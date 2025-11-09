"""Entrena MobileNetV2 para extracción de embeddings y exporta para matching visual."""
from __future__ import annotations

import argparse
import pathlib
import sys
from datetime import datetime
from typing import Tuple
from collections import Counter
import json

import numpy as np

if not hasattr(np, "object"):
    np.object = object  # type: ignore[attr-defined]
if not hasattr(np, "bool"):
    np.bool = bool  # type: ignore[attr-defined]

import tensorflow as tf

AUTOTUNE = tf.data.AUTOTUNE
DEFAULT_IMG_SIZE = (224, 224)
DEFAULT_BATCH_SIZE = 32
VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def build_datasets(
    data_root: pathlib.Path,
    img_size: Tuple[int, int],
    batch_size: int,

) -> tuple[tf.data.Dataset, tf.data.Dataset, list[str], dict[int, float] | None]:
    """Crea datasets y calcula weights por clase para mitigar desbalance."""
    train_dir = data_root / "train"
    val_dir = data_root / "val"

    if not train_dir.exists():
        raise FileNotFoundError(f"No se encontró el directorio de entrenamiento: {train_dir}")
    if not val_dir.exists():
        raise FileNotFoundError(f"No se encontró el directorio de validación: {val_dir}")

    print(f"Cargando imágenes desde {train_dir} y {val_dir}...")
    train_ds = tf.keras.utils.image_dataset_from_directory(
        train_dir,
        label_mode="categorical",
        image_size=img_size,
        batch_size=batch_size,
        shuffle=True,
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        val_dir,
        label_mode="categorical",
        image_size=img_size,
        batch_size=batch_size,
        shuffle=False,
    )

    class_names = train_ds.class_names
    print(f"Clases detectadas ({len(class_names)}): {class_names}")

    counts = Counter()
    for idx, class_name in enumerate(class_names):
        class_dir = train_dir / class_name
        counts[idx] = sum(1 for path in class_dir.glob("**/*") if path.suffix.lower() in VALID_EXTENSIONS)

    nonzero = {idx: count for idx, count in counts.items() if count > 0}
    total = sum(nonzero.values())
    class_weights = (
        {idx: total / (len(nonzero) * count) for idx, count in nonzero.items()}
        if len(nonzero) > 1
        else None
    )

    def prepare(ds: tf.data.Dataset, training: bool) -> tf.data.Dataset:
        if training:
            return ds.shuffle(buffer_size=max(1000, batch_size * 10)).prefetch(AUTOTUNE)
        return ds.cache().prefetch(AUTOTUNE)

    return prepare(train_ds, True), prepare(val_ds, False), class_names, class_weights


def build_model(
    num_classes: int,
    img_size: Tuple[int, int],
    dropout: float,
    embedding_dim: int,
    projection_regularizer: float,
) -> tuple[tf.keras.Model, tf.keras.Model]:
    """Devuelve modelo de entrenamiento y modelo de embeddings normalizados."""
    base_model = tf.keras.applications.MobileNetV2(
        include_top=False,
        weights="imagenet",
        input_shape=img_size + (3,),
        pooling="avg",
    )
    base_model.trainable = False

    data_augmentation = tf.keras.Sequential(
        [
            tf.keras.layers.RandomFlip("horizontal"),
            tf.keras.layers.RandomRotation(0.05),
            tf.keras.layers.RandomZoom(0.15),
            tf.keras.layers.RandomContrast(0.1),
            tf.keras.layers.RandomTranslation(0.08, 0.08),
        ],
        name="augmentation",
    )

    inputs = tf.keras.Input(shape=img_size + (3,), name="image")
    x = data_augmentation(inputs)
    x = tf.keras.applications.mobilenet_v2.preprocess_input(x)
    x = base_model(x, training=False)
    x = tf.keras.layers.Dropout(dropout)(x)
    projection = tf.keras.layers.Dense(
        embedding_dim,
        activation=None,
        kernel_regularizer=tf.keras.regularizers.l2(projection_regularizer),
        name="embedding",
    )(x)
    normalized = tf.keras.layers.UnitNormalization(axis=1, name="embedding_norm")(projection)
    logits = tf.keras.layers.Dense(
        num_classes,
        activation="softmax",
        kernel_regularizer=tf.keras.regularizers.l2(projection_regularizer),
        name="classifier",
    )(normalized)

    training_model = tf.keras.Model(inputs, logits, name="stockwear_mobilenet_v2")
    embedding_model = tf.keras.Model(inputs, normalized, name="stockwear_mobilenet_v2_embeddings")
    return training_model, embedding_model


def train(
    model: tf.keras.Model,
    train_ds: tf.data.Dataset,
    val_ds: tf.data.Dataset,
    epochs: int,
    class_weights: dict[int, float] | None,
    callbacks: list[tf.keras.callbacks.Callback],
    label_smoothing: float,
    weight_decay: float,
):
    """Realiza el entrenamiento con capas base congeladas."""
    loss = tf.keras.losses.CategoricalCrossentropy(label_smoothing=label_smoothing)
    optimizer = tf.keras.optimizers.AdamW(learning_rate=1e-3, weight_decay=weight_decay)
    model.compile(optimizer=optimizer, loss=loss, metrics=["accuracy", "top_k_categorical_accuracy"])
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=epochs,
        callbacks=callbacks,
        class_weight=class_weights,
    )
    return history


def fine_tune(
    model: tf.keras.Model,
    unfreeze_layers: int,
    train_ds: tf.data.Dataset,
    val_ds: tf.data.Dataset,
    epochs: int,
    class_weights: dict[int, float] | None,
    callbacks: list[tf.keras.callbacks.Callback],
    label_smoothing: float,
    weight_decay: float,
):
    """Descongela las últimas capas de MobileNet para afinar pesos."""
    if epochs <= 0:
        return None

    try:
        base_model = model.get_layer("mobilenetv2_1.40_224")
    except ValueError:
        try:
            base_model = model.get_layer("mobilenetv2_1.00_224")
        except ValueError:
            base_model = next(
                layer for layer in model.layers if isinstance(layer, tf.keras.Model)
            )
    base_model.trainable = True

    if unfreeze_layers > 0:
        for layer in base_model.layers[:-unfreeze_layers]:
            layer.trainable = False

    loss = tf.keras.losses.CategoricalCrossentropy(label_smoothing=label_smoothing)
    optimizer = tf.keras.optimizers.AdamW(learning_rate=5e-5, weight_decay=weight_decay / 2)
    model.compile(optimizer=optimizer, loss=loss, metrics=["accuracy", "top_k_categorical_accuracy"])
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=epochs,
        callbacks=callbacks,
        class_weight=class_weights,
    )
    return history


def export_model(
    embedding_model: tf.keras.Model,
    export_root: pathlib.Path,
    metadata: dict[str, object],
    metadata_filename: str,
):
    """Guarda embeddings en formato Keras y TFJS, más metadatos."""
    keras_path = export_root / "embedding_model.keras"
    h5_path = export_root / "embedding_model.h5"
    tfjs_dir = export_root / "tfjs_graph_model"

    keras_path.parent.mkdir(parents=True, exist_ok=True)
    tfjs_dir.parent.mkdir(parents=True, exist_ok=True)

    saved_path: pathlib.Path | None = None

    print(f"Guardando modelo en formato .keras en {keras_path}...")
    try:
        embedding_model.save(keras_path)
        saved_path = keras_path
    except (TypeError, ValueError, NotImplementedError) as exc:
        print("No se pudo guardar en formato .keras automáticamente:", exc)
        print(f"Intentando guardar en formato H5 en {h5_path}...")
        try:
            embedding_model.save(h5_path)
            saved_path = h5_path
        except Exception as h5_exc:  # pragma: no cover
            raise RuntimeError("No se pudo exportar el modelo en ningún formato soportado") from h5_exc

    print(f"Modelo guardado en {saved_path}")

    metadata_path = export_root / metadata_filename
    metadata_to_save = dict(metadata)
    if saved_path is not None:
        metadata_to_save["model_file"] = saved_path.name
    metadata_path.write_text(json.dumps(metadata_to_save, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Metadatos guardados en {metadata_path}")

    try:
        import tensorflowjs as tfjs  # type: ignore
        try:
            import tensorflow.compat.v1 as tfv1  # type: ignore
            if not hasattr(tfv1, "estimator"):
                import tensorflow_estimator as tfe  # type: ignore
                tfv1.estimator = tfe  # type: ignore[attr-defined]
        except ImportError:
            pass
        print(f"Convirtiendo a TensorFlow.js GraphModel en {tfjs_dir}...")
        tfjs.converters.save_keras_model(embedding_model, str(tfjs_dir))
        print("Exportación completada.")
    except Exception as error:  # pragma: no cover
        print("No se pudo convertir a TensorFlow.js automáticamente:", error)
        print("El SavedModel fue guardado. Ejecuta el conversor manualmente si es necesario.")


def main():
    parser = argparse.ArgumentParser(description="Entrena MobileNetV2 con imágenes personalizadas.")
    parser.add_argument("--data", type=pathlib.Path, default=pathlib.Path("data"), help="Raíz del dataset con train/ y val/")
    parser.add_argument("--epochs", type=int, default=10, help="Épocas de entrenamiento inicial")
    parser.add_argument("--fine_tune_epochs", type=int, default=5, help="Épocas adicionales para fine-tuning")
    parser.add_argument("--unfreeze_layers", type=int, default=20, help="Número de capas finales a descongelar durante fine-tuning")
    parser.add_argument("--batch_size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--dropout", type=float, default=0.35)
    parser.add_argument("--img_size", type=int, nargs=2, default=DEFAULT_IMG_SIZE)
    parser.add_argument("--label_smoothing", type=float, default=0.1)
    parser.add_argument("--weight_decay", type=float, default=1e-4)
    parser.add_argument("--early_stopping_patience", type=int, default=5)
    parser.add_argument("--reduce_lr_patience", type=int, default=3)
    parser.add_argument("--embedding_dim", type=int, default=256)
    parser.add_argument("--projection_regularizer", type=float, default=1e-4)
    parser.add_argument("--metadata_filename", type=str, default="metadata.json")
    parser.add_argument(
        "--export",
        type=pathlib.Path,
        default=pathlib.Path("exports") / datetime.now().strftime("%Y%m%d-%H%M%S"),
        help="Carpeta de salida donde se guardarán SavedModel y TFJS",
    )
    args = parser.parse_args()

    img_size = tuple(args.img_size)
    train_ds, val_ds, class_names, class_weights = build_datasets(args.data, img_size, args.batch_size)
    if len(class_names) <= 1:
        print(
            "Se requiere al menos 2 clases para entrenar un modelo de similitud visual."
            " Añade imágenes de otra categoría y vuelve a ejecutar."
        )
        sys.exit(1)
    if class_weights is None:
        class_weights = None
    training_model, embedding_model = build_model(
        len(class_names),
        img_size,
        args.dropout,
        args.embedding_dim,
        args.projection_regularizer,
    )

    callbacks = [
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.3,
            patience=args.reduce_lr_patience,
            min_lr=1e-6,
            verbose=1,
        ),
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss",
            patience=args.early_stopping_patience,
            restore_best_weights=True,
            verbose=1,
        ),
    ]

    print("Entrenamiento inicial...")
    train(
        training_model,
        train_ds,
        val_ds,
        args.epochs,
        class_weights,
        callbacks,
        args.label_smoothing,
        args.weight_decay,
    )

    print("Fine-tuning de capas superiores...")
    fine_tune(
        training_model,
        args.unfreeze_layers,
        train_ds,
        val_ds,
        args.fine_tune_epochs,
        class_weights,
        callbacks,
        args.label_smoothing,
        args.weight_decay,
    )

    metadata = {
        "created_at": datetime.now().isoformat(),
        "classes": class_names,
        "img_size": img_size,
        "embedding_dim": args.embedding_dim,
        "dropout": args.dropout,
        "projection_regularizer": args.projection_regularizer,
    }
    export_model(embedding_model, args.export, metadata, args.metadata_filename)

if __name__ == "__main__":
    main()

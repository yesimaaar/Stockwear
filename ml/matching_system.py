"""Shoe matching system based on MobileNet embeddings and cosine similarity."""
from __future__ import annotations

import argparse
import json
import pathlib
from dataclasses import dataclass
from typing import Iterable, List, Sequence

import numpy as np
import tensorflow as tf

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


@dataclass
class MatchResult:
    rank: int
    name: str
    similarity: float
    path: str


class ShoeMatchingSystem:
    """Builds and queries a visual similarity index for footwear inventory."""

    def __init__(
        self,
        embedding_model_path: str | pathlib.Path,
        inventory_path: str | pathlib.Path = pathlib.Path("data") / "inventory",
        embeddings_output_path: str | pathlib.Path | None = None,
    ) -> None:
        self.inventory_path = pathlib.Path(inventory_path)
        if not self.inventory_path.exists():
            raise FileNotFoundError(f"Inventario no encontrado en {self.inventory_path}")

        embedding_model_path = pathlib.Path(embedding_model_path)
        if embedding_model_path.is_dir():
            resolved = self._find_model_file_in_dir(embedding_model_path)
        else:
            resolved = embedding_model_path

        self.export_dir = resolved.parent
        self.export_metadata = self._load_export_metadata(self.export_dir)

        try:
            self.embedding_model = tf.keras.models.load_model(resolved, safe_mode=False)
        except TypeError:
            # TensorFlow < 2.15 does not support safe_mode argument
            self.embedding_model = tf.keras.models.load_model(resolved)
        if getattr(self.embedding_model, "output_shape", None) is None:
            raise ValueError("El modelo de embeddings no se cargó correctamente.")

        self.embedding_dim = int(self.embedding_model.output_shape[-1])

        default_embeddings_path = pathlib.Path("data") / "inventory_embeddings.npy"
        default_metadata_path = pathlib.Path("data") / "inventory_metadata.json"
        if embeddings_output_path is None:
            self.embeddings_path = default_embeddings_path
            self.metadata_path = default_metadata_path
        else:
            base = pathlib.Path(embeddings_output_path)
            if base.suffix:
                self.embeddings_path = base
                self.metadata_path = base.with_suffix(".json")
            else:
                self.embeddings_path = base / "inventory_embeddings.npy"
                self.metadata_path = base / "inventory_metadata.json"

        self.embedding_matrix: np.ndarray | None = None
        self.metadata: list[dict[str, str]] = []

        self._try_load_cached_embeddings()

    @staticmethod
    def _find_model_file_in_dir(directory: pathlib.Path) -> pathlib.Path:
        for filename in ("embedding_model.keras", "embedding_model.h5"):
            candidate = directory / filename
            if candidate.exists():
                print(f"Cargando modelo desde {candidate}")
                return candidate
        raise FileNotFoundError(
            f"No se encontró un modelo en {directory}. Esperado embedding_model.keras u embedding_model.h5"
        )

    @staticmethod
    def _load_export_metadata(export_dir: pathlib.Path) -> dict[str, object]:
        metadata_path = export_dir / "metadata.json"
        if metadata_path.exists():
            try:
                with metadata_path.open("r", encoding="utf-8") as fh:
                    return json.load(fh)
            except json.JSONDecodeError as exc:  # pragma: no cover
                print(f"Advertencia: metadata.json inválido en {metadata_path}: {exc}")
        return {}

    def _try_load_cached_embeddings(self) -> None:
        if self.embeddings_path.exists() and self.metadata_path.exists():
            try:
                self.embedding_matrix = np.load(self.embeddings_path)
                with self.metadata_path.open("r", encoding="utf-8") as fh:
                    self.metadata = json.load(fh)
                if self.embedding_matrix.ndim != 2 or len(self.metadata) != len(self.embedding_matrix):
                    raise ValueError("Dimensiones de embeddings/metadata incompatibles")
                print(f"Cargado índice en memoria: {len(self.metadata)} productos")
            except Exception as exc:  # pragma: no cover
                print("No se pudieron cargar embeddings cacheados:", exc)
                self.embedding_matrix = None
                self.metadata = []

    @staticmethod
    def _iter_image_paths(directory: pathlib.Path) -> Iterable[pathlib.Path]:
        for path in directory.rglob("*"):
            if path.suffix.lower() in ALLOWED_EXTENSIONS:
                yield path

    def build_inventory_embeddings(self, batch_size: int = 32, overwrite: bool = False) -> int:
        """Extract embeddings for all inventory images and optionally persist them."""
        if self.embedding_matrix is not None and not overwrite:
            return len(self.metadata)

        image_paths = list(self._iter_image_paths(self.inventory_path))
        if not image_paths:
            raise ValueError(f"No se encontraron imágenes en {self.inventory_path}")

        all_embeddings: List[np.ndarray] = []
        self.metadata = []

        for start in range(0, len(image_paths), batch_size):
            batch_paths = image_paths[start : start + batch_size]
            batch_arrays = [
                tf.keras.utils.img_to_array(
                    tf.keras.utils.load_img(path, target_size=(224, 224))
                )
                for path in batch_paths
            ]
            batch = tf.convert_to_tensor(batch_arrays, dtype=tf.float32)
            batch = tf.keras.applications.mobilenet_v2.preprocess_input(batch)

            embeddings = self.embedding_model.predict(batch, verbose=0)
            embeddings = embeddings / (np.linalg.norm(embeddings, axis=1, keepdims=True) + 1e-8)
            all_embeddings.append(embeddings)

            for path, embedding in zip(batch_paths, embeddings):
                self.metadata.append(
                    {
                        "name": path.stem,
                        "path": str(path.resolve()),
                    }
                )

        self.embedding_matrix = np.concatenate(all_embeddings, axis=0)

        self.embeddings_path.parent.mkdir(parents=True, exist_ok=True)
        np.save(self.embeddings_path, self.embedding_matrix)
        with self.metadata_path.open("w", encoding="utf-8") as fh:
            json.dump(self.metadata, fh, ensure_ascii=False, indent=2)

        print(f"Embeddings guardados en {self.embeddings_path} ({len(self.metadata)} items)")
        return len(self.metadata)

    @staticmethod
    def _cosine_similarity_matrix(matrix: np.ndarray, vector: np.ndarray) -> np.ndarray:
        return matrix @ vector

    def _ensure_embeddings(self) -> None:
        if self.embedding_matrix is None:
            raise ValueError(
                "Embeddings no cargados. Ejecuta build_inventory_embeddings() primero o carga el índice cacheado."
            )

    def find_similar(self, query_image_path: str | pathlib.Path, top_k: int = 5) -> Sequence[MatchResult]:
        """Return the most visually similar inventory items to the given query image."""
        self._ensure_embeddings()
        query_path = pathlib.Path(query_image_path)
        if not query_path.exists():
            raise FileNotFoundError(str(query_path))

        img = tf.keras.utils.load_img(query_path, target_size=(224, 224))
        img_array = tf.keras.utils.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)

        embedding = self.embedding_model.predict(img_array, verbose=0)[0]
        embedding = embedding / (np.linalg.norm(embedding) + 1e-8)

        sims = self._cosine_similarity_matrix(self.embedding_matrix, embedding)
        top_indices = np.argsort(sims)[::-1][:top_k]

        results: List[MatchResult] = []
        for rank, idx in enumerate(top_indices, start=1):
            meta = self.metadata[idx]
            results.append(
                MatchResult(
                    rank=rank,
                    name=meta["name"],
                    similarity=float(sims[idx]),
                    path=meta["path"],
                )
            )

        return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Construye y consulta el índice de similitud de inventario")
    parser.add_argument(
        "--model",
        type=str,
        default="auto",
        help="Ruta al modelo de embeddings Keras o 'auto' para usar el último export",
    )
    parser.add_argument(
        "--inventory",
        type=str,
        default="auto",
        help="Carpeta con imágenes del inventario o 'auto' para usar data/train",
    )
    parser.add_argument(
        "--query",
        type=pathlib.Path,
        help="Imagen de consulta para buscar productos similares",
    )
    parser.add_argument("--top-k", type=int, default=5, help="Número de resultados similares a retornar")
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Forzar recalcular embeddings incluso si existen en caché",
    )
    args = parser.parse_args()

    def resolve_model_path(value: str) -> pathlib.Path:
        def candidate_files(root: pathlib.Path) -> list[pathlib.Path]:
            return [root / "embedding_model.keras", root / "embedding_model.h5"]

        if value.lower() in {"auto", "latest"}:
            exports_root = pathlib.Path("exports")
            export_dirs = sorted(p for p in exports_root.iterdir() if p.is_dir())
            for directory in reversed(export_dirs):
                for candidate in candidate_files(directory):
                    if candidate.exists():
                        print(f"Usando modelo más reciente: {candidate}")
                        return candidate
            parser.error(
                "No se encontró ningún modelo exportado en 'exports/'. Ejecuta ml/train_mobilenet.py para generar uno."
            )

        if "<timestamp>" in value:
            parser.error("Reemplaza '<timestamp>' por la carpeta concreta dentro de exports/, o usa --model auto.")

        path = pathlib.Path(value)
        if path.is_dir():
            for candidate in candidate_files(path):
                if candidate.exists():
                    print(f"Usando modelo encontrado en {candidate}")
                    return candidate
            parser.error(
                f"La carpeta '{path}' no contiene embedding_model.keras ni embedding_model.h5."
            )

        if not path.exists():
            parser.error(f"El modelo '{path}' no existe. Ajusta --model o usa 'auto'.")
        return path

    def resolve_inventory_path(value: str) -> pathlib.Path:
        if value.lower() == "auto":
            path = pathlib.Path("data") / "train"
            if not path.exists():
                parser.error("No se encontró 'data/train'. Especifica manualmente la ruta del inventario con --inventory.")
            print(f"Usando inventario por defecto: {path}")
            return path

        path = pathlib.Path(value)
        if not path.exists():
            parent = path.parent
            if parent.exists() and list(parent.iterdir()):
                print(
                    f"La carpeta '{path}' no existe. Usando la carpeta padre '{parent}' como inventario."
                )
                return parent
            parser.error(f"La carpeta de inventario '{path}' no existe. Ajusta --inventory o usa 'auto'.")
        return path

    model_path = resolve_model_path(args.model)
    inventory_path = resolve_inventory_path(args.inventory)

    matcher = ShoeMatchingSystem(model_path, inventory_path)
    count = matcher.build_inventory_embeddings(overwrite=args.overwrite)
    print(f"Embeddings disponibles para {count} imágenes")

    if args.query:
        results = matcher.find_similar(args.query, top_k=args.top_k)
        for match in results:
            print(f"#{match.rank} {match.name} ({match.similarity * 100:.2f}%) -> {match.path}")

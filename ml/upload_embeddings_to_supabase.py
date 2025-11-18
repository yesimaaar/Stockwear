"""
Sube embeddings de imágenes de productos a una base de datos Supabase.

Este script realiza los siguientes pasos:
1.  Se conecta a Supabase usando las credenciales del entorno.
2.  Carga un modelo de embeddings de Keras (MobileNetV2 por defecto).
3.  Obtiene la lista de productos de la tabla 'productos' en Supabase.
4.  Para cada producto, busca imágenes correspondientes en una carpeta local.
    Se espera que las imágenes estén organizadas en subcarpetas nombradas con el 'código' del producto.
    Ejemplo: /data/inventory/CODIGO_PRODUCTO_1/imagen1.jpg
5.  Genera un embedding para cada imagen encontrada.
6.  Sube el embedding a la tabla 'producto_embeddings', asociándolo con el ID del producto.

Requisitos:
- Python 3.9+
- pip install supabase python-dotenv tensorflow numpy
- Un archivo .env en la raíz del proyecto con:
  SUPABASE_URL="tu_url_de_supabase"
  SUPABASE_KEY="tu_llave_de_servicio_de_supabase"

Uso:
python ml/upload_embeddings_to_supabase.py --images_dir data/inventory --model_path exports/20251109-001619/embedding_model.keras
"""
from __future__ import annotations

import argparse
import os
import pathlib
from typing import Any, Sequence

import numpy as np
import tensorflow as tf
from dotenv import load_dotenv
from supabase import Client, create_client

# --- Configuración ---
# Carga las variables de entorno desde el archivo .env

load_dotenv(dotenv_path='./.env.local')

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise SystemExit(
        "Error: Las variables de entorno SUPABASE_URL y SUPABASE_KEY deben estar definidas.\n"
        "Crea un archivo .env en la raíz del proyecto y añade las credenciales."
    )

# --- Funciones de Ayuda ---

def get_supabase_client() -> Client:
    """Crea y devuelve un cliente de Supabase."""
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def load_embedding_model(model_path: str | pathlib.Path) -> tf.keras.Model:
    """Carga el modelo de Keras para generar embeddings."""
    print(f"Cargando modelo desde: {model_path}")
    try:
        # safe_mode=False es necesario para modelos con capas Lambda como MobileNetV2
        model = tf.keras.models.load_model(model_path, safe_mode=False)
    except TypeError:
        # Versiones más antiguas de TensorFlow no tienen el argumento safe_mode
        model = tf.keras.models.load_model(model_path)
    print("Modelo cargado exitosamente.")
    return model


def generate_embedding(model: tf.keras.Model, image_path: pathlib.Path) -> np.ndarray:
    """Genera un embedding para una única imagen."""
    try:
        img = tf.keras.utils.load_img(image_path, target_size=(224, 224))
        img_array = tf.keras.utils.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)

        embedding = model.predict(img_array, verbose=0)[0]
        # Normalizar el embedding (norma L2) para consistencia con la similitud de coseno
        embedding = embedding / (np.linalg.norm(embedding) + 1e-8)
        return embedding
    except Exception as e:
        print(f"Error procesando la imagen {image_path}: {e}")
        return np.array([])


def get_products_from_supabase(client: Client) -> list[dict[str, Any]]:
    """Obtiene la lista de productos (id y código) de Supabase."""
    print("Obteniendo productos desde Supabase...")
    response = client.from_("productos").select("id, codigo").eq("estado", "activo").execute()
    if response.data:
        print(f"Se encontraron {len(response.data)} productos activos.")
        return response.data
    print("No se encontraron productos o hubo un error.")
    return []


def upload_embedding(
    client: Client,
    product_id: int,
    embedding: np.ndarray,
    source_filename: str,
) -> None:
    """Sube un embedding a la tabla producto_embeddings."""
    payload = {
        "productoId": product_id,
        "embedding": embedding.tolist(),
        "fuente": source_filename,
    }
    try:
        client.from_("producto_embeddings").insert(payload).execute()
        print(f"  -> Embedding para '{source_filename}' subido correctamente.")
    except Exception as e:
        print(f"  -> Error al subir embedding para '{source_filename}': {e}")


# --- Lógica Principal ---

def main(args: argparse.Namespace) -> None:
    """Función principal del script."""
    supabase_client = get_supabase_client()
    embedding_model = load_embedding_model(args.model_path)
    products = get_products_from_supabase(supabase_client)
    images_dir = args.images_dir

    if not products:
        print("No hay productos para procesar. Saliendo.")
        return

    processed_count = 0
    for product in products:
        product_id = product.get("id")
        product_code = product.get("codigo")

        if not product_id or not product_code:
            continue

        product_image_folder = images_dir / str(product_code)
        if not product_image_folder.exists() or not product_image_folder.is_dir():
            # print(f"No se encontró la carpeta de imágenes para el producto {product_code}, se omite.")
            continue

        print(f"\nProcesando producto: {product_code} (ID: {product_id})")
        image_files = [
            p for p in product_image_folder.iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png")
        ]

        if not image_files:
            print("  No se encontraron imágenes en la carpeta.")
            continue

        for image_path in image_files:
            embedding = generate_embedding(embedding_model, image_path)
            if embedding.any():
                upload_embedding(supabase_client, product_id, embedding, image_path.name)
                processed_count += 1

    print(f"\nProceso completado. Se generaron y subieron {processed_count} embeddings.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generar y subir embeddings de productos a Supabase.")
    parser.add_argument(
        "--images_dir",
        type=pathlib.Path,
        required=True,
        help="Directorio raíz que contiene las imágenes de los productos, organizadas en subcarpetas por código de producto.",
    )
    parser.add_argument(
        "--model_path",
        type=pathlib.Path,
        required=True,
        help="Ruta al archivo del modelo Keras (.h5 o .keras) a usar para los embeddings.",
    )
    # Podríamos añadir más argumentos, como --overwrite, etc.

    args = parser.parse_args()
    main(args)

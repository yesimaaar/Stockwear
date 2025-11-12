# Stockwear Embedding Worker (Google Cloud Functions)

Este servicio HTTP genera embeddings para las imágenes de referencia usando `@tensorflow/tfjs-node`.
El objetivo es ejecutarlo fuera de Vercel (por ejemplo en Google Cloud Functions) para evitar los límites
de tamaño de las Serverless Functions de la plataforma principal.

## Estructura

```
cloud-functions/
  embedding-worker/
    index.js             # Handler HTTP (Functions Framework)
    package.json         # Dependencias y script de arranque
    models/mobilenet/... # Copia del modelo MobileNet usado en la app web
```

El archivo `index.js` reutiliza la misma lógica que la app Next.js: carga el modelo MobileNet, decodifica
la imagen recibida en base64, genera el embedding y lo normaliza mediante L2.

## Preparación del entorno

1. Copia la carpeta del modelo que ya existe en `public/models/mobilenet` dentro de este proyecto:

   ```bash
   cp -R ../../public/models ./models
   ```

   El manejador espera encontrar `models/mobilenet/model.json` y los pesos asociados.

2. Instala dependencias (usar Node 20):

   ```bash
   cd cloud-functions/embedding-worker
   npm install
   ```

   > También puedes usar `pnpm install` si prefieres, pero recuerda que el despliegue con `gcloud`
   > utilizará `npm` por defecto.

3. Opcional, prueba localmente:

   ```bash
   npm run start
   ```

   Esto levanta el servidor Functions Framework en `http://localhost:8080/`.
   Puedes probarlo con:

   ```bash
   curl -X POST http://localhost:8080/ \
     -H "Content-Type: application/json" \
     -d '{"imageBase64":"...","productId":1}'
   ```

## Despliegue en Google Cloud Functions

1. Autentícate y selecciona tu proyecto GCP:

   ```bash
   gcloud auth login
   gcloud config set project <tu-proyecto>
   ```

2. Despliega la función (requiere Node.js 20):

   ```bash
   gcloud functions deploy stockwear-embedding \
     --gen2 \
     --runtime=nodejs20 \
     --region=us-central1 \
     --entry-point=generateEmbedding \
     --memory=2Gi \
     --timeout=120s \
     --set-env-vars=AUTH_TOKEN="<token-secreto>" \
     --trigger-http \
     --allow-unauthenticated=false
   ```

   Ajusta `--memory` y `--timeout` según tus necesidades. Si planeas exponer la función
   públicamente, puedes añadir un API Gateway o manejar autenticación mediante tokens.

3. Tras el despliegue, obtén la URL pública de la función (`gcloud functions describe ... --format='value(serviceConfig.uri)'`).
  Configura el mismo token secreto en Vercel (`EMBEDDING_SERVICE_TOKEN`). La aplicación enviará
  una cabecera `Authorization: Bearer <token>` en cada request.

## Integración con la app Next.js

En Vercel (o cualquier entorno donde no puedas usar `tfjs-node`) agrega las siguientes variables
al panel de Environment Variables:

- `EMBEDDING_SERVICE_URL`: URL HTTPS de la Cloud Function.
- `EMBEDDING_SERVICE_TOKEN`: (opcional) token bearer para autenticar la llamada.
- **No** definas `ENABLE_TFJS_NODE` (o déjalo en `false`) para evitar que Vercel intente empaquetar el módulo nativo.

En desarrollo local puedes seguir generando embeddings de forma nativa definiendo
`ENABLE_TFJS_NODE=true` y dejando `EMBEDDING_SERVICE_URL` vacío.

## Formato de la solicitud

La ruta espera un JSON con las siguientes propiedades:

```json
{
  "imageBase64": "...",   // cadena base64 de la imagen
  "mimeType": "image/jpeg", // opcional
  "productId": 123,        // opcional, se devuelve tal cual en la respuesta
  "referenceImageId": 456  // opcional, se devuelve tal cual en la respuesta
}
```

Respuesta exitosa:

```json
{
  "embedding": [0.12, 0.03, ...],
  "length": 1024,
  "productId": 123,
  "referenceImageId": 456,
  "mimeType": "image/jpeg"
}
```

Si ocurre un error se devuelve `500` con el mensaje en `message` y un campo `details` explicando
la causa.

## Seguridad

- Utiliza un header `Authorization: Bearer <token>` o IAM para restringir el acceso a la función.
- En la app Next.js puedes configurar el token en `EMBEDDING_SERVICE_TOKEN`. La llamada se realiza
  desde el servidor, por lo que el token no se expone al navegador.

## Diagnóstico

- Usa `gcloud functions logs read stockwear-embedding` para revisar los logs.
- La función mantiene el modelo en memoria entre invocaciones, así que el primer request será más lento.

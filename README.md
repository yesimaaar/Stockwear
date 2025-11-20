
<p align="center">
	<img src="./public/logo-readme.png" alt="StockWear" width="260" />
</p>

# StockWear

Sistema de gestión de inventario y catálogo omnicanal con reconocimiento visual, sincronización de WhatsApp y portal público para tiendas de calzado.

## Características

- Gestión completa de productos, tallas, almacenes y movimientos de inventario por tienda.
- Generación de catálogos públicos por tienda (`/catalog/[slug]`) con carrito y envío directo a WhatsApp.
- Reconocimiento visual de productos mediante embeddings y referencia de imágenes.
- Paneles administrativos independientes por tienda con métricas, alertas de stock y automatizaciones.
- Integración con Supabase (auth, storage, funciones) y flujos multi-tenant.

## Instalación

> **Requisitos previos**
> - Node.js **20.19.5** (usa `nvm use 20.19.5` o descarga esa versión específica).
> - **Herramientas de desarrollo de escritorio de C++** instaladas mediante el instalador de Visual Studio (Build Tools) para compilar dependencias nativas.

```bash
npm install -g pnpm
pnpm install
pnpm run dev --webpack
```

> Si necesitas usar npm tradicional: `npm install` y, si hay conflictos, `npm install --legacy-peer-deps`.

## Configuración

1. Copia `.env.local.example` (o el bloque del README) a `.env.local`.
2. Rellena las variables de Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
3. Define el bucket `SUPABASE_PRODUCT_BUCKET` y las claves del servicio de embeddings (`EMBEDDING_SERVICE_URL`, `EMBEDDING_SERVICE_TOKEN`).
4. Añade la clave de Google Maps (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`).
5. Cada tienda debe configurar su número de WhatsApp desde el panel de administración.

## Arquitectura y Tecnologías

- <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg" alt="Next.js" width="18" /> **Next.js 16**: App Router, RSC y manejo de layouts.
- <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" alt="React" width="18" /> **React 18**: Componentización y hooks personalizados para estado y servicios.
- <img src="https://www.vectorlogo.zone/logos/tailwindcss/tailwindcss-icon.svg" alt="Tailwind CSS" width="18" /> **Tailwind CSS + shadcn/ui**: Sistema de diseño y componentes accesibles.
- <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/supabase/supabase-original.svg" alt="Supabase" width="18" /> **Supabase**: Postgres multi-tenant, Auth, Storage y funciones administrativas.
- <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg" alt="Google Cloud" width="18" /> **Google Cloud Functions**: Servicio de embeddings y procesamiento ML.
- <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg" alt="TensorFlow" width="18" /> **TensorFlow + MobileNetV2**: Pipeline de entrenamiento y reconocimiento visual para generar embeddings, con fine-tuning opcional basado en datasets propios para mejorar el matching.
- <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" alt="Python" width="18" /> **Python 3 + tooling científico**: Scripts offline (`ml/`) para preparar datasets, ejecutar fine-tuning y regenerar embeddings antes de sincronizarlos con Supabase.
- <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vercel/vercel-original.svg" alt="Vercel" width="18" /> **Vercel**: Despliegue, edge/runtime y automatización CI/CD.

## Contribución

1. Haz fork y crea una rama feature (`git checkout -b feature/nueva-funcionalidad`).
2. Ejecuta `pnpm run lint` / `pnpm run test` antes de abrir un PR.
3. Describe claramente los cambios y adjunta capturas o pasos de prueba cuando aplique.

## Autores

- Jheysmar Armando Fragozo Acosta
- Alam Steven Cortes Martínez
- Amin Jose Pineda Linares

Universidad Popular del César - 2025

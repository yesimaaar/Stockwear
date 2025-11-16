-- 007_almacenes_geom.sql
-- Añadir columnas latitud/longitud, crear geom (PostGIS) y crear índices

-- 1) Añadir columnas simples
ALTER TABLE almacenes
  ADD COLUMN IF NOT EXISTS latitud double precision,
  ADD COLUMN IF NOT EXISTS longitud double precision;

-- 2) Índice combinado sencillo
CREATE INDEX IF NOT EXISTS idx_almacenes_lat_long ON almacenes (latitud, longitud);

-- 3) (Opcional/Avanzado) Habilitar PostGIS y columna geoespacial
-- Nota: CREATE EXTENSION puede requerir permisos; si falla, ejecuta solo las primeras dos secciones.
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE almacenes
  ADD COLUMN IF NOT EXISTS geom geography(Point, 4326);

-- 4) Poblar geom desde lat/long si ya existen valores
UPDATE almacenes
SET geom = ST_SetSRID(ST_MakePoint(longitud, latitud), 4326)::geography
WHERE latitud IS NOT NULL AND longitud IS NOT NULL;

-- 5) Índice espacial
CREATE INDEX IF NOT EXISTS idx_almacenes_geom ON almacenes USING GIST (geom);
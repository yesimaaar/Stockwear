-- Script to clear ALL business data for a fresh start
-- WARNING: This will delete ALL data from the tables listed below.

BEGIN;

-- Truncate tables with CASCADE to handle foreign key constraints
TRUNCATE TABLE 
  "ventasDetalle",
  ventas,
  "historialStock",
  stock,
  consultas,
  producto_reference_images,
  producto_embeddings,
  productos,
  almacenes,
  tallas,
  categorias,
  usuarios,
  tiendas
RESTART IDENTITY CASCADE;

-- Optional: If you want to keep the current user, you'd need to back them up and restore, 
-- but TRUNCATE is faster for a full wipe. 
-- Since this is for "clearing all data", we assume a full wipe is desired.

COMMIT;

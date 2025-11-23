-- 004_seed.sql
-- Consolidated Seed Data

-- 1. Default Store
INSERT INTO tiendas (nombre, slug) VALUES ('Tienda Principal', 'main') ON CONFLICT (slug) DO NOTHING;

-- 2. Backfill existing records to default store (if any exist without tienda_id)
DO $$
DECLARE
  main_tienda_id BIGINT;
BEGIN
  SELECT id INTO main_tienda_id FROM tiendas WHERE slug = 'main';
  
  IF main_tienda_id IS NOT NULL THEN
    UPDATE usuarios SET tienda_id = main_tienda_id WHERE tienda_id IS NULL;
    UPDATE productos SET tienda_id = main_tienda_id WHERE tienda_id IS NULL;
    UPDATE categorias SET tienda_id = main_tienda_id WHERE tienda_id IS NULL;
    UPDATE tallas SET tienda_id = main_tienda_id WHERE tienda_id IS NULL;
    UPDATE almacenes SET tienda_id = main_tienda_id WHERE tienda_id IS NULL;
    UPDATE stock SET tienda_id = main_tienda_id WHERE tienda_id IS NULL;
    UPDATE ventas SET tienda_id = main_tienda_id WHERE tienda_id IS NULL;
    UPDATE consultas SET tienda_id = main_tienda_id WHERE tienda_id IS NULL;
    UPDATE "historialStock" SET tienda_id = main_tienda_id WHERE tienda_id IS NULL;
    UPDATE "ventasDetalle" SET tienda_id = main_tienda_id WHERE tienda_id IS NULL;
    UPDATE producto_reference_images SET tienda_id = main_tienda_id WHERE tienda_id IS NULL;
    -- Also backfill new tables if needed
    UPDATE clientes SET tienda_id = main_tienda_id WHERE tienda_id IS NULL;
    UPDATE abonos SET tienda_id = main_tienda_id WHERE tienda_id IS NULL;
  END IF;
END $$;

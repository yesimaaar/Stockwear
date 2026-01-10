-- 004_seed.sql
-- Consolidated Seed Data for Stockwear
-- Updated: 2025-01-10

-- ============================================================================
-- 1. DEFAULT STORE
-- ============================================================================

INSERT INTO tiendas (nombre, slug) 
VALUES ('Tienda Principal', 'main') 
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 2. BACKFILL EXISTING RECORDS TO DEFAULT STORE
-- ============================================================================

-- Assign orphan records (tienda_id IS NULL) to the default store
-- Only for tables that HAVE tienda_id column
DO $$
DECLARE
  main_tienda_id BIGINT;
BEGIN
  SELECT id INTO main_tienda_id FROM tiendas WHERE slug = 'main';
  
  IF main_tienda_id IS NOT NULL THEN
    -- Core business tables (with tienda_id)
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
    
    -- Customer and payments (with tienda_id)
    UPDATE clientes SET tienda_id = main_tienda_id WHERE tienda_id IS NULL;
    UPDATE abonos SET tienda_id = main_tienda_id WHERE tienda_id IS NULL;
    UPDATE metodos_pago SET tienda_id = main_tienda_id WHERE tienda_id IS NULL;
    UPDATE caja_sesiones SET tienda_id = main_tienda_id WHERE tienda_id IS NULL;
    
    -- Expenses (with tienda_id)
    UPDATE gastos SET tienda_id = main_tienda_id WHERE tienda_id IS NULL;
    UPDATE pagos_gastos SET tienda_id = main_tienda_id WHERE tienda_id IS NULL;
    
    -- NOTE: These tables do NOT have tienda_id:
    -- - search_feedback (uses user_id referencing auth.users)
    -- - producto_reference_images (linked via productoId -> productos)
    -- - producto_embeddings (linked via productoId -> productos)
    -- - visual_recognition_feedback (uses tienda_id as integer, handled separately)
  END IF;
END $$;

-- Handle visual_recognition_feedback separately (tienda_id is integer, not bigint)
DO $$
DECLARE
  main_tienda_id INTEGER;
BEGIN
  SELECT id::integer INTO main_tienda_id FROM tiendas WHERE slug = 'main';
  
  IF main_tienda_id IS NOT NULL THEN
    UPDATE visual_recognition_feedback 
    SET tienda_id = main_tienda_id 
    WHERE tienda_id IS NULL;
  END IF;
END $$;

-- ============================================================================
-- 3. DEFAULT PAYMENT METHODS
-- ============================================================================

-- Efectivo
INSERT INTO public.metodos_pago (tienda_id, nombre, tipo, estado)
SELECT id, 'Efectivo', 'efectivo', 'activo'
FROM public.tiendas t
WHERE NOT EXISTS (
    SELECT 1 FROM public.metodos_pago mp WHERE mp.tienda_id = t.id AND mp.tipo = 'efectivo'
);

-- Transferencia
INSERT INTO public.metodos_pago (tienda_id, nombre, tipo, estado)
SELECT id, 'Transferencia', 'banco', 'activo'
FROM public.tiendas t
WHERE NOT EXISTS (
    SELECT 1 FROM public.metodos_pago mp WHERE mp.tienda_id = t.id AND mp.tipo = 'banco'
);

-- Tarjeta de crédito
INSERT INTO public.metodos_pago (tienda_id, nombre, tipo, estado)
SELECT id, 'Tarjeta de crédito', 'tarjeta', 'activo'
FROM public.tiendas t
WHERE NOT EXISTS (
    SELECT 1 FROM public.metodos_pago mp WHERE mp.tienda_id = t.id AND mp.tipo = 'tarjeta'
);

-- Crédito / Por Cobrar
INSERT INTO public.metodos_pago (tienda_id, nombre, tipo, estado)
SELECT id, 'Crédito', 'otro', 'activo'
FROM public.tiendas t
WHERE NOT EXISTS (
    SELECT 1 FROM public.metodos_pago mp WHERE mp.tienda_id = t.id AND (mp.nombre = 'Crédito' OR mp.nombre = 'Por Cobrar')
);

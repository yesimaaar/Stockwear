-- Seed default payment methods for all existing stores

-- 0. Update constraint to allow 'tarjeta'
DO $$
BEGIN
  ALTER TABLE public.metodos_pago DROP CONSTRAINT IF EXISTS metodos_pago_tipo_check;
  ALTER TABLE public.metodos_pago ADD CONSTRAINT metodos_pago_tipo_check 
    CHECK (tipo IN ('efectivo', 'digital', 'banco', 'tarjeta', 'otro'));
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'Error updating constraint: %', SQLERRM;
END $$;

-- 1. Efectivo
INSERT INTO public.metodos_pago (tienda_id, nombre, tipo, estado)
SELECT id, 'Efectivo', 'efectivo', 'activo'
FROM public.tiendas t
WHERE NOT EXISTS (
    SELECT 1 FROM public.metodos_pago mp WHERE mp.tienda_id = t.id AND mp.tipo = 'efectivo'
);

-- 2. Transferencia
INSERT INTO public.metodos_pago (tienda_id, nombre, tipo, estado)
SELECT id, 'Transferencia', 'banco', 'activo'
FROM public.tiendas t
WHERE NOT EXISTS (
    SELECT 1 FROM public.metodos_pago mp WHERE mp.tienda_id = t.id AND mp.tipo = 'banco'
);

-- 3. Tarjeta de crédito
INSERT INTO public.metodos_pago (tienda_id, nombre, tipo, estado)
SELECT id, 'Tarjeta de crédito', 'tarjeta', 'activo'
FROM public.tiendas t
WHERE NOT EXISTS (
    SELECT 1 FROM public.metodos_pago mp WHERE mp.tienda_id = t.id AND mp.tipo = 'tarjeta'
);

-- 4. Por Cobrar (para ventas a crédito)
INSERT INTO public.metodos_pago (tienda_id, nombre, tipo, estado)
SELECT id, 'Por Cobrar', 'otro', 'activo'
FROM public.tiendas t
WHERE NOT EXISTS (
    SELECT 1 FROM public.metodos_pago mp WHERE mp.tienda_id = t.id AND mp.nombre = 'Por Cobrar'
);

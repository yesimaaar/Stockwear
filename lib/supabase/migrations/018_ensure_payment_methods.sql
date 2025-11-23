-- Ensure all default payment methods exist
-- This is necessary because if 015 failed due to missing table, we need to re-run the seeding.

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

-- 4. Crédito / Por Cobrar
INSERT INTO public.metodos_pago (tienda_id, nombre, tipo, estado)
SELECT id, 'Crédito', 'otro', 'activo'
FROM public.tiendas t
WHERE NOT EXISTS (
    SELECT 1 FROM public.metodos_pago mp WHERE mp.tienda_id = t.id AND (mp.nombre = 'Crédito' OR mp.nombre = 'Por Cobrar')
);

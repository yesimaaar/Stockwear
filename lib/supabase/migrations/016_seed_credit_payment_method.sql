-- Seed 'Crédito' payment method for all existing stores
INSERT INTO public.metodos_pago (tienda_id, nombre, tipo, estado)
SELECT id, 'Crédito', 'otro', 'activo'
FROM public.tiendas t
WHERE NOT EXISTS (
    SELECT 1 FROM public.metodos_pago mp WHERE mp.tienda_id = t.id AND mp.nombre = 'Crédito'
);

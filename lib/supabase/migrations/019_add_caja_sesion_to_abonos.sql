-- Add caja_sesion_id to abonos table
ALTER TABLE public.abonos
ADD COLUMN IF NOT EXISTS caja_sesion_id BIGINT REFERENCES public.caja_sesiones(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS abonos_caja_sesion_idx ON public.abonos(caja_sesion_id);

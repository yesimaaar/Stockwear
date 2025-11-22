-- Add payment frequency and first due date to Ventas table
alter table public.ventas 
add column if not exists frecuencia_pago text check (frecuencia_pago in ('semanal', 'mensual')),
add column if not exists fecha_primer_vencimiento timestamptz;

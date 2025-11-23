-- Add credit details to Ventas table
alter table public.ventas 
add column if not exists numero_cuotas integer default 1,
add column if not exists interes_porcentaje numeric default 0,
add column if not exists monto_cuota numeric default 0;

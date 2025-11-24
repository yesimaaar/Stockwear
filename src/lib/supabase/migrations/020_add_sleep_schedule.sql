-- Add sleep_schedule configuration to tiendas table
ALTER TABLE tiendas
  ADD COLUMN IF NOT EXISTS sleep_schedule_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sleep_schedule_time TIME DEFAULT '22:00:00',
  ADD COLUMN IF NOT EXISTS wake_schedule_time TIME DEFAULT '07:00:00';

-- Add comment
COMMENT ON COLUMN tiendas.sleep_schedule_enabled IS 'Indica si la desactivación automática de cuentas está habilitada';
COMMENT ON COLUMN tiendas.sleep_schedule_time IS 'Hora del día en que se desactivan automáticamente las cuentas (excepto el propietario)';
COMMENT ON COLUMN tiendas.wake_schedule_time IS 'Hora del día en que se permite nuevamente el acceso (fin del modo dormir)';

-- Corrige el trigger de sincronización entre auth.users y public.usuarios
-- Asegura que las columnas coincidan con el esquema camelCase y que tienda_id se propague.

DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  DROP FUNCTION IF EXISTS public.handle_new_user();
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  metadata JSONB := NEW.raw_user_meta_data;
  nombre TEXT := COALESCE(metadata ->> 'nombre', split_part(NEW.email, '@', 1));
  rol TEXT := COALESCE(metadata ->> 'rol', 'admin');
  telefono TEXT := NULLIF(trim(COALESCE(metadata ->> 'telefono', '')), '');
  raw_tienda TEXT := metadata ->> 'tienda_id';
  tienda_id BIGINT := NULL;
BEGIN
  IF raw_tienda IS NOT NULL AND raw_tienda ~ '^\d+$' THEN
    tienda_id := raw_tienda::BIGINT;
  END IF;

  INSERT INTO public.usuarios (
    id,
    auth_uid,
    email,
    nombre,
    telefono,
    rol,
    estado,
    "createdAt",
    "updatedAt",
    tienda_id
  )
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    nombre,
    telefono,
    rol,
    'activo',
    timezone('utc', NOW()),
    timezone('utc', NOW()),
    tienda_id
  )
  ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      nombre = EXCLUDED.nombre,
      telefono = EXCLUDED.telefono,
      rol = EXCLUDED.rol,
      estado = EXCLUDED.estado,
      "updatedAt" = timezone('utc', NOW()),
      tienda_id = COALESCE(EXCLUDED.tienda_id, usuarios.tienda_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

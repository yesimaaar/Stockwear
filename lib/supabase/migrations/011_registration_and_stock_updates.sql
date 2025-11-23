-- Consolidated fixes for user registration, tienda policies and talla handling

-- 1. Add owner reference to tiendas so we can track creators
ALTER TABLE tiendas
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- 2. Rebuild the handle_new_user trigger to sync metadata and tienda_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
      AND tgrelid = 'auth.users'::regclass
  ) THEN
    EXECUTE 'DROP TRIGGER on_auth_user_created ON auth.users';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'handle_new_user'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    EXECUTE 'DROP FUNCTION public.handle_new_user()';
  END IF;
END $$;

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

-- 3. Registration and tienda policies
DROP POLICY IF EXISTS "Authenticated users can create store" ON tiendas;
CREATE POLICY "Authenticated users can create store" ON tiendas
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view their own tienda" ON tiendas;
CREATE POLICY "Users can view their own tienda" ON tiendas
  FOR SELECT
  USING (
    id = get_my_tienda_id()
    OR owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can manage their own profile" ON usuarios;
CREATE POLICY "Users can manage their own profile" ON usuarios
  USING (auth_uid = auth.uid())
  WITH CHECK (auth_uid = auth.uid());

-- 4. Allow productos sin talla by permitting NULL tallaId
ALTER TABLE public.stock
  ALTER COLUMN "tallaId" DROP NOT NULL;

ALTER TABLE public."historialStock"
  ALTER COLUMN "tallaId" DROP NOT NULL;

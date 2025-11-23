-- 002_functions.sql
-- Consolidated Functions and Triggers

-- 1. Helper Functions

-- Function to get current user's tienda_id (Multi-tenancy)
-- Updated in migration 009 to use JWT metadata for recursion prevention
CREATE OR REPLACE FUNCTION get_my_tienda_id()
RETURNS bigint AS $$
DECLARE
  tienda_id_claim jsonb;
BEGIN
  -- Try to get tienda_id from user_metadata in the JWT
  tienda_id_claim := auth.jwt() -> 'user_metadata' -> 'tienda_id';
  
  -- If found, return it (cast to bigint)
  IF tienda_id_claim IS NOT NULL THEN
    RETURN (tienda_id_claim)::bigint;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_my_tienda_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_tienda_id TO service_role;

-- 2. Auth Sync Function

-- Syncs Supabase Auth users to public.usuarios
-- Updated in migration 011 to handle tienda_id and metadata
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

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Trigger for Auth Sync
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- 3. Timestamp Update Functions

-- Stock Updated At
CREATE OR REPLACE FUNCTION set_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = timezone('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_updated_at
BEFORE UPDATE ON stock
FOR EACH ROW
EXECUTE FUNCTION set_stock_updated_at();

-- Product Reference Image Updated At
CREATE OR REPLACE FUNCTION set_producto_reference_image_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = timezone('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_producto_reference_image_updated_at
BEFORE UPDATE ON producto_reference_images
FOR EACH ROW
EXECUTE FUNCTION set_producto_reference_image_updated_at();

-- Product Embedding Updated At
CREATE OR REPLACE FUNCTION set_producto_embedding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = timezone('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_producto_embedding_updated_at
BEFORE UPDATE ON producto_embeddings
FOR EACH ROW
EXECUTE FUNCTION set_producto_embedding_updated_at();

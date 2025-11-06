-- Sincroniza usuarios de Supabase Auth con la tabla publica "usuarios"
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  metadata JSONB := NEW.raw_user_meta_data;
  nombre TEXT := COALESCE(metadata ->> 'nombre', split_part(NEW.email, '@', 1));
  rol TEXT := COALESCE(metadata ->> 'rol', 'empleado');
BEGIN
  INSERT INTO public.usuarios (id, auth_uid, nombre, email, rol, estado)
  VALUES (NEW.id, NEW.id, nombre, NEW.email, rol, 'activo')
  ON CONFLICT (id) DO UPDATE
    SET auth_uid = EXCLUDED.auth_uid,
        nombre = EXCLUDED.nombre,
        email = EXCLUDED.email,
        rol = EXCLUDED.rol,
        estado = EXCLUDED.estado,
        "updatedAt" = timezone('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sincronizar usuarios existentes en auth.users con la tabla publica
INSERT INTO public.usuarios (id, auth_uid, nombre, email, rol, estado)
SELECT
  u.id,
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'nombre', split_part(u.email, '@', 1)) AS nombre,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'rol', 'empleado') AS rol,
  'activo'
FROM auth.users u
ON CONFLICT (id) DO UPDATE
  SET auth_uid = EXCLUDED.auth_uid,
      nombre = EXCLUDED.nombre,
      email = EXCLUDED.email,
      rol = EXCLUDED.rol,
      estado = EXCLUDED.estado,
      "updatedAt" = timezone('utc', NOW());

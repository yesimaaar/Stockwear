-- Enable the "pg_net" extension if not already enabled (usually standard in Supabase)
-- create extension if not exists "pg_net";

-- 1. Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, auth_uid, email, nombre, rol, estado, created_at)
  VALUES (
    new.id,
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nombre', 'Usuario'),
    COALESCE(new.raw_user_meta_data->>'rol', 'admin'), -- Default to admin if not specified
    'activo',
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Ensure RLS policies are correct for tiendas
-- Drop existing policy if it exists to avoid conflicts (or use IF NOT EXISTS logic if supported for policies, but DROP is safer here)
DROP POLICY IF EXISTS "Authenticated users can create store" ON tiendas;

CREATE POLICY "Authenticated users can create store" ON tiendas
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Ensure RLS policies for usuarios allow users to read/update their own data
DROP POLICY IF EXISTS "Users can manage their own profile" ON usuarios;

CREATE POLICY "Users can manage their own profile" ON usuarios
  USING (auth_uid = auth.uid())
  WITH CHECK (auth_uid = auth.uid());

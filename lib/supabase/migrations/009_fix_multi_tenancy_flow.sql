-- 009_fix_multi_tenancy_flow.sql

-- 1. Fix Infinite Recursion in get_my_tienda_id
-- We use JWT metadata to avoid querying the table that uses this function in its policy.
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

-- 2. Update RLS on 'usuarios' to handle the "Owner with no store" state
-- Users must ALWAYS be able to see their own profile, even if tienda_id is NULL.
DROP POLICY IF EXISTS "Tenant Isolation" ON usuarios;
DROP POLICY IF EXISTS "Users can view their own tienda users" ON usuarios;
DROP POLICY IF EXISTS "Users can view own profile" ON usuarios;
DROP POLICY IF EXISTS "Users can view store members" ON usuarios;
DROP POLICY IF EXISTS "Users can update own profile" ON usuarios;
DROP POLICY IF EXISTS "Users can insert own profile" ON usuarios;

-- Policy 1: Users can always view their own profile (Critical for login/onboarding)
CREATE POLICY "Users can view own profile" ON usuarios
FOR SELECT
USING (auth_uid = auth.uid());

-- Policy 2: Users can view other users in their store (using the JWT claim)
CREATE POLICY "Users can view store members" ON usuarios
FOR SELECT
USING (
  tienda_id IS NOT NULL 
  AND tienda_id = get_my_tienda_id()
);

-- Policy 3: Users can update their own profile (e.g. to set tienda_id after store creation)
CREATE POLICY "Users can update own profile" ON usuarios
FOR UPDATE
USING (auth_uid = auth.uid());

-- Policy 4: Users can insert their own profile (Required for registration)
CREATE POLICY "Users can insert own profile" ON usuarios
FOR INSERT
WITH CHECK (auth_uid = auth.uid());

-- 3. Allow Store Creation
-- Authenticated users (Owners) need to be able to create a store.
DROP POLICY IF EXISTS "Users can create stores" ON tiendas;
CREATE POLICY "Users can create stores" ON tiendas
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Ensure tienda_id is nullable in usuarios (it should be, but just in case)
ALTER TABLE usuarios ALTER COLUMN tienda_id DROP NOT NULL;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_my_tienda_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_tienda_id TO service_role;

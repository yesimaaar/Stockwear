-- Fix for Infinite Recursion in RLS Policies
-- The previous implementation of get_my_tienda_id() queried the 'usuarios' table,
-- which itself has an RLS policy that calls get_my_tienda_id(), causing infinite recursion.

-- 1. Update get_my_tienda_id to use JWT metadata
-- This avoids querying the table directly.
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

  -- Fallback: If not in metadata, we MUST query the table but we need to bypass RLS
  -- to avoid recursion. However, standard SQL functions can't easily "bypass RLS" 
  -- for just one query unless they are SECURITY DEFINER and the owner has bypassrls.
  -- A safer fallback for now is to return NULL if not in metadata, 
  -- forcing the user to re-login or update their profile to get the claim.
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the policy on 'usuarios' to be non-recursive
-- We split the policy: one for viewing self (always allowed), one for viewing others in same store.

DROP POLICY IF EXISTS "Tenant Isolation" ON usuarios;
DROP POLICY IF EXISTS "Users can view their own tienda users" ON usuarios;

-- Policy 1: Users can always view their own profile
CREATE POLICY "Users can view own profile" ON usuarios
FOR SELECT
USING (auth_uid = auth.uid());

-- Policy 2: Users can view other users in their store (using the JWT claim)
CREATE POLICY "Users can view store members" ON usuarios
FOR SELECT
USING (tienda_id = get_my_tienda_id());

-- 3. Ensure other tables use the updated function (no changes needed if function name is same)
-- The existing "Tenant Isolation" policies on other tables will now use the new non-recursive function.

-- 4. Grant execute permissions just in case
GRANT EXECUTE ON FUNCTION get_my_tienda_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_tienda_id TO service_role;

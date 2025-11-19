-- 1. Add owner_id column to tiendas
ALTER TABLE tiendas ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- 2. Update existing stores to have an owner (optional, but good for consistency)
-- We can't easily guess the owner for existing stores without more logic, 
-- but for new stores it will be set.

-- 3. Update the INSERT policy to include owner_id check (optional but good practice)
-- Actually, we just need to allow authenticated users to insert, which we already did.
-- But we should ensure they set themselves as owner if they provide it.

-- 4. Update the SELECT policy to allow users to view stores they own
DROP POLICY IF EXISTS "Users can view their own tienda" ON tiendas;

CREATE POLICY "Users can view their own tienda" ON tiendas
  FOR SELECT USING (
    id = get_my_tienda_id() -- Existing logic: users in the store
    OR
    owner_id = auth.uid()   -- New logic: owner of the store
  );

-- 5. Update the INSERT policy to strictly enforce owner_id = auth.uid() if provided?
-- For now, just keeping the simple "authenticated" check is fine, 
-- but let's make sure the client sends the owner_id.

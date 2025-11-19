-- Allow authenticated users to create a store
CREATE POLICY "Authenticated users can create store" ON tiendas
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to manage their own profile (view/update) regardless of tenant
-- This ensures they can update their tienda_id after creating the store
CREATE POLICY "Users can manage their own profile" ON usuarios
  USING (auth_uid = auth.uid())
  WITH CHECK (auth_uid = auth.uid());

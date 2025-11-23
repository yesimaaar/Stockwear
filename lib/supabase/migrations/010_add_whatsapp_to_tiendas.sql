-- Add whatsapp column to tiendas table
ALTER TABLE tiendas ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Update RLS policies if necessary (existing policies should cover update if user owns the store)
-- "Users can view their own tienda" policy already exists.
-- We might need an UPDATE policy if it doesn't exist implicitly or explicitly.
-- Let's check if there's a policy for updating tiendas.
-- Usually "Users can view their own tienda" is for SELECT.
-- We need to ensure users can UPDATE their own tienda.

CREATE POLICY "Users can update their own tienda" ON tiendas
  FOR UPDATE USING (id = get_my_tienda_id())
  WITH CHECK (id = get_my_tienda_id());

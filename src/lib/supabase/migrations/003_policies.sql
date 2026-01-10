-- 003_policies.sql
-- Consolidated RLS Policies for Stockwear
-- Updated: 2025-01-10

-- ============================================================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE tiendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE tallas ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE "historialStock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ventasDetalle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_reference_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonos ENABLE ROW LEVEL SECURITY;
ALTER TABLE metodos_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE caja_sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_recognition_feedback ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. TIENDAS POLICIES
-- ============================================================================

-- Users can view their own tienda (or if they are the owner)
DROP POLICY IF EXISTS "Users can view their own tienda" ON tiendas;
CREATE POLICY "Users can view their own tienda" ON tiendas
  FOR SELECT
  USING (
    id = get_my_tienda_id()
    OR owner_id = auth.uid()
  );

-- Public can view tienda by slug (for public catalog)
DROP POLICY IF EXISTS "Public can view tienda by slug" ON tiendas;
CREATE POLICY "Public can view tienda by slug" ON tiendas
  FOR SELECT
  USING (slug IS NOT NULL);

-- Authenticated users can create store
DROP POLICY IF EXISTS "Authenticated users can create store" ON tiendas;
CREATE POLICY "Authenticated users can create store" ON tiendas
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own tienda
DROP POLICY IF EXISTS "Users can update their own tienda" ON tiendas;
CREATE POLICY "Users can update their own tienda" ON tiendas
  FOR UPDATE USING (id = get_my_tienda_id())
  WITH CHECK (id = get_my_tienda_id());

-- ============================================================================
-- 3. USUARIOS POLICIES
-- ============================================================================

-- Users can view own profile
DROP POLICY IF EXISTS "Users can view own profile" ON usuarios;
CREATE POLICY "Users can view own profile" ON usuarios
  FOR SELECT
  USING (auth_uid = auth.uid());

-- Users can view store members
DROP POLICY IF EXISTS "Users can view store members" ON usuarios;
CREATE POLICY "Users can view store members" ON usuarios
  FOR SELECT
  USING (
    tienda_id IS NOT NULL 
    AND tienda_id = get_my_tienda_id()
  );

-- Users can update own profile
DROP POLICY IF EXISTS "Users can update own profile" ON usuarios;
CREATE POLICY "Users can update own profile" ON usuarios
  FOR UPDATE
  USING (auth_uid = auth.uid());

-- Users can insert own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON usuarios;
CREATE POLICY "Users can insert own profile" ON usuarios
  FOR INSERT
  WITH CHECK (auth_uid = auth.uid());

-- ============================================================================
-- 4. TENANT ISOLATION POLICIES (GENERIC)
-- ============================================================================

-- Applies to: productos, categorias, tallas, almacenes, stock, ventas, 
--             consultas, producto_reference_images, clientes, abonos
DO $$
DECLARE
  t text;
BEGIN
  -- Standard tables with tienda_id
  FOR t IN 
    SELECT unnest(ARRAY[
      'productos', 
      'categorias', 
      'tallas', 
      'almacenes', 
      'stock', 
      'ventas', 
      'consultas', 
      'producto_reference_images', 
      'clientes', 
      'abonos'
    ])
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "Tenant Isolation" ON %I;
      CREATE POLICY "Tenant Isolation" ON %I
      USING (tienda_id = get_my_tienda_id())
      WITH CHECK (tienda_id = get_my_tienda_id());
    ', t, t);
  END LOOP;
  
  -- Quoted tables (camelCase names)
  EXECUTE 'DROP POLICY IF EXISTS "Tenant Isolation" ON "historialStock"';
  EXECUTE 'CREATE POLICY "Tenant Isolation" ON "historialStock" USING (tienda_id = get_my_tienda_id()) WITH CHECK (tienda_id = get_my_tienda_id())';
  
  EXECUTE 'DROP POLICY IF EXISTS "Tenant Isolation" ON "ventasDetalle"';
  EXECUTE 'CREATE POLICY "Tenant Isolation" ON "ventasDetalle" USING (tienda_id = get_my_tienda_id()) WITH CHECK (tienda_id = get_my_tienda_id())';
END $$;

-- ============================================================================
-- 5. PRODUCTO EMBEDDINGS POLICIES
-- ============================================================================

-- Authenticated users can read
DROP POLICY IF EXISTS "producto_embeddings_select_authenticated" ON producto_embeddings;
CREATE POLICY "producto_embeddings_select_authenticated" ON producto_embeddings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admins can insert
DROP POLICY IF EXISTS "producto_embeddings_insert_admin" ON producto_embeddings;
CREATE POLICY "producto_embeddings_insert_admin" ON producto_embeddings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM usuarios u
      WHERE u.auth_uid = auth.uid()
        AND u.rol = 'admin'
    )
  );

-- Admins can update
DROP POLICY IF EXISTS "producto_embeddings_update_admin" ON producto_embeddings;
CREATE POLICY "producto_embeddings_update_admin" ON producto_embeddings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM usuarios u
      WHERE u.auth_uid = auth.uid()
        AND u.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM usuarios u
      WHERE u.auth_uid = auth.uid()
        AND u.rol = 'admin'
    )
  );

-- Admins can delete
DROP POLICY IF EXISTS "producto_embeddings_delete_admin" ON producto_embeddings;
CREATE POLICY "producto_embeddings_delete_admin" ON producto_embeddings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM usuarios u
      WHERE u.auth_uid = auth.uid()
        AND u.rol = 'admin'
    )
  );

-- Allow inserting embeddings for user feedback
DROP POLICY IF EXISTS "producto_embeddings_insert_feedback" ON producto_embeddings;
CREATE POLICY "producto_embeddings_insert_feedback" ON producto_embeddings
  FOR INSERT
  WITH CHECK (fuente = 'user_feedback');

-- ============================================================================
-- 6. METODOS DE PAGO POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Tenant Isolation" ON metodos_pago;
CREATE POLICY "Tenant Isolation" ON metodos_pago
  USING (tienda_id = get_my_tienda_id())
  WITH CHECK (tienda_id = get_my_tienda_id());

-- ============================================================================
-- 7. CAJA SESIONES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Tenant Isolation" ON caja_sesiones;
CREATE POLICY "Tenant Isolation" ON caja_sesiones
  USING (tienda_id = get_my_tienda_id())
  WITH CHECK (tienda_id = get_my_tienda_id());

-- ============================================================================
-- 8. GASTOS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Tenant Isolation" ON gastos;
CREATE POLICY "Tenant Isolation" ON gastos
  USING (tienda_id = get_my_tienda_id())
  WITH CHECK (tienda_id = get_my_tienda_id());

-- ============================================================================
-- 9. PAGOS GASTOS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Tenant Isolation" ON pagos_gastos;
CREATE POLICY "Tenant Isolation" ON pagos_gastos
  USING (tienda_id = get_my_tienda_id())
  WITH CHECK (tienda_id = get_my_tienda_id());

-- ============================================================================
-- 10. SEARCH FEEDBACK POLICIES
-- ============================================================================

-- search_feedback uses user_id (references auth.users), not tienda_id
DROP POLICY IF EXISTS "Users can view own search feedback" ON search_feedback;
CREATE POLICY "Users can view own search feedback" ON search_feedback
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own search feedback" ON search_feedback;
CREATE POLICY "Users can insert own search feedback" ON search_feedback
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own search feedback" ON search_feedback;
CREATE POLICY "Users can delete own search feedback" ON search_feedback
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- 11. VISUAL RECOGNITION FEEDBACK POLICIES
-- ============================================================================

-- Users can view feedback from their store
DROP POLICY IF EXISTS "Users can view feedback from their store" ON visual_recognition_feedback;
CREATE POLICY "Users can view feedback from their store" ON visual_recognition_feedback
  FOR SELECT
  USING (
    tienda_id IN (
      SELECT tienda_id FROM usuarios WHERE auth_uid = auth.uid()
    )
  );

-- Users can insert feedback for their store
DROP POLICY IF EXISTS "Users can insert feedback for their store" ON visual_recognition_feedback;
CREATE POLICY "Users can insert feedback for their store" ON visual_recognition_feedback
  FOR INSERT
  WITH CHECK (
    tienda_id IN (
      SELECT tienda_id FROM usuarios WHERE auth_uid = auth.uid()
    )
  );

-- Admins can view all feedback
DROP POLICY IF EXISTS "Admins can view all feedback" ON visual_recognition_feedback;
CREATE POLICY "Admins can view all feedback" ON visual_recognition_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE auth_uid = auth.uid() 
      AND rol IN ('admin', 'super_admin')
    )
  );

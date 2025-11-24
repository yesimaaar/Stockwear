-- 003_policies.sql
-- Consolidated RLS Policies

-- 1. Enable RLS on all tables
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
ALTER TABLE "public"."gastos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pagos_gastos" ENABLE ROW LEVEL SECURITY;

-- 2. Policies

-- Tiendas
-- Users can view their own tienda (or if they are the owner)
CREATE POLICY "Users can view their own tienda" ON tiendas
  FOR SELECT
  USING (
    id = get_my_tienda_id()
    OR owner_id = auth.uid()
  );

-- Authenticated users can create store
CREATE POLICY "Authenticated users can create store" ON tiendas
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own tienda
CREATE POLICY "Users can update their own tienda" ON tiendas
  FOR UPDATE USING (id = get_my_tienda_id())
  WITH CHECK (id = get_my_tienda_id());

-- Usuarios
-- Users can view own profile
CREATE POLICY "Users can view own profile" ON usuarios
FOR SELECT
USING (auth_uid = auth.uid());

-- Users can view store members
CREATE POLICY "Users can view store members" ON usuarios
FOR SELECT
USING (
  tienda_id IS NOT NULL 
  AND tienda_id = get_my_tienda_id()
);

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON usuarios
FOR UPDATE
USING (auth_uid = auth.uid());

-- Users can insert own profile
CREATE POLICY "Users can insert own profile" ON usuarios
FOR INSERT
WITH CHECK (auth_uid = auth.uid());

-- Tenant Isolation Policies (Generic)
-- Applies to: productos, categorias, tallas, almacenes, stock, ventas, consultas, producto_reference_images, historialStock, ventasDetalle, clientes, abonos

DO $$
DECLARE
  t text;
BEGIN
  -- Standard tables
  FOR t IN 
    SELECT unnest(ARRAY['productos', 'categorias', 'tallas', 'almacenes', 'stock', 'ventas', 'consultas', 'producto_reference_images', 'clientes', 'abonos'])
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "Tenant Isolation" ON %I;
      CREATE POLICY "Tenant Isolation" ON %I
      USING (tienda_id = get_my_tienda_id())
      WITH CHECK (tienda_id = get_my_tienda_id());
    ', t, t);
  END LOOP;
  
  -- Quoted tables
  EXECUTE 'DROP POLICY IF EXISTS "Tenant Isolation" ON "historialStock"';
  EXECUTE 'CREATE POLICY "Tenant Isolation" ON "historialStock" USING (tienda_id = get_my_tienda_id()) WITH CHECK (tienda_id = get_my_tienda_id())';
  
  EXECUTE 'DROP POLICY IF EXISTS "Tenant Isolation" ON "ventasDetalle"';
  EXECUTE 'CREATE POLICY "Tenant Isolation" ON "ventasDetalle" USING (tienda_id = get_my_tienda_id()) WITH CHECK (tienda_id = get_my_tienda_id())';

END $$;

-- Producto Embeddings (Admin only write, Authenticated read)
-- Note: These do not have tienda_id, so they are global or managed differently.
-- Assuming they follow the pattern from 003.

CREATE POLICY "producto_embeddings_select_authenticated" ON producto_embeddings
	FOR SELECT
	USING (auth.uid() IS NOT NULL);

CREATE POLICY "producto_embeddings_insert_admin" ON producto_embeddings
	FOR INSERT
	WITH CHECK (
		exists (
			SELECT 1
			FROM usuarios u
			WHERE u.id = auth.uid()
				AND u.rol = 'admin'
		)
	);

CREATE POLICY "producto_embeddings_update_admin" ON producto_embeddings
	FOR UPDATE
	USING (
		exists (
			SELECT 1
			FROM usuarios u
			WHERE u.id = auth.uid()
				AND u.rol = 'admin'
		)
	)
	WITH CHECK (
		exists (
			SELECT 1
			FROM usuarios u
			WHERE u.id = auth.uid()
				AND u.rol = 'admin'
		)
	);

CREATE POLICY "producto_embeddings_delete_admin" ON producto_embeddings
	FOR DELETE
	USING (
		exists (
			SELECT 1
			FROM usuarios u
			WHERE u.id = auth.uid()
				AND u.rol = 'admin'
		)
	);

-- Consolidated Policies from 017

-- Metodos de Pago
CREATE POLICY "Tenant Isolation" ON metodos_pago
  USING (tienda_id = get_my_tienda_id())
  WITH CHECK (tienda_id = get_my_tienda_id());

-- Caja Sesiones
CREATE POLICY "Tenant Isolation" ON caja_sesiones
  USING (tienda_id = get_my_tienda_id())
  WITH CHECK (tienda_id = get_my_tienda_id());

-- Gastos
CREATE POLICY "Enable read access for all users" ON "public"."gastos"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert access for all users" ON "public"."gastos"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON "public"."gastos"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (true);

-- Pagos Gastos
CREATE POLICY "Enable read access for all users" ON "public"."pagos_gastos"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert access for all users" ON "public"."pagos_gastos"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (true);

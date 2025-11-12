-- Habilitar Row Level Security en el nuevo esquema
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

-- Eliminar políticas existentes para usuarios
DROP POLICY IF EXISTS "usuarios_select_authenticated" ON usuarios;
DROP POLICY IF EXISTS "usuarios_insert_self" ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_self" ON usuarios;

-- Eliminar políticas existentes para catálogos
DROP POLICY IF EXISTS "categorias_select_authenticated" ON categorias;
DROP POLICY IF EXISTS "categorias_write_authenticated" ON categorias;
DROP POLICY IF EXISTS "tallas_select_authenticated" ON tallas;
DROP POLICY IF EXISTS "tallas_write_authenticated" ON tallas;
DROP POLICY IF EXISTS "almacenes_select_authenticated" ON almacenes;
DROP POLICY IF EXISTS "almacenes_write_authenticated" ON almacenes;

-- Eliminar políticas existentes para productos y stock
DROP POLICY IF EXISTS "productos_select_authenticated" ON productos;
DROP POLICY IF EXISTS "productos_write_authenticated" ON productos;
DROP POLICY IF EXISTS "stock_select_authenticated" ON stock;
DROP POLICY IF EXISTS "stock_write_authenticated" ON stock;

-- Eliminar políticas existentes para historial y consultas
DROP POLICY IF EXISTS "historial_select_authenticated" ON "historialStock";
DROP POLICY IF EXISTS "historial_insert_authenticated" ON "historialStock";
DROP POLICY IF EXISTS "consultas_select_authenticated" ON consultas;
DROP POLICY IF EXISTS "consultas_insert_authenticated" ON consultas;
DROP POLICY IF EXISTS "ventas_select_authenticated" ON ventas;
DROP POLICY IF EXISTS "ventas_write_authenticated" ON ventas;
DROP POLICY IF EXISTS "ventas_detalle_select_authenticated" ON "ventasDetalle";
DROP POLICY IF EXISTS "ventas_detalle_write_authenticated" ON "ventasDetalle";
DROP POLICY IF EXISTS "producto_reference_images_select_authenticated" ON producto_reference_images;
DROP POLICY IF EXISTS "producto_reference_images_insert_admin" ON producto_reference_images;
DROP POLICY IF EXISTS "producto_reference_images_update_admin" ON producto_reference_images;
DROP POLICY IF EXISTS "producto_reference_images_delete_admin" ON producto_reference_images;
DROP POLICY IF EXISTS "producto_embeddings_select_authenticated" ON producto_embeddings;
DROP POLICY IF EXISTS "producto_embeddings_insert_admin" ON producto_embeddings;
DROP POLICY IF EXISTS "producto_embeddings_update_admin" ON producto_embeddings;
DROP POLICY IF EXISTS "producto_embeddings_delete_admin" ON producto_embeddings;

-- Crear nuevas políticas para usuarios
CREATE POLICY "usuarios_select_authenticated" ON usuarios
	FOR SELECT
	USING (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

CREATE POLICY "usuarios_insert_self" ON usuarios
	FOR INSERT
	WITH CHECK (
		auth.role() = 'service_role'
		OR auth.uid() IS NOT NULL AND (
			auth.uid()::uuid = id
			OR auth.uid()::uuid = COALESCE(auth_uid, id)
		)
	);

CREATE POLICY "usuarios_update_self" ON usuarios
	FOR UPDATE
	USING (
		auth.role() = 'service_role'
		OR auth.uid() IS NOT NULL AND auth.uid()::uuid = COALESCE(auth_uid, id)
	)
	WITH CHECK (
		auth.role() = 'service_role'
		OR auth.uid() IS NOT NULL AND auth.uid()::uuid = COALESCE(auth_uid, id)
	);

-- Catálogos compartidos: lectura para autenticados, escritura para autenticados
CREATE POLICY "categorias_select_authenticated" ON categorias FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "categorias_write_authenticated" ON categorias FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tallas_select_authenticated" ON tallas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "tallas_write_authenticated" ON tallas FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "almacenes_select_authenticated" ON almacenes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "almacenes_write_authenticated" ON almacenes FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Productos y stock
CREATE POLICY "productos_select_authenticated" ON productos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "productos_write_authenticated" ON productos FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "stock_select_authenticated" ON stock FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "stock_write_authenticated" ON stock FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Historial y consultas
CREATE POLICY "historial_select_authenticated" ON "historialStock" FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "historial_insert_authenticated" ON "historialStock" FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "consultas_select_authenticated" ON consultas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "consultas_insert_authenticated" ON consultas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "ventas_select_authenticated" ON ventas
	FOR SELECT
	USING (auth.uid() IS NOT NULL);

CREATE POLICY "ventas_write_authenticated" ON ventas
	FOR ALL
	USING (auth.uid() IS NOT NULL)
	WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "ventas_detalle_select_authenticated" ON "ventasDetalle"
	FOR SELECT
	USING (auth.uid() IS NOT NULL);

CREATE POLICY "ventas_detalle_write_authenticated" ON "ventasDetalle"
	FOR ALL
	USING (auth.uid() IS NOT NULL)
	WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "producto_reference_images_select_authenticated" ON producto_reference_images
	FOR SELECT
	USING (auth.uid() IS NOT NULL);

CREATE POLICY "producto_reference_images_insert_admin" ON producto_reference_images
	FOR INSERT
	WITH CHECK (
		exists (
			SELECT 1
			FROM usuarios u
			WHERE u.id = auth.uid()
				AND u.rol = 'admin'
		)
	);

CREATE POLICY "producto_reference_images_update_admin" ON producto_reference_images
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

CREATE POLICY "producto_reference_images_delete_admin" ON producto_reference_images
	FOR DELETE
	USING (
		exists (
			SELECT 1
			FROM usuarios u
			WHERE u.id = auth.uid()
				AND u.rol = 'admin'
		)
	);

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
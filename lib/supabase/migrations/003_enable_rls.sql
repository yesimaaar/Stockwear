-- Habilitar Row Level Security en todas las tablas
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Políticas para categorías (lectura pública, escritura autenticada)
CREATE POLICY "categories_select_all" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_insert_authenticated" ON categories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "categories_update_authenticated" ON categories FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "categories_delete_authenticated" ON categories FOR DELETE USING (auth.uid() IS NOT NULL);

-- Políticas para productos (lectura pública, escritura autenticada)
CREATE POLICY "products_select_all" ON products FOR SELECT USING (true);
CREATE POLICY "products_insert_authenticated" ON products FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "products_update_authenticated" ON products FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "products_delete_authenticated" ON products FOR DELETE USING (auth.uid() IS NOT NULL);

-- Políticas para tallas (lectura pública, escritura autenticada)
CREATE POLICY "sizes_select_all" ON sizes FOR SELECT USING (true);
CREATE POLICY "sizes_insert_authenticated" ON sizes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "sizes_update_authenticated" ON sizes FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "sizes_delete_authenticated" ON sizes FOR DELETE USING (auth.uid() IS NOT NULL);

-- Políticas para colores (lectura pública, escritura autenticada)
CREATE POLICY "colors_select_all" ON colors FOR SELECT USING (true);
CREATE POLICY "colors_insert_authenticated" ON colors FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "colors_update_authenticated" ON colors FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "colors_delete_authenticated" ON colors FOR DELETE USING (auth.uid() IS NOT NULL);

-- Políticas para variantes de productos (lectura pública, escritura autenticada)
CREATE POLICY "product_variants_select_all" ON product_variants FOR SELECT USING (true);
CREATE POLICY "product_variants_insert_authenticated" ON product_variants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "product_variants_update_authenticated" ON product_variants FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "product_variants_delete_authenticated" ON product_variants FOR DELETE USING (auth.uid() IS NOT NULL);

-- Políticas para movimientos de inventario (lectura y escritura autenticada)
CREATE POLICY "inventory_movements_select_authenticated" ON inventory_movements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "inventory_movements_insert_authenticated" ON inventory_movements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

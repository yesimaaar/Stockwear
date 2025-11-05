-- Insertar categorías iniciales
INSERT INTO categories (name, description) VALUES
  ('Camisetas', 'Camisetas y polos'),
  ('Pantalones', 'Pantalones y jeans'),
  ('Chaquetas', 'Chaquetas y abrigos'),
  ('Accesorios', 'Accesorios varios')
ON CONFLICT (name) DO NOTHING;

-- Insertar tallas estándar
INSERT INTO sizes (name, sort_order) VALUES
  ('XS', 1),
  ('S', 2),
  ('M', 3),
  ('L', 4),
  ('XL', 5),
  ('XXL', 6)
ON CONFLICT (name) DO NOTHING;

-- Insertar colores básicos
INSERT INTO colors (name, hex_code) VALUES
  ('Negro', '#000000'),
  ('Blanco', '#FFFFFF'),
  ('Gris', '#808080'),
  ('Azul', '#0000FF'),
  ('Rojo', '#FF0000'),
  ('Verde', '#008000'),
  ('Amarillo', '#FFFF00')
ON CONFLICT (name) DO NOTHING;

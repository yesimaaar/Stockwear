-- Catálogos base: categorías, tallas y almacenes
INSERT INTO categorias (nombre, descripcion, estado) VALUES
  ('Calzado Deportivo', 'Zapatos para deporte', 'activo'),
  ('Ropa Deportiva', 'Camisetas, shorts y prendas técnicas', 'activo'),
  ('Accesorios', 'Gorras, medias y otros complementos', 'activo');

INSERT INTO tallas (tipo, nombre, estado) VALUES
  ('numerico', '38', 'activo'),
  ('numerico', '39', 'activo'),
  ('numerico', '40', 'activo'),
  ('numerico', '41', 'activo'),
  ('numerico', '42', 'activo'),
  ('alfanumerico', 'S', 'activo'),
  ('alfanumerico', 'M', 'activo'),
  ('alfanumerico', 'L', 'activo'),
  ('alfanumerico', 'XL', 'activo');

INSERT INTO almacenes (nombre, direccion, tipo, estado) VALUES
  ('Almacén Principal', 'Calle 50 #25-30', 'principal', 'activo'),
  ('Sucursal Centro', 'Carrera 15 #10-20', 'sucursal', 'activo'),
  ('Sucursal Norte', 'Avenida 30 #45-10', 'sucursal', 'activo');

-- Productos iniciales
INSERT INTO productos (codigo, nombre, "categoriaId", precio, descuento, proveedor, imagen, "stockMinimo", estado) VALUES
  ('ZAP-001', 'Nike Air Max 270', 1, 450000, 0, 'Nike Colombia', '/nike-air-max-270.png', 10, 'activo'),
  ('CAM-002', 'Camiseta Adidas Running', 2, 120000, 10, 'Adidas Colombia', '/adidas-running-shirt.jpg', 20, 'activo'),
  ('ZAP-003', 'Puma RS-X', 1, 380000, 15, 'Puma Colombia', '/puma-rs-x-sneakers.jpg', 10, 'activo'),
  ('CAM-004', 'Camiseta Nike Dri-Fit', 2, 95000, 0, 'Nike Colombia', '/nike-dri-fit-shirt.jpg', 15, 'activo'),
  ('ZAP-005', 'Adidas Ultraboost', 1, 520000, 0, 'Adidas Colombia', '/adidas-ultraboost.png', 8, 'activo');

-- Stock inicial por talla y almacén
INSERT INTO stock ("productoId", "tallaId", "almacenId", cantidad)
VALUES
  (1, 1, 1, 15),
  (1, 2, 1, 20),
  (1, 3, 1, 10),
  (1, 1, 2, 8),
  (1, 2, 2, 12),
  (2, 6, 1, 30),
  (2, 7, 1, 45),
  (2, 8, 1, 35),
  (2, 9, 1, 10),
  (3, 2, 1, 5),
  (3, 3, 1, 3),
  (3, 4, 2, 7),
  (4, 6, 1, 25),
  (4, 7, 1, 30),
  (4, 8, 2, 20),
  (5, 3, 1, 12),
  (5, 4, 1, 8),
  (5, 5, 2, 6);

-- Historial base de movimientos de inventario
INSERT INTO "historialStock" (tipo, "productoId", "tallaId", "almacenId", cantidad, "stockAnterior", "stockNuevo", "usuarioId", motivo, "costoUnitario")
VALUES
  ('entrada', 1, 1, 1, 15, 0, 15, NULL, 'Stock inicial', 350000),
  ('venta', 1, 1, 1, 2, 15, 13, NULL, 'Venta en tienda', 350000);

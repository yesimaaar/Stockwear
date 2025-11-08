TRUNCATE TABLE "ventasDetalle", ventas, consultas, "historialStock", stock, productos, almacenes, tallas, categorias
  RESTART IDENTITY CASCADE;

-- Catálogos base: categorías, tallas y almacenes
INSERT INTO categorias (nombre, descripcion, estado) VALUES
  ('Calzado Urbano', 'Sneakers y tenis para uso diario', 'activo'),
  ('Entrenamiento', 'Prendas y calzado diseñados para alto rendimiento', 'activo'),
  ('Accesorios', 'Complementos inteligentes y utilitarios para entrenar', 'activo');

INSERT INTO tallas (tipo, nombre, estado) VALUES
  ('numerico', '37', 'activo'),
  ('numerico', '38', 'activo'),
  ('numerico', '39', 'activo'),
  ('numerico', '40', 'activo'),
  ('numerico', '41', 'activo'),
  ('numerico', '42', 'activo'),
  ('alfanumerico', 'S', 'activo'),
  ('alfanumerico', 'M', 'activo'),
  ('alfanumerico', 'L', 'activo'),
  ('alfanumerico', 'XL', 'activo'),
  ('alfanumerico', 'UNICA', 'activo');

INSERT INTO almacenes (nombre, direccion, tipo, estado) VALUES
  ('Centro Logístico Bogotá', 'Calle 13 #45-22', 'principal', 'activo'),
  ('Express Laureles', 'Circular 74 #39-18', 'sucursal', 'activo'),
  ('Pop-up Usaquén', 'Carrera 6 #118-45', 'sucursal', 'activo');

-- Productos iniciales
INSERT INTO productos (codigo, nombre, descripcion, "categoriaId", precio, descuento, proveedor, imagen, "stockMinimo", estado) VALUES
  ('ZAP-101', 'Air Zoom Next Gen', 'Tenis ligeros con espuma reactiva para entrenamiento diario.', 1, 480000, 0, 'Nike Colombia', '/products/air-zoom-next-gen.jpg', 8, 'activo'),
  ('ZAP-205', 'Future Rider Evo', 'Sneakers retro con amortiguación híbrida y paneles reflectivos.', 1, 420000, 5, 'Puma Colombia', '/products/future-rider-evo.jpg', 6, 'activo'),
  ('CAM-301', 'Performance Tee Volt', 'Camiseta de secado rápido con protección UV integrada.', 2, 135000, 10, 'Adidas Colombia', '/products/performance-tee-volt.jpg', 12, 'activo'),
  ('JAC-410', 'Urban Windbreaker', 'Chaqueta cortaviento plegable con bolsillos ocultos.', 2, 280000, 0, 'New Balance Colombia', '/products/urban-windbreaker.jpg', 6, 'activo'),
  ('ACC-515', 'SmartBand Pulse', 'Banda inteligente con monitoreo de frecuencia cardiaca y GPS.', 3, 190000, 5, 'Garmin Colombia', '/products/smartband-pulse.jpg', 10, 'activo'),
  ('ACC-520', 'Running Cap Vent', 'Gorra ultraligera con paneles de ventilación y cinta absorbente.', 3, 75000, 0, 'Nike Colombia', '/products/running-cap-vent.jpg', 15, 'activo');

-- Stock inicial por talla y almacén
INSERT INTO stock ("productoId", "tallaId", "almacenId", cantidad) VALUES
  (1, 1, 1, 12),
  (1, 2, 1, 18),
  (1, 3, 1, 15),
  (1, 4, 2, 10),
  (1, 5, 2, 8),
  (2, 2, 1, 14),
  (2, 3, 1, 12),
  (2, 4, 2, 9),
  (2, 5, 2, 7),
  (2, 6, 3, 6),
  (3, 7, 1, 28),
  (3, 8, 1, 32),
  (3, 9, 1, 24),
  (3, 10, 2, 18),
  (4, 7, 2, 12),
  (4, 8, 2, 10),
  (4, 9, 3, 8),
  (5, 11, 1, 20),
  (5, 11, 3, 15),
  (6, 11, 2, 25),
  (6, 11, 3, 18);

-- Historial base de movimientos de inventario
INSERT INTO "historialStock" (tipo, "productoId", "tallaId", "almacenId", cantidad, "stockAnterior", "stockNuevo", "usuarioId", motivo, "costoUnitario") VALUES
  ('entrada', 1, 1, 1, 12, 0, 12, NULL, 'Carga inicial Air Zoom talla 37', 395000),
  ('entrada', 1, 2, 1, 18, 0, 18, NULL, 'Carga inicial Air Zoom talla 38', 395000),
  ('entrada', 2, 3, 1, 12, 0, 12, NULL, 'Carga inicial Future Rider talla 39', 340000),
  ('entrada', 3, 7, 1, 28, 0, 28, NULL, 'Carga inicial Performance Tee talla S', 89000),
  ('entrada', 4, 8, 2, 10, 0, 10, NULL, 'Carga inicial Urban Windbreaker talla M', 210000),
  ('entrada', 5, 11, 1, 20, 0, 20, NULL, 'Carga inicial SmartBand Pulse', 150000),
  ('entrada', 6, 11, 2, 25, 0, 25, NULL, 'Carga inicial Running Cap Vent', 52000);

-- Ventas de ejemplo para métricas del dashboard
INSERT INTO ventas (folio, total, "usuarioId", "createdAt") VALUES
  ('VTA-20250115-1001', 1081500, NULL, '2025-01-15T14:30:00Z'),
  ('VTA-20250210-1022', 691500, NULL, '2025-02-10T11:05:00Z'),
  ('VTA-20250303-1044', 658000, NULL, '2025-03-03T16:45:00Z');

INSERT INTO "ventasDetalle" ("ventaId", "productoId", "stockId", cantidad, "precioUnitario", descuento, subtotal) VALUES
  (1, 1, 2, 2, 480000, 0, 960000),
  (1, 3, 12, 1, 135000, 10, 121500),
  (2, 5, 18, 3, 190000, 5, 541500),
  (2, 6, 20, 2, 75000, 0, 150000),
  (3, 2, 7, 1, 420000, 0, 420000),
  (3, 4, 16, 1, 280000, 15, 238000);

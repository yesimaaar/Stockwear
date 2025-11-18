-- Trunca información de negocio preservando usuarios y credenciales de inicio de sesión
TRUNCATE TABLE producto_embeddings, producto_reference_images, "ventasDetalle", ventas, consultas, "historialStock", stock, productos, almacenes, tallas, categorias
  RESTART IDENTITY CASCADE;

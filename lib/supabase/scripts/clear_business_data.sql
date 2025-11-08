-- Trunca información de negocio preservando usuarios y credenciales de inicio de sesión
TRUNCATE TABLE "ventasDetalle", ventas, consultas, "historialStock", stock, productos, almacenes, tallas, categorias
  RESTART IDENTITY CASCADE;

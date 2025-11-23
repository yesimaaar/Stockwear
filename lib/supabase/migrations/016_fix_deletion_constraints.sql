-- 016_fix_deletion_constraints.sql
-- Fix foreign key constraints to allow user deletion

-- 1. Update 'abonos' table
-- Drop existing constraint if it exists (name might vary, so we try to drop by standard naming or just alter)
-- Standard naming in Supabase usually follows table_column_fkey
ALTER TABLE abonos
DROP CONSTRAINT IF EXISTS abonos_usuario_id_fkey;

ALTER TABLE abonos
ADD CONSTRAINT abonos_usuario_id_fkey
FOREIGN KEY (usuario_id)
REFERENCES auth.users(id)
ON DELETE SET NULL;

-- 2. Update 'historialStock' table
ALTER TABLE "historialStock"
DROP CONSTRAINT IF EXISTS "historialStock_usuarioId_fkey";

ALTER TABLE "historialStock"
ADD CONSTRAINT "historialStock_usuarioId_fkey"
FOREIGN KEY ("usuarioId")
REFERENCES usuarios(id)
ON DELETE SET NULL;

-- 3. Update 'consultas' table
ALTER TABLE consultas
DROP CONSTRAINT IF EXISTS "consultas_empleadoId_fkey";

ALTER TABLE consultas
ADD CONSTRAINT "consultas_empleadoId_fkey"
FOREIGN KEY ("empleadoId")
REFERENCES usuarios(id)
ON DELETE SET NULL;

-- 4. Update 'public.usuarios' table to cascade delete from auth.users
-- Currently 'id' is just a primary key, we need to make sure it references auth.users
-- It likely doesn't have a formal FK constraint to auth.users in the schema definition provided,
-- or it might be implicit. Let's add/update it to be sure.

-- Check if constraint exists (we can't easily check in SQL script without dynamic SQL, so we drop if exists)
ALTER TABLE usuarios
DROP CONSTRAINT IF EXISTS usuarios_id_fkey;

-- Note: In the original schema, 'id' is UUID PRIMARY KEY.
-- We want to enforce that it references auth.users(id) and cascades.
ALTER TABLE usuarios
ADD CONSTRAINT usuarios_id_fkey
FOREIGN KEY (id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 5. Update 'ventas' table (usuarioId)
-- Just in case, though usually sales might want to keep the user record.
-- But if the user is gone, we should probably SET NULL too.
ALTER TABLE ventas
DROP CONSTRAINT IF EXISTS "ventas_usuarioId_fkey";

ALTER TABLE ventas
ADD CONSTRAINT "ventas_usuarioId_fkey"
FOREIGN KEY ("usuarioId")
REFERENCES usuarios(id)
ON DELETE SET NULL;

-- 6. Update 'tiendas' table (owner_id)
-- This prevents blocking deletion if the user is a store owner.
ALTER TABLE tiendas
DROP CONSTRAINT IF EXISTS tiendas_owner_id_fkey;

ALTER TABLE tiendas
ADD CONSTRAINT tiendas_owner_id_fkey
FOREIGN KEY (owner_id)
REFERENCES auth.users(id)
ON DELETE SET NULL;

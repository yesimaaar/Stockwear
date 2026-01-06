-- Migration: Add descripcion column to ventas table
-- This allows "Venta Libre" (Free Sales) to have a custom description without appearing in inventory
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS descripcion TEXT;

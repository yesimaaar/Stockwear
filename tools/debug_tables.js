const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ubzabtbearqsbprabqce.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViemFidGJlYXJxc2JwcmFicWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTk1MjIsImV4cCI6MjA3NzkzNTUyMn0.y1fs4e4HfW5UkRy4p8CudP0RitYvGU32kXoNFle3rJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking 'ventas_detalle'...");
  const { data: d1, error: e1 } = await supabase.from('ventas_detalle').select('*').limit(1);
  if (e1) console.log("ventas_detalle error:", e1.message);
  else console.log("ventas_detalle exists, row count:", d1.length, d1[0]);

  console.log("Checking 'ventasDetalle'...");
  const { data: d2, error: e2 } = await supabase.from('ventasDetalle').select('*').limit(1);
  if (e2) console.log("ventasDetalle error:", e2.message);
  else console.log("ventasDetalle exists, row count:", d2.length, d2[0]);

  console.log("Checking 'productos' columns...");
  const { data: d3, error: e3 } = await supabase.from('productos').select('id, precio_base').limit(1);
  if (e3) console.log("productos error:", e3.message);
  else console.log("productos sample:", d3);
}

main();
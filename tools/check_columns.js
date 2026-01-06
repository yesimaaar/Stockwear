const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ubzabtbearqsbprabqce.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViemFidGJlYXJxc2JwcmFicWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTk1MjIsImV4cCI6MjA3NzkzNTUyMn0.y1fs4e4HfW5UkRy4p8CudP0RitYvGU32kXoNFle3rJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Try to insert a dummy venta with 'notas' to see if it fails.
  // Actually, better to query information_schema via rpc if available, but usually not exposed to anon.
  // We will try to SELECT 'nota' from ventas.
  
  const { data, error } = await supabase
    .from('ventas')
    .select('id, nota')
    .limit(1);

  if (error) {
    console.log("Column 'nota' likely does not exist:", error.message);
    
    const { data: data2, error: error2 } = await supabase
        .from('ventas')
        .select('id, descripcion')
        .limit(1);
        
     if (error2) {
         console.log("Column 'descripcion' likely does not exist:", error2.message);
     } else {
         console.log("Column 'descripcion' EXISTS!");
     }

  } else {
    console.log("Column 'nota' EXISTS!");
  }
}

main();

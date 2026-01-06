const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ubzabtbearqsbprabqce.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViemFidGJlYXJxc2JwcmFicWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTk1MjIsImV4cCI6MjA3NzkzNTUyMn0.y1fs4e4HfW5UkRy4p8CudP0RitYvGU32kXoNFle3rJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('ventasDetalle')
    .select('id, nota')
    .limit(1);

  if (error) {
    console.log("Column 'nota' likely does not exist in detail:", error.message);
    
    const { data: data2, error: error2 } = await supabase
        .from('ventasDetalle')
        .select('id, descripcion')
        .limit(1);
        
     if (error2) {
         console.log("Column 'descripcion' likely does not exist in detail:", error2.message);
     } else {
         console.log("Column 'descripcion' EXISTS in detail!");
     }

  } else {
    console.log("Column 'nota' EXISTS in detail!");
  }
}

main();

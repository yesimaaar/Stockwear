const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ubzabtbearqsbprabqce.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViemFidGJlYXJxc2JwcmFicWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTk1MjIsImV4cCI6MjA3NzkzNTUyMn0.y1fs4e4HfW5UkRy4p8CudP0RitYvGU32kXoNFle3rJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking historialStock for Venta libre patterns...");
  
  const { data, error } = await supabase
    .from('historialStock')
    .select('motivo')
    .ilike('motivo', 'Venta libre:%')
    .limit(10);

  if (error) {
    console.error("Error fetching history:", error);
  } else {
    if (data.length > 0) {
      console.log("Sample Motivo:", data[0].motivo);
    } else {
      console.log("No Venta libre history found.");
    }
  }
}

main();

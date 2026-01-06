const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ubzabtbearqsbprabqce.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViemFidGJlYXJxc2JwcmFicWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTk1MjIsImV4cCI6MjA3NzkzNTUyMn0.y1fs4e4HfW5UkRy4p8CudP0RitYvGU32kXoNFle3rJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching one sale...");
  const { data, error } = await supabase
    .from('ventas')
    .select('*')
    .order('createdAt', { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Venta:", JSON.stringify(data[0], null, 2));
  }
}

main();
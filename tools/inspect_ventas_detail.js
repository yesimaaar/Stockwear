const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ubzabtbearqsbprabqce.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViemFidGJlYXJxc2JwcmFicWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTk1MjIsImV4cCI6MjA3NzkzNTUyMn0.y1fs4e4HfW5UkRy4p8CudP0RitYvGU32kXoNFle3rJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching latest venta details...");
  // Get 5 latest details
  const { data, error } = await supabase
    .from('ventasDetalle')
    .select('*')
    .order('id', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Found", data.length, "rows.");
    if (data.length > 0) {
      console.log("Keys in first row:", Object.keys(data[0]));
      console.log("First row data:", JSON.stringify(data[0], null, 2));
    }
  }
}

main();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ubzabtbearqsbprabqce.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViemFidGJlYXJxc2JwcmFicWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTk1MjIsImV4cCI6MjA3NzkzNTUyMn0.y1fs4e4HfW5UkRy4p8CudP0RitYvGU32kXoNFle3rJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching latest sales to check columns...");
  const { data, error } = await supabase
    .from('ventas')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error:", error);
  } else {
    if (data.length > 0) {
      console.log("Keys in 'ventas':", Object.keys(data[0]));
    } else {
        console.log("No sales found, cannot infer columns.");
    }
  }
}

main();

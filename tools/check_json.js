const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ubzabtbearqsbprabqce.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViemFidGJlYXJxc2JwcmFicWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTk1MjIsImV4cCI6MjA3NzkzNTUyMn0.y1fs4e4HfW5UkRy4p8CudP0RitYvGU32kXoNFle3rJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('ventas')
    .select('id, metadata, info, extra, details')
    .limit(1);

  if (error) {
    console.log("Error checking json columns:", error.message);
  } else {
    // If we get here, one of them might exist, but likely it selects id and ignores others if using PostgREST loose selection? 
    // No, Supabase/PostgREST errors if column doesn't exist.
    // So if this matches, ALL exist. Unlikely.
    console.log("Success?", data);
  }
}

main();

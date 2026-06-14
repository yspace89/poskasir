import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gvzcmsgeldxcbrmcambn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2emNtc2dlbGR4Y2JybWNhbWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMTE3NzYsImV4cCI6MjA5Njg4Nzc3Nn0.-EhhxP_oMSpmZuLVk1Xo2dLymY066F7YmMBi-K9Rjoc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Starting migration...');
  
  // 1. Get the store named like "Januari"
  const { data: stores, error: storeErr } = await supabase
    .from('stores')
    .select('id, name')
    .ilike('name', '%Januari%')
    .limit(1);

  if (storeErr) {
    console.error('Error fetching stores:', storeErr);
    return;
  }

  if (!stores || stores.length === 0) {
    console.log('Toko "Januari" not found. Looking for any available store...');
    const { data: anyStore } = await supabase.from('stores').select('id, name').limit(1);
    if (!anyStore || anyStore.length === 0) {
      console.log('No stores found at all.');
      return;
    }
    stores.push(anyStore[0]);
  }

  const targetStoreId = stores[0].id;
  console.log(`Target Store: ${stores[0].name} (${targetStoreId})`);

  // 2. Update products where store_id is null
  const { data: productsToUpdate, error: queryErr } = await supabase
    .from('products')
    .select('id, name')
    .is('store_id', null);

  if (queryErr) {
    console.error('Error querying products:', queryErr);
    return;
  }

  if (!productsToUpdate || productsToUpdate.length === 0) {
    console.log('No products with store_id = null found. Already migrated.');
    return;
  }

  console.log(`Found ${productsToUpdate.length} products to update...`);

  // Update in bulk
  const { error: updateErr } = await supabase
    .from('products')
    .update({ store_id: targetStoreId })
    .is('store_id', null);

  if (updateErr) {
    console.error('Error updating products:', updateErr);
  } else {
    console.log(`Successfully migrated ${productsToUpdate.length} products to store ${stores[0].name}!`);
  }
}

migrate();

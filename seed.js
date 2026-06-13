import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gvzcmsgeldxcbrmcambn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2emNtc2dlbGR4Y2JybWNhbWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMTE3NzYsImV4cCI6MjA5Njg4Nzc3Nn0.-EhhxP_oMSpmZuLVk1Xo2dLymY066F7YmMBi-K9Rjoc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding data...');

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@toko.com',
    password: 'password123'
  });

  if (authError) {
     console.error('Login failed:', authError.message);
     return;
  }

  // 1. Seed Categories
  const categoriesData = [
    { name: 'Snack', icon: '🍿' },
    { name: 'Minuman', icon: '🥤' },
    { name: 'Makanan Instan', icon: '🍜' },
    { name: 'Home Care', icon: '🧼' },
    { name: 'Personal Care', icon: '🧴' }
  ];

  const { data: insertedCategories, error: catError } = await supabase
    .from('categories')
    .insert(categoriesData)
    .select();

  if (catError) {
    console.error('Error inserting categories:', catError);
    return;
  }
  
  // Create a mapping from category name to ID
  const categoryMap = {};
  insertedCategories.forEach(cat => {
    categoryMap[cat.name] = cat.id;
  });

  // 2. Seed Products
  const productsData = [
    { sku: 'SNK-001', name: 'Chitato Sapi Panggang 68g', category_id: categoryMap['Snack'], price: 11500, stock: 100, image_url: 'https://images.unsplash.com/photo-1566478989037-e945c2ea0fcd?w=500&q=80' },
    { sku: 'SNK-002', name: 'Lays Rasa Rumput Laut 68g', category_id: categoryMap['Snack'], price: 11500, stock: 100, image_url: 'https://images.unsplash.com/photo-1566478989037-e945c2ea0fcd?w=500&q=80' },
    { sku: 'MIN-001', name: 'Aqua Botol 600ml', category_id: categoryMap['Minuman'], price: 3500, stock: 300, image_url: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=500&q=80' },
    { sku: 'MIN-002', name: 'Le Minerale 600ml', category_id: categoryMap['Minuman'], price: 3500, stock: 250, image_url: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=500&q=80' },
    { sku: 'INS-001', name: 'Indomie Goreng Special 85g', category_id: categoryMap['Makanan Instan'], price: 3100, stock: 400, image_url: 'https://images.unsplash.com/photo-1612929633738-8fe01f7467c5?w=500&q=80' },
    { sku: 'HOM-001', name: 'Rinso Anti Noda 770g', category_id: categoryMap['Home Care'], price: 23500, stock: 80, image_url: 'https://images.unsplash.com/photo-1584820927498-cafe2c157669?w=500&q=80' },
    { sku: 'PER-001', name: 'Pepsodent White 190g', category_id: categoryMap['Personal Care'], price: 12500, stock: 150, image_url: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&q=80' }
  ];

  const { error: prodError } = await supabase
    .from('products')
    .insert(productsData);

  if (prodError) {
    console.error('Error inserting products:', prodError);
  } else {
    console.log('Products seeded successfully.');
  }

  // 3. Seed Discounts
  const discountsData = [
    { code: 'PROMO10', discount_type: 'percent', value: 10, min_purchase: 50000, valid_until: '2026-12-31' },
    { code: 'POTONGAN5RB', discount_type: 'fixed', value: 5000, min_purchase: 20000, valid_until: '2026-12-31' }
  ];

  const { error: discError } = await supabase
    .from('discounts')
    .insert(discountsData);
    
  if (discError) {
    console.error('Error inserting discounts:', discError);
  } else {
    console.log('Discounts seeded successfully.');
  }

  console.log('Done!');
}

seed();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gvzcmsgeldxcbrmcambn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2emNtc2dlbGR4Y2JybWNhbWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMTE3NzYsImV4cCI6MjA5Njg4Nzc3Nn0.-EhhxP_oMSpmZuLVk1Xo2dLymY066F7YmMBi-K9Rjoc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Menghapus produk lama...');

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@toko.com',
    password: 'password123'
  });

  if (authError) {
     console.error('Login failed:', authError.message);
     return;
  }

  // Hapus semua produk lama agar tidak duplikat
  await supabase.from('products').delete().neq('id', 0);

  // Ambil kategori untuk referensi
  const { data: categories } = await supabase.from('categories').select('*');
  const catMap = {};
  categories.forEach(c => catMap[c.name] = c.id);

  console.log('Memasukkan 12 produk minimarket asli...');
  const productsData = [
    { sku: 'SNK-001', name: 'Chitato Sapi Panggang 68g', category_id: catMap['Snack'], price: 11500, stock: 100, image_url: 'https://images.tokopedia.net/img/cache/500-square/hDjmkQ/2022/1/14/fc746cd4-fba6-45bc-bec9-14a9ec00cde1.jpg' },
    { sku: 'SNK-002', name: 'Taro Net Seaweed 65g', category_id: catMap['Snack'], price: 9500, stock: 80, image_url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/6/17/2ed7c9a6-eaad-4d43-8557-0402b115456f.jpg' },
    { sku: 'SNK-003', name: 'Silverqueen Cashew 62g', category_id: catMap['Snack'], price: 16500, stock: 50, image_url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2023/1/25/7a347b74-1ff6-42d6-8ee4-ea5a72064dc7.jpg' },
    
    { sku: 'MIN-001', name: 'Aqua Botol 600ml', category_id: catMap['Minuman'], price: 3500, stock: 300, image_url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/3/2/a794719d-bca7-47b6-9ca4-927a4d538e1b.jpg' },
    { sku: 'MIN-002', name: 'Le Minerale 600ml', category_id: catMap['Minuman'], price: 3500, stock: 250, image_url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/9/13/28cb2c7e-ddc7-43f6-9ddf-68212a4b870d.jpg' },
    { sku: 'MIN-003', name: 'Pocari Sweat 500ml', category_id: catMap['Minuman'], price: 8000, stock: 120, image_url: 'https://images.tokopedia.net/img/cache/500-square/hDjmkQ/2021/8/16/09930f30-e83c-4e89-a99f-7c653ff9d59e.jpg' },
    { sku: 'MIN-004', name: 'Bear Brand Susu Steril', category_id: catMap['Minuman'], price: 10500, stock: 100, image_url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/4/19/081dbca1-f9b6-4556-9430-e3a5ab65137d.jpg' },
    { sku: 'MIN-005', name: 'Indomilk UHT Coklat 250ml', category_id: catMap['Minuman'], price: 5500, stock: 150, image_url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/10/22/d4b3eb4f-37ff-43b8-8f83-e18e6ff05d76.jpg' },

    { sku: 'INS-001', name: 'Indomie Goreng Special 85g', category_id: catMap['Makanan Instan'], price: 3100, stock: 400, image_url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/4/20/35fe608d-e4fb-4b53-b43e-ccab1c0022d4.jpg' },
    { sku: 'INS-002', name: 'Indomie Kuah Soto Mie', category_id: catMap['Makanan Instan'], price: 3000, stock: 350, image_url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/6/28/7da21e64-ba1f-4ff0-b2cc-f3e09210fbbf.jpg' },

    { sku: 'HOM-001', name: 'Rinso Anti Noda 770g', category_id: catMap['Home Care'], price: 23500, stock: 80, image_url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/11/4/110ecaf2-b13c-4573-98ba-d5766dc828fb.jpg' },
    { sku: 'HOM-002', name: 'Sunlight Jeruk Nipis 755ml', category_id: catMap['Home Care'], price: 17500, stock: 90, image_url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/11/17/dfb75c04-f06b-4e89-9a25-7076a5e01bd8.jpg' },

    { sku: 'PER-001', name: 'Pepsodent White 190g', category_id: catMap['Personal Care'], price: 12500, stock: 150, image_url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/3/17/d57cc16d-3e5e-4c74-8b63-ab9db9378604.jpg' },
    { sku: 'PER-002', name: 'Sunsilk Black Shine 170ml', category_id: catMap['Personal Care'], price: 22000, stock: 75, image_url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/7/22/01b80db2-1eb1-46bd-8959-1e3ff29ed16b.jpg' }
  ];

  const { error: prodError } = await supabase
    .from('products')
    .insert(productsData);

  if (prodError) {
    console.error('Error inserting products:', prodError);
  } else {
    console.log('Selesai! Berhasil mengunggah 14 produk asli ke toko.');
  }
}

seed();

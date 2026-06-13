import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gvzcmsgeldxcbrmcambn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2emNtc2dlbGR4Y2JybWNhbWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMTE3NzYsImV4cCI6MjA5Njg4Nzc3Nn0.-EhhxP_oMSpmZuLVk1Xo2dLymY066F7YmMBi-K9Rjoc';
const supabase = createClient(supabaseUrl, supabaseKey);

const knownUrls = {
  'Beng-Beng ShareIt 10x9.5g': 'https://images.openfoodfacts.org/images/products/899/600/130/0817/front_en.16.400.jpg',
  'Biore Body Wash Men 450ml': 'https://images.openfoodfacts.org/images/products/899/999/904/0079/front_en.7.400.jpg',
  'Daia Bunga 850g': 'https://images.openfoodfacts.org/images/products/899/886/660/1719/front_id.3.400.jpg',
  'Chitato Sapi Panggang 68g': 'https://images.openfoodfacts.org/images/products/008/968/659/9077/front_en.43.400.jpg',
  'Lays Rasa Rumput Laut 68g': 'https://images.openfoodfacts.org/images/products/885/071/880/1628/front_en.4.400.jpg',
  'Fitbar Choco 24g': 'https://images.openfoodfacts.org/images/products/899/280/203/1028/front_id.3.400.jpg',
  'Sunlight Jeruk Nipis 755ml': 'https://images.openfoodfacts.org/images/products/899/999/902/6790/front_id.3.400.jpg',
  'Mama Lemon 780ml': 'https://images.openfoodfacts.org/images/products/899/886/660/1757/front_id.3.400.jpg',
  'Nivea Body Lotion 200ml': 'https://images.openfoodfacts.org/images/products/885/002/902/2311/front_en.4.400.jpg',
  'Tolak Angin Cair Sido Muncul 15ml': 'https://images.openfoodfacts.org/images/products/899/303/344/2222/front_en.4.400.jpg'
};

async function fixPlaceholders() {
  const { data: products } = await supabase.from('products').select('*');
  let fixed = 0;

  for (const p of products) {
    if (p.image_url.includes('tokopedia.net') || p.image_url.includes('unsplash.com')) {
      let finalUrl = knownUrls[p.name];
      if (!finalUrl) {
          // Buat placeholder teks yang rapi jika tidak ada di knownUrls
          const cleanName = encodeURIComponent(p.name.split(' ').slice(0, 2).join('\\n'));
          finalUrl = `https://placehold.co/400x400/E8F0FE/1A73E8?text=${cleanName}&font=Roboto`;
      }
      
      await supabase.from('products').update({ image_url: finalUrl }).eq('id', p.id);
      console.log(`Update ${p.name} -> ${finalUrl}`);
      fixed++;
    }
  }
  console.log(`Total produk diperbaiki: ${fixed}`);
}

fixPlaceholders();

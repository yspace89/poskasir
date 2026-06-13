import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gvzcmsgeldxcbrmcambn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2emNtc2dlbGR4Y2JybWNhbWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMTE3NzYsImV4cCI6MjA5Njg4Nzc3Nn0.-EhhxP_oMSpmZuLVk1Xo2dLymY066F7YmMBi-K9Rjoc';
const supabase = createClient(supabaseUrl, supabaseKey);

// Fallback manual URLs for those that might miss in OpenFoodFacts
const fallbackImages = {
  'Chitato Sapi Panggang 68g': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/6/15/d409b30a-605a-4952-b88d-ddab6d66e511.jpg',
  'Lays Rasa Rumput Laut 68g': 'https://images.tokopedia.net/img/cache/500-square/hDjmkQ/2022/3/25/6f8f5ea0-a940-424a-bba9-195cbbec7a54.jpg',
  'SilverQueen Kacang Mede 62g': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2023/1/6/f1b5d12d-a6d1-432a-bc95-0df75a8de001.jpg',
  'Beng-Beng ShareIt 10x9.5g': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/4/23/bf1ab4c8-ab35-43ea-9f79-24b54e7d1746.jpg',
  'Roma Kelapa 300g': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/11/4/19d5051d-b6a8-446d-9d41-e932efab091b.jpg',
  'Fitbar Choco 24g': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/10/7/005e80fa-1e01-4dd9-813a-a1b75b1c97a2.jpg',
  'Le Minerale 600ml': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/3/30/b62b10ab-bc8d-4f11-9a7f-d5b768e1a89c.jpg',
  'Kopiko 78C Coffee Latte 240ml': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/5/30/c92eb2fb-c70e-4735-a757-e173e04eb923.jpg',
  'Samyang Spicy Chicken 140g': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/10/5/3199ce7e-ea13-42eb-8ec3-ebcd6060c1d6.jpg',
  'Sarden ABC Tomat 155g': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/9/3/35f08215-6fb0-4e5d-b0dc-0164c02da3fa.jpg',
  'Pronas Corned Beef 198g': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/2/18/d35b91b8-c3e0-4743-8fba-813d3ccf7267.jpg',
  'Quaker Oat Biru 200g': 'https://images.tokopedia.net/img/cache/500-square/hDjmkQ/2021/4/26/fa510842-fc29-4d89-9a22-c3614ab1f87b.jpg',
  'Rinso Anti Noda 770g': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/11/17/801a6b0c-a9df-4c3d-82d3-13834a34b2cf.jpg',
  'Daia Bunga 850g': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/9/13/a5c9ab86-9a5d-4f33-b91c-1af7e06a6c42.jpg',
  'Sunlight Jeruk Nipis 755ml': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/9/28/0ccb87d3-ff05-4702-861f-d3dd78f77af4.jpg',
  'Mama Lemon 780ml': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/9/6/d0059e09-ed32-479e-b153-fdf472cdb3f1.jpg',
  'Baygon Aerosol 600ml': 'https://images.tokopedia.net/img/cache/500-square/hDjmkQ/2020/9/14/0cddb0af-0c9f-43b6-bad7-1c64eb3eebf6.jpg',
  'Vipor Karbol Wangi 780ml': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/11/15/8e6ec2aa-f173-455b-80a5-f9a888e7855b.jpg',
  'Super Pel Apple 770ml': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/5/31/592c3a59-b146-4e52-af82-b258529e71ec.jpg',
  'Kapur Barus Swallow 150g': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2020/12/3/b5fc0e09-b9d9-43c2-849c-f2a74c3d7e82.jpg',
  'Tisu Tessa 250s': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/5/25/7f4a5c60-a292-4f36-a36c-9a405a74efaf.jpg',
  'Bagus Zipper Bag M 25s': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/2/18/721edcfa-818d-4e94-ad7c-023a1a586bd7.jpg',
  'Pepsodent White 190g': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/1/14/b87ad95f-3310-4ed3-a602-fa9e6027a4d6.jpg',
  'Ciptadent Cool Mint 190g': 'https://images.tokopedia.net/img/cache/500-square/hDjmkQ/2021/4/26/fa510842-fc29-4d89-9a22-c3614ab1f87b.jpg',
  'Lifebuoy Sabun Cair Merah 450ml': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/6/2/c8b598d9-2325-46bc-8152-ed48356976ce.jpg',
  'Biore Body Wash Men 450ml': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/6/15/892d2165-f9ad-45df-bbbe-f2e1a3dc8f64.jpg',
  'Clear Shampoo Menthol 160ml': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/6/28/7f8f4a33-2559-4bba-bd8f-bd442ef553e1.jpg',
  'Pantene Anti Dandruff 160ml': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/7/22/e1b69736-8a07-4e67-965a-0d170b0cc829.jpg',
  'Rexona Men Roll On 50ml': 'https://images.tokopedia.net/img/cache/500-square/hDjmkQ/2021/10/22/b3b9b4af-7c2a-466d-a1ad-4cf5f9c1d1a1.jpg',
  'Gatsby Water Gloss 75g': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/7/26/020cc5cc-d0db-46db-8378-fc7b39f37905.jpg',
  'Nivea Body Lotion 200ml': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/1/22/d75bdf4b-e3a5-4eb8-a72f-4889c1ed8ab9.jpg',
  'Tolak Angin Cair Sido Muncul 15ml': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/8/1/863cb6df-2015-462f-b4bd-cd6ba13a24ed.jpg',
  'Ultra Milk Coklat 250ml': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/10/22/23af5b3d-71b5-41df-a56d-eeb08d8ea622.jpg',
  'Coca Cola Kaleng 330ml': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/6/17/a090b4d4-6e6d-4ee8-b2dc-c8529e8c07e0.jpg',
  'Yakult 5 Botol': 'https://images.tokopedia.net/img/cache/500-square/hDjmkQ/2022/3/30/ca0a7ad5-ec12-4017-9c98-ed9ec82c3c6f.jpg'
};

async function fixMissingImages() {
  const { data: products } = await supabase.from('products').select('*');
  let fixedCount = 0;

  for (const p of products) {
    if (p.image_url.includes('unsplash.com') || p.image_url.includes('undefined')) {
      if (fallbackImages[p.name]) {
        console.log("Memperbaiki:", p.name);
        await supabase.from('products').update({ image_url: fallbackImages[p.name] }).eq('id', p.id);
        fixedCount++;
      }
    }
  }
  console.log("Berhasil memperbaiki gambar:", fixedCount);
}

fixMissingImages();

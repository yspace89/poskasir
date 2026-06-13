import { createClient } from '@supabase/supabase-js';
import { image_search } from 'duckduckgo-images-api';
import axios from 'axios';

const supabaseUrl = 'https://gvzcmsgeldxcbrmcambn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2emNtc2dlbGR4Y2JybWNhbWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMTE3NzYsImV4cCI6MjA5Njg4Nzc3Nn0.-EhhxP_oMSpmZuLVk1Xo2dLymY066F7YmMBi-K9Rjoc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBrokenImages() {
  const { data: products } = await supabase.from('products').select('*');
  let fixed = 0;

  for (const p of products) {
    let isBroken = false;
    try {
      await axios.head(p.image_url, { timeout: 3000 });
    } catch (err) {
      isBroken = true;
    }

    if (isBroken || p.image_url.includes('unsplash.com')) {
      console.log(`Mencari gambar baru untuk: ${p.name}`);
      try {
        const results = await image_search({ query: p.name + " alfamart", moderate: true });
        if (results && results.length > 0) {
            // Pick the first working image
            let found = false;
            for(let res of results.slice(0, 5)) {
                try {
                    await axios.head(res.image, { timeout: 2000 });
                    await supabase.from('products').update({ image_url: res.image }).eq('id', p.id);
                    console.log(`  -> Berhasil diperbarui: ${res.image}`);
                    fixed++;
                    found = true;
                    break;
                } catch(e) {}
            }
            if (!found) console.log(`  -> Semua hasil pencarian rusak.`);
        }
      } catch (err) {
        console.error(`  -> Gagal mencari:`, err.message);
      }
    }
  }
  console.log(`Total yang berhasil diperbaiki via DuckDuckGo: ${fixed}`);
}

checkBrokenImages();

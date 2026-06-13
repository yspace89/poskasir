import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = 'https://gvzcmsgeldxcbrmcambn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2emNtc2dlbGR4Y2JybWNhbWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMTE3NzYsImV4cCI6MjA5Njg4Nzc3Nn0.-EhhxP_oMSpmZuLVk1Xo2dLymY066F7YmMBi-K9Rjoc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBrokenImages() {
  const { data: products } = await supabase.from('products').select('*');
  const broken = [];

  for (const p of products) {
    try {
      await axios.head(p.image_url, { timeout: 3000 });
    } catch (err) {
      broken.push(p.name);
      console.log(`Broken: ${p.name} - ${p.image_url}`);
    }
  }
  console.log(`Total broken images: ${broken.length}`);
}

checkBrokenImages();

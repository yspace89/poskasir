import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://gvzcmsgeldxcbrmcambn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2emNtc2dlbGR4Y2JybWNhbWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMTE3NzYsImV4cCI6MjA5Njg4Nzc3Nn0.-EhhxP_oMSpmZuLVk1Xo2dLymY066F7YmMBi-K9Rjoc';
const supabase = createClient(supabaseUrl, supabaseKey);

const imageDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(imageDir)) {
  fs.mkdirSync(imageDir, { recursive: true });
}

const productsToDownload = [
  { sku: 'SNK-001', url: 'https://images.tokopedia.net/img/cache/500-square/hDjmkQ/2022/1/14/fc746cd4-fba6-45bc-bec9-14a9ec00cde1.jpg', filename: 'chitato.jpg' },
  { sku: 'SNK-002', url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/6/17/2ed7c9a6-eaad-4d43-8557-0402b115456f.jpg', filename: 'taro.jpg' },
  { sku: 'SNK-003', url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2023/1/25/7a347b74-1ff6-42d6-8ee4-ea5a72064dc7.jpg', filename: 'silverqueen.jpg' },
  
  { sku: 'MIN-001', url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/3/2/a794719d-bca7-47b6-9ca4-927a4d538e1b.jpg', filename: 'aqua.jpg' },
  { sku: 'MIN-002', url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/9/13/28cb2c7e-ddc7-43f6-9ddf-68212a4b870d.jpg', filename: 'leminerale.jpg' },
  { sku: 'MIN-003', url: 'https://images.tokopedia.net/img/cache/500-square/hDjmkQ/2021/8/16/09930f30-e83c-4e89-a99f-7c653ff9d59e.jpg', filename: 'pocari.jpg' },
  { sku: 'MIN-004', url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/4/19/081dbca1-f9b6-4556-9430-e3a5ab65137d.jpg', filename: 'bearbrand.jpg' },
  { sku: 'MIN-005', url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/10/22/d4b3eb4f-37ff-43b8-8f83-e18e6ff05d76.jpg', filename: 'indomilk.jpg' },

  { sku: 'INS-001', url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/4/20/35fe608d-e4fb-4b53-b43e-ccab1c0022d4.jpg', filename: 'indomiegoreng.jpg' },
  { sku: 'INS-002', url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/6/28/7da21e64-ba1f-4ff0-b2cc-f3e09210fbbf.jpg', filename: 'indomiesoto.jpg' },

  { sku: 'HOM-001', url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/11/4/110ecaf2-b13c-4573-98ba-d5766dc828fb.jpg', filename: 'rinso.jpg' },
  { sku: 'HOM-002', url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2021/11/17/dfb75c04-f06b-4e89-9a25-7076a5e01bd8.jpg', filename: 'sunlight.jpg' },

  { sku: 'PER-001', url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/3/17/d57cc16d-3e5e-4c74-8b63-ab9db9378604.jpg', filename: 'pepsodent.jpg' },
  { sku: 'PER-002', url: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/7/22/01b80db2-1eb1-46bd-8959-1e3ff29ed16b.jpg', filename: 'sunsilk.jpg' }
];

const downloadImage = (url, filepath) => {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Referer': 'https://www.tokopedia.com/',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    }, (res) => {
      if (res.statusCode === 200) {
        const file = fs.createWriteStream(filepath);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        reject(new Error(`Failed to download, status code: ${res.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
};

async function run() {
  await supabase.auth.signInWithPassword({ email: 'admin@toko.com', password: 'password123' });
  
  for (const prod of productsToDownload) {
    const filepath = path.join(imageDir, prod.filename);
    try {
      console.log(`Downloading ${prod.filename}...`);
      await downloadImage(prod.url, filepath);
      
      // Update DB
      await supabase.from('products').update({ image_url: `/images/${prod.filename}` }).eq('sku', prod.sku);
      console.log(`Updated DB for ${prod.sku}`);
    } catch (err) {
      console.error(`Error processing ${prod.filename}:`, err);
    }
  }
  console.log('Done!');
}

run();

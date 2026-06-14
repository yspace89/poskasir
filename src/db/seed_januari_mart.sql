-- ============================================================
-- KASIRIND — Migration Seed: Toko Januari Mart
-- Jalankan di Supabase SQL Editor SETELAH schema.sql
-- 
-- Script ini akan:
-- 1. Membuat profile untuk semua user yang sudah ada
-- 2. Membuat Organization "Januari Mart"
-- 3. Membuat Store "Toko Januari Mart"
-- 4. Mendaftarkan semua user existing sebagai anggota org
-- 5. Seed data produk, kategori, dll
-- ============================================================

DO $$
DECLARE
  v_owner_id      UUID;
  v_org_id        UUID;
  v_store_id      UUID;
  v_user          RECORD;
  v_cat_minuman   INTEGER;
  v_cat_makanan   INTEGER;
  v_cat_snack     INTEGER;
  v_cat_sembako   INTEGER;
  v_cat_personal  INTEGER;
  v_cat_homecare  INTEGER;
BEGIN

-- ============================================================
-- LANGKAH 1: Buat Profiles untuk semua user existing di auth.users
-- (jika belum ada, trigger akan buat tapi kita pastikan manual)
-- ============================================================
FOR v_user IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
  INSERT INTO profiles (id, full_name)
  VALUES (
    v_user.id,
    COALESCE(
      v_user.raw_user_meta_data->>'full_name',
      CASE
        WHEN v_user.email = 'admin@toko.com'          THEN 'Administrator'
        WHEN v_user.email = 'admintrainee@toko.com'   THEN 'Admin Trainee'
        WHEN v_user.email = 'admin.pos123@gmail.com'  THEN 'Admin POS'
        WHEN v_user.email = 'yspace89@gmail.com'      THEN 'Yspace Owner'
        ELSE split_part(v_user.email, '@', 1)
      END
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name;
END LOOP;

RAISE NOTICE 'Profiles dibuat untuk semua user existing.';


-- ============================================================
-- LANGKAH 2: Tentukan Owner Org
-- Gunakan yspace89@gmail.com sebagai owner utama
-- ============================================================
SELECT id INTO v_owner_id
FROM auth.users
WHERE email = 'yspace89@gmail.com'
LIMIT 1;

-- Fallback: jika tidak ada, pakai user pertama
IF v_owner_id IS NULL THEN
  SELECT id INTO v_owner_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
END IF;

RAISE NOTICE 'Owner: %', v_owner_id;


-- ============================================================
-- LANGKAH 3: Buat Organization "Januari Mart"
-- ============================================================
INSERT INTO organizations (name, slug, plan, owner_id)
VALUES ('Januari Mart', 'januari-mart', 'premium', v_owner_id)
RETURNING id INTO v_org_id;

RAISE NOTICE 'Organization dibuat: %', v_org_id;


-- ============================================================
-- LANGKAH 4: Buat Store "Toko Januari Mart"
-- ============================================================
INSERT INTO stores (org_id, name, address, phone, city, receipt_footer)
VALUES (
  v_org_id,
  'Toko Januari Mart',
  'Jl. Januari No. 1, Jakarta',
  '08123456789',
  'Jakarta',
  'Terima kasih telah berbelanja di Januari Mart!'
)
RETURNING id INTO v_store_id;

RAISE NOTICE 'Store dibuat: %', v_store_id;


-- ============================================================
-- LANGKAH 5: Daftarkan semua user sebagai org_members
-- ============================================================
FOR v_user IN SELECT id, email FROM auth.users LOOP
  INSERT INTO org_members (org_id, user_id, role, invited_by)
  VALUES (
    v_org_id,
    v_user.id,
    CASE
      WHEN v_user.email = 'yspace89@gmail.com'      THEN 'owner'
      WHEN v_user.email = 'admin.pos123@gmail.com'  THEN 'owner'
      WHEN v_user.email = 'admin@toko.com'          THEN 'manager'
      WHEN v_user.email = 'admintrainee@toko.com'   THEN 'cashier'
      ELSE 'cashier'
    END,
    v_owner_id
  )
  ON CONFLICT (org_id, user_id) DO NOTHING;

  -- Juga daftarkan ke store_members
  INSERT INTO store_members (
    store_id, user_id, role,
    can_view_reports, can_manage_products,
    can_void_transactions, can_manage_discounts, can_manage_team
  )
  VALUES (
    v_store_id,
    v_user.id,
    CASE
      WHEN v_user.email = 'yspace89@gmail.com'      THEN 'owner'
      WHEN v_user.email = 'admin.pos123@gmail.com'  THEN 'owner'
      WHEN v_user.email = 'admin@toko.com'          THEN 'manager'
      WHEN v_user.email = 'admintrainee@toko.com'   THEN 'cashier'
      ELSE 'cashier'
    END,
    -- can_view_reports
    CASE WHEN v_user.email IN ('yspace89@gmail.com','admin.pos123@gmail.com','admin@toko.com') THEN TRUE ELSE FALSE END,
    -- can_manage_products
    CASE WHEN v_user.email IN ('yspace89@gmail.com','admin.pos123@gmail.com','admin@toko.com') THEN TRUE ELSE FALSE END,
    -- can_void_transactions
    CASE WHEN v_user.email IN ('yspace89@gmail.com','admin.pos123@gmail.com','admin@toko.com') THEN TRUE ELSE FALSE END,
    -- can_manage_discounts
    CASE WHEN v_user.email IN ('yspace89@gmail.com','admin.pos123@gmail.com','admin@toko.com') THEN TRUE ELSE FALSE END,
    -- can_manage_team
    CASE WHEN v_user.email IN ('yspace89@gmail.com','admin.pos123@gmail.com') THEN TRUE ELSE FALSE END
  )
  ON CONFLICT (store_id, user_id) DO NOTHING;

END LOOP;

RAISE NOTICE 'Semua user didaftarkan ke org dan store.';


-- ============================================================
-- LANGKAH 6: Seed Kategori
-- ============================================================
INSERT INTO categories (org_id, name, icon) VALUES
  (v_org_id, 'Minuman', '🥤'),
  (v_org_id, 'Makanan', '🍱'),
  (v_org_id, 'Snack', '🍿'),
  (v_org_id, 'Sembako', '🛒'),
  (v_org_id, 'Personal Care', '🧴'),
  (v_org_id, 'Home Care', '🧹')
RETURNING id INTO v_cat_minuman;

SELECT id INTO v_cat_minuman FROM categories WHERE org_id = v_org_id AND name = 'Minuman';
SELECT id INTO v_cat_makanan FROM categories WHERE org_id = v_org_id AND name = 'Makanan';
SELECT id INTO v_cat_snack   FROM categories WHERE org_id = v_org_id AND name = 'Snack';
SELECT id INTO v_cat_sembako FROM categories WHERE org_id = v_org_id AND name = 'Sembako';
SELECT id INTO v_cat_personal FROM categories WHERE org_id = v_org_id AND name = 'Personal Care';
SELECT id INTO v_cat_homecare FROM categories WHERE org_id = v_org_id AND name = 'Home Care';

RAISE NOTICE 'Kategori dibuat.';


-- ============================================================
-- LANGKAH 7: Seed Produk (store_id NULL = produk global org)
-- ============================================================
INSERT INTO products (org_id, store_id, sku, name, category_id, price, stock, min_stock, image_url) VALUES
  -- Minuman
  (v_org_id, NULL, 'MIN-001', 'Aqua 600ml', v_cat_minuman, 3500, 200, 20, NULL),
  (v_org_id, NULL, 'MIN-002', 'Aqua 1500ml', v_cat_minuman, 5500, 150, 15, NULL),
  (v_org_id, NULL, 'MIN-003', 'Teh Botol Sosro 350ml', v_cat_minuman, 5000, 120, 15, NULL),
  (v_org_id, NULL, 'MIN-004', 'Pocari Sweat 350ml', v_cat_minuman, 8000, 80, 10, NULL),
  (v_org_id, NULL, 'MIN-005', 'Indomilk UHT Putih 250ml', v_cat_minuman, 5500, 150, 20, NULL),
  (v_org_id, NULL, 'MIN-006', 'Le Minerale 600ml', v_cat_minuman, 3000, 200, 20, NULL),
  (v_org_id, NULL, 'MIN-007', 'Bear Brand 140ml', v_cat_minuman, 12000, 60, 10, NULL),
  (v_org_id, NULL, 'MIN-008', 'Sprite 330ml Kaleng', v_cat_minuman, 7500, 90, 10, NULL),

  -- Makanan
  (v_org_id, NULL, 'MAK-001', 'Indomie Goreng', v_cat_makanan, 3100, 400, 30, NULL),
  (v_org_id, NULL, 'MAK-002', 'Indomie Soto', v_cat_makanan, 3100, 350, 30, NULL),
  (v_org_id, NULL, 'MAK-003', 'Indomie Rasa Ayam', v_cat_makanan, 3100, 300, 30, NULL),
  (v_org_id, NULL, 'MAK-004', 'Sarimi Isi 2 Soto Koya', v_cat_makanan, 4500, 150, 20, NULL),

  -- Snack
  (v_org_id, NULL, 'SNK-001', 'Chitato Sapi Panggang 68g', v_cat_snack, 14000, 75, 10, NULL),
  (v_org_id, NULL, 'SNK-002', 'Taro Net 40g', v_cat_snack, 8000, 100, 10, NULL),
  (v_org_id, NULL, 'SNK-003', 'Piattos Keju 40g', v_cat_snack, 8000, 90, 10, NULL),
  (v_org_id, NULL, 'SNK-004', 'Oreo Original 137g', v_cat_snack, 13000, 60, 10, NULL),
  (v_org_id, NULL, 'SNK-005', 'Roma Kelapa 150g', v_cat_snack, 9000, 80, 10, NULL),

  -- Sembako
  (v_org_id, NULL, 'SBK-001', 'Beras Rojolele 5kg', v_cat_sembako, 78000, 30, 5, NULL),
  (v_org_id, NULL, 'SBK-002', 'Gula Pasir 1kg', v_cat_sembako, 15000, 50, 10, NULL),
  (v_org_id, NULL, 'SBK-003', 'Minyak Goreng Bimoli 2L', v_cat_sembako, 36000, 40, 8, NULL),
  (v_org_id, NULL, 'SBK-004', 'Tepung Terigu Bogasari 1kg', v_cat_sembako, 13000, 45, 10, NULL),

  -- Personal Care
  (v_org_id, NULL, 'PER-001', 'Pepsodent 190g', v_cat_personal, 12500, 150, 15, NULL),
  (v_org_id, NULL, 'PER-002', 'Sunsilk Shampoo 170ml', v_cat_personal, 22000, 75, 10, NULL),
  (v_org_id, NULL, 'PER-003', 'Lifebuoy Sabun 85g', v_cat_personal, 5500, 200, 20, NULL),

  -- Home Care
  (v_org_id, NULL, 'HOM-001', 'Rinso 1.8kg', v_cat_homecare, 23500, 80, 10, NULL),
  (v_org_id, NULL, 'HOM-002', 'Sunlight Jeruk 800ml', v_cat_homecare, 17500, 90, 10, NULL),
  (v_org_id, NULL, 'HOM-003', 'Wipol 770ml', v_cat_homecare, 18000, 50, 8, NULL);

RAISE NOTICE 'Produk di-seed.';


-- ============================================================
-- LANGKAH 8: Seed Diskon Sample
-- ============================================================
INSERT INTO discounts (store_id, org_id, code, discount_type, value, min_purchase, is_active, valid_until)
VALUES
  (v_store_id, v_org_id, 'HEMAT10', 'percent', 10, 50000, TRUE, '2025-12-31'),
  (v_store_id, v_org_id, 'DISKON5K', 'fixed', 5000, 30000, TRUE, '2025-12-31'),
  (v_store_id, v_org_id, 'GRAND20', 'percent', 20, 100000, TRUE, '2025-07-31');

RAISE NOTICE 'Diskon di-seed.';


-- ============================================================
-- SELESAI
-- ============================================================
RAISE NOTICE '==========================================';
RAISE NOTICE 'SEED SELESAI!';
RAISE NOTICE 'Organization ID : %', v_org_id;
RAISE NOTICE 'Store ID        : %', v_store_id;
RAISE NOTICE 'Owner ID        : %', v_owner_id;
RAISE NOTICE '==========================================';
RAISE NOTICE 'Salin ORG_ID dan STORE_ID di atas.';
RAISE NOTICE 'Masukkan ke .env atau konfigurasi app.';

END $$;

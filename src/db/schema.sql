-- ============================================================
-- KASIRIND — Schema Database Multi-Tenant SaaS
-- Version 2.0
-- PERHATIAN: Jalankan di Supabase SQL Editor
-- ============================================================

-- ============================================================
-- BAGIAN 1: HAPUS SEMUA TABEL LAMA (URUTAN BENAR)
-- ============================================================
DROP TABLE IF EXISTS stock_logs CASCADE;
DROP TABLE IF EXISTS shift_logs CASCADE;
DROP TABLE IF EXISTS transaction_items CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS discounts CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS store_members CASCADE;
DROP TABLE IF EXISTS org_members CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop triggers & functions lama
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trg_reduce_stock ON transaction_items;
DROP TRIGGER IF EXISTS trg_restore_stock ON transactions;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS reduce_stock_on_sale();
DROP FUNCTION IF EXISTS restore_stock_on_void();


-- ============================================================
-- BAGIAN 2: TABEL INTI MULTI-TENANT
-- ============================================================

-- 1. Profiles (satu per auth user, data dasar)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Organizations (Tenant = Pemilik Usaha / Brand)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) NOT NULL DEFAULT 'free', -- 'free', 'premium'
    plan_expires_at TIMESTAMP WITH TIME ZONE,
    owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Stores / Outlets (Cabang per Organization)
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    city VARCHAR(100),
    receipt_header TEXT, -- Teks tambahan header struk
    receipt_footer TEXT DEFAULT 'Terima kasih atas kunjungan Anda!',
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Organization Members (User yang terdaftar di sebuah Org)
CREATE TABLE org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'cashier',
    -- Roles: 'owner', 'manager', 'cashier', 'trainee'
    is_active BOOLEAN DEFAULT TRUE,
    invited_by UUID REFERENCES profiles(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

-- 5. Store Members (Penugasan User ke Outlet tertentu)
-- NULL store_id di org_members berarti akses ke semua toko dalam org
CREATE TABLE store_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'cashier',
    -- Override role untuk toko ini spesifik
    -- Permissions granular
    can_view_reports BOOLEAN DEFAULT FALSE,
    can_manage_products BOOLEAN DEFAULT FALSE,
    can_void_transactions BOOLEAN DEFAULT FALSE,
    can_manage_discounts BOOLEAN DEFAULT FALSE,
    can_manage_team BOOLEAN DEFAULT FALSE,
    UNIQUE(store_id, user_id)
);

-- 6. Invitations (Link undangan karyawan)
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'cashier',
    token VARCHAR(255) UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    invited_by UUID REFERENCES profiles(id)
);


-- ============================================================
-- BAGIAN 3: TABEL DATA OPERASIONAL (DENGAN store_id & org_id)
-- ============================================================

-- 7. Categories (Per Org, bisa dipakai semua store dalam org)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, name)
);

-- 8. Discounts / Promo (Per Store, FITUR PREMIUM)
CREATE TABLE discounts (
    id SERIAL PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    discount_type VARCHAR(20) NOT NULL, -- 'percent' atau 'fixed'
    value DECIMAL(12,2) NOT NULL,
    min_purchase DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(store_id, code)
);

-- 9. Products (Per Org, store_id NULL = global org, ada isinya = khusus outlet)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    -- NULL = produk global untuk semua outlet dalam org ini
    -- Isi = produk khusus outlet ini saja
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    price DECIMAL(12,2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER DEFAULT 5, -- alert jika stok di bawah ini
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, sku)
);

-- 10. Transactions (Per Store)
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total DECIMAL(12,2) NOT NULL,
    discount_id INTEGER REFERENCES discounts(id) ON DELETE SET NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    payment_method VARCHAR(50) NOT NULL, -- 'cash', 'qris', 'card'
    tendered_amount DECIMAL(12,2) NOT NULL,
    change DECIMAL(12,2) NOT NULL,
    cashier_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'completed' -- 'completed', 'voided'
);

-- 11. Transaction Items (Per Transaction)
CREATE TABLE transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    qty INTEGER NOT NULL,
    price DECIMAL(12,2) NOT NULL
);

-- 12. Shift Logs (Per Store, per User)
CREATE TABLE shift_logs (
    id SERIAL PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    opening_cash DECIMAL(12,2),
    closing_cash DECIMAL(12,2)
);

-- 13. Stock Logs (Per Product)
CREATE TABLE stock_logs (
    id SERIAL PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    change_qty INTEGER NOT NULL, -- positif = masuk, negatif = keluar
    reason VARCHAR(100) NOT NULL, -- 'sold', 'void', 'restock', 'adjustment'
    notes TEXT,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ============================================================
-- BAGIAN 4: TRIGGER & FUNGSI
-- ============================================================

-- A. Trigger: Buat profile otomatis saat user baru register
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- B. Trigger: Kurangi stok otomatis saat transaksi masuk
CREATE OR REPLACE FUNCTION reduce_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET stock = stock - NEW.qty WHERE id = NEW.product_id;

  INSERT INTO stock_logs (store_id, product_id, change_qty, reason, transaction_id)
  SELECT t.store_id, NEW.product_id, -NEW.qty, 'sold', NEW.transaction_id
  FROM transactions t WHERE t.id = NEW.transaction_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reduce_stock
  AFTER INSERT ON transaction_items
  FOR EACH ROW EXECUTE FUNCTION reduce_stock_on_sale();


-- C. Trigger: Kembalikan stok saat transaksi di-void
CREATE OR REPLACE FUNCTION restore_stock_on_void()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
BEGIN
  IF NEW.status = 'voided' AND OLD.status = 'completed' THEN
    FOR item IN SELECT * FROM transaction_items WHERE transaction_id = NEW.id LOOP
      UPDATE products SET stock = stock + item.qty WHERE id = item.product_id;

      INSERT INTO stock_logs (store_id, product_id, change_qty, reason, transaction_id, user_id)
      VALUES (NEW.store_id, item.product_id, item.qty, 'void', NEW.id, NEW.cashier_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restore_stock
  AFTER UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION restore_stock_on_void();


-- ============================================================
-- BAGIAN 5: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS semua tabel
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;

-- Helper Function: Ambil semua store_id yang bisa diakses user ini
CREATE OR REPLACE FUNCTION get_user_store_ids()
RETURNS SETOF UUID AS $$
  SELECT s.id FROM stores s
  INNER JOIN org_members om ON om.org_id = s.org_id
  WHERE om.user_id = auth.uid() AND om.is_active = TRUE
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper Function: Ambil semua org_id yang bisa diakses user ini
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
  SELECT org_id FROM org_members
  WHERE user_id = auth.uid() AND is_active = TRUE
$$ LANGUAGE SQL SECURITY DEFINER STABLE;


-- Profiles: user bisa baca semua profile (untuk tampil nama kasir), hanya edit milik sendiri
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Organizations: hanya member yang bisa lihat org mereka
CREATE POLICY "orgs_select" ON organizations FOR SELECT
  USING (id IN (SELECT get_user_org_ids()));
CREATE POLICY "orgs_update" ON organizations FOR UPDATE
  USING (owner_id = auth.uid());
CREATE POLICY "orgs_insert" ON organizations FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Stores: member org bisa lihat semua store dalam org mereka
CREATE POLICY "stores_select" ON stores FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "stores_insert" ON stores FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "stores_update" ON stores FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()));

-- Org Members: member bisa lihat daftar member dalam org-nya
CREATE POLICY "org_members_select" ON org_members FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "org_members_insert" ON org_members FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "org_members_update" ON org_members FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "org_members_delete" ON org_members FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids()));

-- Store Members
CREATE POLICY "store_members_select" ON store_members FOR SELECT
  USING (store_id IN (SELECT get_user_store_ids()));
CREATE POLICY "store_members_insert" ON store_members FOR INSERT
  WITH CHECK (store_id IN (SELECT get_user_store_ids()));
CREATE POLICY "store_members_update" ON store_members FOR UPDATE
  USING (store_id IN (SELECT get_user_store_ids()));
CREATE POLICY "store_members_delete" ON store_members FOR DELETE
  USING (store_id IN (SELECT get_user_store_ids()));

-- Invitations
CREATE POLICY "invitations_select" ON invitations FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "invitations_insert" ON invitations FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

-- Categories: per org
CREATE POLICY "categories_select" ON categories FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "categories_insert" ON categories FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "categories_update" ON categories FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "categories_delete" ON categories FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids()));

-- Discounts: per store
CREATE POLICY "discounts_select" ON discounts FOR SELECT
  USING (store_id IN (SELECT get_user_store_ids()));
CREATE POLICY "discounts_insert" ON discounts FOR INSERT
  WITH CHECK (store_id IN (SELECT get_user_store_ids()));
CREATE POLICY "discounts_update" ON discounts FOR UPDATE
  USING (store_id IN (SELECT get_user_store_ids()));
CREATE POLICY "discounts_delete" ON discounts FOR DELETE
  USING (store_id IN (SELECT get_user_store_ids()));

-- Products: per org (atau per store jika store_id tidak null)
CREATE POLICY "products_select" ON products FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "products_insert" ON products FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "products_update" ON products FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "products_delete" ON products FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids()));

-- Transactions: per store
CREATE POLICY "transactions_select" ON transactions FOR SELECT
  USING (store_id IN (SELECT get_user_store_ids()));
CREATE POLICY "transactions_insert" ON transactions FOR INSERT
  WITH CHECK (store_id IN (SELECT get_user_store_ids()));
CREATE POLICY "transactions_update" ON transactions FOR UPDATE
  USING (store_id IN (SELECT get_user_store_ids()));

-- Transaction Items: ikuti akses transaksinya
CREATE POLICY "transaction_items_select" ON transaction_items FOR SELECT
  USING (transaction_id IN (
    SELECT id FROM transactions WHERE store_id IN (SELECT get_user_store_ids())
  ));
CREATE POLICY "transaction_items_insert" ON transaction_items FOR INSERT
  WITH CHECK (transaction_id IN (
    SELECT id FROM transactions WHERE store_id IN (SELECT get_user_store_ids())
  ));

-- Shift Logs: per store
CREATE POLICY "shift_logs_select" ON shift_logs FOR SELECT
  USING (store_id IN (SELECT get_user_store_ids()));
CREATE POLICY "shift_logs_insert" ON shift_logs FOR INSERT
  WITH CHECK (store_id IN (SELECT get_user_store_ids()));
CREATE POLICY "shift_logs_update" ON shift_logs FOR UPDATE
  USING (store_id IN (SELECT get_user_store_ids()));

-- Stock Logs: per store
CREATE POLICY "stock_logs_select" ON stock_logs FOR SELECT
  USING (store_id IN (SELECT get_user_store_ids()));
CREATE POLICY "stock_logs_insert" ON stock_logs FOR INSERT
  WITH CHECK (store_id IN (SELECT get_user_store_ids()));


-- ============================================================
-- BAGIAN 6: REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE shift_logs;

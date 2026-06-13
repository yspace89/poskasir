-- Skema Database POS Kasir Lengkap dengan RLS, Triggers, & Profil
-- Menghapus semua tabel terkait jika sudah ada (PERHATIAN: DATA AKAN HILANG)
DROP TABLE IF EXISTS stock_logs CASCADE;
DROP TABLE IF EXISTS shift_logs CASCADE;
DROP TABLE IF EXISTS transaction_items CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS discounts CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. Tabel Profiles (Sinkronisasi dengan auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'kasir', -- 'admin' atau 'kasir'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger untuk insert profile otomatis saat user signup (opsional, tapi berguna)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, split_part(new.email, '@', 1), 'admin'); -- Default admin for ease
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Tabel Categories
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(50)
);

-- 3. Tabel Discounts
CREATE TABLE discounts (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL, -- 'percent' atau 'fixed'
    value DECIMAL(12,2) NOT NULL,
    min_purchase DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    valid_until DATE
);

-- 4. Tabel Products (Dimodifikasi dengan FK category_id)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    price DECIMAL(12,2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Transactions (Dimodifikasi dengan cashier_id & discount_id)
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(12,2) NOT NULL,
    discount_id INTEGER REFERENCES discounts(id) ON DELETE SET NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    payment_method VARCHAR(50) NOT NULL,
    tendered_amount DECIMAL(12,2) NOT NULL,
    change DECIMAL(12,2) NOT NULL,
    cashier_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'completed'
);

-- 6. Tabel Transaction Items
CREATE TABLE transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    qty INTEGER NOT NULL,
    price DECIMAL(12,2) NOT NULL
);

-- 7. Tabel Shift Logs
CREATE TABLE shift_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    opening_cash DECIMAL(12,2),
    closing_cash DECIMAL(12,2)
);

-- 8. Tabel Stock Logs
CREATE TABLE stock_logs (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    change_qty INTEGER NOT NULL,
    reason VARCHAR(100) NOT NULL, -- 'sold', 'void', 'manual', 'restock'
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- FUNGSI & TRIGGER DATABASE
-- ==========================================

-- A. Trigger Pengurangan Stok Otomatis
CREATE OR REPLACE FUNCTION reduce_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Kurangi stok
  UPDATE products SET stock = stock - NEW.qty WHERE id = NEW.product_id;
  
  -- Catat ke stock_logs
  INSERT INTO stock_logs (product_id, change_qty, reason, transaction_id)
  VALUES (NEW.product_id, -NEW.qty, 'sold', NEW.transaction_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reduce_stock
AFTER INSERT ON transaction_items
FOR EACH ROW EXECUTE FUNCTION reduce_stock_on_sale();


-- B. Trigger Pengembalian Stok (VOID)
CREATE OR REPLACE FUNCTION restore_stock_on_void()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
BEGIN
  IF NEW.status = 'voided' AND OLD.status = 'completed' THEN
    FOR item IN SELECT * FROM transaction_items WHERE transaction_id = NEW.id LOOP
      -- Tambah stok kembali
      UPDATE products SET stock = stock + item.qty WHERE id = item.product_id;
      
      -- Catat ke stock_logs
      INSERT INTO stock_logs (product_id, change_qty, reason, transaction_id, user_id)
      VALUES (item.product_id, item.qty, 'void', NEW.id, NEW.cashier_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restore_stock
AFTER UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION restore_stock_on_void();

-- ==========================================
-- KEBIJAKAN KEAMANAN (RLS - Row Level Security)
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;

-- Untuk mudahnya di tahap awal, kita beri akses READ/WRITE kepada semua user yang ter-autentikasi (login)
CREATE POLICY "Authenticated users can select profiles" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update profiles" ON profiles FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth select categories" ON categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert categories" ON categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update categories" ON categories FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth select discounts" ON discounts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert discounts" ON discounts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update discounts" ON discounts FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth select products" ON products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert products" ON products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update products" ON products FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Auth delete products" ON products FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth select transactions" ON transactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert transactions" ON transactions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update transactions" ON transactions FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth select transaction_items" ON transaction_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert transaction_items" ON transaction_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth select shift_logs" ON shift_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert shift_logs" ON shift_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update shift_logs" ON shift_logs FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth select stock_logs" ON stock_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert stock_logs" ON stock_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

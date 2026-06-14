import { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { useStore } from '../context/StoreContext';
import { db } from '../db/localDb';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Filter } from 'lucide-react';

export default function ProductGrid() {
  const { org, store } = useStore();
  const { addToCart, cart } = useCartStore();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Ambil data secara reaktif dari database lokal (Offline-First)
  const categories = useLiveQuery(
    () => db.categories.where('org_id').equals(org?.id || '').toArray(),
    [org?.id],
    []
  );

  const products = useLiveQuery(
    async () => {
      if (!org || !store) return [];
      // Ambil produk dan mapping nama kategori
      const prods = await db.products.where('org_id').equals(org.id).toArray();
      const cats = await db.categories.where('org_id').equals(org.id).toArray();
      
      const catMap = cats.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {});
      
      return prods
        .filter(p => p.store_id === store.id) // Ketat: Hanya produk toko ini
        .map(p => ({
          ...p,
          categories: p.category_id ? { name: catMap[p.category_id] } : null
        }));
    },
    [org?.id, store?.id],
    [] // default value while loading
  );

  // Jika products masih undefined (loading initial Dexie query)
  const loading = !products || !categories;

  const filteredProducts = (products || []).filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    const matchCat = filterCategory === 'all' || p.category_id?.toString() === filterCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-3 mb-4">
        <div className="relative flex items-center flex-1">
          <Search size={20} className="absolute left-4 text-muted" />
          <input 
            type="text" 
            className="input pl-12 h-12 rounded-lg text-base shadow-sm" 
            placeholder="Cari produk atau scan barcode..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex items-center gap-2 bg-white px-3 rounded-lg border border-border">
          <Filter size={16} className="text-muted" />
          <select 
            className="border-none bg-transparent outline-none text-sm cursor-pointer"
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="all">Semua Kategori</option>
            {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted">Memuat produk (Offline DB)...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(product => {
              const cartItem = cart.find(c => c.id === product.id);
              const currentStock = product.stock - (cartItem ? cartItem.qty : 0);
              const isOutOfStock = currentStock <= 0;

              return (
                <button 
                  key={product.id} 
                  className={`bg-white border border-border rounded-lg overflow-hidden cursor-pointer transition-all flex flex-col text-left p-0 ${
                    isOutOfStock ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:-translate-y-1 hover:shadow-md hover:border-primary/50'
                  }`}
                  onClick={() => !isOutOfStock && addToCart(product)}
                  disabled={isOutOfStock}
                >
                  <div className="relative w-full aspect-square bg-bg-main">
                    <img 
                      className="w-full h-full object-cover"
                      src={product.image_url || 'https://placehold.co/400x400/eeeeee/333333?text=Foto+Produk'} 
                      alt={product.name} 
                      onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x400/eeeeee/333333?text=${encodeURIComponent(product.name)}` }}
                    />
                    <span className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                      Sisa: {currentStock}
                    </span>
                    {cartItem && (
                      <span className="absolute bottom-2 left-2 bg-accent text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm z-10">
                        Di Keranjang
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold mb-1 line-clamp-2">{product.name}</h3>
                    <p className="text-primary font-bold text-base">Rp {product.price.toLocaleString('id-ID')}</p>
                  </div>
                </button>
              )
            })}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-muted">
              Produk tidak ditemukan di database lokal.
            </div>
          )}
        </>
      )}
    </div>
  );
}

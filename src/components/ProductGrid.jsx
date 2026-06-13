import { useState, useEffect } from 'react';
import { supabase } from '../db/supabaseClient';
import { useCart } from '../context/CartContext';
import { Search } from 'lucide-react';
import './ProductGrid.css';

export default function ProductGrid() {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, cart } = useCart();
  
  useEffect(() => {
    fetchProducts();
    
    // Subscribe to realtime changes on products table
    const channel = supabase
      .channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
      
    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="product-grid-container">
      <div className="search-bar">
        <Search size={20} className="search-icon text-muted" />
        <input 
          type="text" 
          className="input search-input" 
          placeholder="Cari produk atau scan barcode..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted">Memuat produk...</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 lg:grid-cols-4">
            {filteredProducts.map(product => {
              const cartItem = cart.find(c => c.id === product.id);
              const currentStock = product.stock - (cartItem ? cartItem.qty : 0);
              const isOutOfStock = currentStock <= 0;

              return (
                <button 
                  key={product.id} 
                  className={`product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
                  onClick={() => !isOutOfStock && addToCart(product)}
                  disabled={isOutOfStock}
                >
                  <div className="product-image-container">
                    <img src={product.image_url || 'https://via.placeholder.com/150'} alt={product.name} />
                    <span className="stock-badge">Sisa: {currentStock}</span>
                  </div>
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-price">Rp {product.price.toLocaleString('id-ID')}</p>
                  </div>
                </button>
              )
            })}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-muted">
              Produk tidak ditemukan.
            </div>
          )}
        </>
      )}
    </div>
  );
}

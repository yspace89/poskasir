import { useState, useEffect } from 'react';
import { supabase } from '../db/supabaseClient';
import { useStore } from '../context/StoreContext';
import { usePlan } from '../context/PlanContext';
import { Plus, Edit2, Trash2, Tag, Filter } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import './ProductManagement.css';

export default function ProductManagement() {
  const { store, org, role, can, allStores } = useStore();
  const { isPremium, limits, withinLimit } = usePlan();
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSourceStore, setImportSourceStore] = useState('');
  const [importableProducts, setImportableProducts] = useState([]);
  const [selectedImportProducts, setSelectedImportProducts] = useState([]);
  const [importLoading, setImportLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', sku: '', category_id: '', price: '', stock: '', image_url: ''
  });

  const fetchProducts = async () => {
    if (!org || !store) return;
    setLoading(true);
    let query = supabase.from('products').select('*, categories(name)').eq('store_id', store.id);
    
    query = query.eq('is_active', true).order('id', { ascending: false });

    const { data } = await query;
    if (data) setProducts(data);
    setLoading(false);
  };

  const fetchCategories = async () => {
    if (!org) return;
    const { data } = await supabase.from('categories').select('*').eq('org_id', org.id).order('name');
    if (data) setCategories(data);
  };

  useEffect(() => {
    if (org && store) {
      const migrateOldProducts = async () => {
        await supabase
          .from('products')
          .update({ store_id: store.id })
          .is('store_id', null)
          .eq('org_id', org.id);
      };

      const cleanupBrokenImages = async () => {
        const { data: prods } = await supabase.from('products').select('id, image_url').eq('store_id', store.id);
        if (prods) {
          for (const p of prods) {
            if (p.image_url && p.image_url.includes('tokopedia.net')) {
              await supabase.from('products').update({ image_url: null }).eq('id', p.id);
            }
          }
        }
      };

      migrateOldProducts().then(cleanupBrokenImages).then(() => {
        fetchProducts();
        fetchCategories();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org, store]);

  const handleOpenModal = (product = null) => {
    if (!product && !isPremium && !withinLimit('products', products.length)) {
      alert(`Limit Free Plan: Maksimal ${limits.products} produk. Upgrade ke Premium untuk menambah produk.`);
      return;
    }

    if (product) {
      setEditingId(product.id);
      setFormData({
        name: product.name, sku: product.sku,
        category_id: product.category_id || (categories.length > 0 ? categories[0].id : ''),
        price: product.price, stock: product.stock, image_url: product.image_url || ''
      });
    } else {
      setEditingId(null);
      setFormData({ 
        name: '', sku: '', 
        category_id: categories.length > 0 ? categories[0].id : '', 
        price: '', stock: '', image_url: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      org_id: org.id,
      store_id: store.id, // Strictly tie product to current store
      price: Number(formData.price),
      stock: Number(formData.stock),
      category_id: formData.category_id ? Number(formData.category_id) : null
    };

    if (editingId) {
      await supabase.from('products').update(dataToSave).eq('id', editingId);
    } else {
      await supabase.from('products').insert([dataToSave]);
    }
    
    handleCloseModal();
    fetchProducts();
  };

  // --- Import Logic ---
  const handleOpenImportModal = () => {
    setIsImportModalOpen(true);
    setImportSourceStore('');
    setImportableProducts([]);
    setSelectedImportProducts([]);
  };

  const handleSourceStoreChange = async (sourceId) => {
    setImportSourceStore(sourceId);
    if (!sourceId) {
      setImportableProducts([]);
      return;
    }
    setImportLoading(true);
    // Fetch products from source store
    const { data: sourceProducts } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', sourceId)
      .eq('is_active', true);
    
    if (sourceProducts) {
      // Filter out products that already exist in current store (by sku or name)
      const existingSkus = products.filter(p => p.sku).map(p => p.sku);
      const existingNames = products.map(p => p.name.toLowerCase());
      
      const filtered = sourceProducts.filter(sp => {
        if (sp.sku && existingSkus.includes(sp.sku)) return false;
        if (existingNames.includes(sp.name.toLowerCase())) return false;
        return true;
      });
      setImportableProducts(filtered);
    }
    setImportLoading(false);
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (selectedImportProducts.length === 0) return;
    setImportLoading(true);

    const itemsToInsert = selectedImportProducts.map(sp => ({
      org_id: org.id,
      store_id: store.id,
      sku: sp.sku,
      name: sp.name,
      category_id: sp.category_id,
      price: sp.price,
      stock: 0, // Reset stock
      min_stock: sp.min_stock,
      image_url: sp.image_url
    }));

    await supabase.from('products').insert(itemsToInsert);
    
    setIsImportModalOpen(false);
    setImportLoading(false);
    fetchProducts();
  };
  // -------------------

  const handleImageUpload = async (e) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${org.id}-${Math.random()}.${fileExt}`; // tenant-isolated file path
      
      let { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
    } catch (error) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (productToDelete) {
      // Soft delete
      await supabase.from('products').update({ is_active: false }).eq('id', productToDelete);
      setProductToDelete(null);
      fetchProducts();
    }
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchCat = filterCategory === 'all' || p.category_id?.toString() === filterCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="product-management">
      <header className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Produk</h1>
          <p className="text-sm text-muted">{products.length} produk aktif terdaftar</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="search-bar">
            <input 
              type="text" className="input" placeholder="Cari nama / SKU..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} className="text-muted" />
            <select className="input" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '0.4rem 2rem 0.4rem 0.5rem' }}>
              <option value="all">Semua Kategori</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {can('manage_products') && (
            <div className="flex gap-2">
              {allStores && allStores.length > 1 && (
                <button className="btn btn-outline flex items-center gap-1" onClick={handleOpenImportModal}>
                  <Plus size={16} /> Import Cabang Lain
                </button>
              )}
              <button className="btn btn-primary flex items-center gap-1" onClick={() => handleOpenModal()}>
                <Plus size={16} /> Tambah Produk
              </button>
            </div>
          )}
        </div>
      </header>

      {!isPremium && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex justify-between items-center">
          <span>Plan Free Anda bisa menambahkan maksimal {limits.products} produk. Saat ini digunakan: {products.length}.</span>
          {products.length >= limits.products && <a href="/settings" className="font-bold underline">Upgrade Premium</a>}
        </div>
      )}

      <div className="card table-container">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th>Gambar</th>
              <th>SKU</th>
              <th>Nama Produk</th>
              <th>Kategori</th>
              <th>Harga</th>
              <th>Stok</th>
              {can('manage_products') && <th className="text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="text-center py-6 text-muted">Memuat data...</td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-6 text-muted">Tidak ada produk ditemukan.</td></tr>
            ) : (
              filteredProducts.map(product => (
                <tr key={product.id}>
                  <td style={{ width: '60px' }}>
                    <div 
                      style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ccc', cursor: 'pointer' }}
                      onClick={() => setPreviewImage(product.image_url)}
                      title="Klik untuk memperbesar"
                    >
                      <img 
                        src={product.image_url || 'https://placehold.co/400x400/eeeeee/333333?text=Foto'} 
                        alt={product.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/40x40/eeeeee/333333?text=${encodeURIComponent(product.name.charAt(0))}` }}
                      />
                    </div>
                  </td>
                  <td><code className="text-xs px-2 py-1 bg-gray-100 rounded">{product.sku}</code></td>
                  <td className="font-medium">{product.name}</td>
                  <td>
                    {product.categories?.name ? (
                      <span className="flex items-center gap-1 text-sm text-muted"><Tag size={12}/> {product.categories.name}</span>
                    ) : '—'}
                  </td>
                  <td className="font-semibold text-primary">Rp {product.price.toLocaleString('id-ID')}</td>
                  <td>
                    <span className={`stock-badge-table ${product.stock <= product.min_stock ? 'low-stock' : ''}`}>
                      {product.stock}
                    </span>
                  </td>
                  {can('manage_products') && (
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button className="btn-icon" onClick={() => handleOpenModal(product)}><Edit2 size={16} /></button>
                        <button className="btn-icon" onClick={() => setProductToDelete(product.id)}><Trash2 size={16} className="text-danger" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {previewImage && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }} 
          onClick={() => setPreviewImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '800px', maxHeight: '90vh', borderRadius: '8px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <button 
              style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: '50%', width: '32px', height: '32px', border: 'none', cursor: 'pointer' }}
              onClick={() => setPreviewImage(null)}
            >✕</button>
            <img src={previewImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', backgroundColor: 'white' }} />
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Produk' : 'Tambah Produk'}</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body flex-col gap-4">
                <div className="form-group">
                  <label className="text-sm font-medium mb-1">Nama Produk *</label>
                  <input required type="text" className="input" placeholder="Indomie Goreng" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="text-sm font-medium mb-1">SKU</label>
                    <input type="text" className="input" placeholder="PRD-001" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="text-sm font-medium mb-1">Kategori</label>
                    <select className="input" value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}>
                      <option value="">-- Pilih Kategori --</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="text-sm font-medium mb-1">Harga Jual (Rp) *</label>
                    <input required type="number" min="0" className="input" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="text-sm font-medium mb-1">Stok Tersedia *</label>
                    <input required type="number" min="0" className="input" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="text-sm font-medium mb-1">Foto Produk</label>
                  <div className="flex gap-3 items-center">
                    {formData.image_url && (
                      <div style={{ width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ccc', flexShrink: 0 }}>
                        <img src={formData.image_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <input type="file" accept="image/*" className="input" onChange={handleImageUpload} disabled={uploading} style={{ padding: '0.4rem' }} />
                    </div>
                  </div>
                  {uploading && <p className="text-xs text-primary mt-1">Mengunggah gambar...</p>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={handleCloseModal}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>Simpan Produk</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="text-xl font-bold">Import dari Cabang Lain</h2>
            </div>
            <form onSubmit={handleImportSubmit}>
              <div className="modal-body flex-col gap-4">
                <div className="form-group">
                  <label className="text-sm font-medium mb-1">Pilih Cabang Sumber</label>
                  <select 
                    required
                    className="input" 
                    value={importSourceStore} 
                    onChange={e => handleSourceStoreChange(e.target.value)}
                  >
                    <option value="">-- Pilih Cabang --</option>
                    {allStores.filter(s => s.id !== store?.id).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {importSourceStore && (
                  <div className="form-group mt-2">
                    <label className="text-sm font-medium mb-2 block">Pilih Produk untuk Diimpor ({importableProducts.length} produk tersedia)</label>
                    {importLoading ? (
                      <p className="text-sm text-muted">Memuat data produk...</p>
                    ) : importableProducts.length === 0 ? (
                      <p className="text-sm text-muted">Semua produk dari cabang ini sudah ada di cabang Anda.</p>
                    ) : (
                      <div className="max-h-60 overflow-y-auto border border-border rounded-lg p-2 flex flex-col gap-2">
                        {importableProducts.map(p => (
                          <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-bg-main rounded cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={selectedImportProducts.some(sp => sp.id === p.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedImportProducts(prev => [...prev, p]);
                                else setSelectedImportProducts(prev => prev.filter(sp => sp.id !== p.id));
                              }}
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{p.name}</p>
                              <p className="text-xs text-muted">{p.sku} • Rp {p.price.toLocaleString('id-ID')}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsImportModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={importLoading || selectedImportProducts.length === 0}>
                  {importLoading ? 'Menyimpan...' : `Import ${selectedImportProducts.length} Produk`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={!!productToDelete}
        title="Hapus Produk"
        message="Apakah Anda yakin ingin menghapus produk ini? (Data akan disembunyikan dan masih dapat dilihat pada laporan masa lalu)"
        type="danger"
        confirmText="Ya, Hapus"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
}

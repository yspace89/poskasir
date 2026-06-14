import { useState, useEffect } from 'react';
import { supabase } from '../db/supabaseClient';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import './ProductManagement.css';

export default function ProductManagement({ userRole }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category_id: '',
    price: '',
    stock: '',
    image_url: ''
  });
  const [accessDeniedMessage, setAccessDeniedMessage] = useState(null);

  const checkAccess = () => {
    if (userRole === 'trainee') {
      setAccessDeniedMessage('Maaf, peran Admin Trainee tidak memiliki izin untuk menambah, mengedit, atau menghapus data produk ini.');
      return false;
    }
    return true;
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('products')
      .select('*, categories(name)')
      .order('id', { ascending: false });
    
    if (data) setProducts(data);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingId(product.id);
      setFormData({
        name: product.name,
        sku: product.sku,
        category_id: product.category_id || (categories.length > 0 ? categories[0].id : ''),
        price: product.price,
        stock: product.stock,
        image_url: product.image_url || ''
      });
    } else {
      setEditingId(null);
      setFormData({ 
        name: '', 
        sku: '', 
        category_id: categories.length > 0 ? categories[0].id : '', 
        price: '', 
        stock: '', 
        image_url: '' 
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
      price: Number(formData.price),
      stock: Number(formData.stock),
      category_id: Number(formData.category_id)
    };

    if (editingId) {
      await supabase.from('products').update(dataToSave).eq('id', editingId);
    } else {
      await supabase.from('products').insert([dataToSave]);
    }
    
    handleCloseModal();
    fetchProducts();
  };

  const handleImageUpload = async (e) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      let { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
      
      setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
    } catch (error) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (productToDelete) {
      await supabase.from('products').delete().eq('id', productToDelete);
      setProductToDelete(null);
      fetchProducts();
    }
  };

  return (
    <div className="product-management">
      <header className="page-header flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manajemen Produk</h1>
        <div className="flex items-center gap-4">
          <div className="search-bar">
            <input 
              type="text" 
              className="input" 
              placeholder="Cari nama produk..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => {
            if(checkAccess()) handleOpenModal();
          }}>
            <Plus size={18} /> Tambah Produk
          </button>
        </div>
      </header>

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
              <th className="text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-4 text-muted">Memuat data...</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-4 text-muted">Belum ada produk.</td>
              </tr>
            ) : (
              products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(product => (
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
                  <td>{product.sku}</td>
                  <td className="font-medium">{product.name}</td>
                  <td>{product.categories?.name || 'Uncategorized'}</td>
                  <td>Rp {product.price.toLocaleString('id-ID')}</td>
                  <td>
                    <span className={`stock-badge-table ${product.stock <= 5 ? 'low-stock' : ''}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="text-right">
                    <button className="btn-icon mr-2" onClick={() => {
                      if(checkAccess()) handleOpenModal(product);
                    }}>
                      <Edit2 size={16} className="text-primary" />
                    </button>
                    <button className="btn-icon" onClick={() => {
                      if(checkAccess()) setProductToDelete(product.id);
                    }}>
                      <Trash2 size={16} className="text-danger" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }} 
          onClick={() => setPreviewImage(null)}
        >
          <div 
            style={{ position: 'relative', maxWidth: '800px', maxHeight: '90vh', borderRadius: '8px', overflow: 'hidden' }} 
            onClick={e => e.stopPropagation()}
          >
            <button 
              style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
              onClick={() => setPreviewImage(null)}
            >
              ✕
            </button>
            <img 
              src={previewImage} 
              alt="Preview" 
              style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', backgroundColor: 'white' }}
              onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/800x800/eeeeee/333333?text=Gambar+Rusak' }}
            />
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass">
            <div className="modal-header">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Produk' : 'Tambah Produk'}</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body flex-col gap-4">
                <div className="form-group">
                  <label className="text-sm font-medium mb-1">Nama Produk</label>
                  <input required type="text" className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="text-sm font-medium mb-1">SKU</label>
                    <input required type="text" className="input" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="text-sm font-medium mb-1">Kategori</label>
                    <select 
                      className="input" 
                      required 
                      value={formData.category_id} 
                      onChange={e => setFormData({...formData, category_id: e.target.value})}
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="text-sm font-medium mb-1">Harga (Rp)</label>
                    <input required type="number" min="0" className="input" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="text-sm font-medium mb-1">Stok</label>
                    <input required type="number" min="0" className="input" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="text-sm font-medium mb-1">Gambar Produk</label>
                  <div className="flex gap-2 items-center">
                    <div style={{ flex: 1 }}>
                      <input 
                        type="file" 
                        accept="image/*"
                        className="input" 
                        onChange={handleImageUpload} 
                        disabled={uploading}
                      />
                    </div>
                    {formData.image_url && (
                      <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #ccc' }}>
                        <img src={formData.image_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                  </div>
                  {uploading && <p className="text-xs text-muted mt-1">Mengunggah gambar...</p>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={handleCloseModal}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={!!productToDelete}
        title="Hapus Produk"
        message="Apakah Anda yakin ingin menghapus produk ini? Tindakan ini akan menghapus produk secara permanen dari sistem."
        type="danger"
        confirmText="Ya, Hapus"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setProductToDelete(null)}
      />

      <ConfirmModal 
        isOpen={!!accessDeniedMessage}
        title="Akses Ditolak"
        message={accessDeniedMessage}
        type="warning"
        isAlert={true}
        onCancel={() => setAccessDeniedMessage(null)}
      />
    </div>
  );
}


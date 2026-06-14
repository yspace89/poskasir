import { useState, useEffect } from 'react';
import { supabase } from '../db/supabaseClient';
import { useStore } from '../context/StoreContext';
import { usePlan } from '../context/PlanContext';
import { RotateCcw, Eye, Download, Lock } from 'lucide-react';
import Receipt from '../components/Receipt';
import ConfirmModal from '../components/ConfirmModal';
import './Reports.css';

export default function Reports() {
  const { store, can } = useStore();
  const { isPremium } = usePlan();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewReceipt, setViewReceipt] = useState(null);
  const [dateFilter, setDateFilter] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [transactionToVoid, setTransactionToVoid] = useState(null);

  const fetchTransactions = async () => {
    if (!store) return;
    setLoading(true);
    let query = supabase
      .from('transactions')
      .select('*, transaction_items(*), profiles(full_name)')
      .eq('store_id', store.id)
      .order('id', { ascending: false });
      
    if (dateFilter !== 'all') {
      const now = new Date();
      let startD, endD;
      if (dateFilter === 'today') {
         startD = new Date(new Date().setHours(0,0,0,0)).toISOString();
         endD = new Date(new Date().setHours(23,59,59,999)).toISOString();
      } else if (dateFilter === 'yesterday') {
         const y = new Date(now);
         y.setDate(y.getDate() - 1);
         startD = new Date(y.setHours(0,0,0,0)).toISOString();
         endD = new Date(y.setHours(23,59,59,999)).toISOString();
      } else if (dateFilter === '7days') {
         const lw = new Date(now);
         lw.setDate(lw.getDate() - 6);
         startD = new Date(lw.setHours(0,0,0,0)).toISOString();
         endD = new Date(new Date().setHours(23,59,59,999)).toISOString();
      } else if (dateFilter === 'custom') {
         if (customStart) startD = new Date(customStart + 'T00:00:00.000Z').toISOString();
         if (customEnd) endD = new Date(customEnd + 'T23:59:59.999Z').toISOString();
      }
      
      if (startD) query = query.gte('date', startD);
      if (endD) query = query.lte('date', endD);
    }
      
    const { data } = await query;
    if (data) setTransactions(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
    
    if (store) {
      const channel = supabase
        .channel('public:transactions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `store_id=eq.${store.id}` }, () => {
          fetchTransactions();
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, customStart, customEnd, store]);

  const totalRevenue = transactions?.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.total, 0) || 0;
  const totalTransactions = transactions?.filter(t => t.status === 'completed').length || 0;

  const handleVoidConfirm = async () => {
    if (transactionToVoid) {
      try {
        const { error: trxError } = await supabase
          .from('transactions')
          .update({ status: 'voided' })
          .eq('id', transactionToVoid.id);
          
        if (trxError) throw trxError;
        setTransactionToVoid(null);
        fetchTransactions();
      } catch (err) {
        console.error('Error voiding transaction:', err);
        alert('Gagal membatalkan transaksi.');
      }
    }
  };

  const handleViewReceipt = (transaction) => {
    const formattedTransaction = {
      ...transaction,
      discountAmount: transaction.discount_amount,
      paymentMethod: transaction.payment_method,
      tenderedAmount: transaction.tendered_amount,
      cashierName: transaction.profiles?.full_name || 'Kasir',
      items: transaction.transaction_items.map(item => ({
        name: item.product_name,
        qty: item.qty,
        price: item.price
      }))
    };
    setViewReceipt(formattedTransaction);
  };

  const handleExportCSV = () => {
    if (!isPremium) {
      alert("Fitur Export CSV hanya tersedia di Paket Premium.");
      return;
    }
    const headers = ['ID,Waktu,Kasir,Metode Pembayaran,Total,Status\n'];
    const rows = transactions.map(t => 
      `TRX-${t.id},"${new Date(t.date).toLocaleString('id-ID')}","${t.profiles?.full_name || 'Admin'}",${t.payment_method},${t.total},${t.status}`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Transaksi_${store?.name}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="reports-page">
      <header className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Laporan & Riwayat</h1>
          <p className="text-sm text-muted">{store?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-muted">Filter Waktu:</label>
          <select 
            className="input py-2" 
            style={{ width: 'auto', minWidth: '150px' }}
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="today">Hari Ini</option>
            <option value="yesterday">Kemarin</option>
            <option value="7days">7 Hari Terakhir</option>
            <option value="custom">Kustom Range</option>
            <option value="all">Semua Waktu</option>
          </select>
          
          <button className="btn btn-outline flex items-center gap-2" onClick={handleExportCSV}>
            <Download size={16} /> Export CSV
            {!isPremium && <Lock size={12} className="text-warning" />}
          </button>
        </div>
      </header>

      {dateFilter === 'custom' && (
        <div className="flex items-center gap-4 mb-6 card p-4">
           <div className="flex items-center gap-2">
             <label className="text-sm font-medium">Dari:</label>
             <input type="date" className="input" value={customStart} onChange={e => setCustomStart(e.target.value)} />
           </div>
           <div className="flex items-center gap-2">
             <label className="text-sm font-medium">Sampai:</label>
             <input type="date" className="input" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
           </div>
        </div>
      )}

      <div className="dashboard-summary grid grid-cols-3 gap-6 mb-8">
        <div className="card summary-card">
          <h3 className="text-muted text-sm mb-1">Total Pendapatan</h3>
          <p className="text-2xl font-bold text-primary">Rp {totalRevenue.toLocaleString('id-ID')}</p>
        </div>
        <div className="card summary-card">
          <h3 className="text-muted text-sm mb-1">Total Transaksi</h3>
          <p className="text-2xl font-bold">{totalTransactions}</p>
        </div>
      </div>

      <div className="card table-container">
        <h2 className="text-lg font-bold p-4 border-b border-border">Riwayat Transaksi</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th>ID</th>
              <th>Waktu</th>
              <th>Kasir</th>
              <th>Metode</th>
              <th>Total</th>
              <th>Status</th>
              <th className="text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="text-center py-4 text-muted">Memuat riwayat transaksi...</td></tr>
            ) : transactions?.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-4 text-muted">Belum ada transaksi.</td></tr>
            ) : (
              transactions?.map(trx => (
                <tr key={trx.id} className={trx.status === 'voided' ? 'opacity-50' : ''}>
                  <td>TRX-{trx.id}</td>
                  <td>{new Date(trx.date).toLocaleString('id-ID')}</td>
                  <td>{trx.profiles?.full_name || 'Admin'}</td>
                  <td className="uppercase">{trx.payment_method}</td>
                  <td className="font-medium">Rp {trx.total.toLocaleString('id-ID')}</td>
                  <td>
                    <span className={`status-badge ${trx.status}`}>
                      {trx.status === 'voided' ? 'Dibatalkan' : 'Selesai'}
                    </span>
                  </td>
                  <td className="text-right">
                    {trx.transaction_items && (
                      <button className="btn-icon mr-2" title="Lihat Struk" onClick={() => handleViewReceipt(trx)}>
                        <Eye size={16} />
                      </button>
                    )}
                    {trx.status === 'completed' && trx.transaction_items && can('void_transactions') && (
                      <button className="btn-icon" title="Void Transaksi" onClick={() => setTransactionToVoid(trx)}>
                        <RotateCcw size={16} className="text-danger" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {viewReceipt && <Receipt transaction={viewReceipt} onClose={() => setViewReceipt(null)} />}

      <ConfirmModal 
        isOpen={!!transactionToVoid}
        title="Void Transaksi"
        message="Apakah Anda yakin ingin membatalkan (VOID) transaksi ini? Stok produk akan dikembalikan otomatis ke inventaris."
        type="warning"
        confirmText="Ya, Batalkan Transaksi"
        onConfirm={handleVoidConfirm}
        onCancel={() => setTransactionToVoid(null)}
      />
    </div>
  );
}

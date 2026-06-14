import { useState, useEffect } from 'react';
import { supabase } from '../db/supabaseClient';
import { useStore } from '../context/StoreContext';
import { usePlan } from '../context/PlanContext';
import { TrendingUp, ShoppingCart, Package, AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
  const { store, org } = useStore();
  const { canUse, plan } = usePlan();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ revenue: 0, transactions: 0, products: 0, lowStock: 0 });
  const [recentTrx, setRecentTrx] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!store) return;
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  const loadDashboard = async () => {
    setLoading(true);
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

    // Transaksi hari ini
    const { data: todayTrx } = await supabase
      .from('transactions')
      .select('total, status')
      .eq('store_id', store.id)
      .gte('date', todayStart.toISOString())
      .lte('date', todayEnd.toISOString());

    const revenue = todayTrx?.filter(t => t.status === 'completed').reduce((s, t) => s + t.total, 0) || 0;
    const transactions = todayTrx?.filter(t => t.status === 'completed').length || 0;

    // Total produk aktif
    const { count: productCount } = await supabase
      .from('products').select('id', { count: 'exact', head: true })
      .eq('org_id', org.id).eq('is_active', true);

    // Produk stok rendah
    const { data: lowStockData } = await supabase
      .from('products').select('id, name, stock, min_stock')
      .eq('org_id', org.id).eq('is_active', true)
      .lt('stock', 10).order('stock', { ascending: true }).limit(5);

    setStats({ revenue, transactions, products: productCount || 0, lowStock: lowStockData?.length || 0 });
    setLowStockItems(lowStockData || []);

    // Transaksi terbaru (5)
    const { data: recentData } = await supabase
      .from('transactions').select('id, date, total, payment_method, status, profiles(full_name)')
      .eq('store_id', store.id)
      .order('date', { ascending: false }).limit(5);
    setRecentTrx(recentData || []);

    // Chart 7 hari (premium only)
    if (canUse('reports_chart')) {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const start = new Date(d); start.setHours(0,0,0,0);
        const end = new Date(d); end.setHours(23,59,59,999);
        const { data } = await supabase.from('transactions')
          .select('total').eq('store_id', store.id).eq('status', 'completed')
          .gte('date', start.toISOString()).lte('date', end.toISOString());
        const total = data?.reduce((s, t) => s + t.total, 0) || 0;
        days.push({
          label: d.toLocaleDateString('id-ID', { weekday: 'short' }),
          value: total
        });
      }
      setChartData(days);
    }

    setLoading(false);
  };

  const maxChart = Math.max(...chartData.map(d => d.value), 1);
  const fmtRp = (n) => 'Rp ' + n.toLocaleString('id-ID');

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted">{store?.name} · Hari ini, {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </header>

      {loading ? (
        <div className="text-center py-8 text-muted">Memuat data...</div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="dashboard-stats">
            <div className="stat-card primary">
              <div className="stat-icon"><TrendingUp size={22} /></div>
              <div className="stat-body">
                <p className="stat-label">Pendapatan Hari Ini</p>
                <h3 className="stat-value">{fmtRp(stats.revenue)}</h3>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon accent"><ShoppingCart size={22} /></div>
              <div className="stat-body">
                <p className="stat-label">Transaksi Hari Ini</p>
                <h3 className="stat-value">{stats.transactions}</h3>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon secondary"><Package size={22} /></div>
              <div className="stat-body">
                <p className="stat-label">Total Produk Aktif</p>
                <h3 className="stat-value">{stats.products}</h3>
              </div>
            </div>
            {stats.lowStock > 0 && (
              <div className="stat-card warning">
                <div className="stat-icon warn"><AlertTriangle size={22} /></div>
                <div className="stat-body">
                  <p className="stat-label">Stok Hampir Habis</p>
                  <h3 className="stat-value">{stats.lowStock} produk</h3>
                </div>
              </div>
            )}
          </div>

          <div className="dashboard-grid">
            {/* Chart (Premium only) */}
            {canUse('reports_chart') ? (
              <div className="card chart-card">
                <div className="card-header">
                  <h2>Penjualan 7 Hari Terakhir</h2>
                </div>
                <div className="bar-chart">
                  {chartData.map((d, i) => (
                    <div key={i} className="bar-item">
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{ height: `${(d.value / maxChart) * 100}%` }}
                          title={fmtRp(d.value)}
                        />
                      </div>
                      <span className="bar-label">{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card chart-card premium-gate-card">
                <div className="premium-gate-content">
                  <span style={{ fontSize: '2rem' }}>📊</span>
                  <h3>Grafik Penjualan</h3>
                  <p>Visualisasi penjualan 7 hari tersedia di paket Premium</p>
                  <button className="btn btn-primary" onClick={() => navigate('/settings?tab=plan')}>
                    ⭐ Lihat Paket Premium
                  </button>
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            <div className="card recent-trx-card">
              <div className="card-header">
                <h2>Transaksi Terbaru</h2>
                <button className="btn-link" onClick={() => navigate('/reports')}>
                  Lihat semua <ArrowRight size={14} />
                </button>
              </div>
              {recentTrx.length === 0 ? (
                <p className="empty-state">Belum ada transaksi hari ini.</p>
              ) : (
                <div className="trx-list">
                  {recentTrx.map(t => (
                    <div key={t.id} className="trx-row">
                      <div>
                        <p className="trx-id">TRX-{t.id}</p>
                        <p className="text-xs text-muted">{new Date(t.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="text-right">
                        <p className="trx-amount">{fmtRp(t.total)}</p>
                        <p className="text-xs uppercase text-muted">{t.payment_method}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Low Stock */}
            {lowStockItems.length > 0 && (
              <div className="card low-stock-card">
                <div className="card-header">
                  <h2>⚠️ Stok Hampir Habis</h2>
                  <button className="btn-link" onClick={() => navigate('/products')}>
                    Kelola <ArrowRight size={14} />
                  </button>
                </div>
                <div className="low-stock-list">
                  {lowStockItems.map(p => (
                    <div key={p.id} className="low-stock-row">
                      <span className="low-stock-name">{p.name}</span>
                      <span className={`low-stock-qty ${p.stock <= 3 ? 'critical' : 'warning'}`}>
                        Sisa {p.stock}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <button className="quick-btn" onClick={() => navigate('/pos')}>
              <ShoppingCart size={20} /> Buka Kasir
            </button>
            <button className="quick-btn" onClick={() => navigate('/products')}>
              <Package size={20} /> Tambah Produk
            </button>
          </div>
        </>
      )}
    </div>
  );
}

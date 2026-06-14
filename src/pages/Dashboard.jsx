import { useState, useEffect } from 'react';
import { supabase } from '../db/supabaseClient';
import { useStore } from '../context/StoreContext';
import { usePlan } from '../context/PlanContext';
import { TrendingUp, ShoppingCart, Package, AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { store, org } = useStore();
  const { canUse } = usePlan();
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
    <div className="p-0 sm:p-2">
      <header className="mb-6">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border-l-4 border-l-primary border-y border-r border-border rounded-lg p-5 flex items-start gap-4 transition hover:shadow-md">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                <TrendingUp size={22} />
              </div>
              <div>
                <p className="text-xs text-muted font-medium mb-1">Pendapatan Hari Ini</p>
                <h3 className="text-[1.375rem] font-extrabold">{fmtRp(stats.revenue)}</h3>
              </div>
            </div>
            <div className="bg-white border border-border rounded-lg p-5 flex items-start gap-4 transition hover:shadow-md">
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent shrink-0">
                <ShoppingCart size={22} />
              </div>
              <div>
                <p className="text-xs text-muted font-medium mb-1">Transaksi Hari Ini</p>
                <h3 className="text-[1.375rem] font-extrabold">{stats.transactions}</h3>
              </div>
            </div>
            <div className="bg-white border border-border rounded-lg p-5 flex items-start gap-4 transition hover:shadow-md">
              <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary shrink-0">
                <Package size={22} />
              </div>
              <div>
                <p className="text-xs text-muted font-medium mb-1">Total Produk Aktif</p>
                <h3 className="text-[1.375rem] font-extrabold">{stats.products}</h3>
              </div>
            </div>
            {stats.lowStock > 0 && (
              <div className="bg-white border-l-4 border-l-warning border-y border-r border-border rounded-lg p-5 flex items-start gap-4 transition hover:shadow-md">
                <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center text-warning shrink-0">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <p className="text-xs text-muted font-medium mb-1">Stok Hampir Habis</p>
                  <h3 className="text-[1.375rem] font-extrabold">{stats.lowStock} produk</h3>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Chart (Premium only) */}
            {canUse('reports_chart') ? (
              <div className="card overflow-hidden">
                <div className="flex justify-between items-center p-4 lg:p-5 border-b border-border">
                  <h2 className="text-[0.9375rem] font-bold">Penjualan 7 Hari Terakhir</h2>
                </div>
                <div className="flex items-end justify-around h-[140px] px-5 pt-4 pb-3 gap-2">
                  {chartData.map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                      <div className="w-full flex-1 flex items-end bg-bg-main rounded overflow-hidden">
                        <div
                          className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t min-h-[2px] transition-all duration-400"
                          style={{ height: `${(d.value / maxChart) * 100}%` }}
                          title={fmtRp(d.value)}
                        />
                      </div>
                      <span className="text-[0.68rem] text-muted">{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card flex items-center justify-center">
                <div className="text-center p-8 flex flex-col items-center gap-2.5">
                  <span className="text-3xl mb-2">📊</span>
                  <h3 className="text-base font-bold">Grafik Penjualan</h3>
                  <p className="text-sm text-muted mb-2">Visualisasi penjualan 7 hari tersedia di paket Premium</p>
                  <button className="btn btn-primary" onClick={() => navigate('/settings?tab=plan')}>
                    ⭐ Lihat Paket Premium
                  </button>
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            <div className="card">
              <div className="flex justify-between items-center p-4 lg:p-5 border-b border-border">
                <h2 className="text-[0.9375rem] font-bold">Transaksi Terbaru</h2>
                <button className="flex items-center gap-1 bg-transparent border-none text-[0.8rem] text-primary font-medium cursor-pointer" onClick={() => navigate('/reports')}>
                  Lihat semua <ArrowRight size={14} />
                </button>
              </div>
              {recentTrx.length === 0 ? (
                <p className="p-6 text-center text-muted text-sm">Belum ada transaksi hari ini.</p>
              ) : (
                <div className="px-5 pb-4">
                  {recentTrx.map(t => (
                    <div key={t.id} className="flex justify-between items-center py-2.5 border-b border-border last:border-0">
                      <div>
                        <p className="text-[0.8rem] font-semibold">TRX-{t.id}</p>
                        <p className="text-xs text-muted">{new Date(t.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{fmtRp(t.total)}</p>
                        <p className="text-xs uppercase text-muted">{t.payment_method}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Low Stock */}
            {lowStockItems.length > 0 && (
              <div className="card lg:col-span-2">
                <div className="flex justify-between items-center p-4 lg:p-5 border-b border-border">
                  <h2 className="text-[0.9375rem] font-bold">⚠️ Stok Hampir Habis</h2>
                  <button className="flex items-center gap-1 bg-transparent border-none text-[0.8rem] text-primary font-medium cursor-pointer" onClick={() => navigate('/products')}>
                    Kelola <ArrowRight size={14} />
                  </button>
                </div>
                <div className="px-5 pb-4">
                  {lowStockItems.map(p => (
                    <div key={p.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                      <span className="text-[0.8rem] font-medium">{p.name}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.stock <= 3 ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning'}`}>
                        Sisa {p.stock}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <button className="flex items-center gap-2.5 px-5 py-3 bg-white border border-border rounded-md cursor-pointer text-sm font-semibold text-text-main transition hover:bg-primary hover:text-white hover:border-primary shadow-sm" onClick={() => navigate('/pos')}>
              <ShoppingCart size={20} /> Buka Kasir
            </button>
            <button className="flex items-center gap-2.5 px-5 py-3 bg-white border border-border rounded-md cursor-pointer text-sm font-semibold text-text-main transition hover:bg-primary hover:text-white hover:border-primary shadow-sm" onClick={() => navigate('/products')}>
              <Package size={20} /> Tambah Produk
            </button>
          </div>
        </>
      )}
    </div>
  );
}

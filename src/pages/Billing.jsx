import { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { usePlan } from '../context/PlanContext';
import { supabase } from '../db/supabaseClient';
import { CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import './Billing.css';

export default function Billing() {
  const { org, loadStores } = useStore();
  const { plan, isPremium, expiresAt } = usePlan();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Memuat script Snap Midtrans
  useEffect(() => {
    const snapScript = 'https://app.sandbox.midtrans.com/snap/snap.js';
    const clientKey = 'SB-Mid-client-XXXXXXXXXXXX'; // GANTI DENGAN CLIENT KEY ANDA NANTI

    const script = document.createElement('script');
    script.src = snapScript;
    script.setAttribute('data-client-key', clientKey);
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleCheckout = async () => {
    if (!org) return;
    setLoading(true);
    setError('');
    
    try {
      // 1. Panggil Edge Function kita untuk meminta Snap Token
      // NOTE: Karena ini belum ada, kita gunakan block try-catch untuk fallback
      const { data, error: fnError } = await supabase.functions.invoke('create-transaction', {
        body: { orgId: org.id, planId: 'observasi_1bln' }
      });

      if (fnError || !data?.token) {
        throw new Error('Gagal memanggil fungsi pembayaran atau Midtrans belum dikonfigurasi.');
      }

      // 2. Buka Snap Popup
      window.snap.pay(data.token, {
        onSuccess: function (result) {
          // Normalnya, backend webhook yang akan update DB. 
          // Tapi kita bisa reload data disini.
          setSuccess('Pembayaran berhasil! Silakan muat ulang halaman.');
          loadStores();
        },
        onPending: function (result) {
          setSuccess('Menunggu pembayaran Anda...');
        },
        onError: function (result) {
          setError('Pembayaran gagal atau dibatalkan.');
        },
        onClose: function () {
          setError('Anda menutup jendela pembayaran sebelum menyelesaikan.');
        }
      });
      
    } catch (err) {
      console.warn('Checkout Asli gagal (biasanya karena Edge Function/Keys belum ada). Beralih ke mode simulasi...', err);
      // --- FALLBACK MODE SIMULASI UNTUK TES LOKAL ---
      const confirmSimulate = window.confirm(
        "Sistem Midtrans sepertinya belum dikonfigurasi sepenuhnya dengan API Keys Anda.\n\n" +
        "Namun karena kita dalam tahap observasi, apakah Anda ingin SIMULASIKAN pembayaran berhasil?"
      );

      if (confirmSimulate) {
        await simulateSuccess();
      } else {
        setError(err.message || 'Pembayaran dibatalkan.');
      }
    } finally {
      setLoading(false);
    }
  };

  const simulateSuccess = async () => {
    try {
      setLoading(true);
      // Set expired 30 hari dari sekarang
      const newExp = new Date();
      newExp.setDate(newExp.getDate() + 30);

      const { error: dbErr } = await supabase
        .from('organizations')
        .update({ 
          plan: 'premium', 
          plan_expires_at: newExp.toISOString() 
        })
        .eq('id', org.id);

      if (dbErr) throw dbErr;

      setSuccess('🎉 Simulasi Berhasil! Paket Observasi Anda telah aktif.');
      await loadStores(); // Refresh context
    } catch (err) {
      setError('Gagal simulasi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateObj) => {
    if (!dateObj) return '-';
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(dateObj);
  };

  return (
    <div className="billing-page p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <CreditCard size={32} className="text-primary" />
        <h1 className="text-2xl font-bold">Tagihan & Langganan</h1>
      </div>

      {error && <div className="bg-danger/10 text-danger p-4 rounded-lg mb-6 flex items-center gap-2"><AlertCircle size={20}/> {error}</div>}
      {success && <div className="bg-success/10 text-success p-4 rounded-lg mb-6 flex items-center gap-2"><CheckCircle2 size={20}/> {success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Card */}
        <div className="card border border-border">
          <div className="card-header border-b border-border pb-4">
            <h2 className="text-lg font-bold">Status Saat Ini</h2>
          </div>
          <div className="card-body pt-4">
            <div className="mb-4">
              <p className="text-sm text-muted">Paket Aktif</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${isPremium ? 'bg-primary text-white' : 'bg-surface text-muted border border-border'}`}>
                  {isPremium ? '⭐ PREMIUM (Observasi)' : 'GRATIS'}
                </span>
              </div>
            </div>
            
            {isPremium && expiresAt && (
              <div className="mb-4">
                <p className="text-sm text-muted">Berlaku Sampai</p>
                <p className="font-medium">{formatDate(expiresAt)}</p>
              </div>
            )}

            {!isPremium && (
              <p className="text-sm text-muted mt-4">
                Anda saat ini menggunakan versi Gratis. Tingkatkan paket untuk membuka fitur Multi-Cabang, Laporan Lengkap, dan Diskon.
              </p>
            )}
          </div>
        </div>

        {/* Upgrade Card */}
        <div className="card border-2 border-primary relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
            REKOMENDASI
          </div>
          <div className="card-header border-b border-border pb-4">
            <h2 className="text-lg font-bold">Paket Observasi</h2>
            <p className="text-2xl font-black text-primary mt-2">Rp 50.000 <span className="text-sm text-muted font-normal">/ 1 Bulan</span></p>
          </div>
          <div className="card-body pt-4">
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm"><CheckCircle2 size={16} className="text-success"/> Fitur Multi-Cabang tanpa batas</li>
              <li className="flex items-center gap-2 text-sm"><CheckCircle2 size={16} className="text-success"/> Manajemen Diskon & Promo</li>
              <li className="flex items-center gap-2 text-sm"><CheckCircle2 size={16} className="text-success"/> Analitik & Export Laporan CSV</li>
              <li className="flex items-center gap-2 text-sm"><CheckCircle2 size={16} className="text-success"/> Riwayat Keluar-Masuk Stok Lengkap</li>
            </ul>

            <button 
              className="btn btn-primary w-full py-3"
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? 'Memproses...' : (isPremium ? 'Perpanjang Masa Aktif' : 'Upgrade Sekarang')}
            </button>
            <p className="text-xs text-center text-muted mt-3">
              Mendukung QRIS, GoPay, OVO, ShopeePay, Transfer Bank, dan Kartu Kredit via <strong>Midtrans</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

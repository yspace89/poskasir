import { useState, useEffect } from 'react';
import { supabase } from '../db/supabaseClient';
import { useStore } from '../context/StoreContext';
import { usePlan } from '../context/PlanContext';
import { UserPlus, Trash2, Shield } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import './TeamManagement.css';

const ROLES = [
  { value: 'owner', label: 'Owner', desc: 'Akses penuh ke semua fitur dan pengaturan' },
  { value: 'manager', label: 'Manager', desc: 'Bisa kelola produk, laporan, dan diskon' },
  { value: 'cashier', label: 'Kasir', desc: 'Hanya bisa proses transaksi di POS' },
  { value: 'trainee', label: 'Trainee', desc: 'POS saja, tidak bisa void/hapus' },
];

export default function TeamManagement() {
  const { store, org } = useStore();
  const { canUse, limits, isPremium } = usePlan();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('cashier');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [memberToRemove, setMemberToRemove] = useState(null);

  useEffect(() => {
    if (store && org) loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, org]);

  const loadMembers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('org_members')
      .select('*, profiles(full_name, avatar_url), store_members!inner(role, store_id)')
      .eq('org_id', org.id)
      .eq('store_members.store_id', store.id)
      .eq('is_active', true);
    setMembers(data || []);
    setLoading(false);
  };

  const handleInvite = async () => {
    setInviteError('');
    if (!inviteEmail) return;

    // Cek limit plan
    if (!isPremium && members.length >= limits.users) {
      setInviteError(`Plan Free hanya mendukung maksimal ${limits.users} anggota. Upgrade ke Premium untuk menambah lebih banyak.`);
      return;
    }

    setInviting(true);
    try {
      // Cek apakah user dengan email ini sudah ada di auth.users
      // (kita tidak bisa query auth.users langsung dari frontend, jadi kita pakai invitations table)
      const token = crypto.randomUUID();
      const { error } = await supabase.from('invitations').insert({
        org_id: org.id,
        store_id: store.id,
        email: inviteEmail,
        role: inviteRole,
        token,
      });
      if (error) throw error;

      alert(`✅ Undangan tersimpan!\n\nLink undangan untuk ${inviteEmail}:\n${window.location.origin}/join/${token}\n\nSalin link ini dan kirimkan ke karyawan Anda.`);
      setInviteEmail('');
      setShowInvite(false);
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async () => {
    if (!memberToRemove) return;
    await supabase.from('org_members')
      .update({ is_active: false })
      .eq('id', memberToRemove.id);
    await supabase.from('store_members')
      .delete()
      .eq('user_id', memberToRemove.user_id)
      .eq('store_id', store.id);
    setMemberToRemove(null);
    loadMembers();
  };

  const updateRole = async (memberId, userId, newRole) => {
    await supabase.from('org_members').update({ role: newRole }).eq('id', memberId);
    await supabase.from('store_members').update({ role: newRole }).eq('user_id', userId).eq('store_id', store.id);
    loadMembers();
  };

  return (
    <div className="team-page">
      <header className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Tim</h1>
          <p className="text-sm text-muted">{members.length} anggota aktif · {store?.name}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
          <UserPlus size={16} /> Undang Anggota
        </button>
      </header>

      {/* Plan limit warning */}
      {!isPremium && (
        <div className="plan-limit-banner">
          <span>🆓 Plan Free: {members.length}/{limits.users} anggota digunakan.</span>
          {members.length >= limits.users && (
            <a href="/settings" className="upgrade-link">Upgrade ke Premium →</a>
          )}
        </div>
      )}

      {/* Invite form */}
      {showInvite && (
        <div className="card invite-form">
          <h3 className="font-semibold mb-3">Undang Anggota Baru</h3>
          <div className="invite-fields">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Email</label>
              <input className="input" type="email" placeholder="kasir@email.com"
                value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Peran</label>
              <select className="input" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          {inviteError && <p className="text-danger text-xs mt-2">{inviteError}</p>}
          <p className="invite-desc">{ROLES.find(r => r.value === inviteRole)?.desc}</p>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-outline" onClick={() => setShowInvite(false)}>Batal</button>
            <button className="btn btn-primary" onClick={handleInvite} disabled={inviting || !inviteEmail}>
              {inviting ? 'Membuat link...' : 'Buat Link Undangan'}
            </button>
          </div>
        </div>
      )}

      {/* Members table */}
      <div className="card table-container">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th>Anggota</th>
              <th>Peran</th>
              <th>Status</th>
              <th className="text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="text-center py-6 text-muted">Memuat...</td></tr>
            ) : members.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-6 text-muted">Belum ada anggota tim.</td></tr>
            ) : members.map(m => (
              <tr key={m.id}>
                <td>
                  <div className="member-info">
                    <div className="member-avatar">{(m.profiles?.full_name || 'U').charAt(0).toUpperCase()}</div>
                    <div>
                      <p className="font-medium text-sm">{m.profiles?.full_name || 'Unnamed'}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <select
                    className="role-select"
                    value={m.store_members?.[0]?.role || m.role}
                    onChange={e => updateRole(m.id, m.user_id, e.target.value)}
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <span className="status-badge completed">Aktif</span>
                </td>
                <td className="text-right">
                  <button className="btn-icon" onClick={() => setMemberToRemove(m)} title="Nonaktifkan">
                    <Trash2 size={16} className="text-danger" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role descriptions */}
      <div className="card role-guide">
        <h3 className="font-semibold mb-3"><Shield size={16} style={{ display: 'inline', marginRight: '6px' }} />Panduan Peran</h3>
        <div className="role-grid">
          {ROLES.map(r => (
            <div key={r.value} className="role-item">
              <span className={`role-badge role-${r.value}`}>{r.label}</span>
              <span className="text-sm text-muted">{r.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!memberToRemove}
        title="Nonaktifkan Anggota"
        message={`Apakah Anda yakin ingin menonaktifkan ${memberToRemove?.profiles?.full_name}? Mereka tidak akan bisa login ke toko ini.`}
        type="warning"
        confirmText="Ya, Nonaktifkan"
        onConfirm={handleRemove}
        onCancel={() => setMemberToRemove(null)}
      />
    </div>
  );
}

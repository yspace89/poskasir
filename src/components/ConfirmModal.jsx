import { AlertTriangle, Info } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  type = 'danger', // 'danger' or 'warning'
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  isAlert = false
}) {
  if (!isOpen) return null;

  const isDanger = type === 'danger';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onCancel}>
      <div 
        className="glass"
        style={{ position: 'relative', width: '100%', maxWidth: '400px', borderRadius: '12px', padding: '24px', backgroundColor: 'rgba(255, 255, 255, 0.95)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }} 
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: isDanger ? '#fee2e2' : '#fef3c7', padding: '10px', borderRadius: '50%', color: isDanger ? '#ef4444' : '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isDanger ? <AlertTriangle size={24} /> : <Info size={24} />}
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: '#111827' }}>{title}</h2>
        </div>
        
        <p style={{ color: '#4b5563', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
          {message}
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
          {!isAlert && (
            <button 
              className="btn btn-outline" 
              style={{ padding: '8px 16px', fontWeight: '500' }} 
              onClick={onCancel}
            >
              {cancelText}
            </button>
          )}
          <button 
            className="btn" 
            style={{ backgroundColor: isDanger ? '#ef4444' : '#f59e0b', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', fontWeight: '500', cursor: 'pointer' }} 
            onClick={() => {
              if (onConfirm) onConfirm();
              if (onCancel) onCancel();
            }}
          >
            {isAlert ? 'Mengerti' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

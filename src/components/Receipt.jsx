import { X, Printer } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import './Receipt.css';

export default function Receipt({ transaction, onClose }) {
  const { store } = useStore();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay receipt-modal-overlay">
      <div className="modal-content receipt-container">
        <div className="modal-header no-print">
          <h2 className="text-xl font-bold">Struk Transaksi</h2>
          <div className="flex gap-2">
            <button className="btn btn-outline" onClick={handlePrint}><Printer size={20}/></button>
            <button className="btn-close" onClick={onClose}><X size={24}/></button>
          </div>
        </div>

        <div className="modal-body receipt-body" id="printable-receipt">
          <div className="receipt-header text-center mb-4">
            <h2 className="font-bold text-xl uppercase">{store?.name || 'KASIR POS'}</h2>
            {store?.address && <p className="text-sm">{store.address}</p>}
            {store?.phone && <p className="text-sm">Telp: {store.phone}</p>}
            <hr className="my-2 border-dashed border-gray-400" />
          </div>
          
          <div className="receipt-meta text-sm mb-4">
            <p>Tanggal: {new Date(transaction.date).toLocaleString('id-ID')}</p>
            <p>Kasir: {transaction.cashierName}</p>
            <p>No. Trans: TRX-{transaction.id}</p>
          </div>

          <hr className="my-2 border-dashed border-gray-400" />

          <div className="receipt-items mb-4">
            {transaction.items.map((item, idx) => (
              <div key={idx} className="receipt-item text-sm">
                <div className="font-semibold">{item.name}</div>
                <div className="flex justify-between">
                  <span>{item.qty} x {item.price.toLocaleString('id-ID')}</span>
                  <span>{(item.qty * item.price).toLocaleString('id-ID')}</span>
                </div>
              </div>
            ))}
          </div>

          <hr className="my-2 border-dashed border-gray-400" />

          <div className="receipt-summary text-sm">
            <div className="flex justify-between mb-1">
              <span>Subtotal</span>
              <span>{(transaction.total + transaction.discountAmount).toLocaleString('id-ID')}</span>
            </div>
            {transaction.discountAmount > 0 && (
              <div className="flex justify-between mb-1">
                <span>Diskon</span>
                <span>-{transaction.discountAmount.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg my-2">
              <span>TOTAL</span>
              <span>{transaction.total.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Metode</span>
              <span className="uppercase">{transaction.paymentMethod}</span>
            </div>
            {transaction.paymentMethod === 'cash' && (
              <>
                <div className="flex justify-between mb-1">
                  <span>Tunai</span>
                  <span>{transaction.tenderedAmount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between font-semibold mt-1">
                  <span>Kembali</span>
                  <span>{transaction.change.toLocaleString('id-ID')}</span>
                </div>
              </>
            )}
          </div>

          <hr className="my-4 border-dashed border-gray-400" />
          
          <div className="receipt-footer text-center text-sm">
            <p>Terima kasih atas kunjungan Anda!</p>
            <p>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</p>
          </div>
        </div>

        <div className="modal-footer no-print">
          <button className="btn btn-primary w-full" onClick={onClose}>Selesai</button>
        </div>
      </div>
    </div>
  );
}

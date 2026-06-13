import { useState } from 'react';
import ProductGrid from '../components/ProductGrid';
import Cart from '../components/Cart';
import PaymentModal from '../components/PaymentModal';
import Receipt from '../components/Receipt';
import './POS.css';

export default function POS() {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const handleCheckout = () => {
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = (transaction) => {
    setIsPaymentOpen(false);
    setReceiptData(transaction);
  };

  const handleCloseReceipt = () => {
    setReceiptData(null);
  };

  return (
    <div className="pos-container">
      <div className="pos-main">
        <header className="pos-header">
          <h1 className="text-2xl font-bold">Kasir</h1>
        </header>
        <div className="pos-content">
          <ProductGrid />
        </div>
      </div>
      <div className="pos-sidebar">
        <Cart onCheckout={handleCheckout} />
      </div>

      {isPaymentOpen && (
        <PaymentModal 
          onClose={() => setIsPaymentOpen(false)} 
          onSuccess={handlePaymentSuccess} 
        />
      )}

      {receiptData && (
        <Receipt 
          transaction={receiptData} 
          onClose={handleCloseReceipt} 
        />
      )}
    </div>
  );
}

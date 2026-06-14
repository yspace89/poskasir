import { useState } from 'react';
import ProductGrid from '../components/ProductGrid';
import Cart from '../components/Cart';
import PaymentModal from '../components/PaymentModal';
import Receipt from '../components/Receipt';

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
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-3rem)] gap-6">
      <div className="flex-1 flex flex-col">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Kasir</h1>
        </header>
        <div className="flex-1 overflow-y-auto">
          <ProductGrid />
        </div>
      </div>
      <div className="w-full lg:w-[350px] h-[500px] lg:h-full bg-white rounded-xl shadow-sm border border-border flex flex-col">
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

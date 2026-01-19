import React, { useState } from 'react';
import { PAYMENT_PLANS } from '../constants';
import { User, PaymentPlan } from '../types';
import { api } from '../services/supabase';
import { CreditCard, Copy, Check, Clock } from 'lucide-react';

interface StoreProps {
  user: User;
  refreshUser: () => void;
}

const Store: React.FC<StoreProps> = ({ user, refreshUser }) => {
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | null>(null);
  const [trxId, setTrxId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !paymentMethod || !trxId) return;

    setProcessing(true);
    // Simulate API delay
    await new Promise(r => setTimeout(r, 1500));
    
    const result = await api.submitPayment(user.id, selectedPlan.coins, paymentMethod, trxId);
    
    if (result) {
        setSuccess(true);
        refreshUser();
    }
    setProcessing(false);
  };

  const closeOverlay = () => {
    setSelectedPlan(null);
    setPaymentMethod(null);
    setTrxId('');
    setSuccess(false);
  }

  return (
    <div className="p-4 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Store</h1>
        <p className="text-sm text-gray-500">Buy coins to promote your channel faster.</p>
      </header>

      <div className="grid gap-4">
        {PAYMENT_PLANS.map((plan) => (
          <div 
            key={plan.id}
            onClick={() => setSelectedPlan(plan)}
            className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center hover:border-brand-500 transition-colors cursor-pointer active:scale-95 transform transition"
          >
            <div>
                <div className="text-brand-600 font-bold text-lg">{plan.coins} Coins</div>
                <div className="text-xs text-gray-400">Boost ~{plan.coins} subscribers</div>
            </div>
            <div className="bg-gray-50 px-4 py-2 rounded-lg font-mono font-semibold text-gray-800">
                ৳{plan.price}
            </div>
          </div>
        ))}
      </div>

      {/* Payment Modal/Overlay */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300">
                
                {!success ? (
                    <>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold">Checkout</h3>
                                <p className="text-sm text-gray-500">{selectedPlan.coins} Coins for ৳{selectedPlan.price}</p>
                            </div>
                            <button onClick={closeOverlay} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>

                        {!paymentMethod ? (
                            <div className="space-y-3">
                                <p className="text-sm font-medium text-gray-700">Select Payment Method</p>
                                <button 
                                    onClick={() => setPaymentMethod('bKash')}
                                    className="w-full p-3 border rounded-xl flex items-center justify-center space-x-2 hover:bg-pink-50 hover:border-pink-500 border-gray-200 text-pink-600 font-bold transition-colors"
                                >
                                    <span>bKash</span>
                                </button>
                                <button 
                                    onClick={() => setPaymentMethod('Nagad')}
                                    className="w-full p-3 border rounded-xl flex items-center justify-center space-x-2 hover:bg-orange-50 hover:border-orange-500 border-gray-200 text-orange-600 font-bold transition-colors"
                                >
                                    <span>Nagad</span>
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handlePayment} className="space-y-4">
                                <div className={`p-3 rounded-lg text-sm ${paymentMethod === 'bKash' ? 'bg-pink-50 text-pink-900' : 'bg-orange-50 text-orange-900'}`}>
                                    <p className="font-semibold mb-1">Instructions:</p>
                                    <p>1. Send ৳{selectedPlan.price} to <span className="font-mono font-bold select-all">01700000000</span> (Personal)</p>
                                    <p>2. Copy the Transaction ID (TrxID).</p>
                                    <p>3. Paste it below.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Transaction ID</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="e.g. 8N7A6D..."
                                        value={trxId}
                                        onChange={e => setTrxId(e.target.value.toUpperCase())}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                    />
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={processing || trxId.length < 5}
                                    className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                                >
                                    {processing ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"/> : 'Verify Payment'}
                                </button>
                                <button type="button" onClick={() => setPaymentMethod(null)} className="w-full text-xs text-gray-500 underline">Change Method</button>
                            </form>
                        )}
                    </>
                ) : (
                    <div className="text-center py-6">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600">
                            <Clock size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Payment Pending</h3>
                        <p className="text-gray-500 mt-2 text-sm">Your payment is being verified by Admin.<br/>Coins will be added shortly.</p>
                        <button onClick={closeOverlay} className="mt-6 w-full bg-gray-900 text-white py-3 rounded-xl font-bold">Close</button>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default Store;
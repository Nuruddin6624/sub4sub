import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../services/supabase';
import { Wallet, LogOut, Info } from 'lucide-react';

interface ProfileProps {
  user: User;
  refreshUser: () => void;
  onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, refreshUser, onLogout }) => {
  const [withdrawAmount, setWithdrawAmount] = useState<number | ''>('');
  const [method, setMethod] = useState<'bKash' | 'Nagad'>('bKash');
  const [accountNumber, setAccountNumber] = useState('');
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const handleWithdraw = async (e: React.FormEvent) => {
      e.preventDefault();
      const amount = Number(withdrawAmount);
      
      if (!amount || amount < 100) {
          setMessage({type: 'error', text: 'Minimum withdrawal is 100 Coins'});
          return;
      }

      if (user.coins < amount) {
          setMessage({type: 'error', text: 'Insufficient balance'});
          return;
      }

      const success = await api.requestWithdrawal(user, amount, method, accountNumber);
      if (success) {
          setMessage({type: 'success', text: 'Withdrawal request sent! Pending approval.'});
          setWithdrawAmount('');
          setAccountNumber('');
          refreshUser();
      } else {
          setMessage({type: 'error', text: 'Request failed. Try again.'});
      }
  };

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>
      
      <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
          <div className="bg-gray-100 h-24"></div>
          <div className="px-4 pb-4">
              <div className="relative -top-10 w-20 h-20 bg-white p-1 rounded-full mx-auto">
                 <img src={`https://ui-avatars.com/api/?name=${user.channelName}`} className="w-full h-full rounded-full bg-gray-200" alt="avatar" />
              </div>
              <div className="text-center mt-[-30px]">
                  <h2 className="text-xl font-bold text-gray-900">{user.channelName}</h2>
                  <p className="text-sm text-gray-500">{user.email}</p>
              </div>
          </div>
      </div>

      {/* Withdrawal Section */}
      <div className="mt-6 bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 mb-4 text-brand-600">
              <Wallet size={20} />
              <h3 className="font-bold">Withdraw Funds</h3>
          </div>
          
          <div className="bg-brand-50 p-3 rounded-lg mb-4 text-xs text-brand-800 flex items-start space-x-2">
              <Info size={16} className="mt-0.5 flex-shrink-0" />
              <p>100 Coins = 10 BDT. Minimum withdrawal 100 Coins. Approval takes 24h.</p>
          </div>

          <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setMethod('bKash')} className={`p-2 border rounded-lg text-sm font-semibold ${method === 'bKash' ? 'bg-pink-50 border-pink-500 text-pink-700' : 'bg-white text-gray-500'}`}>bKash</button>
                  <button type="button" onClick={() => setMethod('Nagad')} className={`p-2 border rounded-lg text-sm font-semibold ${method === 'Nagad' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white text-gray-500'}`}>Nagad</button>
              </div>

              <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Coins to Withdraw</label>
                  <input 
                    type="number" 
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(Number(e.target.value))}
                    placeholder="Min 100"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
              </div>

              <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Mobile Number</label>
                  <input 
                    type="text" 
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
              </div>

              <button type="submit" className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition text-sm">
                  Request Withdrawal
              </button>

              {message && (
                  <p className={`text-xs text-center ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {message.text}
                  </p>
              )}
          </form>
      </div>

      <div className="mt-6 space-y-2">
           <div className="bg-white p-4 rounded-lg flex justify-between items-center border border-gray-100">
               <span className="text-gray-600">User ID</span>
               <span className="text-xs font-mono text-gray-400">{user.id.slice(0, 8)}...</span>
           </div>
           
           <button 
             onClick={onLogout}
             className="w-full mt-4 text-red-500 font-semibold py-3 bg-red-50 rounded-lg flex justify-center items-center space-x-2"
            >
               <LogOut size={16} />
               <span>Log Out</span>
           </button>
      </div>
    </div>
  );
};

export default Profile;
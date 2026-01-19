import React, { useState, useEffect } from 'react';
import { api } from '../services/supabase';
import { WithdrawalLog, User, ActionLog, PaymentLog } from '../types';
import { Check, X, RefreshCw, LogOut, Users, Wallet, Search, Edit3, Save, ShieldCheck, Eye, ExternalLink, CreditCard, Clock } from 'lucide-react';

interface AdminProps {
    onLogout: () => void;
}

const Admin: React.FC<AdminProps> = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState<'withdrawals' | 'users' | 'proofs' | 'deposits'>('proofs');
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Data States
    const [withdrawals, setWithdrawals] = useState<WithdrawalLog[]>([]);
    const [deposits, setDeposits] = useState<PaymentLog[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [pendingProofs, setPendingProofs] = useState<ActionLog[]>([]);

    // User Editing State
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editCoinsValue, setEditCoinsValue] = useState<number | ''>('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadData();
        
        // --- REALTIME POLLING ---
        const interval = setInterval(() => {
            silentRefresh();
        }, 30000);

        return () => clearInterval(interval);
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        await silentRefresh();
        setLoading(false);
    }

    const silentRefresh = async () => {
        setIsRefreshing(true);
        try {
            if (activeTab === 'withdrawals') {
                const data = await api.getWithdrawals();
                setWithdrawals(data);
            } else if (activeTab === 'users') {
                const data = await api.getAllUsers();
                setUsers(data);
            } else if (activeTab === 'deposits') {
                const data = await api.getPendingPayments();
                setDeposits(data);
            } else {
                const data = await api.getPendingActions();
                setPendingProofs(data);
            }
        } finally {
            setIsRefreshing(false);
        }
    }

    const handleWithdrawalAction = async (id: string, action: 'APPROVED' | 'REJECTED') => {
        await api.processWithdrawal(id, action);
        silentRefresh();
    }

    const handleDepositAction = async (id: string, action: 'APPROVED' | 'REJECTED', coins: number) => {
        await api.reviewPayment(id, action, coins);
        silentRefresh();
    }

    const handleProofAction = async (id: string, action: 'VERIFIED' | 'REJECTED', coinReward: number) => {
        await api.reviewAction(id, action, coinReward);
        silentRefresh();
    }

    const saveUserCoins = async (userId: string) => {
        if (typeof editCoinsValue === 'number' && editCoinsValue >= 0) {
            const success = await api.updateUserCoins(userId, editCoinsValue);
            if (success) {
                setEditingUserId(null);
                silentRefresh();
            }
        }
    }

    const filteredUsers = users.filter(u => 
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.channelName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-gray-50 min-h-screen flex flex-col">
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <div className="bg-gray-900 text-white p-1.5 rounded-lg">
                            <ShieldCheck size={20} />
                        </div>
                        Secret Admin
                    </h1>
                </div>
                <button onClick={onLogout} className="flex items-center space-x-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-medium transition">
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            </header>

            <div className="px-6 mt-6">
                <div className="flex space-x-4 border-b border-gray-200 overflow-x-auto">
                    {[
                        { id: 'proofs', icon: Eye, label: 'Proofs', count: pendingProofs.length, color: 'bg-red-500' },
                        { id: 'deposits', icon: CreditCard, label: 'Deposits', count: deposits.length, color: 'bg-green-500' },
                        { id: 'withdrawals', icon: Wallet, label: 'Withdrawals', count: withdrawals.filter(w=>w.status==='PENDING').length, color: 'bg-blue-500' },
                        { id: 'users', icon: Users, label: 'Users', count: 0, color: 'bg-gray-500' }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`pb-3 px-2 font-medium text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${activeTab === tab.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {tab.count > 0 && <span className={`${tab.color} text-white text-[10px] px-1.5 rounded-full`}>{tab.count}</span>}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 p-6">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Clock size={12} />
                        Auto-refresh active (30s)
                    </div>
                    <button onClick={silentRefresh} disabled={isRefreshing} className="flex items-center space-x-2 text-sm text-brand-600 hover:text-brand-800 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-200 disabled:opacity-50">
                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                        <span>Refresh Data</span>
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                        <RefreshCw className="animate-spin mb-2" />
                        Loading Admin Dashboard...
                    </div>
                ) : (
                    <>
                        {activeTab === 'proofs' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pendingProofs.length === 0 ? (
                                    <div className="col-span-full text-center text-gray-400 py-20 bg-white rounded-xl border border-gray-200 border-dashed">No pending proofs.</div>
                                ) : (
                                    pendingProofs.map((log) => (
                                        <div key={log.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                                            <div className="h-48 bg-gray-100 relative group cursor-pointer" onClick={() => log.screenshotUrl && window.open(log.screenshotUrl)}>
                                                {log.screenshotUrl ? <img src={log.screenshotUrl} alt="Proof" className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-gray-400">No Image</div>}
                                                <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded">Click to View Full</div>
                                            </div>
                                            <div className="p-4 flex-1">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h3 className="font-bold text-gray-900">{log.userName || 'Unknown'}</h3>
                                                        <p className="text-[10px] text-gray-500">ID: {log.userId.slice(0,8)}</p>
                                                    </div>
                                                    <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-brand-100 text-brand-700">{log.type}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 mt-4">
                                                    <button onClick={() => handleProofAction(log.id, 'VERIFIED', 4)} className="py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1"><Check size={14} /> Approve</button>
                                                    <button onClick={() => handleProofAction(log.id, 'REJECTED', 0)} className="py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-bold text-xs flex items-center justify-center gap-1"><X size={14} /> Reject</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'deposits' && (
                            <div className="space-y-4 max-w-4xl mx-auto">
                                {deposits.length === 0 ? (
                                    <div className="text-center text-gray-400 py-20 bg-white rounded-xl border border-gray-200 border-dashed">No pending deposits.</div>
                                ) : (
                                    deposits.map((d) => (
                                        <div key={d.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div className="flex-1">
                                                <div className="text-2xl font-black text-gray-900">৳{d.amount} <span className="text-xs text-gray-400 font-normal">→ {d.coinsRequested} Coins</span></div>
                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                                    <span className={`px-2 py-0.5 rounded font-bold ${d.method === 'bKash' ? 'bg-pink-100 text-pink-700' : 'bg-orange-100 text-orange-700'}`}>{d.method}</span>
                                                    <span className="font-mono bg-gray-100 px-2 py-0.5 border rounded">Trx: {d.transactionId}</span>
                                                    <span className="text-gray-400">{new Date(d.timestamp).toLocaleString()}</span>
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-2">User: {d.userId}</p>
                                            </div>
                                            <div className="flex gap-2 w-full sm:w-auto">
                                                <button onClick={() => handleDepositAction(d.id, 'APPROVED', d.coinsRequested)} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-bold text-xs flex items-center gap-1"><Check size={14} /> Approve</button>
                                                <button onClick={() => handleDepositAction(d.id, 'REJECTED', 0)} className="flex-1 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg font-bold text-xs flex items-center gap-1"><X size={14} /> Reject</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'withdrawals' && (
                            <div className="space-y-4 max-w-4xl mx-auto">
                                {withdrawals.length === 0 ? (
                                    <div className="text-center text-gray-400 py-20 bg-white rounded-xl border border-gray-200 border-dashed">No withdrawal requests.</div>
                                ) : (
                                    withdrawals.map((w) => (
                                        <div key={w.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div className="flex-1">
                                                <div className="text-xl font-bold text-gray-900">{w.coins} Coins <span className="text-sm font-normal text-gray-400">≈ {w.amount} BDT</span></div>
                                                <div className="mt-2 flex items-center gap-3 text-xs">
                                                    <span className="font-bold text-brand-600">{w.method}</span>
                                                    <span className="font-mono">{w.accountNumber}</span>
                                                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${w.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : w.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{w.status}</span>
                                                </div>
                                            </div>
                                            {w.status === 'PENDING' && (
                                                <div className="flex gap-2 w-full sm:w-auto">
                                                    <button onClick={() => handleWithdrawalAction(w.id, 'APPROVED')} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-bold text-xs flex items-center gap-1"><Check size={14} /> Pay</button>
                                                    <button onClick={() => handleWithdrawalAction(w.id, 'REJECTED')} className="flex-1 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg font-bold text-xs flex items-center gap-1"><X size={14} /> Reject</button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-4 border-b border-gray-100">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                        <input type="text" placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-1 focus:ring-brand-500 text-sm" />
                                    </div>
                                </div>
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 text-gray-500 uppercase font-bold">
                                        <tr>
                                            <th className="px-6 py-3">User</th>
                                            <th className="px-6 py-3">Email</th>
                                            <th className="px-6 py-3 text-right">Coins</th>
                                            <th className="px-6 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-4 font-bold text-gray-900">{u.channelName}</td>
                                                <td className="px-6 py-4 text-gray-500">{u.email}</td>
                                                <td className="px-6 py-4 text-right">
                                                    {editingUserId === u.id ? <input type="number" value={editCoinsValue} onChange={e => setEditCoinsValue(Number(e.target.value))} className="w-20 p-1 border rounded text-right" /> : <span className="font-mono font-bold">{u.coins}</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {editingUserId === u.id ? <button onClick={() => saveUserCoins(u.id)} className="text-green-600 font-bold">Save</button> : <button onClick={() => {setEditingUserId(u.id); setEditCoinsValue(u.coins)}} className="text-brand-600 hover:underline">Edit</button>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Admin;

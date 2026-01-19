import React, { useState, useEffect } from 'react';
import { api } from '../services/supabase';
import { WithdrawalLog, User, ActionLog, PaymentLog } from '../types';
import { Check, X, RefreshCw, LogOut, Users, Wallet, Search, Edit3, Save, ShieldCheck, Eye, ExternalLink, CreditCard } from 'lucide-react';

interface AdminProps {
    onLogout: () => void;
}

const Admin: React.FC<AdminProps> = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState<'withdrawals' | 'users' | 'proofs' | 'deposits'>('proofs');
    const [loading, setLoading] = useState(true);

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
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
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
        setLoading(false);
    }

    const handleWithdrawalAction = async (id: string, action: 'APPROVED' | 'REJECTED') => {
        await api.processWithdrawal(id, action);
        loadData();
    }

    const handleDepositAction = async (id: string, action: 'APPROVED' | 'REJECTED', coins: number) => {
        await api.reviewPayment(id, action, coins);
        loadData();
    }

    const handleProofAction = async (id: string, action: 'VERIFIED' | 'REJECTED', coinReward: number) => {
        await api.reviewAction(id, action, coinReward);
        loadData();
    }

    const startEditingUser = (user: User) => {
        setEditingUserId(user.id);
        setEditCoinsValue(user.coins);
    }

    const saveUserCoins = async (userId: string) => {
        if (typeof editCoinsValue === 'number' && editCoinsValue >= 0) {
            const success = await api.updateUserCoins(userId, editCoinsValue);
            if (success) {
                setEditingUserId(null);
                loadData();
            }
        }
    }

    const filteredUsers = users.filter(u => 
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.channelName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-gray-50 min-h-screen flex flex-col">
            {/* Admin Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <div className="bg-gray-900 text-white p-1.5 rounded-lg">
                            <ShieldCheck size={20} />
                        </div>
                        Secret Admin
                    </h1>
                </div>
                <button 
                    onClick={onLogout}
                    className="flex items-center space-x-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-medium transition"
                >
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            </header>

            {/* Navigation Tabs */}
            <div className="px-6 mt-6">
                <div className="flex space-x-4 border-b border-gray-200 overflow-x-auto">
                    <button 
                        onClick={() => setActiveTab('proofs')}
                        className={`pb-3 px-2 font-medium text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${activeTab === 'proofs' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Eye size={16} />
                        Proofs
                        {pendingProofs.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{pendingProofs.length}</span>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('deposits')}
                        className={`pb-3 px-2 font-medium text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${activeTab === 'deposits' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <CreditCard size={16} />
                        Deposits
                        {deposits.length > 0 && <span className="bg-green-500 text-white text-[10px] px-1.5 rounded-full">{deposits.length}</span>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('withdrawals')}
                        className={`pb-3 px-2 font-medium text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${activeTab === 'withdrawals' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Wallet size={16} />
                        Withdrawals
                    </button>
                    <button 
                        onClick={() => setActiveTab('users')}
                        className={`pb-3 px-2 font-medium text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${activeTab === 'users' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Users size={16} />
                        Users
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6">
                <div className="flex justify-end mb-4">
                    <button onClick={loadData} className="flex items-center space-x-2 text-sm text-brand-600 hover:text-brand-800 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-200">
                        <RefreshCw size={14} />
                        <span>Refresh Data</span>
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-40 text-gray-400">Loading...</div>
                ) : (
                    <>
                        {/* ================= PROOFS TAB ================= */}
                        {activeTab === 'proofs' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pendingProofs.length === 0 ? (
                                    <div className="col-span-full text-center text-gray-400 py-20 bg-white rounded-xl border border-gray-200 border-dashed">
                                        No pending proofs to verify.
                                    </div>
                                ) : (
                                    pendingProofs.map((log) => (
                                        <div key={log.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                                            {/* Screenshot Area */}
                                            <div className="h-48 bg-gray-100 relative group cursor-pointer">
                                                {log.screenshotUrl ? (
                                                    <img 
                                                        src={log.screenshotUrl} 
                                                        alt="Proof" 
                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                                        onClick={() => {
                                                            const w = window.open("");
                                                            if(w) {
                                                                w.document.write(`<img src="${log.screenshotUrl}" style="max-width:100%"/>`);
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                                                )}
                                                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                                    Click to Zoom
                                                </div>
                                            </div>
                                            
                                            <div className="p-4 flex-1">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h3 className="font-bold text-gray-900">{log.userName || 'Unknown User'}</h3>
                                                        <p className="text-xs text-gray-500">User ID: {log.userId.slice(0,6)}</p>
                                                    </div>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                                        log.type === 'SUBSCRIBE' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {log.type}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500 mb-4">
                                                    Task ID: {log.targetChannelId.slice(0,8)}...
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 mt-auto">
                                                    <button 
                                                        onClick={() => handleProofAction(log.id, 'VERIFIED', 4)} // Assuming 4 coins for now
                                                        className="py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-1"
                                                    >
                                                        <Check size={16} /> Approve
                                                    </button>
                                                    <button 
                                                        onClick={() => handleProofAction(log.id, 'REJECTED', 0)}
                                                        className="py-2 bg-gray-100 hover:bg-red-50 text-red-600 border border-gray-200 rounded-lg font-bold text-sm flex items-center justify-center gap-1"
                                                    >
                                                        <X size={16} /> Reject
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* ================= DEPOSITS TAB ================= */}
                        {activeTab === 'deposits' && (
                            <div className="space-y-4 max-w-4xl mx-auto">
                                {deposits.length === 0 ? (
                                    <div className="text-center text-gray-400 py-20 bg-white rounded-xl border border-gray-200 border-dashed">No pending deposits found.</div>
                                ) : (
                                    deposits.map((d) => (
                                        <div key={d.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="text-xs text-gray-400 font-mono">{new Date(d.timestamp).toLocaleString()}</span>
                                                </div>
                                                
                                                <div className="flex items-end gap-2 mt-2">
                                                    <span className="text-2xl font-bold text-gray-900">+{d.amount} Coins</span>
                                                </div>

                                                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                                    <span className="font-semibold text-brand-600">{d.method}</span>
                                                    <span className="w-px h-3 bg-gray-300"></span>
                                                    <span className="font-mono bg-white px-2 py-0.5 border rounded select-all">{d.transactionId}</span>
                                                    <span className="w-px h-3 bg-gray-300"></span>
                                                    <span className="text-xs text-gray-500">User: {d.userId.slice(0,6)}...</span>
                                                </div>
                                            </div>

                                            <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                                                <button 
                                                    onClick={() => handleDepositAction(d.id, 'APPROVED', d.amount)}
                                                    className="flex-1 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition"
                                                >
                                                    <Check size={16} /> Confirm
                                                </button>
                                                <button 
                                                    onClick={() => handleDepositAction(d.id, 'REJECTED', 0)}
                                                    className="flex-1 px-6 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition"
                                                >
                                                    <X size={16} /> Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* ================= WITHDRAWALS TAB ================= */}
                        {activeTab === 'withdrawals' && (
                            <div className="space-y-4 max-w-4xl mx-auto">
                                {withdrawals.length === 0 ? (
                                    <div className="text-center text-gray-400 py-20 bg-white rounded-xl border border-gray-200 border-dashed">No withdrawal requests found.</div>
                                ) : (
                                    withdrawals.map((w) => (
                                        <div key={w.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                                        w.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                                                        w.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {w.status}
                                                    </span>
                                                    <span className="text-xs text-gray-400 font-mono">{new Date(w.timestamp).toLocaleString()}</span>
                                                </div>
                                                
                                                <div className="flex items-end gap-2 mt-2">
                                                    <span className="text-2xl font-bold text-gray-900">{w.coins} Coins</span>
                                                    <span className="text-sm text-gray-500 mb-1">≈ {w.amount.toFixed(2)} BDT</span>
                                                </div>

                                                <div className="mt-3 flex items-center gap-4 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg inline-block">
                                                    <span className="font-semibold">{w.method}</span>
                                                    <span className="w-px h-3 bg-gray-300"></span>
                                                    <span className="font-mono">{w.accountNumber}</span>
                                                </div>
                                            </div>

                                            {w.status === 'PENDING' && (
                                                <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                                                    <button 
                                                        onClick={() => handleWithdrawalAction(w.id, 'APPROVED')}
                                                        className="flex-1 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition"
                                                    >
                                                        <Check size={16} /> Approve
                                                    </button>
                                                    <button 
                                                        onClick={() => handleWithdrawalAction(w.id, 'REJECTED')}
                                                        className="flex-1 px-6 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition"
                                                    >
                                                        <X size={16} /> Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* ================= USERS TAB ================= */}
                        {activeTab === 'users' && (
                            <div className="max-w-5xl mx-auto">
                                {/* Search Bar */}
                                <div className="mb-6 relative">
                                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                                    <input 
                                        type="text" 
                                        placeholder="Search users by email or channel..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                    />
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-4 font-semibold">Channel / User</th>
                                                <th className="px-6 py-4 font-semibold">Email</th>
                                                <th className="px-6 py-4 font-semibold text-right">Coin Balance</th>
                                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredUsers.map((u) => (
                                                <tr key={u.id} className="hover:bg-gray-50 transition">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">
                                                                {u.channelName.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-gray-900">{u.channelName}</div>
                                                                <a href={u.channelUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">View Channel</a>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600">{u.email}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        {editingUserId === u.id ? (
                                                            <input 
                                                                type="number" 
                                                                value={editCoinsValue}
                                                                onChange={(e) => setEditCoinsValue(Number(e.target.value))}
                                                                className="w-24 p-1 border border-brand-500 rounded text-right focus:outline-none"
                                                                autoFocus
                                                            />
                                                        ) : (
                                                            <span className="font-mono font-bold text-gray-800">{u.coins}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {editingUserId === u.id ? (
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => saveUserCoins(u.id)} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200">
                                                                    <Save size={16} />
                                                                </button>
                                                                <button onClick={() => setEditingUserId(null)} className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => startEditingUser(u)}
                                                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 hover:text-brand-600 flex items-center gap-1 ml-auto"
                                                            >
                                                                <Edit3 size={12} />
                                                                Edit Coins
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredUsers.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                                                        No users found matching "{searchQuery}"
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Admin;
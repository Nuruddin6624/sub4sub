import React from 'react';
import { User } from '../types';
import { TrendingUp, Users, Activity, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface HomeProps {
  user: User;
}

const Home: React.FC<HomeProps> = ({ user }) => {
  
  // Mock data for the chart
  const data = [
    { name: 'Mon', actions: 4 },
    { name: 'Tue', actions: 3 },
    { name: 'Wed', actions: 10 },
    { name: 'Thu', actions: 7 },
    { name: 'Fri', actions: 12 },
    { name: 'Sat', actions: 8 },
    { name: 'Sun', actions: 15 },
  ];

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {user.channelName}</p>
        </div>
        <div className="bg-brand-50 px-3 py-1 rounded-full border border-brand-100 flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-brand-900 font-bold text-sm">{user.coins} Coins</span>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 text-accent-500 mb-2">
            <TrendingUp size={20} />
            <span className="font-semibold text-sm">Earned</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">142</p>
          <p className="text-xs text-gray-400">Total Coins</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 text-brand-500 mb-2">
            <Users size={20} />
            <span className="font-semibold text-sm">Growth</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">+24</p>
          <p className="text-xs text-gray-400">Subscribers gained</p>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Activity size={18} className="mr-2 text-gray-500"/>
            Weekly Activity
        </h2>
        <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: '#f0f9ff'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="actions" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 6 ? '#0ea5e9' : '#e0f2fe'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Warnings / Tips */}
      <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-start space-x-3">
        <AlertCircle className="text-orange-500 flex-shrink-0" size={20} />
        <div>
            <h3 className="font-semibold text-orange-800 text-sm">Anti-Cheat Active</h3>
            <p className="text-xs text-orange-700 mt-1">
                Do not unsubscribe from channels after earning coins. Our system checks daily. Violators will be banned.
            </p>
        </div>
      </div>
    </div>
  );
};

export default Home;

import React, { useState, useEffect } from 'react';
import { User, ChannelTask } from '../types';
import { api } from '../services/supabase';
import { Youtube, Plus, Eye, MessageSquare, UserPlus, Clock, Link as LinkIcon, PlayCircle, Layers, BarChart2 } from 'lucide-react';
import { ACTION_BASE_COSTS, COST_PER_MINUTE } from '../constants';

interface PromoteProps {
  user: User;
  refreshUser: () => void;
}

const Promote: React.FC<PromoteProps> = ({ user, refreshUser }) => {
  const [description, setDescription] = useState('');
  const [actionType, setActionType] = useState<'SUBSCRIBE' | 'VIEW' | 'COMMENT'>('SUBSCRIBE');
  const [duration, setDuration] = useState<number>(60);
  const [quantity, setQuantity] = useState<number>(10);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  
  const [myCampaigns, setMyCampaigns] = useState<ChannelTask[]>([]);

  useEffect(() => {
      loadMyCampaigns();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.coins]); // Reload when coins change (likely after creation)

  const loadMyCampaigns = async () => {
      const camps = await api.getMyCampaigns(user.id);
      setMyCampaigns(camps);
  }

  // Cost Logic
  const baseCost = ACTION_BASE_COSTS[actionType];
  const timeBonus = duration > 60 ? Math.ceil((duration - 60) / 60) * COST_PER_MINUTE : 0;
  const costPerUser = baseCost + timeBonus;
  const totalCost = costPerUser * quantity;

  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value;
      setVideoUrl(url);
      const id = extractVideoId(url);
      setVideoId(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    if (!videoId) {
        setMessage({type: 'error', text: 'Please enter a valid YouTube Video URL.'});
        return;
    }

    if (user.coins < totalCost) {
        setMessage({type: 'error', text: `Not enough coins! You need ${totalCost} coins.`});
        return;
    }

    const success = await api.createCampaign(user, description, actionType, duration, videoUrl, videoId, quantity);
    if (success) {
        setMessage({type: 'success', text: `Campaign Active! ${quantity} users will ${actionType.toLowerCase()} for ${duration}s.`});
        refreshUser();
        setDescription('');
        setVideoUrl('');
        setVideoId(null);
        setActionType('SUBSCRIBE');
        setQuantity(10);
        loadMyCampaigns();
    } else {
        setMessage({type: 'error', text: 'Failed to create campaign. Try again.'});
    }
  };

  return (
    <div className="p-4 pb-24">
       <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Promote Channel</h1>
        <p className="text-sm text-gray-500">Spend coins to get real engagement.</p>
      </header>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                  <Youtube size={24} />
              </div>
              <div>
                  <h3 className="font-bold text-gray-900">{user.channelName}</h3>
                  <a href={user.channelUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 truncate block max-w-[200px]">{user.channelUrl}</a>
              </div>
          </div>
          
          <div className="border-t border-gray-100 pt-4 flex justify-between items-center text-sm">
             <span className="text-gray-500">Available Balance:</span>
             <span className="font-bold text-brand-600">{user.coins} Coins</span>
          </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Action Type Selector */}
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Goal</label>
              <div className="grid grid-cols-3 gap-2">
                  <button 
                    type="button"
                    onClick={() => setActionType('SUBSCRIBE')}
                    className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-1 transition ${actionType === 'SUBSCRIBE' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                      <UserPlus size={20} />
                      Subscribe
                  </button>
                  <button 
                    type="button"
                    onClick={() => setActionType('VIEW')}
                    className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-1 transition ${actionType === 'VIEW' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                      <Eye size={20} />
                      View
                  </button>
                  <button 
                    type="button"
                    onClick={() => setActionType('COMMENT')}
                    className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-1 transition ${actionType === 'COMMENT' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                      <MessageSquare size={20} />
                      Comment
                  </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Base Cost: {ACTION_BASE_COSTS[actionType]} Coins</p>
          </div>

          {/* Video URL Input */}
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">YouTube Video Link <span className="text-red-500">*</span></label>
              <div className="relative">
                  <input 
                    type="url" 
                    required
                    value={videoUrl}
                    onChange={handleUrlChange}
                    placeholder="https://youtu.be/..."
                    className="w-full pl-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                  <LinkIcon className="absolute left-3 top-3.5 text-gray-400" size={18} />
              </div>
              
              {/* Thumbnail Preview */}
              {videoId && (
                  <div className="mt-3 relative rounded-xl overflow-hidden shadow-md aspect-video bg-black">
                      <img 
                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} 
                        alt="Video Thumbnail" 
                        className="w-full h-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                          <PlayCircle size={48} className="text-white opacity-90" />
                      </div>
                  </div>
              )}
          </div>

           <div className="grid grid-cols-2 gap-4">
                {/* Duration Selector */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration (Seconds)</label>
                    <select 
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full p-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                        {[45, 60, 75, 90, 120, 180, 300].map(sec => (
                            <option key={sec} value={sec}>{sec}s</option>
                        ))}
                    </select>
                </div>

                {/* Quantity Selector */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            min="1"
                            max="1000"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <div className="absolute right-3 top-3.5 text-gray-400 text-xs font-bold">USERS</div>
                    </div>
                </div>
           </div>

          {/* Description */}
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Instructions (Optional)</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Please watch full video"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none h-20 text-sm"
              />
          </div>
          
          {/* Cost Summary */}
          <div className="bg-brand-50 p-4 rounded-xl space-y-2 border border-brand-100">
              <div className="flex justify-between text-sm text-gray-600">
                  <span>Unit Cost:</span>
                  <span>{costPerUser} Coins</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                  <span>Quantity:</span>
                  <span>x {quantity} users</span>
              </div>
              <div className="border-t border-brand-200 pt-2 flex justify-between font-bold text-brand-900">
                  <span>Total Cost:</span>
                  <span>{totalCost} Coins</span>
              </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-accent-500 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-accent-600 transition flex items-center justify-center space-x-2"
          >
              <Plus size={20} />
              <span>Start Campaign</span>
          </button>
      </form>

      {message && (
          <div className={`mt-4 p-4 rounded-xl text-sm text-center ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message.text}
          </div>
      )}

      {/* Active Campaigns List */}
      <div className="mt-10">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Layers className="mr-2" size={20} />
              My Active Campaigns
          </h2>
          
          {myCampaigns.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <p className="text-gray-400 text-sm">No active campaigns.</p>
              </div>
          ) : (
              <div className="space-y-4">
                  {myCampaigns.map((camp) => (
                      <div key={camp.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                  <div className="w-16 h-10 bg-black rounded overflow-hidden relative">
                                       <img src={`https://img.youtube.com/vi/${camp.videoId || 'default'}/mqdefault.jpg`} className="w-full h-full object-cover" alt="thumb"/>
                                  </div>
                                  <div>
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                          camp.requiredAction === 'SUBSCRIBE' ? 'bg-red-50 text-red-600 border-red-100' : 
                                          camp.requiredAction === 'VIEW' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                          'bg-green-50 text-green-600 border-green-100'
                                      }`}>
                                          {camp.requiredAction}
                                      </span>
                                      <p className="text-xs text-gray-400 mt-1">{new Date(camp.createdAt || '').toLocaleDateString()}</p>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <div className="text-sm font-bold text-gray-900">
                                      {camp.completedQuantity} / {camp.targetQuantity}
                                  </div>
                                  <div className="text-xs text-gray-400">Completed</div>
                              </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                              <div 
                                className="bg-brand-500 h-2 rounded-full transition-all duration-500" 
                                style={{width: `${Math.min(100, ((camp.completedQuantity || 0) / (camp.targetQuantity || 1)) * 100)}%`}}
                              ></div>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
};

export default Promote;
import { createClient } from '@supabase/supabase-js';
import { User, ChannelTask, ActionLog, PaymentLog, WithdrawalLog } from '../types';
import { MOCK_CHANNELS, ACTION_BASE_COSTS, COST_PER_MINUTE } from '../constants';

// ==========================================
// 🔴 SUPABASE URL & KEY (এগুলো আপনার Supabase Dashboard থেকে পাবেন)
// ==========================================
const SUPABASE_URL = ((import.meta as any).env && (import.meta as any).env.VITE_SUPABASE_URL) || 'https://kqypggcnbeoepcbwlzmi.supabase.co';
const SUPABASE_KEY = ((import.meta as any).env && (import.meta as any).env.VITE_SUPABASE_ANON_KEY) || 'sb_publishable_XHlqJgMK_8xFvj5sikXfWQ_Lec1Wq9A';
// ==========================================

const isMock = !SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes('আপনার_SUPABASE_URL');
export const supabase = !isMock ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// --- MOCK STORAGE HELPERS (Fallback) ---
const getStorage = <T>(key: string, defaultVal: T): T => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultVal;
};
const setStorage = (key: string, val: any) => {
  localStorage.setItem(key, JSON.stringify(val));
};

// --- API METHODS ---
export const api = {
  // Get Current Session
  getSession: async () => {
    if (isMock) return null;
    const { data } = await supabase!.auth.getSession();
    return data.session;
  },

  // Get User Profile from DB
  getUser: async (userId?: string): Promise<User | null> => {
    if (isMock) return getStorage<User | null>('currentUser', null);
    
    let targetId = userId;
    if (!targetId) {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) return null;
      targetId = user.id;
    }
    
    const { data } = await supabase!.from('users').select('*').eq('id', targetId).single();
    return data;
  },

  // Find User by Email (for unified login)
  findUserByEmail: async (email: string): Promise<User | null> => {
      if (isMock) {
          const dbUsers = getStorage<User[]>('db_users', []);
          return dbUsers.find(u => u.email === email) || null;
      }
      const { data } = await supabase!.from('users').select('*').eq('email', email).single();
      return data;
  },

  // Google Login Trigger
  signInWithGoogle: async () => {
    if (isMock) {
        alert("Mock Mode: Please configure Supabase Keys in services/supabase.ts to use Google Login.");
        return;
    }
    const { error } = await supabase!.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  },

  // Admin Login Flow (Static Check)
  signInAdmin: async (email: string, password: string): Promise<User | null> => {
    if (email === 'shamim6624@gmail.com' && password === 'nur6624') {
        const adminUser: User = {
            id: 'admin-master-id',
            email: email,
            channelUrl: 'https://youtube.com/admin',
            channelName: 'Super Admin',
            coins: 999999,
            joinedAt: new Date().toISOString()
        };
        // Always set in current session
        setStorage('currentUser', adminUser);
        return adminUser;
    }
    return null;
  },

  registerUser: async (email: string, channelUrl: string, channelName: string): Promise<User> => {
    const newUser: User = {
      id: !isMock ? (await supabase!.auth.getUser()).data.user?.id || crypto.randomUUID() : crypto.randomUUID(),
      email,
      channelUrl,
      channelName,
      coins: 10,
      joinedAt: new Date().toISOString()
    };

    if (isMock) {
      setStorage('currentUser', newUser);
      const dbUsers = getStorage<User[]>('db_users', []);
      dbUsers.push(newUser);
      setStorage('db_users', dbUsers);
    } else {
      const { error } = await supabase!.from('users').upsert(newUser);
      if (error) throw error;
      setStorage('currentUser', newUser);
    }
    return newUser;
  },

  // --- ADMIN TOOLS ---
  getAllUsers: async (): Promise<User[]> => {
      if (isMock) return getStorage<User[]>('db_users', []);
      const { data } = await supabase!.from('users').select('*');
      return data || [];
  },

  updateUserCoins: async (userId: string, newBalance: number): Promise<boolean> => {
      if (isMock) {
          const dbUsers = getStorage<User[]>('db_users', []);
          const index = dbUsers.findIndex(u => u.id === userId);
          if (index !== -1) {
              dbUsers[index].coins = newBalance;
              setStorage('db_users', dbUsers);
              return true;
          }
          return false;
      }
      const { error } = await supabase!.from('users').update({ coins: newBalance }).eq('id', userId);
      return !error;
  },

  // --- TASK MANAGEMENT ---
  getTasks: async (excludeUserId: string): Promise<ChannelTask[]> => {
    if (isMock) {
      const userCampaigns = getStorage<ChannelTask[]>('active_campaigns', []);
      const logs = getStorage<ActionLog[]>('actionLogs', []);
      const doneIds = new Set(logs.filter(l => l.userId === excludeUserId).map(l => l.targetChannelId));
      return [...userCampaigns.filter(t => t.ownerId !== excludeUserId), ...MOCK_CHANNELS as ChannelTask[]].filter(t => !doneIds.has(t.id));
    }
    const { data } = await supabase!.from('channel_queue').select('*').neq('ownerId', excludeUserId).limit(10);
    return data || [];
  },

  submitProof: async (user: User, task: ChannelTask, screenshotData: string): Promise<boolean> => {
      const log: ActionLog = {
          id: crypto.randomUUID(),
          userId: user.id,
          userName: user.channelName,
          targetChannelId: task.id,
          type: task.requiredAction as any,
          timestamp: new Date().toISOString(),
          status: 'PENDING',
          screenshotUrl: screenshotData
      };
      if (isMock) {
          const logs = getStorage<ActionLog[]>('actionLogs', []);
          logs.push(log);
          setStorage('actionLogs', logs);
          return true;
      }
      const { error } = await supabase!.from('action_logs').insert(log);
      return !error;
  },

  // --- REVIEW METHODS ---
  getPendingActions: async () => isMock ? getStorage<ActionLog[]>('actionLogs', []).filter(l => l.status === 'PENDING') : [],
  getWithdrawals: async () => isMock ? getStorage<WithdrawalLog[]>('withdrawalLogs', []) : [],
  getPendingPayments: async () => isMock ? getStorage<PaymentLog[]>('paymentLogs', []).filter(p => p.status === 'PENDING') : [],
  
  reviewAction: async (id: string, status: any, reward: number): Promise<boolean> => {
      if (isMock) {
          const logs = getStorage<ActionLog[]>('actionLogs', []);
          const index = logs.findIndex(l => l.id === id);
          if (index !== -1) {
              logs[index].status = status;
              setStorage('actionLogs', logs);
              if (status === 'VERIFIED') {
                  const dbUsers = getStorage<User[]>('db_users', []);
                  const userIdx = dbUsers.findIndex(u => u.id === logs[index].userId);
                  if (userIdx !== -1) {
                      dbUsers[userIdx].coins += reward;
                      setStorage('db_users', dbUsers);
                  }
              }
              return true;
          }
          return false;
      }
      const { error } = await supabase!.from('action_logs').update({ status }).eq('id', id);
      return !error;
  },

  submitPayment: async (uid: string, amt: number, meth: any, trx: string): Promise<boolean> => {
      const log: PaymentLog = {
          id: crypto.randomUUID(),
          userId: uid,
          amount: amt,
          method: meth,
          transactionId: trx,
          status: 'PENDING',
          timestamp: new Date().toISOString()
      };
      if (isMock) {
          const logs = getStorage<PaymentLog[]>('paymentLogs', []);
          logs.push(log);
          setStorage('paymentLogs', logs);
          return true;
      }
      const { error } = await supabase!.from('payment_logs').insert(log);
      return !error;
  },

  requestWithdrawal: async (u: User, c: number, m: any, a: string): Promise<boolean> => {
      const log: WithdrawalLog = {
          id: crypto.randomUUID(),
          userId: u.id,
          coins: c,
          amount: c / 10,
          method: m,
          accountNumber: a,
          status: 'PENDING',
          timestamp: new Date().toISOString()
      };
      if (isMock) {
          const logs = getStorage<WithdrawalLog[]>('withdrawalLogs', []);
          logs.push(log);
          setStorage('withdrawalLogs', logs);
          return true;
      }
      const { error } = await supabase!.from('withdrawal_logs').insert(log);
      return !error;
  },

  createCampaign: async (u: User, desc: string, type: any, dur: number, url: string, vid: string, q: number): Promise<boolean> => {
      const task: ChannelTask = {
          id: crypto.randomUUID(),
          ownerId: u.id,
          channelUrl: url,
          videoId: vid,
          channelName: u.channelName,
          description: desc,
          requiredAction: type,
          duration: dur,
          coinReward: ACTION_BASE_COSTS[type as keyof typeof ACTION_BASE_COSTS] || 4,
          targetQuantity: q,
          completedQuantity: 0,
          createdAt: new Date().toISOString()
      };
      if (isMock) {
          const campaigns = getStorage<ChannelTask[]>('active_campaigns', []);
          campaigns.push(task);
          setStorage('active_campaigns', campaigns);
          const dbUsers = getStorage<User[]>('db_users', []);
          const index = dbUsers.findIndex(usr => usr.id === u.id);
          if (index !== -1) {
              const timeBonus = dur > 60 ? Math.ceil((dur - 60) / 60) * COST_PER_MINUTE : 0;
              const costPerUser = task.coinReward + timeBonus;
              dbUsers[index].coins -= (costPerUser * q);
              setStorage('db_users', dbUsers);
          }
          return true;
      }
      const { error } = await supabase!.from('channel_queue').insert(task);
      return !error;
  },

  getMyCampaigns: async (uid: string) => isMock ? getStorage<ChannelTask[]>('active_campaigns', []).filter(c => c.ownerId === uid) : [],

  processWithdrawal: async (id: string, status: any): Promise<boolean> => {
    if (isMock) {
        const logs = getStorage<WithdrawalLog[]>('withdrawalLogs', []);
        const index = logs.findIndex(l => l.id === id);
        if (index !== -1) {
            logs[index].status = status;
            setStorage('withdrawalLogs', logs);
            if (status === 'REJECTED') {
                const dbUsers = getStorage<User[]>('db_users', []);
                const userIdx = dbUsers.findIndex(u => u.id === logs[index].userId);
                if (userIdx !== -1) {
                    dbUsers[userIdx].coins += logs[index].coins;
                    setStorage('db_users', dbUsers);
                }
            }
            return true;
        }
        return false;
    }
    const { error } = await supabase!.from('withdrawal_logs').update({ status }).eq('id', id);
    return !error;
  },

  reviewPayment: async (id: string, status: any, coins: number): Promise<boolean> => {
    if (isMock) {
        const logs = getStorage<PaymentLog[]>('paymentLogs', []);
        const index = logs.findIndex(l => l.id === id);
        if (index !== -1) {
            logs[index].status = status;
            setStorage('paymentLogs', logs);
            if (status === 'APPROVED') {
                const dbUsers = getStorage<User[]>('db_users', []);
                const userIdx = dbUsers.findIndex(u => u.id === logs[index].userId);
                if (userIdx !== -1) {
                    dbUsers[userIdx].coins += coins;
                    setStorage('db_users', dbUsers);
                }
            }
            return true;
        }
        return false;
    }
    const { error } = await supabase!.from('payment_logs').update({ status }).eq('id', id);
    return !error;
  }
};

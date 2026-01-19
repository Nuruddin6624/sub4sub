import { createClient } from '@supabase/supabase-js';
import { User, ChannelTask, ActionLog, PaymentLog, WithdrawalLog } from '../types';
import { MOCK_CHANNELS, ACTION_BASE_COSTS, COST_PER_MINUTE } from '../constants';

// ==========================================
// 🔴 SUPABASE CONFIG
// ==========================================
const SUPABASE_URL = ((import.meta as any).env && (import.meta as any).env.VITE_SUPABASE_URL) || 'https://kqypggcnbeoepcbwlzmi.supabase.co';
const SUPABASE_KEY = ((import.meta as any).env && (import.meta as any).env.VITE_SUPABASE_ANON_KEY) || 'sb_publishable_XHlqJgMK_8xFvj5sikXfWQ_Lec1Wq9A';
// ==========================================

const isMock = !SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes('আপনার_SUPABASE');
export const supabase = !isMock ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// --- HELPERS ---
const getStorage = <T>(key: string, defaultVal: T): T => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultVal;
};
const setStorage = (key: string, val: any) => {
  localStorage.setItem(key, JSON.stringify(val));
};

// Mapping function: Database (snake_case) -> Frontend (camelCase)
const mapUser = (dbUser: any): User | null => {
    if (!dbUser) return null;
    return {
        id: dbUser.id,
        email: dbUser.email,
        channelUrl: dbUser.channel_url || dbUser.channelUrl, // Supports both just in case
        channelName: dbUser.channel_name || dbUser.channelName,
        coins: dbUser.coins,
        joinedAt: dbUser.joined_at || dbUser.joinedAt
    };
};

// Mapping function: Frontend -> Database
const toDbUser = (user: User) => {
    return {
        id: user.id,
        email: user.email,
        channel_url: user.channelUrl,
        channel_name: user.channelName,
        coins: user.coins,
        joined_at: user.joinedAt
    };
};

export const api = {
  getSession: async () => {
    if (isMock) return null;
    const { data } = await supabase!.auth.getSession();
    return data.session;
  },

  getUser: async (userId?: string): Promise<User | null> => {
    if (isMock) return getStorage<User | null>('currentUser', null);
    
    let targetId = userId;
    if (!targetId) {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) return null;
      targetId = user.id;
    }
    
    const { data, error } = await supabase!.from('users').select('*').eq('id', targetId).single();
    if (error || !data) return null;
    return mapUser(data);
  },

  findUserByEmail: async (email: string): Promise<User | null> => {
      if (isMock) {
          const dbUsers = getStorage<User[]>('db_users', []);
          return dbUsers.find(u => u.email === email) || null;
      }
      const { data } = await supabase!.from('users').select('*').eq('email', email).single();
      return mapUser(data);
  },

  signInWithGoogle: async () => {
    if (isMock) throw new Error("Supabase is not configured.");
    const { error } = await supabase!.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
  },

  signInWithEmail: async (email: string, pass: string) => {
      if (isMock) {
          const u = await api.findUserByEmail(email);
          if (u) return { user: { id: u.id, email: u.email }, error: null };
          return { user: null, error: 'User not found in Mock mode' };
      }
      const { data, error } = await supabase!.auth.signInWithPassword({ email, password: pass });
      return { user: data.user, error: error?.message };
  },

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
        setStorage('currentUser', adminUser);
        return adminUser;
    }
    return null;
  },

  registerUser: async (email: string, password: string, channelUrl: string, channelName: string): Promise<User> => {
    let finalUserId = '';

    if (!isMock) {
        // 1. Get current user (might be from Google or Email Session)
        const { data: { user: existingAuthUser } } = await supabase!.auth.getUser();
        
        if (!existingAuthUser) {
            // 2. New Email Signup
            const { data: signUpData, error: signUpError } = await supabase!.auth.signUp({
                email,
                password,
            });
            if (signUpError) throw signUpError;
            if (!signUpData.user) throw new Error("Check your email for confirmation link.");
            finalUserId = signUpData.user.id;
        } else {
            finalUserId = existingAuthUser.id;
        }
    } else {
        finalUserId = crypto.randomUUID();
    }

    const newUser: User = {
      id: finalUserId,
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
      // Use mapping to snake_case for DB
      const { error: dbError } = await supabase!.from('users').upsert(toDbUser(newUser));
      if (dbError) {
          console.error("DB Error during registration:", dbError);
          // If it fails with 'channel_name' missing, try camelCase as fallback
          if (dbError.message.includes('channel_name')) {
             await supabase!.from('users').upsert(newUser);
          } else {
             throw dbError;
          }
      }
      setStorage('currentUser', newUser);
    }
    return newUser;
  },

  // --- REST OF API METHODS (Task mapping if needed, but tasks seem fine) ---
  getAllUsers: async (): Promise<User[]> => {
      if (isMock) return getStorage<User[]>('db_users', []);
      const { data } = await supabase!.from('users').select('*');
      return (data || []).map(mapUser).filter(u => u !== null) as User[];
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
          id: crypto.randomUUID() as any,
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
          id: crypto.randomUUID() as any,
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
          id: crypto.randomUUID() as any,
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
          id: crypto.randomUUID() as any,
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

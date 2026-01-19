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

// --- MAPPING HELPERS (DB snake_case to Frontend camelCase) ---
const mapUser = (db: any): User | null => {
    if (!db) return null;
    return {
        id: db.id, email: db.email,
        channelUrl: db.channel_url || db.channelUrl,
        channelName: db.channel_name || db.channelName,
        coins: db.coins, joinedAt: db.joined_at || db.joinedAt
    };
};

const mapPayment = (db: any): PaymentLog => ({
    id: db.id, userId: db.user_id || db.userId,
    amount: db.amount, method: db.method,
    transactionId: db.transaction_id || db.transactionId,
    status: db.status, timestamp: db.timestamp || db.created_at
});

const mapAction = (db: any): ActionLog => ({
    id: db.id, userId: db.user_id || db.userId,
    userName: db.user_name || db.userName,
    targetChannelId: db.target_channel_id || db.targetChannelId,
    type: db.type, timestamp: db.timestamp || db.created_at,
    status: db.status, screenshotUrl: db.screenshot_url || db.screenshotUrl
});

const mapWithdrawal = (db: any): WithdrawalLog => ({
    id: db.id, userId: db.user_id || db.userId,
    coins: db.coins, amount: db.amount, method: db.method,
    accountNumber: db.account_number || db.accountNumber,
    status: db.status, timestamp: db.timestamp || db.created_at
});

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
    if (error) return null;
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
          return { user: null, error: 'User not found' };
      }
      const { data, error } = await supabase!.auth.signInWithPassword({ email, password: pass });
      return { user: data.user, error: error?.message };
  },

  signInAdmin: async (email: string, password: string): Promise<User | null> => {
    if (email === 'shamim6624@gmail.com' && password === 'nur6624') {
        const adminUser: User = {
            id: 'admin-master-id', email, channelUrl: 'https://youtube.com/admin',
            channelName: 'Super Admin', coins: 999999, joinedAt: new Date().toISOString()
        };
        setStorage('currentUser', adminUser);
        return adminUser;
    }
    return null;
  },

  registerUser: async (email: string, password: string, channelUrl: string, channelName: string): Promise<User> => {
    let finalUserId = '';
    
    if (!isMock) {
        // First try to see if user is already authenticated (from Google)
        const { data: { user: authUser } } = await supabase!.auth.getUser();
        
        if (!authUser) {
            // New email signup
            const { data: signUpData, error: signUpError } = await supabase!.auth.signUp({ 
                email, 
                password,
                options: {
                    data: { channel_name: channelName }
                }
            });
            if (signUpError) throw signUpError;
            if (!signUpData.user) throw new Error("Signup failed. Please check your email.");
            finalUserId = signUpData.user.id;
        } else {
            finalUserId = authUser.id;
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
      // THE UPSERT MUST MATCH THE POLICIES
      const { error: dbError } = await supabase!.from('users').upsert({
          id: newUser.id,
          email: newUser.email,
          channel_url: newUser.channelUrl, 
          channel_name: newUser.channelName,
          coins: newUser.coins,
          joined_at: newUser.joinedAt
      }, { onConflict: 'id' });

      if (dbError) {
          console.error("Supabase Error:", dbError);
          if (dbError.message.includes('row-level security')) {
              throw new Error("Database Security Error: Please ensure you have run the RLS SQL commands in your Supabase SQL Editor.");
          }
          throw dbError;
      }
      setStorage('currentUser', newUser);
    }
    return newUser;
  },

  getAllUsers: async (): Promise<User[]> => {
      if (isMock) return getStorage<User[]>('db_users', []);
      const { data } = await supabase!.from('users').select('*').order('joined_at', { ascending: false });
      return (data || []).map(mapUser).filter(u => u !== null) as User[];
  },

  updateUserCoins: async (userId: string, newBalance: number): Promise<boolean> => {
      if (isMock) {
          const dbUsers = getStorage<User[]>('db_users', []);
          const index = dbUsers.findIndex(u => u.id === userId);
          if (index !== -1) { dbUsers[index].coins = newBalance; setStorage('db_users', dbUsers); return true; }
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
    const { data } = await supabase!.from('channel_queue').select('*').neq('owner_id', excludeUserId).limit(10);
    return data || [];
  },

  submitProof: async (user: User, task: ChannelTask, screenshotData: string): Promise<boolean> => {
      const logData = {
          user_id: user.id, user_name: user.channelName, 
          target_channel_id: task.id, type: task.requiredAction,
          status: 'PENDING', screenshot_url: screenshotData, timestamp: new Date().toISOString()
      };
      if (isMock) {
          const logs = getStorage<any[]>('actionLogs', []);
          logs.push({ ...logData, id: crypto.randomUUID() });
          setStorage('actionLogs', logs);
          return true;
      }
      const { error } = await supabase!.from('action_logs').insert(logData);
      return !error;
  },

  getPendingActions: async () => {
      if (isMock) return getStorage<any[]>('actionLogs', []).filter(l => l.status === 'PENDING').map(mapAction);
      const { data } = await supabase!.from('action_logs').select('*').eq('status', 'PENDING');
      return (data || []).map(mapAction);
  },

  getWithdrawals: async () => {
      if (isMock) return getStorage<any[]>('withdrawalLogs', []).map(mapWithdrawal);
      const { data } = await supabase!.from('withdrawal_logs').select('*').order('created_at', { ascending: false });
      return (data || []).map(mapWithdrawal);
  },

  getPendingPayments: async () => {
      if (isMock) return getStorage<any[]>('paymentLogs', []).filter(p => p.status === 'PENDING').map(mapPayment);
      const { data } = await supabase!.from('payment_logs').select('*').eq('status', 'PENDING');
      return (data || []).map(mapPayment);
  },
  
  reviewAction: async (id: string, status: any, reward: number): Promise<boolean> => {
      let userId = '';
      if (isMock) {
          const logs = getStorage<any[]>('actionLogs', []);
          const index = logs.findIndex(l => l.id === id);
          if (index !== -1) {
              logs[index].status = status;
              userId = logs[index].user_id || logs[index].userId;
              setStorage('actionLogs', logs);
              if (status === 'VERIFIED') {
                  const dbUsers = getStorage<User[]>('db_users', []);
                  const userIdx = dbUsers.findIndex(u => u.id === userId);
                  if (userIdx !== -1) { dbUsers[userIdx].coins += reward; setStorage('db_users', dbUsers); }
              }
              return true;
          }
          return false;
      }
      
      const { data: log } = await supabase!.from('action_logs').select('user_id').eq('id', id).single();
      if (!log) return false;
      
      const { error } = await supabase!.from('action_logs').update({ status }).eq('id', id);
      if (!error && status === 'VERIFIED') {
          const { data: user } = await supabase!.from('users').select('coins').eq('id', log.user_id).single();
          if (user) await supabase!.from('users').update({ coins: user.coins + reward }).eq('id', log.user_id);
      }
      return !error;
  },

  submitPayment: async (uid: string, amt: number, meth: any, trx: string): Promise<boolean> => {
      const logData = { user_id: uid, amount: amt, method: meth, transaction_id: trx, status: 'PENDING', timestamp: new Date().toISOString() };
      if (isMock) {
          const logs = getStorage<any[]>('paymentLogs', []);
          logs.push({ ...logData, id: crypto.randomUUID() });
          setStorage('paymentLogs', logs);
          return true;
      }
      const { error } = await supabase!.from('payment_logs').insert(logData);
      return !error;
  },

  requestWithdrawal: async (u: User, c: number, m: any, a: string): Promise<boolean> => {
      const logData = { user_id: u.id, coins: c, amount: c / 10, method: m, account_number: a, status: 'PENDING', timestamp: new Date().toISOString() };
      if (isMock) {
          const logs = getStorage<any[]>('withdrawalLogs', []);
          logs.push({ ...logData, id: crypto.randomUUID() });
          setStorage('withdrawalLogs', logs);
          const dbUsers = getStorage<User[]>('db_users', []);
          const idx = dbUsers.findIndex(usr => usr.id === u.id);
          if(idx !== -1) { dbUsers[idx].coins -= c; setStorage('db_users', dbUsers); }
          return true;
      }
      const { error } = await supabase!.from('withdrawal_logs').insert(logData);
      if (!error) {
          const { data: user } = await supabase!.from('users').select('coins').eq('id', u.id).single();
          if (user) await supabase!.from('users').update({ coins: user.coins - c }).eq('id', u.id);
      }
      return !error;
  },

  createCampaign: async (u: User, desc: string, type: any, dur: number, url: string, vid: string, q: number): Promise<boolean> => {
      const task = {
          owner_id: u.id, channel_url: url, video_id: vid, channel_name: u.channelName,
          description: desc, required_action: type, duration: dur, 
          coin_reward: ACTION_BASE_COSTS[type as keyof typeof ACTION_BASE_COSTS] || 4,
          target_quantity: q, completed_quantity: 0, created_at: new Date().toISOString()
      };
      const costPerUser = task.coin_reward + (dur > 60 ? Math.ceil((dur - 60) / 60) * COST_PER_MINUTE : 0);
      const totalCost = costPerUser * q;

      if (isMock) {
          const campaigns = getStorage<any[]>('active_campaigns', []);
          campaigns.push({ ...task, id: crypto.randomUUID() });
          setStorage('active_campaigns', campaigns);
          const dbUsers = getStorage<User[]>('db_users', []);
          const idx = dbUsers.findIndex(usr => usr.id === u.id);
          if (idx !== -1) { dbUsers[idx].coins -= totalCost; setStorage('db_users', dbUsers); }
          return true;
      }
      const { error } = await supabase!.from('channel_queue').insert(task);
      if (!error) {
          const { data: user } = await supabase!.from('users').select('coins').eq('id', u.id).single();
          if (user) await supabase!.from('users').update({ coins: user.coins - totalCost }).eq('id', u.id);
      }
      return !error;
  },

  getMyCampaigns: async (uid: string) => {
      if (isMock) return getStorage<any[]>('active_campaigns', []).filter(c => (c.owner_id || c.ownerId) === uid);
      const { data } = await supabase!.from('channel_queue').select('*').eq('owner_id', uid);
      return data || [];
  },

  processWithdrawal: async (id: string, status: any): Promise<boolean> => {
    if (isMock) {
        const logs = getStorage<any[]>('withdrawalLogs', []);
        const index = logs.findIndex(l => l.id === id);
        if (index !== -1) {
            logs[index].status = status;
            setStorage('withdrawalLogs', logs);
            if (status === 'REJECTED') {
                const dbUsers = getStorage<User[]>('db_users', []);
                const userIdx = dbUsers.findIndex(u => u.id === (logs[index].user_id || logs[index].userId));
                if (userIdx !== -1) { dbUsers[userIdx].coins += logs[index].coins; setStorage('db_users', dbUsers); }
            }
            return true;
        }
        return false;
    }
    const { data: log } = await supabase!.from('withdrawal_logs').select('*').eq('id', id).single();
    if (!log) return false;
    const { error } = await supabase!.from('withdrawal_logs').update({ status }).eq('id', id);
    if (!error && status === 'REJECTED') {
        const { data: user } = await supabase!.from('users').select('coins').eq('id', log.user_id).single();
        if (user) await supabase!.from('users').update({ coins: user.coins + log.coins }).eq('id', log.user_id);
    }
    return !error;
  },

  reviewPayment: async (id: string, status: any, coins: number): Promise<boolean> => {
    if (isMock) {
        const logs = getStorage<any[]>('paymentLogs', []);
        const index = logs.findIndex(l => l.id === id);
        if (index !== -1) {
            logs[index].status = status;
            setStorage('paymentLogs', logs);
            if (status === 'APPROVED') {
                const dbUsers = getStorage<User[]>('db_users', []);
                const userIdx = dbUsers.findIndex(u => u.id === (logs[index].user_id || logs[index].userId));
                if (userIdx !== -1) { dbUsers[userIdx].coins += coins; setStorage('db_users', dbUsers); }
            }
            return true;
        }
        return false;
    }
    const { data: log } = await supabase!.from('payment_logs').select('*').eq('id', id).single();
    if (!log) return false;
    const { error } = await supabase!.from('payment_logs').update({ status }).eq('id', id);
    if (!error && status === 'APPROVED') {
        const { data: user } = await supabase!.from('users').select('coins').eq('id', log.user_id).single();
        if (user) await supabase!.from('users').update({ coins: user.coins + coins }).eq('id', log.user_id);
    }
    return !error;
  }
};

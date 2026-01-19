import { createClient } from '@supabase/supabase-js';
import { User, ChannelTask, ActionLog, PaymentLog, WithdrawalLog } from '../types';
import { MOCK_CHANNELS, ACTION_BASE_COSTS, COST_PER_MINUTE } from '../constants';

// NOTE: In a real production app, these would come from process.env
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

// We implement a "Service" pattern. 
// If valid keys are present, we use Supabase.
// If not, we use LocalStorage to mimic a backend for the user to try the app immediately.

const isMock = !SUPABASE_URL || !SUPABASE_KEY;

export const supabase = !isMock ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// --- MOCK DATABASE (LocalStorage) ---

const getStorage = <T>(key: string, defaultVal: T): T => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultVal;
};

const setStorage = (key: string, val: any) => {
  localStorage.setItem(key, JSON.stringify(val));
};

// Seed some fake users for the Admin to manage if the list is empty
const SEED_USERS: User[] = [
    { id: 'u1', email: 'rahim@test.com', channelUrl: 'https://youtube.com/@rahim', channelName: 'Rahim Vlogs', coins: 150, joinedAt: new Date().toISOString() },
    { id: 'u2', email: 'karim@test.com', channelUrl: 'https://youtube.com/@karim', channelName: 'Karim Gaming', coins: 45, joinedAt: new Date().toISOString() },
    { id: 'u3', email: 'sara@test.com', channelUrl: 'https://youtube.com/@sara', channelName: 'Sara Cooks', coins: 320, joinedAt: new Date().toISOString() },
];

// --- API METHODS ---

export const api = {
  getUser: async (): Promise<User | null> => {
    if (isMock) {
      return getStorage<User | null>('currentUser', null);
    }
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) return null;
    
    const { data } = await supabase!.from('users').select('*').eq('id', user.id).single();
    return data;
  },

  // Simulate Google Login or Admin Login
  loginAdmin: async (email: string, password: string): Promise<User | null> => {
      if (isMock) {
          // Hardcoded Admin Credentials as requested
          if (email === 'shamim6624@gmail.com' && password === 'nur6624') {
              const adminUser: User = {
                  id: 'admin-master-id',
                  email: email,
                  channelUrl: 'https://youtube.com/admin',
                  channelName: 'Super Admin',
                  coins: 999999, // Admin gets unlimited coins for testing
                  joinedAt: new Date().toISOString()
              };
              setStorage('currentUser', adminUser);
              return adminUser;
          }
          return null;
      }
      // Real implementation would verify against a secure auth provider
      return null;
  },

  registerUser: async (email: string, channelUrl: string, channelName: string): Promise<User> => {
    // If attempting to register as admin via normal flow, block or handle gracefully
    if (email === 'shamim6624@gmail.com') {
         throw new Error("Please use Admin Login for this email.");
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      email,
      channelUrl,
      channelName,
      coins: 10, // Bonus for joining
      joinedAt: new Date().toISOString()
    };

    if (isMock) {
      setStorage('currentUser', newUser);
      
      // Also save to the "Database" of users so Admin can see them
      const dbUsers = getStorage<User[]>('db_users', SEED_USERS);
      // Check if exists
      const exists = dbUsers.find(u => u.email === email);
      if (!exists) {
          dbUsers.push(newUser);
          setStorage('db_users', dbUsers);
      }
      
      return newUser;
    }
    return newUser;
  },

  // --- ADMIN: USER MANAGEMENT ---

  getAllUsers: async (): Promise<User[]> => {
      if (isMock) {
          // Return the mock database of users
          return getStorage<User[]>('db_users', SEED_USERS);
      }
      const { data } = await supabase!.from('users').select('*');
      return data || [];
  },

  updateUserCoins: async (userId: string, newBalance: number): Promise<boolean> => {
      if (isMock) {
          const dbUsers = getStorage<User[]>('db_users', SEED_USERS);
          const index = dbUsers.findIndex(u => u.id === userId);
          if (index !== -1) {
              dbUsers[index].coins = newBalance;
              setStorage('db_users', dbUsers);
              
              // If we are editing the currently logged in user (in a different session simulation), update them too
              const currentUser = getStorage<User | null>('currentUser', null);
              if (currentUser && currentUser.id === userId) {
                  currentUser.coins = newBalance;
                  setStorage('currentUser', currentUser);
              }
              return true;
          }
          return false;
      }
      const { error } = await supabase!.from('users').update({ coins: newBalance }).eq('id', userId);
      return !error;
  },

  // --- TASKS & ACTIONS ---

  getTasks: async (excludeUserId: string): Promise<ChannelTask[]> => {
    if (isMock) {
      // Return user created campaigns + mock channels
      const userCampaigns = getStorage<ChannelTask[]>('active_campaigns', []);
      const availableUserCampaigns = userCampaigns.filter(t => 
        (t.targetQuantity || 0) > (t.completedQuantity || 0)
      );
      // Filter out tasks the user has already done or pending
      const logs = getStorage<ActionLog[]>('actionLogs', []);
      const myLogs = logs.filter(l => l.userId === excludeUserId);
      const doneIds = new Set(myLogs.map(l => l.targetChannelId));

      const filtered = [...availableUserCampaigns, ...MOCK_CHANNELS as ChannelTask[]].filter(t => !doneIds.has(t.id));

      return filtered;
    }
    const { data } = await supabase!
      .from('channel_queue')
      .select('*')
      .neq('ownerId', excludeUserId)
      .limit(10);
    return data || [];
  },
  
  getMyCampaigns: async (userId: string): Promise<ChannelTask[]> => {
      if(isMock) {
          const allCampaigns = getStorage<ChannelTask[]>('active_campaigns', []);
          return allCampaigns.filter(c => c.ownerId === userId).reverse(); // Newest first
      }
      return [];
  },

  // UPDATED: Now requires manual verification
  submitProof: async (user: User, task: ChannelTask, screenshotData: string): Promise<boolean> => {
      const log: ActionLog = {
          id: crypto.randomUUID(),
          userId: user.id,
          userName: user.channelName,
          targetChannelId: task.id,
          type: task.requiredAction as any,
          timestamp: new Date().toISOString(),
          status: 'PENDING',
          screenshotUrl: screenshotData // Base64 string in mock
      };

      if(isMock) {
          const logs = getStorage<ActionLog[]>('actionLogs', []);
          logs.push(log);
          setStorage('actionLogs', logs);
          return true;
      }
      return false;
  },

  // --- ADMIN: PROOF VERIFICATION ---

  getPendingActions: async (): Promise<ActionLog[]> => {
      if(isMock) {
          const logs = getStorage<ActionLog[]>('actionLogs', []);
          return logs.filter(l => l.status === 'PENDING').reverse();
      }
      return [];
  },

  reviewAction: async (actionId: string, status: 'VERIFIED' | 'REJECTED', coinReward: number): Promise<void> => {
      if(isMock) {
          const logs = getStorage<ActionLog[]>('actionLogs', []);
          const index = logs.findIndex(l => l.id === actionId);
          
          if(index !== -1) {
              logs[index].status = status;
              setStorage('actionLogs', logs);

              // If Verified, Give Coins to User
              if (status === 'VERIFIED') {
                  const userId = logs[index].userId;
                  const dbUsers = getStorage<User[]>('db_users', SEED_USERS);
                  const uIndex = dbUsers.findIndex(u => u.id === userId);
                  
                  if(uIndex !== -1) {
                      dbUsers[uIndex].coins += coinReward;
                      setStorage('db_users', dbUsers);

                      // Update current user session if it matches
                      const currentUser = getStorage<User | null>('currentUser', null);
                      if (currentUser && currentUser.id === userId) {
                          currentUser.coins = dbUsers[uIndex].coins;
                          setStorage('currentUser', currentUser);
                      }
                  }

                   // Update campaign completed count
                   const targetId = logs[index].targetChannelId;
                   const allCampaigns = getStorage<ChannelTask[]>('active_campaigns', []);
                   const cIndex = allCampaigns.findIndex(c => c.id === targetId);
                   if (cIndex !== -1) {
                       allCampaigns[cIndex].completedQuantity = (allCampaigns[cIndex].completedQuantity || 0) + 1;
                       setStorage('active_campaigns', allCampaigns);
                   }
              }
          }
      }
  },

  // --- PAYMENTS (DEPOSIT) ---

  submitPayment: async (userId: string, amount: number, method: 'bKash' | 'Nagad', trxId: string): Promise<boolean> => {
    const log: PaymentLog = {
      id: crypto.randomUUID(),
      userId,
      amount,
      method,
      transactionId: trxId,
      status: 'PENDING', // PENDING by default
      timestamp: new Date().toISOString()
    };

    if (isMock) {
        const payments = getStorage<PaymentLog[]>('paymentLogs', []);
        payments.push(log);
        setStorage('paymentLogs', payments);
        return true;
    }
    return false;
  },

  // Admin: Get all Pending Deposits
  getPendingPayments: async (): Promise<PaymentLog[]> => {
    if(isMock) {
        return getStorage<PaymentLog[]>('paymentLogs', []).filter(p => p.status === 'PENDING').reverse();
    }
    return [];
  },

  // Admin: Approve Deposit
  reviewPayment: async (paymentId: string, status: 'APPROVED' | 'REJECTED', coinsToAdd: number): Promise<void> => {
      if(isMock) {
          const payments = getStorage<PaymentLog[]>('paymentLogs', []);
          const index = payments.findIndex(p => p.id === paymentId);
          
          if (index !== -1) {
              payments[index].status = status;
              setStorage('paymentLogs', payments);

              if (status === 'APPROVED') {
                  const userId = payments[index].userId;
                  const dbUsers = getStorage<User[]>('db_users', SEED_USERS);
                  const uIndex = dbUsers.findIndex(u => u.id === userId);
                  
                  if (uIndex !== -1) {
                      dbUsers[uIndex].coins += coinsToAdd;
                      setStorage('db_users', dbUsers);
                      
                       // Also update currentUser if it matches
                      const currentUser = getStorage<User>('currentUser', {} as User);
                      if (currentUser.id === userId) {
                          currentUser.coins = dbUsers[uIndex].coins;
                          setStorage('currentUser', currentUser);
                      }
                  }
              }
          }
      }
  },

  // --- WITHDRAWAL METHODS ---

  requestWithdrawal: async (user: User, coins: number, method: 'bKash' | 'Nagad', accountNumber: string): Promise<boolean> => {
      const conversionRate = 0.1; 
      const amount = coins * conversionRate;

      const log: WithdrawalLog = {
          id: crypto.randomUUID(),
          userId: user.id,
          coins,
          amount,
          method,
          accountNumber,
          status: 'PENDING',
          timestamp: new Date().toISOString()
      };

      if (isMock) {
          if (user.coins < coins) return false;
          
          const updatedUser = { ...user, coins: user.coins - coins };
          setStorage('currentUser', updatedUser);

          // Update DB version of user
          const dbUsers = getStorage<User[]>('db_users', SEED_USERS);
          const uIndex = dbUsers.findIndex(u => u.id === user.id);
          if(uIndex !== -1) {
              dbUsers[uIndex].coins = updatedUser.coins;
              setStorage('db_users', dbUsers);
          }

          const withdrawals = getStorage<WithdrawalLog[]>('withdrawalLogs', []);
          withdrawals.push(log);
          setStorage('withdrawalLogs', withdrawals);
          return true;
      }
      return false;
  },

  getWithdrawals: async (): Promise<WithdrawalLog[]> => {
      if(isMock) {
          return getStorage<WithdrawalLog[]>('withdrawalLogs', []).reverse();
      }
      return [];
  },

  processWithdrawal: async (id: string, status: 'APPROVED' | 'REJECTED'): Promise<void> => {
      if (isMock) {
          const withdrawals = getStorage<WithdrawalLog[]>('withdrawalLogs', []);
          const index = withdrawals.findIndex(w => w.id === id);
          if (index !== -1) {
              const withdrawal = withdrawals[index];
              withdrawal.status = status;
              withdrawals[index] = withdrawal;
              setStorage('withdrawalLogs', withdrawals);

              if (status === 'REJECTED') {
                  const dbUsers = getStorage<User[]>('db_users', SEED_USERS);
                  const uIndex = dbUsers.findIndex(u => u.id === withdrawal.userId);
                  if (uIndex !== -1) {
                      dbUsers[uIndex].coins += withdrawal.coins;
                      setStorage('db_users', dbUsers);
                      
                      // Also update currentUser if it matches
                      const currentUser = getStorage<User>('currentUser', {} as User);
                      if (currentUser.id === withdrawal.userId) {
                          currentUser.coins = dbUsers[uIndex].coins;
                          setStorage('currentUser', currentUser);
                      }
                  }
              }
          }
      }
  },
  
  getActionHistory: async (userId: string): Promise<ActionLog[]> => {
      if(isMock) {
          return getStorage<ActionLog[]>('actionLogs', []).filter(l => l.userId === userId);
      }
      return [];
  },
  
  createCampaign: async(
    user: User, 
    description: string, 
    actionType: 'SUBSCRIBE' | 'VIEW' | 'COMMENT', 
    duration: number,
    videoUrl: string,
    videoId: string,
    quantity: number
  ): Promise<boolean> => {
      const baseCost = ACTION_BASE_COSTS[actionType];
      const timeBonus = duration > 60 ? Math.ceil((duration - 60) / 60) * COST_PER_MINUTE : 0;
      const totalCostPerUser = baseCost + timeBonus;
      const totalCampaignCost = totalCostPerUser * quantity;

      if(isMock) {
          if(user.coins < totalCampaignCost) return false;
          
          const updatedUser = { ...user, coins: user.coins - totalCampaignCost };
          setStorage('currentUser', updatedUser);

           // Update DB version of user
          const dbUsers = getStorage<User[]>('db_users', SEED_USERS);
          const uIndex = dbUsers.findIndex(u => u.id === user.id);
          if(uIndex !== -1) {
              dbUsers[uIndex].coins = updatedUser.coins;
              setStorage('db_users', dbUsers);
          }
          
          const newTask: ChannelTask = {
              id: crypto.randomUUID(),
              ownerId: user.id,
              channelUrl: user.channelUrl, 
              videoId: videoId,
              channelName: user.channelName,
              description: description || `Please ${actionType.toLowerCase()}`,
              requiredAction: actionType,
              duration: duration,
              coinReward: totalCostPerUser,
              targetQuantity: quantity,
              completedQuantity: 0,
              createdAt: new Date().toISOString()
          };

          const existingCampaigns = getStorage<ChannelTask[]>('active_campaigns', []);
          existingCampaigns.unshift(newTask);
          setStorage('active_campaigns', existingCampaigns);

          return true;
      }
      return false;
  }
};
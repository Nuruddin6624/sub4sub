export const APP_NAME = "SubXchange";

// Base costs per action type (in coins)
export const ACTION_BASE_COSTS = {
  VIEW: 1,
  COMMENT: 2,
  SUBSCRIBE: 4, // Subscribe costs the most
};

// Extra cost per 60 seconds
export const COST_PER_MINUTE = 1; 

export const PAYMENT_PLANS = [
  { id: 'pack_1', coins: 50, price: 50, currency: 'BDT' },
  { id: 'pack_2', coins: 150, price: 120, currency: 'BDT' }, // Discounted
  { id: 'pack_3', coins: 500, price: 400, currency: 'BDT' }, // Best Value
];

// Mock Data for Initial State if Supabase is empty/offline
export const MOCK_CHANNELS = [
  { id: '1', ownerId: 'sys', channelUrl: 'https://youtube.com/@google', videoId: 'e-ORhEE9VVg', channelName: 'Google Developers', description: 'Tech & Code', requiredAction: 'SUBSCRIBE', duration: 30, coinReward: 4 },
  { id: '2', ownerId: 'sys', channelUrl: 'https://youtube.com/@fireship', videoId: 'uAgU9H4Vw-k', channelName: 'Fireship', description: 'Fast code news', requiredAction: 'VIEW', duration: 45, coinReward: 1 },
  { id: '3', ownerId: 'sys', channelUrl: 'https://youtube.com/@mrbeast', videoId: '0e3GPea1Tyg', channelName: 'MrBeast', description: 'Leave a nice comment', requiredAction: 'COMMENT', duration: 60, coinReward: 3 },
];
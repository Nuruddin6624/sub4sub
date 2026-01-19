export interface User {
  id: string;
  email: string;
  channelUrl: string;
  channelName: string;
  coins: number;
  joinedAt: string;
}

export interface ChannelTask {
  id: string;
  ownerId: string;
  channelUrl: string;
  videoId?: string; // Optional: specific video to watch
  channelName: string;
  description: string;
  requiredAction: 'SUBSCRIBE' | 'VIEW' | 'COMMENT';
  duration: number; // Duration in seconds
  coinReward: number;
  targetQuantity?: number; // How many people needed
  completedQuantity?: number; // How many done so far
  createdAt?: string;
}

export interface ActionLog {
  id: string;
  userId: string;
  userName?: string; // For display in admin
  targetChannelId: string;
  type: 'SUBSCRIBE' | 'VIEW' | 'COMMENT';
  timestamp: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  screenshotUrl?: string; // New field for proof
}

export interface PaymentPlan {
  id: string;
  coins: number;
  price: number;
  currency: string;
}

export interface PaymentLog {
  id: string;
  userId: string;
  amount: number; // The BDT Price paid
  coinsRequested: number; // The coins to be granted
  method: 'bKash' | 'Nagad';
  transactionId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp: string;
}

export interface WithdrawalLog {
  id: string;
  userId: string;
  coins: number;
  amount: number; // Equivalent fiat currency
  method: 'bKash' | 'Nagad';
  accountNumber: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp: string;
}

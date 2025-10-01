export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  deleted_at?: string;
}

export interface Group {
  group_id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  user_id: string;
  joined_at: string;
  users: User;
}

export interface Expense {
  expense_id: string;
  group_id?: string;
  description: string;
  amount: number;
  currency: string;
  paid_by: string;
  created_by: string;
  date: string;
  notes?: string;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
  expense_splits: ExpenseSplit[];
  paid_by_user: User;
}

export interface ExpenseSplit {
  expense_id: string;
  user_id: string;
  amount_owed: number;
  users?: User;
}

export interface Settlement {
  settlement_id: string;
  group_id?: string;
  paid_by: string;
  paid_to: string;
  amount: number;
  currency: string;
  date: string;
  notes?: string;
  created_at: string;
  paid_by_user: User;
  paid_to_user: User;
}

export interface Friend {
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  friend: User;
}

export interface Balance {
  userId: string;
  totalBalance: string;
  owes: Array<{ user: User; amount: string }>;
  owedBy: Array<{ user: User; amount: string }>;
}
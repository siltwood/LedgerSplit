export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  deleted_at?: string;
  google_id?: string;
}

export interface Event {
  event_id: string;
  name: string;
  description?: string;
  share_token?: string;
  created_by: string;
  created_at: string;
  deleted_at?: string;
  is_dismissed?: boolean;
  is_settled?: boolean;
  participants?: EventParticipant[];
  creator?: User;
  settled_confirmations?: EventSettledConfirmation[];
}

export interface EventSettledConfirmation {
  event_id: string;
  user_id: string;
  confirmed_at: string;
}

export interface EventParticipant {
  event_id: string;
  user_id: string;
  joined_at: string;
  user?: User;
}

export interface Split {
  split_id: string;
  event_id: string;
  title: string;
  amount: number;
  currency: string;
  paid_by: string;
  created_by: string;
  date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  split_participants: SplitParticipant[];
  paid_by_user: User;
  event?: Event;
}

export interface SplitParticipant {
  split_id: string;
  user_id: string;
  amount_owed: number;
  user?: User;
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
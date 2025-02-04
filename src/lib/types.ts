export interface Room {
  id: string;
  name: string;
  type: string;
  description: string;
  is_occupied: boolean;
  occupied_since: string | null;
  occupied_by: string | null;
  school_id: string | null;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface School {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface Profile {
  id: string;
  school_id: string | null;
  updated_at: string;
}

export interface RoomQueueEntry {
  id: string;
  room_id: string;
  user_id: string;
  position: number;
  requested_at: string;
}

export interface RoomMessage {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  sent_at: string;
  sender?: User;
}

export interface RoomHistory {
  id: string;
  room_id: string;
  user_id: string;
  action: 'occupy' | 'vacate';
  timestamp: string;
}
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DoorClosed, DoorOpen, Clock, Users, AlertTriangle, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { RoomChat } from './RoomChat';
import { RoomQueue } from './RoomQueue';
import type { Room, RoomQueueEntry, User } from '../lib/types';

interface RoomCardProps {
  room: Room;
  onToggleOccupancy: (room: Room) => void;
  currentUser: User | null;
  disabled?: boolean;
}

export function RoomCard({ room, onToggleOccupancy, currentUser, disabled }: RoomCardProps) {
  const [showChat, setShowChat] = useState(false);
  const [queue, setQueue] = useState<RoomQueueEntry[]>([]);
  const [isJoiningQueue, setIsJoiningQueue] = useState(false);
  const occupiedDuration = room.occupied_since
    ? Math.floor((new Date().getTime() - new Date(room.occupied_since).getTime()) / (1000 * 60))
    : 0;

  useEffect(() => {
    fetchQueue();
    setupQueueSubscription();
  }, [room.id]);

  const fetchQueue = async () => {
    const { data, error } = await supabase
      .from('room_queue')
      .select('*')
      .eq('room_id', room.id)
      .order('position');

    if (!error && data) {
      setQueue(data);
    }
  };

  const setupQueueSubscription = () => {
    const channel = supabase
      .channel(`room_queue:${room.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_queue',
          filter: `room_id=eq.${room.id}`,
        },
        () => {
          fetchQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleJoinQueue = async () => {
    if (!currentUser) return;
    if (isJoiningQueue) return;

    // Check if user is already in queue
    const isInQueue = queue.some(entry => entry.user_id === currentUser.id);
    if (isInQueue) {
      toast.error('You are already in the queue');
      return;
    }

    setIsJoiningQueue(true);
    try {
      const { error } = await supabase.from('room_queue').insert({
        room_id: room.id,
        user_id: currentUser.id,
      });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast.error('You are already in the queue');
        } else {
          toast.error('Failed to join queue');
          console.error('Error joining queue:', error);
        }
      } else {
        toast.success('Successfully joined the queue');
      }
    } catch (error) {
      toast.error('Failed to join queue');
      console.error('Error joining queue:', error);
    } finally {
      setIsJoiningQueue(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('room_queue')
        .delete()
        .eq('room_id', room.id)
        .eq('user_id', currentUser.id);

      if (error) {
        toast.error('Failed to leave queue');
        console.error('Error leaving queue:', error);
      } else {
        toast.success('Successfully left the queue');
      }
    } catch (error) {
      toast.error('Failed to leave queue');
      console.error('Error leaving queue:', error);
    }
  };

  const getStatusColor = () => {
    if (!room.is_occupied) return 'bg-green-100 text-green-800';
    if (occupiedDuration > 120) return 'bg-red-100 text-red-800'; // 2 hours
    if (occupiedDuration > 60) return 'bg-orange-100 text-orange-800'; // 1 hour
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-xl overflow-hidden border-2 border-transparent hover:border-purple-200 transition-colors"
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-purple-900">{room.name}</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
            {room.is_occupied ? 'Room in use' : 'Room available'}
          </span>
        </div>

        <div className="flex items-center space-x-2 mb-4">
          <Users className="w-5 h-5 text-purple-500" />
          <span className="text-purple-900">{room.type}</span>
        </div>
        
        <p className="text-gray-600 mb-4">{room.description}</p>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            {room.is_occupied ? (
              <DoorClosed className="w-5 h-5 text-red-500" />
            ) : (
              <DoorOpen className="w-5 h-5 text-green-500" />
            )}
            <span className={`font-medium ${room.is_occupied ? 'text-red-500' : 'text-green-500'}`}>
              {room.is_occupied ? 'Room in use' : 'Room available'}
            </span>
          </div>

          {room.occupied_since && (
            <div className="flex items-center space-x-2 text-sm">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">
                In use for {occupiedDuration} {occupiedDuration === 1 ? 'minute' : 'minutes'}
              </span>
            </div>
          )}

          {room.is_occupied && occupiedDuration > 120 && (
            <div className="flex items-center space-x-2 text-sm bg-red-50 p-2 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-red-600">Extended occupation (over 2 hours)</span>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onToggleOccupancy(room)}
            disabled={disabled}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
              room.is_occupied
                ? 'bg-red-100 text-red-700 hover:bg-red-200 hover:shadow-md'
                : 'bg-green-100 text-green-700 hover:bg-green-200 hover:shadow-md'
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none`}
          >
            {room.is_occupied ? 'Release Room' : 'Occupy Room'}
          </motion.button>

          {currentUser && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowChat(!showChat)}
              className="w-full py-3 px-4 rounded-lg font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-all hover:shadow-md flex items-center justify-center space-x-2"
            >
              <MessageSquare className="w-5 h-5" />
              <span>{showChat ? 'Hide Chat' : 'Show Chat'}</span>
            </motion.button>
          )}
        </div>

        <AnimatePresence>
          {showChat && currentUser && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <RoomChat roomId={room.id} currentUser={currentUser} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4">
          <RoomQueue
            roomId={room.id}
            queue={queue}
            currentUser={currentUser}
            onJoinQueue={handleJoinQueue}
            onLeaveQueue={handleLeaveQueue}
          />
        </div>
      </div>
    </motion.div>
  );
}
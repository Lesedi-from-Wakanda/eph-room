import React from 'react';
import { Clock, UserPlus, UserMinus } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import type { RoomQueueEntry, User } from '../lib/types';

interface RoomQueueProps {
  roomId: string;
  queue: RoomQueueEntry[];
  currentUser: User | null;
  onJoinQueue: () => void;
  onLeaveQueue: () => void;
}

export function RoomQueue({ roomId, queue, currentUser, onJoinQueue, onLeaveQueue }: RoomQueueProps) {
  const userPosition = currentUser
    ? queue.findIndex((entry) => entry.user_id === currentUser.id) + 1
    : 0;

  const handleJoinQueue = () => {
    if (userPosition > 0) {
      toast.error('You are already in the queue');
      return;
    }
    onJoinQueue();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-purple-900 mb-4">Queue</h3>

      {queue.length > 0 ? (
        <div className="space-y-3">
          {queue.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <span className="w-6 h-6 flex items-center justify-center bg-purple-100 text-purple-700 rounded-full font-medium">
                  {index + 1}
                </span>
                <span className="text-gray-700">
                  {entry.user_id === currentUser?.id ? 'You' : `User ${index + 1}`}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>
                  {new Date(entry.requested_at).toLocaleTimeString()}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">No one is waiting</p>
      )}

      {currentUser && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={userPosition ? onLeaveQueue : handleJoinQueue}
          className={`mt-4 w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
            userPosition
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
          }`}
        >
          {userPosition ? (
            <>
              <UserMinus className="w-5 h-5" />
              <span>Leave Queue (Position: {userPosition})</span>
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5" />
              <span>Join Queue</span>
            </>
          )}
        </motion.button>
      )}
    </div>
  );
}
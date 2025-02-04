import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { RoomMessage, User } from '../lib/types';

interface RoomChatProps {
  roomId: string;
  currentUser: User;
}

export function RoomChat({ roomId, currentUser }: RoomChatProps) {
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const maxRetries = 3;

  useEffect(() => {
    let mounted = true;
    
    const loadMessages = async () => {
      if (!mounted) return;
      
      try {
        const { data, error } = await supabase
          .from('room_messages')
          .select(`
            id,
            room_id,
            sender_id,
            message,
            sent_at
          `)
          .eq('room_id', roomId)
          .order('sent_at', { ascending: true });

        if (error) {
          console.error('Error fetching messages:', error);
          if (retryCount < maxRetries) {
            setRetryCount(prev => prev + 1);
            await loadMessages();
          } else {
            toast.error('Failed to load messages');
          }
        } else if (mounted) {
          // Transform messages to include sender email
          const messagesWithSender = data.map(msg => ({
            ...msg,
            sender: {
              id: msg.sender_id,
              email: msg.sender_id === currentUser.id ? currentUser.email : `User ${msg.sender_id.slice(0, 4)}`
            }
          }));
          setMessages(messagesWithSender);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        if (mounted && retryCount < maxRetries) {
          setRetryCount(prev => prev + 1);
          await loadMessages();
        } else if (mounted) {
          toast.error('Failed to load messages');
          setLoading(false);
        }
      }
    };

    loadMessages();
    const channel = setupRealtimeSubscription();

    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [roomId, retryCount, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`room_messages:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = {
            ...payload.new,
            sender: {
              id: payload.new.sender_id,
              email: payload.new.sender_id === currentUser.id ? 
                currentUser.email : 
                `User ${payload.new.sender_id.slice(0, 4)}`
            }
          };
          setMessages(current => [...current, newMessage]);
        }
      )
      .subscribe();

    return channel;
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from('room_messages').insert({
        room_id: roomId,
        sender_id: currentUser.id,
        message: newMessage.trim(),
      });

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
      } else {
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-6 h-6 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-96 bg-white rounded-lg shadow-md">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${
                message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.sender_id === currentUser.id
                    ? 'bg-purple-100 text-purple-900'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm font-medium mb-1">
                  {message.sender_id === currentUser.id ? 'You' : message.sender.email}
                </p>
                <p className="text-sm">{message.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(message.sent_at).toLocaleTimeString()}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
            disabled={sending}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
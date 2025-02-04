import React, { useEffect, useState } from 'react';
import { Users, LogIn, LogOut, Search, Filter } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './lib/supabase';
import { AuthModal } from './components/AuthModal';
import { RoomCard } from './components/RoomCard';
import { SchoolSelector } from './components/SchoolSelector';
import { useAuth } from './lib/hooks';
import type { Room, School } from './lib/types';

function App() {
  const { user, loading: authLoading } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  useEffect(() => {
    if (!authLoading && selectedSchool) {
      fetchRooms();
      const cleanup = setupRealtimeSubscription();
      return () => {
        cleanup?.();
      };
    }
  }, [selectedSchool, authLoading]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserProfile();
    }
  }, [user, authLoading]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, school:school_id(*)')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load user profile');
      } else if (profile?.school) {
        setSelectedSchool(profile.school);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load user profile');
    }
  };

  const fetchRooms = async () => {
    if (!selectedSchool) return;

    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('school_id', selectedSchool.id)
        .order('name');
      
      if (error) {
        toast.error('Failed to fetch rooms');
        console.error('Error fetching rooms:', error);
      } else {
        setRooms(data || []);
      }
    } catch (error) {
      toast.error('Failed to fetch rooms');
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!selectedSchool) return;

    const channel = supabase
      .channel(`rooms:${selectedSchool.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rooms',
        filter: `school_id=eq.${selectedSchool.id}`
      }, 
        payload => {
          if (payload.new) {
            setRooms(current => 
              current.map(room => 
                room.id === payload.new.id ? payload.new : room
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleRoomOccupancy = async (room: Room) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      const updates = {
        is_occupied: !room.is_occupied,
        occupied_by: !room.is_occupied ? user.id : null,
        occupied_since: !room.is_occupied ? new Date().toISOString() : null
      };

      const { error } = await supabase
        .from('rooms')
        .update(updates)
        .eq('id', room.id);

      if (error) {
        toast.error('Failed to update room status');
        console.error('Error updating room:', error);
      } else {
        toast.success(`Room ${!room.is_occupied ? 'occupied' : 'released'} successfully`);
      }
    } catch (error) {
      toast.error('Failed to update room status');
      console.error('Error updating room:', error);
    }
  };

  const handleSchoolSelect = async (school: School) => {
    setSelectedSchool(school);
    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .upsert({ 
            id: user.id,
            school_id: school.id,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error updating profile:', error);
          toast.error('Failed to update school preference');
        }
      } catch (error) {
        console.error('Error updating profile:', error);
        toast.error('Failed to update school preference');
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setSelectedSchool(null);
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const filteredRooms = rooms
    .filter(room => {
      const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          room.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' ||
                          (filterType === 'available' && !room.is_occupied) ||
                          (filterType === 'occupied' && room.is_occupied);
      return matchesSearch && matchesFilter;
    });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-purple-700 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-purple-700">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-purple-800 shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-yellow-400" />
              <h1 className="text-2xl font-bold text-white">EPHRoom</h1>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => user ? handleSignOut() : setShowAuthModal(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-yellow-400 text-purple-900 font-semibold hover:bg-yellow-300 transition-colors"
            >
              {user ? (
                <>
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </motion.button>
          </div>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search rooms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white bg-opacity-10 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            <SchoolSelector
              currentSchool={selectedSchool}
              onSchoolSelect={handleSchoolSelect}
            />
            <div className="flex items-center space-x-2 bg-white bg-opacity-10 rounded-lg px-3 py-2">
              <Filter className="w-5 h-5 text-gray-300" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent text-white focus:outline-none"
              >
                <option value="all" className="text-purple-900">All Rooms</option>
                <option value="available" className="text-purple-900">Available</option>
                <option value="occupied" className="text-purple-900">Occupied</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {!selectedSchool ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <h2 className="text-2xl font-bold text-white mb-2">Select a School</h2>
            <p className="text-gray-300">Choose your school to view available rooms</p>
          </motion.div>
        ) : loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          </motion.div>
        ) : filteredRooms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <h2 className="text-2xl font-bold text-white mb-2">No rooms found</h2>
            <p className="text-gray-300">Try adjusting your search or filters</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onToggleOccupancy={toggleRoomOccupancy}
                  currentUser={user}
                  disabled={!user}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
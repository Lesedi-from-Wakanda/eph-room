import React, { useState, useEffect } from 'react';
import { School } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { School as SchoolType } from '../lib/types';

interface SchoolSelectorProps {
  currentSchool: SchoolType | null;
  onSchoolSelect: (school: SchoolType) => void;
}

export function SchoolSelector({ currentSchool, onSchoolSelect }: SchoolSelectorProps) {
  const [schools, setSchools] = useState<SchoolType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('name');

      if (error) {
        toast.error('Failed to load schools');
        console.error('Error fetching schools:', error);
      } else {
        setSchools(data);
      }
    } catch (error) {
      toast.error('Failed to load schools');
      console.error('Error fetching schools:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 bg-white bg-opacity-10 rounded-lg px-3 py-2">
        <School className="w-5 h-5 text-gray-300" />
        <span className="text-gray-300">Loading schools...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 bg-white bg-opacity-10 rounded-lg px-3 py-2">
      <School className="w-5 h-5 text-gray-300" />
      <select
        value={currentSchool?.id || ''}
        onChange={(e) => {
          const school = schools.find(s => s.id === e.target.value);
          if (school) onSchoolSelect(school);
        }}
        className="bg-transparent text-white focus:outline-none"
      >
        <option value="" disabled className="text-purple-900">Select School</option>
        {schools.map((school) => (
          <option key={school.id} value={school.id} className="text-purple-900">
            {school.name}
          </option>
        ))}
      </select>
    </div>
  );
}
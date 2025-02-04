/*
  # Fix profiles table and relationships

  1. Changes
    - Add ON DELETE CASCADE to profiles foreign key constraints
    - Add upsert capability for profiles
    - Add missing RLS policies for profile insertion
    - Add proper indexes for performance

  2. Security
    - Add policy for profile insertion
    - Maintain existing RLS policies
*/

-- Drop existing foreign key constraints if they exist
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
  
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_school_id_fkey'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_school_id_fkey;
  END IF;
END $$;

-- Recreate foreign key constraints with ON DELETE CASCADE
ALTER TABLE profiles
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

ALTER TABLE profiles
ADD CONSTRAINT profiles_school_id_fkey
FOREIGN KEY (school_id)
REFERENCES schools(id)
ON DELETE SET NULL;

-- Add missing RLS policies
CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Add policy for upsert operations
CREATE POLICY "Users can upsert their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at);

-- Ensure all existing users have a profile
INSERT INTO profiles (id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;
/*
  # Add schools support

  1. New Tables
    - `schools`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `code` (text, unique)
      - `created_at` (timestamp)

  2. Changes
    - Add school_id to rooms table
    - Add school_id to users profile

  3. Security
    - Enable RLS on schools table
    - Add policies for reading schools
*/

-- Create schools table
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add school_id to rooms
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);

-- Create user profiles table with school association
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  school_id uuid REFERENCES schools(id),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read schools"
  ON schools
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can read profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Insert initial schools
INSERT INTO schools (name, code) VALUES 
  ('Williams College', 'WILLIAMS'),
  ('Amherst College', 'AMHERST'),
  ('Middlebury College', 'MIDDLEBURY'),
  ('Bowdoin College', 'BOWDOIN'),
  ('Wesleyan University', 'WESLEYAN')
ON CONFLICT DO NOTHING;
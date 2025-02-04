/*
  # Room Tracker Schema

  1. New Tables
    - `rooms`
      - `id` (uuid, primary key)
      - `name` (text)
      - `type` (text)
      - `description` (text)
      - `is_occupied` (boolean)
      - `occupied_by` (uuid, references auth.users)
      - `occupied_since` (timestamptz)
      - `created_at` (timestamptz)
    
  2. Security
    - Enable RLS on `rooms` table
    - Add policies for:
      - Anyone can read room data
      - Authenticated users can update room occupancy
*/

CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  description text,
  is_occupied boolean DEFAULT false,
  occupied_by uuid REFERENCES auth.users,
  occupied_since timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Everyone can read rooms data
CREATE POLICY "Anyone can read rooms"
  ON rooms
  FOR SELECT
  TO public
  USING (true);

-- Authenticated users can update rooms
CREATE POLICY "Authenticated users can update rooms"
  ON rooms
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert initial rooms
INSERT INTO rooms (name, type, description)
VALUES 
  ('Thompson Memorial Chapel', 'Prayer Room', 'A peaceful space for prayer and meditation'),
  ('Sawyer Library Study Room 1', 'Study Room', 'Private study room on the first floor'),
  ('Sawyer Library Study Room 2', 'Study Room', 'Private study room on the first floor'),
  ('Schow Science Library Room', 'Study Room', 'Quiet study space for focused work'),
  ('Paresky Meditation Room', 'Meditation Room', 'A tranquil space for mindfulness practice')
ON CONFLICT DO NOTHING;
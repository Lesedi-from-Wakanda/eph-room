/*
  # Add Chat and Queue System

  1. New Tables
    - `room_queue`
      - `id` (uuid, primary key)
      - `room_id` (uuid, references rooms)
      - `user_id` (uuid, references auth.users)
      - `position` (integer)
      - `requested_at` (timestamptz)
      
    - `room_messages`
      - `id` (uuid, primary key)
      - `room_id` (uuid, references rooms)
      - `sender_id` (uuid, references auth.users)
      - `message` (text)
      - `sent_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create room queue table
CREATE TABLE IF NOT EXISTS room_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  position integer NOT NULL,
  requested_at timestamptz DEFAULT now(),
  UNIQUE (room_id, user_id)
);

-- Create room messages table
CREATE TABLE IF NOT EXISTS room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms NOT NULL,
  sender_id uuid REFERENCES auth.users NOT NULL,
  message text NOT NULL,
  sent_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE room_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;

-- Policies for room_queue
CREATE POLICY "Users can view all queue entries"
  ON room_queue
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add themselves to queue"
  ON room_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove themselves from queue"
  ON room_queue
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for room_messages
CREATE POLICY "Users can view messages for rooms"
  ON room_messages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can send messages"
  ON room_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Function to manage queue positions
CREATE OR REPLACE FUNCTION manage_queue_position()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Set the position to the next available number for this room
    SELECT COALESCE(MAX(position), 0) + 1 
    INTO NEW.position 
    FROM room_queue 
    WHERE room_id = NEW.room_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Reorder positions for remaining queue entries
    UPDATE room_queue
    SET position = position - 1
    WHERE room_id = OLD.room_id
    AND position > OLD.position;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for queue position management
CREATE TRIGGER manage_queue_position_insert
  BEFORE INSERT ON room_queue
  FOR EACH ROW
  EXECUTE FUNCTION manage_queue_position();

CREATE TRIGGER manage_queue_position_delete
  AFTER DELETE ON room_queue
  FOR EACH ROW
  EXECUTE FUNCTION manage_queue_position();
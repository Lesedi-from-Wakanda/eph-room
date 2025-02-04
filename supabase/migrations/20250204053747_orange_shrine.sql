/*
  # Fix room messages relationship with users

  1. Changes
    - Add foreign key relationship between room_messages.sender_id and auth.users.id
    - Update room_messages query to properly join with auth.users table

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing foreign key if it exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'room_messages_sender_id_fkey'
  ) THEN
    ALTER TABLE room_messages DROP CONSTRAINT room_messages_sender_id_fkey;
  END IF;
END $$;

-- Add proper foreign key relationship to auth.users
ALTER TABLE room_messages
ADD CONSTRAINT room_messages_sender_id_fkey
FOREIGN KEY (sender_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;
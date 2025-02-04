/*
  # Add Williams College rooms

  1. Changes
    - Add rooms for Williams College
    - Associate rooms with Williams College school_id
    - Update existing rooms to be associated with Williams College

  2. Data
    - Adds rooms for various buildings at Williams College
    - Each room includes name, type, and description
*/

-- Get Williams College school_id
DO $$ 
DECLARE
  williams_id uuid;
BEGIN
  SELECT id INTO williams_id FROM schools WHERE code = 'WILLIAMS';

  -- Update existing rooms to be associated with Williams College
  UPDATE rooms SET school_id = williams_id WHERE school_id IS NULL;

  -- Insert new rooms for Williams College
  INSERT INTO rooms (name, type, description, school_id)
  VALUES 
    ('Thompson Memorial Chapel', 'Prayer Room', 'A peaceful space for prayer and meditation', williams_id),
    ('Sawyer Library Study Room 1', 'Study Room', 'Private study room on the first floor', williams_id),
    ('Sawyer Library Study Room 2', 'Study Room', 'Private study room on the first floor', williams_id),
    ('Schow Science Library Room', 'Study Room', 'Quiet study space for focused work', williams_id),
    ('Paresky Meditation Room', 'Meditation Room', 'A tranquil space for mindfulness practice', williams_id),
    ('Schapiro 130', 'Study Room', 'Group study room in Schapiro Hall', williams_id),
    ('Schapiro 140', 'Study Room', 'Individual study room in Schapiro Hall', williams_id),
    ('Hopkins Hall Conference Room', 'Conference Room', 'Meeting space in Hopkins Hall', williams_id),
    ('Griffin Hall 3', 'Study Room', 'Historic study space in Griffin Hall', williams_id),
    ('Stetson Reading Room', 'Reading Room', 'Quiet reading space in Stetson Hall', williams_id),
    ('Hollander Hall Seminar Room', 'Seminar Room', 'Small group discussion space', williams_id),
    ('Bronfman Science Center Room 105', 'Study Room', 'Science-focused study space', williams_id),
    ('Lasell Dance Studio', 'Practice Room', 'Dance and movement practice space', williams_id),
    ('Bernhard Music Center Practice Room 1', 'Practice Room', 'Individual music practice room', williams_id),
    ('Bernhard Music Center Practice Room 2', 'Practice Room', 'Individual music practice room', williams_id)
  ON CONFLICT (name) DO UPDATE 
  SET 
    type = EXCLUDED.type,
    description = EXCLUDED.description,
    school_id = EXCLUDED.school_id;
END $$;
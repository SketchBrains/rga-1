/*
  # Fix User-Profile Relationship

  1. Database Changes
    - Add unique constraint to profiles.user_id to establish one-to-one relationship
    - This allows Supabase to properly infer relationships for nested queries

  2. Security
    - Maintain existing RLS policies
    - No changes to security model
*/

-- Add unique constraint to profiles.user_id to establish proper relationship
DO $$
BEGIN
  -- Check if the constraint doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_user_id_unique' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- Create index for better performance on user_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Create index for better performance on applications queries
CREATE INDEX IF NOT EXISTS idx_applications_student_id ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_submitted_at ON applications(submitted_at DESC);
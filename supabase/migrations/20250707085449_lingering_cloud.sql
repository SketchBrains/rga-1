/*
  # Fix user signup trigger function

  1. Database Functions
    - Create or replace `handle_new_user()` function to automatically create profile entries
    - Function extracts full_name from user metadata and creates profile record
    - Added ON CONFLICT clauses to prevent duplicate key violations
    
  2. Triggers
    - Create trigger on auth.users table to execute function after user insertion
    - Ensures every new user gets a corresponding profile entry
    
  3. Security
    - Function runs with security definer to have proper permissions
    - Handles the automatic profile creation process safely
    - Now idempotent to prevent duplicate insertion errors
*/

-- Create or replace the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- First insert into users table with default role
  INSERT INTO public.users (id, email, role, language)
  VALUES (
    NEW.id,
    NEW.email,
    'student',
    'english'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Then insert into profiles table (which references users.id)
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
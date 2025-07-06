/*
  # Scholarship Management System Database Schema

  1. New Tables
    - `users` - Store user information with role-based access
    - `scholarship_forms` - Store form templates created by admins
    - `form_fields` - Store dynamic form field configurations
    - `applications` - Store student applications
    - `application_responses` - Store student responses to form fields
    - `documents` - Store uploaded documents
    - `announcements` - Store marquee announcements
    - `profiles` - Store additional user profile information

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Separate student and admin access patterns

  3. Features
    - Multi-language support
    - Dynamic form creation
    - Document management
    - Application tracking
    - Status management
*/

-- Create users table with role-based access
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('student', 'admin')),
  language text DEFAULT 'english' CHECK (language IN ('english', 'hindi')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create profiles table for additional user information
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  date_of_birth date,
  address text,
  city text,
  state text,
  pincode text,
  profile_picture text,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create scholarship forms table
CREATE TABLE IF NOT EXISTS scholarship_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_hindi text,
  description text,
  description_hindi text,
  education_level text NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create form fields table for dynamic form creation
CREATE TABLE IF NOT EXISTS form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid REFERENCES scholarship_forms(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  field_label text NOT NULL,
  field_label_hindi text,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'email', 'phone', 'date', 'file', 'select', 'textarea')),
  field_options jsonb,
  is_required boolean DEFAULT false,
  validation_rules jsonb,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid REFERENCES scholarship_forms(id) ON DELETE CASCADE,
  student_id uuid REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'hold')),
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES users(id),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(form_id, student_id)
);

-- Create application responses table
CREATE TABLE IF NOT EXISTS application_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  field_id uuid REFERENCES form_fields(id) ON DELETE CASCADE,
  response_value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  field_id uuid REFERENCES form_fields(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  uploaded_by uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  message_hindi text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarship_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create policies for profiles table
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create policies for scholarship forms
CREATE POLICY "Everyone can read active forms"
  ON scholarship_forms
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage forms"
  ON scholarship_forms
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Create policies for form fields
CREATE POLICY "Everyone can read form fields"
  ON form_fields
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM scholarship_forms WHERE id = form_fields.form_id AND is_active = true
  ));

CREATE POLICY "Admins can manage form fields"
  ON form_fields
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Create policies for applications
CREATE POLICY "Students can read own applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students can create applications"
  ON applications
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own pending applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can read all applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can update applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Create policies for application responses
CREATE POLICY "Students can manage own responses"
  ON application_responses
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM applications WHERE id = application_responses.application_id AND student_id = auth.uid()
  ));

CREATE POLICY "Admins can read all responses"
  ON application_responses
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Create policies for documents
CREATE POLICY "Students can manage own documents"
  ON documents
  FOR ALL
  TO authenticated
  USING (uploaded_by = auth.uid());

CREATE POLICY "Admins can read all documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Create policies for announcements
CREATE POLICY "Everyone can read active announcements"
  ON announcements
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage announcements"
  ON announcements
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, role)
  VALUES (NEW.id, NEW.email, 'student');
  
  INSERT INTO profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Insert sample data
INSERT INTO users (id, email, role) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'admin@rga.org', 'admin');

INSERT INTO profiles (user_id, full_name) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'System Administrator');

INSERT INTO announcements (message, message_hindi, created_by) VALUES 
  ('New scholarship forms for degree students are now available!', 'डिग्री के छात्रों के लिए नए छात्रवृत्ति फॉर्म अब उपलब्ध हैं!', '11111111-1111-1111-1111-111111111111');
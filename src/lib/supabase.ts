import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'rga-scholarship-portal'
    }
  }
})

export interface User {
  id: string
  email: string
  role: 'student' | 'admin'
  language: 'english' | 'hindi'
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  user_id: string
  full_name: string
  phone?: string
  date_of_birth?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  profile_picture?: string
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface ScholarshipForm {
  id: string
  title: string
  title_hindi?: string
  description?: string
  description_hindi?: string
  education_level: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface FormField {
  id: string
  form_id: string
  field_name: string
  field_label: string
  field_label_hindi?: string
  field_type: 'text' | 'number' | 'email' | 'phone' | 'date' | 'file' | 'select' | 'textarea'
  field_options?: any
  is_required: boolean
  validation_rules?: any
  sort_order: number
  created_at: string
}

export interface Application {
  id: string
  form_id: string
  student_id: string
  status: 'pending' | 'approved' | 'rejected' | 'hold'
  submitted_at: string
  reviewed_at?: string
  reviewed_by?: string
  admin_notes?: string
  created_at: string
  updated_at: string
}

export interface ApplicationResponse {
  id: string
  application_id: string
  field_id: string
  response_value: string
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  application_id: string
  field_id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  uploaded_by: string
  created_at: string
}

export interface Announcement {
  id: string
  message: string
  message_hindi?: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}
import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase, User, Profile } from '../lib/supabase'
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js'

export interface AuthContextType {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, fullName: string, password: string) => Promise<{ user: User | null; session: Session | null }>
  signOut: () => Promise<void>
  verifyOtp: (email: string, otp: string, type: 'signup' | 'recovery') => Promise<void>
  setPassword: (password: string) => Promise<void>
  resendOtp: (email: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  updateLanguage: (userId: string, language: 'english' | 'hindi') => Promise<void>
  getSession: () => Promise<{ session: Session | null; user: SupabaseUser | null; profile: Profile | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Utility for conditional logging
  const log = (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(message, ...args)
    }
  }

  // Utility for timeout
  const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms))
  
  const getProfileAndUser = async (supabaseUser: SupabaseUser): Promise<{ user: User | null; profile: Profile | null }> => {
    try {
      log('🔍 Fetching user and profile data for:', supabaseUser.id)

      // Cleanup duplicate profiles (this logic can remain as it's a one-off fix)
      let hasCleanedProfiles = false; // Local flag for this function call
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .order('created_at', { ascending: true })

      if (error) {
        log('❌ Error fetching profiles for cleanup/fetch:', error);
        // Continue without profile if there's an error fetching it
      } else if (profiles && profiles.length > 1) {
        log(`🔍 Found ${profiles.length} profiles, keeping the first one and removing duplicates`);
        const profilesToDelete = profiles.slice(1);
        await Promise.all(profilesToDelete.map(p => supabase.from('profiles').delete().eq('id', p.id)));
        hasCleanedProfiles = true;
      }

      if (hasCleanedProfiles) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Give DB a moment
      }
      
      let userData = null
      let profileData = null
      let retries = 3
      
      while (retries > 0 && (!userData || !profileData)) {
        log(`🔄 Fetching user and profile data (attempt ${4 - retries})...`)
        
        try {
          const { data: userResult, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', supabaseUser.id)
            .maybeSingle()

          if (userError) {
            log('❌ Error fetching user:', userError)
          } else {
            userData = userResult
            if (userData) {
              log('✅ User data fetched successfully')
            } else {
              log('⚠️ User data not found, will retry...')
            }
          }

          const { data: profileResult, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', supabaseUser.id)
            .maybeSingle()

          if (profileError) {
            log('❌ Error fetching profile:', profileError)
          } else {
            profileData = profileResult
            if (profileData) {
              log('✅ Profile data fetched successfully')
            } else {
              log('⚠️ Profile data not found, will retry...')
            }
          }

        } catch (fetchError) {
          log('❌ Error in fetch attempt:', fetchError)
        }

        if (!userData || !profileData) {
          retries--
          if (retries > 0) {
            log('⏳ Retrying in 2 seconds...')
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        } else {
          break
        }
      }

      if (!userData || !profileData) {
        log('❌ Failed to fetch user data after retries')
        
        if (userData && !profileData) { // User record exists, but profile is missing
          log('🔧 Attempting to create missing profile...')
          const fullName = supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User'
          
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              user_id: supabaseUser.id,
              full_name: fullName
            })
            .select()
            .single()
          
          if (createError) {
            log('❌ Failed to create profile:', createError)
            throw new Error('Unable to create user profile. Please try refreshing the page.')
          } else {
            profileData = newProfile
            log('✅ Profile created successfully')
          }
        }
        
        if (profileData && !userData) { // Profile exists, but user record is missing (less common)
          log('🔧 Attempting to create missing user record...')
          
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              id: supabaseUser.id,
              email: supabaseUser.email!,
              role: 'student',
              language: 'english'
            })
            .select()
            .single()
          
          if (createError) {
            log('❌ Failed to create user:', createError)
            throw new Error('Unable to create user record. Please try refreshing the page.')
          } else {
            userData = newUser
            log('✅ User record created successfully')
          }
        }
        
        if (!userData || !profileData) {
          throw new Error('Unable to retrieve or create user account data. Please try refreshing the page.')
        }
      }

      log('✅ User data fetched:', { id: userData.id, role: userData.role, email: userData.email });
      log('✅ Profile data fetched:', { name: profileData.full_name });

      return { user: userData, profile: profileData };

      log('🎉 User data set successfully:', {
        userId: userData.id,
        role: userData.role,
        name: profileData.full_name
      })
    } catch (error) {
      log('❌ Error fetching user data:', error)
      throw error
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      log('🔐 Attempting sign in for:', email)
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        throw new Error(
          error.message.includes('Invalid login credentials')
            ? 'Incorrect email or password'
            : 'Sign-in failed. Please try again.'
        )
      }
      
      log('✅ Sign in successful')
    } catch (error) {
      log('❌ Sign in error:', error)
      throw error
    }
  }

  const signUp = async (email: string, fullName: string, password: string): Promise<{ user: User | null; session: Session | null }> => {
    try {
      log('🔧 signUp function called with:', { email, fullName, passwordLength: password.length })
      
      if (!email || !email.includes('@')) {
        log('❌ Invalid email validation failed')
        throw new Error('Invalid email address')
      }
      if (!fullName || fullName.trim() === '') {
        log('❌ Full name validation failed')
        throw new Error('Full name is required')
      }
      if (!password || password.length < 6) {
        log('❌ Password validation failed')
        throw new Error('Password must be at least 6 characters long')
      }

      log('📤 Calling supabase.auth.signUp...')
      const { data, error } = await supabase.auth.signUp({
        email,
        password: password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      log('📥 supabase.auth.signUp response:', { data, error })
      
      if (error) {
        throw new Error(
          error.message.includes('User already registered')
            ? 'This email is already registered'
            : 'Signup failed. Please try again.'
        )
      }

      let mappedUser: User | null = null
      if (data.user) {
        mappedUser = {
          id: data.user.id,
          email: data.user.email ?? '',
          role: 'student',
          language: 'english',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }

      log('✅ signUp function returning mapped data:', { user: mappedUser, session: data.session })
      return { user: mappedUser, session: data.session }
    } catch (error) {
      log('❌ Signup error:', error)
      throw error
    }
  }

  const verifyOtp = async (email: string, otp: string, type: 'signup' | 'recovery') => {
    try {
      log('🔐 Verifying OTP for:', email, 'Type:', type)
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type
      })
      
      if (error) {
        log('❌ OTP verification error details:', { message: error.message, code: error.code, status: error.status })
        throw new Error(
          error.message.includes('Invalid token')
            ? 'Invalid OTP code. Please try again.'
            : `OTP verification failed: ${error.message}`
        )
      }
      
      log('✅ OTP verified successfully:', data)
    } catch (error) {
      log('❌ OTP verification error:', error)
      throw error
    }
  }

  const setPassword = async (password: string) => {
    try {
      log('🔑 Attempting to set password')
      const { error } = await supabase.auth.updateUser({
        password
      })
      
      if (error) {
        log('❌ Set password error details:', { message: error.message, code: error.code, status: error.status })
        throw new Error(
          error.message.includes('Password')
            ? 'Invalid password format'
            : 'Failed to set password. Please try again.'
        )
      }
      
      log('✅ Password set successfully')
      await supabase.auth.signOut()
      log('✅ Signed out after password reset')
    } catch (error) {
      log('❌ Set password error:', error)
      throw error
    }
  }

  const resendOtp = async (email: string) => {
    try {
      log('🔧 resendOtp function called with email:', email)
      log('📤 Calling supabase.auth.resend...')
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })
      
      log('📥 supabase.auth.resend response:', { error })
      
      if (error) {
        throw new Error(
          error.message.includes('rate limit')
            ? 'Too many requests. Please wait before trying again.'
            : 'Failed to resend OTP. Please try again.'
        )
      }
      
      log('✅ resendOtp function completed successfully')
    } catch (error) {
      log('❌ Resend OTP error:', error)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      log('🔧 resetPassword function called with email:', email)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
      
      if (error) {
        log('❌ Password reset error details:', { message: error.message, code: error.status })
        throw new Error(
          error.message.includes('rate limit')
            ? 'Too many requests. Please wait before trying again.'
            : 'Failed to send password reset email. Please try again.'
        )
      }
      log('✅ Password reset email sent successfully')
    } catch (error) {
      log('❌ Password reset error:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      log('👋 Signing out...')
      
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw new Error('Failed to sign out. Please try again.')
      }
      log('✅ Sign out successful')
    } catch (error) {
      log('❌ Error signing out:', error)
      throw error
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
 
    if (error) {
      throw new Error('Failed to update profile. Please try again.')
    }
  };

  const updateLanguage = async (userId: string, language: 'english' | 'hindi') => {
    const { error } = await supabase
      .from('users')
      .update({ 
        language,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
 
    if (error) {
      throw new Error('Failed to update language. Please try again.')
    }
  };

  const getSession = async (): Promise<{ session: Session | null; user: SupabaseUser | null; profile: Profile | null }> => {
    try {
      log('🔄 Attempting to get session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        log('❌ Error getting session:', sessionError.message);
        return { session: null, user: null, profile: null };
      }

      if (!session) {
        log('❗ No active session found.');
        return { session: null, user: null, profile: null };
      }

      log('✅ Session found, fetching user and profile data...');
      const { user: userData, profile: profileData } = await getProfileAndUser(session.user);
      
      return { session, user: userData, profile: profileData };
    } catch (error) {
      log('❌ Error in getSession:', error);
      return { session: null, user: null, profile: null };
    }
  };

  const value = {
    signIn,
    signUp,
    signOut,
    verifyOtp,
    setPassword,
    resendOtp,
    resetPassword,
    updateProfile,
    updateLanguage,
    getSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
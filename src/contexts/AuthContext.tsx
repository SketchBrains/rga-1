import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, User, Profile } from '../lib/supabase'
import { Session, User as SupabaseUser } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, fullName: string, password: string) => Promise<{ user: User | null; session: Session | null }>
  signOut: () => Promise<void>
  verifyOtp: (email: string, otp: string) => Promise<void>
  setPassword: (password: string) => Promise<void>
  resendOtp: (email: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  updateLanguage: (language: 'english' | 'hindi') => Promise<void>
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
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let authSubscription: any = null

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing auth...')
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('❌ Error getting session:', error.message)
          if (mounted) {
            setSession(null)
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
          return
        }

        console.log('📋 Initial session:', session?.user?.id ? 'Found' : 'None')
        if (mounted) {
          setSession(session)
          if (session?.user) {
            await fetchUserData(session.user)
          } else {
            setLoading(false)
          }
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error)
        if (mounted) {
          setSession(null)
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    }

    const setupAuthListener = () => {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return

        console.log('🔄 Auth state changed:', event, session?.user?.id || 'No user')
        
        if (event === 'SIGNED_OUT' || !session) {
          setSession(null)
          setUser(null)
          setProfile(null)
          setLoading(false)
          console.log('👋 User signed out')
          return
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log('✅ User signed in, fetching data...')
          setSession(session)
          if (session?.user) {
            await fetchUserData(session.user)
          } else {
            setLoading(false)
          }
        }
      })

      authSubscription = subscription
    }

    initializeAuth().then(() => {
      if (mounted) {
        setupAuthListener()
      }
    })

    return () => {
      mounted = false
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
    }
  }, [])

  const createMissingUserRecords = async (authUser: SupabaseUser) => {
    try {
      console.log('🔧 Creating missing user records for:', authUser.id)
      
      // Create user record
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: authUser.email!,
          role: 'student',
          language: 'english'
        })

      if (userError && userError.code !== '23505') {
        console.error('❌ Error creating user record:', userError)
        throw userError
      }

      // Create profile record
      const fullName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User'
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authUser.id,
          full_name: fullName
        })

      if (profileError && profileError.code !== '23505') {
        console.error('❌ Error creating profile record:', profileError)
        throw profileError
      }

      console.log('✅ Successfully created missing user records')
      return true
    } catch (error) {
      console.error('❌ Failed to create missing user records:', error)
      return false
    }
  }

  const fetchUserData = async (authUser: SupabaseUser) => {
    try {
      console.log('🔍 Fetching user data for:', authUser.id)
      
      // Try to fetch user and profile data
      const [userResult, profileResult] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', authUser.id)
          .maybeSingle()
      ])

      let userData = userResult.data
      let profileData = profileResult.data

      // If user or profile data is missing, try to create it
      if (!userData || !profileData) {
        console.log('⚠️ Missing user records, attempting to create them...')
        const created = await createMissingUserRecords(authUser)
        
        if (created) {
          // Retry fetching after creation
          const [retryUserResult, retryProfileResult] = await Promise.all([
            supabase
              .from('users')
              .select('*')
              .eq('id', authUser.id)
              .maybeSingle(),
            supabase
              .from('profiles')
              .select('*')
              .eq('user_id', authUser.id)
              .maybeSingle()
          ])
          
          userData = retryUserResult.data
          profileData = retryProfileResult.data
        }
      }

      if (!userData || !profileData) {
        console.error('❌ Still missing user data after creation attempt')
        throw new Error('Failed to create or retrieve user account data. Please try signing up again.')
      }

      console.log('✅ User data fetched:', { id: userData.id, role: userData.role, email: userData.email })
      console.log('✅ Profile data fetched:', { name: profileData.full_name })
      
      setUser(userData)
      setProfile(profileData)
      
      console.log('🎉 User data set successfully:', {
        userId: userData.id,
        role: userData.role,
        name: profileData.full_name
      })
    } catch (error) {
      console.error('❌ Error fetching user data:', error)
      throw error
    } finally {
      setLoading(false)
      console.log('✅ Loading complete')
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting sign in for:', email)
      setLoading(true)
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.')
        }
        throw new Error(`Sign-in failed: ${error.message}`)
      }
      
      console.log('✅ Sign in successful')
      // Don't set loading to false here - let the auth state change handler manage it
    } catch (error) {
      console.error('❌ Sign in error:', error)
      setLoading(false)
      throw error
    }
  }

  const signUp = async (email: string, fullName: string, password: string) => {
    try {
      // Validate inputs
      if (!email || !email.includes('@')) {
        throw new Error('Invalid email address')
      }
      if (!fullName || fullName.trim() === '') {
        throw new Error('Full name is required')
      }
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      if (error) throw new Error(`Auth signup failed: ${error.message}`)

      if (data.user && !data.session) {
        // User needs to verify email with OTP
        return { user: null, session: null }
      }

      // The database trigger will handle creating user and profile records
      return { user: null, session: data.session }
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    }
  }

  const verifyOtp = async (email: string, otp: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup'
      })
      
      if (error) throw new Error(`OTP verification failed: ${error.message}`)
      
      // After successful OTP verification, the user should be signed in
      // The auth state change handler will fetch user data
    } catch (error) {
      console.error('OTP verification error:', error)
      throw error
    }
  }

  const setPassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })
      
      if (error) throw new Error(`Set password failed: ${error.message}`)
      
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Set password error:', error)
      throw error
    }
  }

  const resendOtp = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })
      
      if (error) throw new Error(`Resend OTP failed: ${error.message}`)
    } catch (error) {
      console.error('Resend OTP error:', error)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      
      if (error) throw new Error(`Password reset failed: ${error.message}`)
    } catch (error) {
      console.error('Password reset error:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      console.log('👋 Signing out...')
      
      const { error } = await supabase.auth.signOut()
      if (error) throw new Error(`Sign-out failed: ${error.message}`)
      console.log('✅ Sign out successful')
    } catch (error) {
      console.error('Error signing out:', error)
    }
    // Don't manually set states here - let the auth state change handler manage it
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return
    
    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (error) throw new Error(`Update profile failed: ${error.message}`)
    
    const updatedProfile = profile ? { ...profile, ...updates } : null
    setProfile(updatedProfile)
  }

  const updateLanguage = async (language: 'english' | 'hindi') => {
    if (!user) return
    
    const { error } = await supabase
      .from('users')
      .update({ 
        language,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (error) throw new Error(`Update language failed: ${error.message}`)
    
    const updatedUser = { ...user, language }
    setUser(updatedUser)
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    verifyOtp,
    setPassword,
    resendOtp,
    resetPassword,
    updateProfile,
    updateLanguage,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
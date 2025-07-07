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
            await fetchUserData(session.user.id)
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
            await fetchUserData(session.user.id)
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

  const fetchUserData = async (userId: string) => {
    try {
      console.log('🔍 Fetching user data for:', userId)
      
      // Fetch user and profile data with increased retries and longer delays
      let userData = null
      let profileData = null
      let retryCount = 0
      const maxRetries = 5 // Increased from 3 to 5
      const retryDelay = 2000 // Increased from 1500ms to 2000ms

      while (retryCount < maxRetries && (!userData || !profileData)) {
        console.log(`🔄 Attempt ${retryCount + 1} to fetch user data...`)
        
        try {
          const [userResult, profileResult] = await Promise.all([
            supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .maybeSingle(),
            supabase
              .from('profiles')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle()
          ])

          if (userResult.data && !userResult.error) {
            userData = userResult.data
            console.log('✅ User data fetched:', { id: userData.id, role: userData.role, email: userData.email })
          } else if (userResult.error) {
            console.error('❌ Error fetching user data:', userResult.error)
          } else {
            console.log('⏳ User data not yet available')
          }

          if (profileResult.data && !profileResult.error) {
            profileData = profileResult.data
            console.log('✅ Profile data fetched:', { name: profileData.full_name })
          } else if (profileResult.error) {
            console.error('❌ Error fetching profile data:', profileResult.error)
          } else {
            console.log('⏳ Profile data not yet available')
          }

          // If we have both, break out of the loop
          if (userData && profileData) {
            break
          }

        } catch (error) {
          console.error(`❌ Error in fetch attempt ${retryCount + 1}:`, error)
        }

        // If we don't have both user and profile data, wait and retry
        if (!userData || !profileData) {
          retryCount++
          if (retryCount < maxRetries) {
            console.log(`⏳ Waiting ${retryDelay}ms for database triggers to complete...`)
            await new Promise(resolve => setTimeout(resolve, retryDelay))
          }
        }
      }

      if (!userData || !profileData) {
        console.error('❌ Failed to fetch user data after all retries')
        // Check if user exists in Supabase auth but not in our custom tables
        const { data: authUser } = await supabase.auth.getUser()
        if (authUser.user) {
          console.error('❌ User exists in auth but not in database. Please contact support.')
          throw new Error('User account not properly set up. Please contact support or try signing up again.')
        } else {
          throw new Error('User does not exist. Please sign up first.')
        }
      }

      console.log('🎯 Setting user state:', { id: userData.id, role: userData.role })
      console.log('🎯 Setting profile state:', { name: profileData.full_name })
      
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
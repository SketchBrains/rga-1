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

// Cache for user data to prevent unnecessary refetching
const userDataCache = new Map<string, { user: User | null, profile: Profile | null, timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

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
          if (session?.user?.id) {
            userDataCache.delete(session.user.id)
          }
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
      
      // Check cache but validate it has actual data
      const cached = userDataCache.get(userId)
      const now = Date.now()
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION && cached.user && cached.profile) {
        console.log('💾 Using cached user data:', { role: cached.user.role, name: cached.profile.full_name })
        setUser(cached.user)
        setProfile(cached.profile)
        setLoading(false)
        return
      } else if (cached) {
        console.log('🗑️ Clearing invalid cache data')
        userDataCache.delete(userId)
      }

      // Fetch user and profile data with retries
      let userData = null
      let profileData = null
      let retryCount = 0
      const maxRetries = 3

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
            console.log('⏳ Waiting for database triggers to complete...')
            await new Promise(resolve => setTimeout(resolve, 1500))
          }
        }
      }

      if (!userData || !profileData) {
        console.error('❌ Failed to fetch user data after all retries')
        setLoading(false)
        return
      }

      // Cache the data only if we have valid data
      userDataCache.set(userId, {
        user: userData,
        profile: profileData,
        timestamp: now
      })

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
    } finally {
      setLoading(false)
      console.log('✅ Loading complete')
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting sign in for:', email)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw new Error(`Sign-in failed: ${error.message}`)
      console.log('✅ Sign in successful')
      // Don't set loading here - let the auth state change handler manage it
    } catch (error) {
      console.error('❌ Sign in error:', error)
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
      if (user?.id) {
        userDataCache.delete(user.id)
      }
      
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
    
    if (user.id) {
      const cached = userDataCache.get(user.id)
      if (cached) {
        userDataCache.set(user.id, {
          ...cached,
          profile: updatedProfile,
          timestamp: Date.now()
        })
      }
    }
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
    
    if (user.id) {
      const cached = userDataCache.get(user.id)
      if (cached) {
        userDataCache.set(user.id, {
          ...cached,
          user: updatedUser,
          timestamp: Date.now()
        })
      }
    }
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
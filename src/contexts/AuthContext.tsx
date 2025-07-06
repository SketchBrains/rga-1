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
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error.message, error)
          if (mounted) {
            setSession(null)
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
          return
        }

        if (mounted) {
          setSession(session)
          if (session?.user) {
            await fetchUserData(session.user.id)
          } else {
            setLoading(false)
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
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

        console.log('Auth state changed:', event, session?.user?.id)
        
        if (event === 'SIGNED_OUT' || !session) {
          if (session?.user?.id) {
            userDataCache.delete(session.user.id)
          }
          setSession(null)
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
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

  const createUserRecord = async (userId: string, email: string, fullName: string) => {
    try {
      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()
      
      if (existingUser) {
        throw new Error('Email already registered')
      }
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing user:', checkError.message, checkError)
        throw new Error(`Failed to check existing user: ${checkError.message}`)
      }

      // Validate fullName
      if (!fullName || fullName.trim() === '') {
        throw new Error('Full name is required')
      }

      // Create user record
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email,
          role: 'student',
          language: 'english',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (userError) {
        console.error('Error creating user record:', userError.message, userError)
        throw new Error(`Failed to create user record: ${userError.message}`)
      }

      // Create profile record
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          full_name: fullName,
          is_verified: true, // Email verified through OTP
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (profileError) {
        console.error('Error creating profile record:', profileError.message, profileError)
        throw new Error(`Failed to create profile record: ${profileError.message}`)
      }

      return { user: userData, profile: profileData }
    } catch (error) {
      console.error('Error creating user/profile records:', error)
      throw error
    }
  }

  const fetchUserData = async (userId: string) => {
    try {
      setLoading(true)
      
      const cached = userDataCache.get(userId)
      const now = Date.now()
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        console.log('Using cached user data')
        setUser(cached.user)
        setProfile(cached.profile)
        setLoading(false)
        return
      }

      const fetchPromise = Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single(),
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single()
      ])

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      )

      const [userResult, profileResult] = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any

      let userData = null
      let profileData = null

      if (userResult.data && !userResult.error) {
        userData = userResult.data
      } else if (userResult.error && !userResult.error.message.includes('No rows')) {
        console.error('Error fetching user data:', userResult.error.message, userResult.error)
      }

      if (profileResult.data && !profileResult.error) {
        profileData = profileResult.data
      } else if (profileResult.error && !profileResult.error.message.includes('No rows')) {
        console.error('Error fetching profile data:', profileResult.error.message, profileResult.error)
      }

      if (!userData || !profileData) {
        const { data: authUser } = await supabase.auth.getUser()
        if (authUser.user) {
          const { user: newUserData, profile: newProfileData } = await createUserRecord(
            authUser.user.id, 
            authUser.user.email || '', 
            authUser.user.user_metadata?.full_name || 'User'
          )
          userData = newUserData
          profileData = newProfileData
        }
      }

      userDataCache.set(userId, {
        user: userData,
        profile: profileData,
        timestamp: now
      })

      setUser(userData)
      setProfile(profileData)
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw new Error(`Sign-in failed: ${error.message}`)
    } catch (error) {
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

      // Check if email already exists in auth.users
      const { data: existingAuthUser } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', email)
        .single()

      if (existingAuthUser) {
        throw new Error('Email already registered')
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

      if (data.user) {
        const { user: userData, profile: profileData } = await createUserRecord(
          data.user.id,
          email,
          fullName
        )
        return { user: userData, session: data.session }
      }

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
      if (data.user) {
        await fetchUserData(data.user.id)
      }
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
    setLoading(true)
    try {
      if (user?.id) {
        userDataCache.delete(user.id)
      }
      
      const { error } = await supabase.auth.signOut()
      if (error) throw new Error(`Sign-out failed: ${error.message}`)
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setSession(null)
      setUser(null)
      setProfile(null)
      setLoading(false)
    }
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
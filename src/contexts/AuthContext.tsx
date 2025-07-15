import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase, User, Profile } from '../lib/supabase'
import { Session, User as SupabaseUser, Subscription, AuthError } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, fullName: string, password: string) => Promise<{ user: User | null; session: Session | null }>
  signOut: () => Promise<void>
  verifyOtp: (email: string, otp: string, type: 'signup' | 'recovery') => Promise<void>
  setPassword: (password: string) => Promise<void>
  resendOtp: (email: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  updateLanguage: (language: 'english' | 'hindi') => Promise<void>
  refreshSession: () => Promise<void>
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
  const [hasCleanedProfiles, setHasCleanedProfiles] = useState(false) // New state to prevent duplicate cleanup
  const mounted = useRef(true)

  // Utility for conditional logging
  const log = (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(message, ...args)
    }
  }

  // Utility for debouncing
  const debounce = (func: () => void, wait: number) => {
    let timeout: NodeJS.Timeout | null = null
    return () => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(func, wait)
    }
  }

  // Utility for timeout
  const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms))

  useEffect(() => {
    mounted.current = true
    let authSubscription: Subscription | null = null

    const handleVisibilityChange = async () => {
      if (!mounted.current) return
      if (document.visibilityState === 'visible') {
        log('🔁 Tab became active again, checking session...')
        try {
          const response = await Promise.race([
            supabase.auth.getSession(),
            timeout(5000)
          ]) as { data: { session: Session | null }, error: AuthError | null }
          const { data: { session }, error } = response
          if (error || !session) {
            log('❗ Session missing or error:', error?.message)
            await refreshSession()
          } else {
            log('✅ Session still valid')
            if (mounted.current) {
              setSession(session)
              await fetchUserData(session.user)
            }
          }
        } catch (error) {
          log('❌ Error checking session:', error)
          await refreshSession()
        }
      }
    }

    const debouncedHandleVisibilityChange = debounce(handleVisibilityChange, 500)
    document.addEventListener('visibilitychange', debouncedHandleVisibilityChange)

    const initializeAuth = async () => {
      try {
        log('🔄 Initializing auth...')
        const response = await Promise.race([
          supabase.auth.getSession(),
          timeout(5000)
        ]) as { data: { session: Session | null }, error: AuthError | null }
        const { data: { session }, error } = response
        if (error) {
          log('❌ Error getting session:', error.message)
          if (mounted.current) {
            setSession(null)
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
          return
        }

        log('📋 Initial session:', session?.user?.id ? 'Found' : 'None')
        if (mounted.current) {
          setSession(session)
          if (session?.user) {
            await fetchUserData(session.user)
          } else {
            setLoading(false)
          }
        }
      } catch (error) {
        log('❌ Error initializing auth:', error)
        if (mounted.current) {
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
        if (!mounted.current) return
        log('🔄 Auth state changed:', event, session?.user?.id || 'No user')

        if (event === 'SIGNED_OUT' || !session) {
          setSession(null)
          setUser(null)
          setProfile(null)
          setHasCleanedProfiles(false) // Reset cleanup flag
          setLoading(false)
          log('👋 User signed out')
          return
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          log('✅ User signed in or token refreshed, fetching data...')
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
      if (mounted.current) {
        setupAuthListener()
      }
    })

    return () => {
      mounted.current = false
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
      document.removeEventListener('visibilitychange', debouncedHandleVisibilityChange)
    }
  }, [])

  const cleanupDuplicateProfiles = async (userId: string) => {
    if (hasCleanedProfiles) {
      log('🧹 Skipping duplicate profile cleanup, already completed for user:', userId)
      return true
    }

    try {
      log('🧹 Cleaning up duplicate profiles for user:', userId)
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (error) {
        log('❌ Error fetching profiles for cleanup:', error)
        return false
      }

      if (!profiles || profiles.length <= 1) {
        log('✅ No duplicate profiles found')
        setHasCleanedProfiles(true)
        return true
      }

      log(`🔍 Found ${profiles.length} profiles, keeping the first one and removing duplicates`)
      
      const profilesToDelete = profiles.slice(1)
      
      const deletePromises = profilesToDelete.map(profile =>
        supabase
          .from('profiles')
          .delete()
          .eq('id', profile.id)
          .then(({ error: deleteError }) => {
            if (deleteError) {
              log('❌ Error deleting duplicate profile:', deleteError)
            } else {
              log('✅ Deleted duplicate profile:', profile.id)
            }
          })
      )

      await Promise.all(deletePromises)
      setHasCleanedProfiles(true)
      log('✅ Completed duplicate profile cleanup')
      return true
    } catch (error) {
      log('❌ Error cleaning up duplicate profiles:', error)
      return false
    }
  }

  const fetchUserData = async (authUser: SupabaseUser) => {
    try {
      log('🔍 Fetching user data for:', authUser.id)
      
      await cleanupDuplicateProfiles(authUser.id)
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      let userData = null
      let profileData = null
      let retries = 3
      
      while (retries > 0 && (!userData || !profileData)) {
        log(`🔄 Fetching user data (attempt ${4 - retries})...`)
        
        try {
          const { data: userResult, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
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
            .eq('user_id', authUser.id)
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
        
        if (userData && !profileData) {
          log('🔧 Attempting to create missing profile...')
          const fullName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User'
          
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              user_id: authUser.id,
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
        
        if (profileData && !userData) {
          log('🔧 Attempting to create missing user record...')
          
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              email: authUser.email!,
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

      log('✅ User data fetched:', { id: userData.id, role: userData.role, email: userData.email })
      log('✅ Profile data fetched:', { name: profileData.full_name })
      
      if (mounted.current) {
        setUser(userData)
        setProfile(profileData)
      }
      
      log('🎉 User data set successfully:', {
        userId: userData.id,
        role: userData.role,
        name: profileData.full_name
      })
    } catch (error) {
      log('❌ Error fetching user data:', error)
      throw error
    } finally {
      if (mounted.current) {
        setLoading(false)
      }
      log('✅ Loading complete')
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      log('🔐 Attempting sign in for:', email)
      setLoading(true)
      
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
      setLoading(false)
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
      setHasCleanedProfiles(false) // Reset cleanup flag
      log('✅ Sign out successful')
    } catch (error) {
      log('❌ Error signing out:', error)
      throw error
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

    if (error) {
      throw new Error('Failed to update profile. Please try again.')
    }
    
    const updatedProfile = profile ? { ...profile, ...updates } : null
    if (mounted.current) {
      setProfile(updatedProfile)
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

    if (error) {
      throw new Error('Failed to update language. Please try again.')
    }
    
    const updatedUser = { ...user, language }
    if (mounted.current) {
      setUser(updatedUser)
    }
  }

  const refreshSession = async () => {
    try {
      log('🔄 Refreshing session...')
      
      // First try to refresh the session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshError) {
        log('❌ Session refresh failed:', refreshError.message)
        // If refresh fails, try to get the current session
        const { data: { session }, error: getSessionError } = await supabase.auth.getSession()
        
        if (getSessionError || !session?.user) {
          log('❗ Session missing or error after refresh attempt:', getSessionError?.message || 'No session')
          throw new Error('Session refresh failed')
        }
        
        // Use the existing session if refresh failed but session exists
        log('⚠️ Using existing session after refresh failure')
        if (mounted.current) {
          setSession(session)
          await fetchUserData(session.user)
        }
        return
      }

      const { session: newSession, user } = refreshData
      
      if (!newSession || !user) {
        log('❗ No session or user after refresh')
        throw new Error('Session refresh returned invalid data')
      }
      
      log('✅ Session refreshed successfully')
      if (mounted.current) {
        setSession(newSession)
        await fetchUserData(user)
      }
    } catch (error) {
      log('❌ Error during session refresh:', error)
      // Only sign out if we're sure the session is invalid
      // Don't sign out on network errors or temporary issues
      if (error.message?.includes('refresh') || error.message?.includes('JWT') || error.message?.includes('expired')) {
        await signOut()
      } else {
        // For other errors, just log them but don't sign out
        log('⚠️ Session refresh failed but not signing out due to error type:', error.message)
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
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
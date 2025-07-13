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

  const cleanupDuplicateProfiles = async (userId: string) => {
    try {
      console.log('🧹 Cleaning up duplicate profiles for user:', userId)
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('❌ Error fetching profiles for cleanup:', error)
        return false
      }

      if (!profiles || profiles.length <= 1) {
        console.log('✅ No duplicate profiles found')
        return true
      }

      console.log(`🔍 Found ${profiles.length} profiles, keeping the first one and removing duplicates`)
      
      const profilesToDelete = profiles.slice(1)
      
      for (const profile of profilesToDelete) {
        const { error: deleteError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', profile.id)
        
        if (deleteError) {
          console.error('❌ Error deleting duplicate profile:', deleteError)
        } else {
          console.log('✅ Deleted duplicate profile:', profile.id)
        }
      }

      return true
    } catch (error) {
      console.error('❌ Error cleaning up duplicate profiles:', error)
      return false
    }
  }

  const fetchUserData = async (authUser: SupabaseUser) => {
    try {
      console.log('🔍 Fetching user data for:', authUser.id)
      
      await cleanupDuplicateProfiles(authUser.id)
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      let userData = null
      let profileData = null
      let retries = 3
      
      while (retries > 0 && (!userData || !profileData)) {
        console.log(`🔄 Fetching user data (attempt ${4 - retries})...`)
        
        try {
          const { data: userResult, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle()

          if (userError) {
            console.error('❌ Error fetching user:', userError)
          } else {
            userData = userResult
            if (userData) {
              console.log('✅ User data fetched successfully')
            } else {
              console.log('⚠️ User data not found, will retry...')
            }
          }

          const { data: profileResult, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', authUser.id)
            .maybeSingle()

          if (profileError) {
            console.error('❌ Error fetching profile:', profileError)
          } else {
            profileData = profileResult
            if (profileData) {
              console.log('✅ Profile data fetched successfully')
            } else {
              console.log('⚠️ Profile data not found, will retry...')
            }
          }

        } catch (fetchError) {
          console.error('❌ Error in fetch attempt:', fetchError)
        }

        if (!userData || !profileData) {
          retries--
          if (retries > 0) {
            console.log('⏳ Retrying in 2 seconds...')
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        } else {
          break
        }
      }

      if (!userData || !profileData) {
        console.error('❌ Failed to fetch user data after retries')
        
        if (userData && !profileData) {
          console.log('🔧 Attempting to create missing profile...')
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
            console.error('❌ Failed to create profile:', createError)
            throw new Error('Unable to create user profile. Please try refreshing the page.')
          } else {
            profileData = newProfile
            console.log('✅ Profile created successfully')
          }
        }
        
        if (profileData && !userData) {
          console.log('🔧 Attempting to create missing user record...')
          
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
            console.error('❌ Failed to create user:', createError)
            throw new Error('Unable to create user record. Please try refreshing the page.')
          } else {
            userData = newUser
            console.log('✅ User record created successfully')
          }
        }
        
        if (!userData || !profileData) {
          throw new Error('Unable to retrieve or create user account data. Please try refreshing the page.')
        }
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
        throw new Error(error.message || 'Sign-in failed')
      }
      
      console.log('✅ Sign in successful')
    } catch (error) {
      console.error('❌ Sign in error:', error)
      setLoading(false)
      throw error
    }
  }

  const signUp = async (email: string, fullName: string, password: string): Promise<{ user: User | null; session: Session | null }> => {
    try {
      console.log('🔧 signUp function called with:', { email, fullName, passwordLength: password.length })
      
      if (!email || !email.includes('@')) {
        console.log('❌ Invalid email validation failed')
        throw new Error('Invalid email address')
      }
      if (!fullName || fullName.trim() === '') {
        console.log('❌ Full name validation failed')
        throw new Error('Full name is required')
      }
      if (!password || password.length < 6) {
        console.log('❌ Password validation failed')
        throw new Error('Password must be at least 6 characters long')
      }

      console.log('📤 Calling supabase.auth.signUp...')
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
      
      console.log('📥 supabase.auth.signUp response:', { data, error })
      
      if (error) throw new Error(error.message || 'Signup failed')

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

      console.log('✅ signUp function returning mapped data:', { user: mappedUser, session: data.session })
      return { user: mappedUser, session: data.session }
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    }
  }

  const verifyOtp = async (email: string, otp: string, type: 'signup' | 'recovery') => {
    try {
      console.log('🔐 Verifying OTP for:', email, 'Type:', type)
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type
      })
      
      if (error) {
        console.error('❌ OTP verification error details:', { message: error.message, code: error.code, status: error.status })
        throw new Error(`OTP verification failed: ${error.message}`)
      }
      
      console.log('✅ OTP verified successfully:', data)
    } catch (error) {
      console.error('❌ OTP verification error:', error)
      throw error
    }
  }

  const setPassword = async (password: string) => {
    try {
      console.log('🔑 Attempting to set password')
      const { error } = await supabase.auth.updateUser({
        password
      })
      
      if (error) {
        console.error('❌ Set password error details:', { message: error.message, code: error.code, status: error.status })
        throw new Error(`Set password failed: ${error.message}`)
      }
      
      console.log('✅ Password set successfully')
      await supabase.auth.signOut()
      console.log('✅ Signed out after password reset')
    } catch (error) {
      console.error('❌ Set password error:', error)
      throw error
    }
  }

  const resendOtp = async (email: string) => {
    try {
      console.log('🔧 resendOtp function called with email:', email)
      console.log('📤 Calling supabase.auth.resend...')
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })
      
      console.log('📥 supabase.auth.resend response:', { error })
      
      if (error) throw new Error(`Resend OTP failed: ${error.message}`)
      
      console.log('✅ resendOtp function completed successfully')
    } catch (error) {
      console.error('Resend OTP error:', error)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      console.log('🔧 resetPassword function called with email:', email)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
      
      if (error) {
        console.error('❌ Password reset error details:', { message: error.message, code: error.code, status: error.status })
        throw new Error(`Password reset failed: ${error.message}`)
      }
      console.log('✅ Password reset email sent successfully')
    } catch (error) {
      console.error('❌ Password reset error:', error)
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

  const refreshSession = async () => {
    try {
      console.log('🔄 Refreshing session...')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Error refreshing session:', error.message)
        // If session refresh fails, sign out the user
        await signOut()
        return
      }

      if (session?.user) {
        console.log('✅ Session refreshed successfully')
        
        // Explicitly set the session to ensure Supabase client state is fully updated
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token
        })
        
        if (setSessionError) {
          console.error('❌ Error setting session:', setSessionError.message)
          await signOut()
          return
        }
        
        console.log('✅ Session state updated in Supabase client')
        setSession(session)
        // Re-fetch user data to ensure it's up to date
        await fetchUserData(session.user)
      } else {
        console.log('❌ No valid session found, signing out...')
        await signOut()
      }
    } catch (error) {
      console.error('❌ Error during session refresh:', error)
      await signOut()
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
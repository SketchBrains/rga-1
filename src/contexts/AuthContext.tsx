import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, User, Profile } from '../lib/supabase'
import { Session, User as SupabaseUser } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, fullName: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
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

      return subscription
    }

    initializeAuth().then(() => {
      if (mounted) {
        const subscription = setupAuthListener()
        return () => subscription.unsubscribe()
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  const fetchUserData = async (userId: string) => {
    try {
      console.log('🔍 Fetching user data for:', userId)
      
      // Fetch user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError) {
        console.error('❌ Error fetching user:', userError)
        throw new Error('Failed to fetch user data')
      }

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (profileError) {
        console.error('❌ Error fetching profile:', profileError)
        throw new Error('Failed to fetch profile data')
      }

      console.log('✅ User data fetched:', { id: userData.id, role: userData.role, email: userData.email })
      console.log('✅ Profile data fetched:', { name: profileData.full_name })
      
      setUser(userData)
      setProfile(profileData)
      
    } catch (error) {
      console.error('❌ Error fetching user data:', error)
      throw error
    } finally {
      setLoading(false)
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
    } catch (error) {
      console.error('❌ Sign in error:', error)
      setLoading(false)
      throw error
    }
  }

  const signUp = async (email: string, fullName: string, password: string) => {
    try {
      console.log('🔐 Attempting sign up for:', email)
      setLoading(true)

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
        },
      })
      
      if (error) throw new Error(`Sign-up failed: ${error.message}`)

      console.log('✅ Sign up successful')
      // The database trigger will handle creating user and profile records
    } catch (error) {
      console.error('❌ Sign up error:', error)
      setLoading(false)
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

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
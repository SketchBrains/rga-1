import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, User, Profile } from '../lib/supabase'
import { Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
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

    const initializeAuth = async () => {
      try {
        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          if (mounted) {
            console.log('Auth initialization timeout - setting loading to false')
            setLoading(false)
          }
        }, 10000) // 10 second timeout

        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        clearTimeout(timeoutId)

        if (error) {
          console.error('Error getting session:', error)
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

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log('Auth state changed:', event, session?.user?.id)
      
      if (event === 'SIGNED_OUT' || !session) {
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

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const createUserRecord = async (userId: string, email: string, fullName?: string) => {
    try {
      // Create user record
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: email,
          role: 'student',
          language: 'english'
        })

      if (userError) {
        console.error('Error creating user record:', userError)
      }

      // Create profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          full_name: fullName || 'User',
          is_verified: false
        })

      if (profileError) {
        console.error('Error creating profile record:', profileError)
      }
    } catch (error) {
      console.error('Error creating user/profile records:', error)
    }
  }

  const fetchUserData = async (userId: string) => {
    try {
      setLoading(true)
      
      // Set timeout for data fetching
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 8000)
      )

      // Fetch user data
      const userPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      const [userResult, profileResult] = await Promise.allSettled([
        Promise.race([userPromise, timeoutPromise]),
        Promise.race([profilePromise, timeoutPromise])
      ])

      let userData = null
      let profileData = null

      if (userResult.status === 'fulfilled') {
        const { data, error } = userResult.value as any
        if (data && !error) {
          userData = data
        } else if (error && !error.message.includes('No rows')) {
          console.error('Error fetching user data:', error)
        }
      } else {
        console.error('User data fetch failed:', userResult.reason)
      }

      if (profileResult.status === 'fulfilled') {
        const { data, error } = profileResult.value as any
        if (data && !error) {
          profileData = data
        } else if (error && !error.message.includes('No rows')) {
          console.error('Error fetching profile data:', error)
        }
      } else {
        console.error('Profile data fetch failed:', profileResult.reason)
      }

      // If no user or profile data found, create them
      if (!userData || !profileData) {
        const { data: authUser } = await supabase.auth.getUser()
        if (authUser.user) {
          await createUserRecord(
            authUser.user.id, 
            authUser.user.email || '', 
            authUser.user.user_metadata?.full_name
          )
          // Retry fetching after creating records
          const { data: newUserData } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single()
          
          const { data: newProfileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single()
          
          userData = newUserData
          profileData = newProfileData
        }
      }

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
      if (error) throw error
      // Loading will be set to false by the auth state change listener
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      
      if (error) throw error
      
      // Create user and profile records immediately after signup
      if (data.user) {
        await createUserRecord(data.user.id, email, fullName)
      }
      
      // Loading will be set to false by the auth state change listener
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
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

    if (error) throw error
    
    setProfile(prev => prev ? { ...prev, ...updates } : null)
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

    if (error) throw error
    
    setUser(prev => prev ? { ...prev, language } : null)
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    updateProfile,
    updateLanguage,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
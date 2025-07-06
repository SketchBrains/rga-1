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
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        
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

    // Set up auth state listener
    const setupAuthListener = () => {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return

        console.log('Auth state changed:', event, session?.user?.id)
        
        if (event === 'SIGNED_OUT' || !session) {
          // Clear cache on sign out
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

    // Initialize auth and set up listener
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
      
      // Check cache first
      const cached = userDataCache.get(userId)
      const now = Date.now()
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        console.log('Using cached user data')
        setUser(cached.user)
        setProfile(cached.profile)
        setLoading(false)
        return
      }

      // Fetch user and profile data with shorter timeout
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

      // Set a 5-second timeout for data fetching
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
        console.error('Error fetching user data:', userResult.error)
      }

      if (profileResult.data && !profileResult.error) {
        profileData = profileResult.data
      } else if (profileResult.error && !profileResult.error.message.includes('No rows')) {
        console.error('Error fetching profile data:', profileResult.error)
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
          try {
            const [newUserResult, newProfileResult] = await Promise.all([
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
            
            userData = newUserResult.data
            profileData = newProfileResult.data
          } catch (retryError) {
            console.error('Error retrying user data fetch:', retryError)
          }
        }
      }

      // Cache the results
      userDataCache.set(userId, {
        user: userData,
        profile: profileData,
        timestamp: now
      })

      setUser(userData)
      setProfile(profileData)
    } catch (error) {
      console.error('Error fetching user data:', error)
      // Don't throw error, just set loading to false
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
      // Clear cache before signing out
      if (user?.id) {
        userDataCache.delete(user.id)
      }
      
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
    
    const updatedProfile = profile ? { ...profile, ...updates } : null
    setProfile(updatedProfile)
    
    // Update cache
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

    if (error) throw error
    
    const updatedUser = { ...user, language }
    setUser(updatedUser)
    
    // Update cache
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
    signInWithGoogle,
    updateProfile,
    updateLanguage,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
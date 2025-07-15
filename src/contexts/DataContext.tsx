import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { RealtimeChannel } from '@supabase/supabase-js'

interface CacheEntry<T> {
  data: T
  timestamp: number
  loading: boolean
}

interface DataContextType {
  scholarshipForms: any[]
  loadingScholarshipForms: boolean
  fetchScholarshipForms: () => Promise<void>
  applications: any[]
  loadingApplications: boolean
  fetchApplications: () => Promise<void>
  documents: any[]
  loadingDocuments: boolean
  fetchDocuments: () => Promise<void>
  allApplications: any[]
  loadingAllApplications: boolean
  fetchAllApplications: () => Promise<void>
  adminForms: any[]
  loadingAdminForms: boolean
  fetchAdminForms: () => Promise<void>
  announcements: any[]
  loadingAnnouncements: boolean
  fetchAnnouncements: () => Promise<void>
  clearCache: () => void
  refreshData: () => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const cache = new Map<string, CacheEntry<any>>()

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session, signOut, refreshSession } = useAuth()

  // State for all cached data
  const [scholarshipForms, setScholarshipForms] = useState<any[]>([])
  const [loadingScholarshipForms, setLoadingScholarshipForms] = useState(false)
  const [applications, setApplications] = useState<any[]>([])
  const [loadingApplications, setLoadingApplications] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [allApplications, setAllApplications] = useState<any[]>([])
  const [loadingAllApplications, setLoadingAllApplications] = useState(false)
  const [adminForms, setAdminForms] = useState<any[]>([])
  const [loadingAdminForms, setLoadingAdminForms] = useState(false)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false)

  // Helper function to check if cache is valid
  const isCacheValid = (key: string): boolean => {
    const cached = cache.get(key)
    if (!cached) return false
    return Date.now() - cached.timestamp < CACHE_DURATION
  }

  // Helper function to check if error is authentication-related
  const isAuthError = (error: any): boolean => {
    if (!error) return false
    const authErrorMessages = [
      'JWT expired',
      'Invalid JWT',
      'Token has expired',
      'Authentication required',
      'Invalid token',
      'Session not found',
      'User not authenticated',
      'session has expired',
      'Invalid or expired session'
    ]
    const errorMessage = error.message?.toLowerCase() || ''
    const isJWTError = authErrorMessages.some(msg => errorMessage.includes(msg.toLowerCase()))
    const isStatusUnauthorized = error.status === 401 || error.code === 401
    const isAuthCode = error.code === 'PGRST301' || error.code === 'PGRST302'
    const isSessionExpired = error.code === 'SESSION_EXPIRED'
    return isJWTError || isStatusUnauthorized || isAuthCode || isSessionExpired
  }

  // Helper function to get from cache or fetch with retry on auth error
  const getCachedOrFetch = async <T,>(
    key: string,
    fetchFn: () => Promise<T>,
    setData: (data: T) => void,
    setLoading: (loading: boolean) => void
  ): Promise<void> => {
    if (isCacheValid(key)) {
      const cached = cache.get(key)
      if (cached && !cached.loading) {
        console.log(`Using cached data for ${key}`)
        setData(cached.data)
        return
      }
    }

    const cached = cache.get(key)
    if (cached?.loading) {
      console.log(`Already loading ${key}, skipping...`)
      return
    }

    let retries = 1
    let lastError: any

    while (retries >= 0) {
      try {
        setLoading(true)
        cache.set(key, { data: [], timestamp: Date.now(), loading: true })

        const data = await fetchFn()
        cache.set(key, { data, timestamp: Date.now(), loading: false })
        setData(data)
        return
      } catch (error) {
        console.error(`Error fetching ${key}:`, error)
        lastError = error

        if (isAuthError(error) && retries > 0) {
          console.log('🔐 Authentication error detected, attempting to refresh session...')
          try {
            await refreshSession()
            // Wait a bit for the session to be updated
            await new Promise(resolve => setTimeout(resolve, 1000))
            retries--
            continue
          } catch (refreshError) {
            console.error('Error refreshing session:', refreshError)
            // Only sign out if refresh explicitly failed due to auth issues
            if (refreshError.message?.includes('refresh') || refreshError.message?.includes('JWT')) {
              await signOut()
            }
            return
          }
        }

        cache.delete(key)
        break
      } finally {
        setLoading(false)
      }
    }

    if (isAuthError(lastError)) {
      console.log('🔐 Authentication error persisted after retry, signing out...')
      try {
        await signOut()
      } catch (signOutError) {
        console.error('Error during sign out:', signOutError)
        // Force reload if sign out fails
        window.location.reload()
      }
    }
    throw lastError
  }

  // Fetch scholarship forms
  const fetchScholarshipForms = useCallback(async () => {
    if (!user || !session) return

    await getCachedOrFetch(
      'scholarshipForms',
      async () => {
        const { data, error } = await supabase
          .from('scholarship_forms')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
      },
      setScholarshipForms,
      setLoadingScholarshipForms
    )
  }, [user, session])

  // Fetch user applications
  const fetchApplications = useCallback(async () => {
    if (!user || !session) return

    await getCachedOrFetch(
      `applications_${user.id}`,
      async () => {
        const { data, error } = await supabase
          .from('applications')
          .select(`
            *,
            scholarship_forms (title, title_hindi, education_level)
          `)
          .eq('student_id', user.id)
          .order('submitted_at', { ascending: false })

        if (error) throw error
        return data || []
      },
      setApplications,
      setLoadingApplications
    )
  }, [user, session])

  // Fetch user documents
  const fetchDocuments = useCallback(async () => {
    if (!user || !session) return

    await getCachedOrFetch(
      `documents_${user.id}`,
      async () => {
        const { data, error } = await supabase
          .from('documents')
          .select(`
            *,
            applications (
              scholarship_forms (title, title_hindi)
            ),
            form_fields (field_label, field_label_hindi)
          `)
          .eq('uploaded_by', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
      },
      setDocuments,
      setLoadingDocuments
    )
  }, [user, session])

  // Fetch all applications (admin)
  const fetchAllApplications = useCallback(async () => {
    if (!user || !session || user.role !== 'admin') return

    await getCachedOrFetch(
      'allApplications',
      async () => {
        const { data: applications, error: appsError } = await supabase
          .from('applications')
          .select(`
            *,
            scholarship_forms (title, title_hindi, education_level)
          `)
          .order('submitted_at', { ascending: false })

        if (appsError) throw appsError
        if (!applications || applications.length === 0) {
          return []
        }

        const userIds = applications.map(app => app.student_id)
        const [usersResult, profilesResult] = await Promise.allSettled([
          supabase
            .from('users')
            .select('id, email')
            .in('id', userIds),
          supabase
            .from('profiles')
            .select('user_id, full_name, phone, is_verified')
            .in('user_id', userIds)
        ])

        const users = usersResult.status === 'fulfilled' ? usersResult.value.data || [] : []
        const profiles = profilesResult.status === 'fulfilled' ? profilesResult.value.data || [] : []

        const enrichedApplications = applications.map(app => {
          const user = users.find(u => u.id === app.student_id)
          const profile = profiles.find(p => p.user_id === app.student_id)
          
          return {
            ...app,
            users: user ? {
              email: user.email,
              profiles: profile ? { 
                full_name: profile.full_name,
                phone: profile.phone,
                is_verified: profile.is_verified
              } : null
            } : null
          }
        })

        return enrichedApplications
      },
      setAllApplications,
      setLoadingAllApplications
    )
  }, [user, session])

  // Fetch admin forms
  const fetchAdminForms = useCallback(async () => {
    if (!user || !session || user.role !== 'admin') return

    await getCachedOrFetch(
      'adminForms',
      async () => {
        const { data, error } = await supabase
          .from('scholarship_forms')
          .select(`
            *,
            form_fields (*)
          `)
          .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
      },
      setAdminForms,
      setLoadingAdminForms
    )
  }, [user, session])

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    await getCachedOrFetch(
      'announcements',
      async () => {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
      },
      setAnnouncements,
      setLoadingAnnouncements
    )
  }, [])

  // Clear all cache
  const clearCache = useCallback(() => {
    cache.clear()
    setScholarshipForms([])
    setApplications([])
    setDocuments([])
    setAllApplications([])
    setAdminForms([])
    setAnnouncements([])
  }, [])

  // Refresh all data
  const refreshData = useCallback(async () => {
    clearCache()
    if (user && session) {
      await Promise.all([
        fetchScholarshipForms(),
        fetchApplications(),
        fetchDocuments(),
        fetchAnnouncements(),
        ...(user.role === 'admin' ? [fetchAllApplications(), fetchAdminForms()] : [])
      ])
    } else {
      await fetchAnnouncements()
    }
  }, [user, session, fetchScholarshipForms, fetchApplications, fetchDocuments, fetchAnnouncements, fetchAllApplications, fetchAdminForms])

  // Real-time subscription setup
  useEffect(() => {
    if (!session) return

    const subscriptions: RealtimeChannel[] = []

    // Scholarship forms subscription
    const scholarshipFormsSub = supabase
      .channel('scholarship_forms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scholarship_forms' }, () => {
        console.log('Scholarship forms changed, refreshing...')
        fetchScholarshipForms()
      })
      .subscribe()

    // Applications subscription
    const applicationsSub = user
      ? supabase
          .channel(`applications_${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'applications', filter: `student_id=eq.${user.id}` }, () => {
            console.log('Applications changed, refreshing...')
            fetchApplications()
          })
          .subscribe()
      : null

    // Documents subscription
    const documentsSub = user
      ? supabase
          .channel(`documents_${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'documents', filter: `uploaded_by=eq.${user.id}` }, () => {
            console.log('Documents changed, refreshing...')
            fetchDocuments()
          })
          .subscribe()
      : null

    // Announcements subscription
    const announcementsSub = supabase
      .channel('announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        console.log('Announcements changed, refreshing...')
        fetchAnnouncements()
      })
      .subscribe()

    // Admin subscriptions
    let allApplicationsSub: RealtimeChannel | null = null
    let adminFormsSub: RealtimeChannel | null = null
    if (user?.role === 'admin') {
      allApplicationsSub = supabase
        .channel('all_applications')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
          console.log('All applications changed, refreshing...')
          fetchAllApplications()
        })
        .subscribe()

      adminFormsSub = supabase
        .channel('admin_forms')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'scholarship_forms' }, () => {
          console.log('Admin forms changed, refreshing...')
          fetchAdminForms()
        })
        .subscribe()
    }

    subscriptions.push(scholarshipFormsSub, announcementsSub)
    if (applicationsSub) subscriptions.push(applicationsSub)
    if (documentsSub) subscriptions.push(documentsSub)
    if (allApplicationsSub) subscriptions.push(allApplicationsSub)
    if (adminFormsSub) subscriptions.push(adminFormsSub)

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe())
      supabase.removeAllChannels()
    }
  }, [user, session, fetchScholarshipForms, fetchApplications, fetchDocuments, fetchAnnouncements, fetchAllApplications, fetchAdminForms])

  // Fetch data when user or session changes
  useEffect(() => {
    if (session) {
      refreshData()
    } else {
      clearCache()
    }
  }, [user, session, refreshData])

  const value = {
    scholarshipForms,
    loadingScholarshipForms,
    fetchScholarshipForms,
    applications,
    loadingApplications,
    fetchApplications,
    documents,
    loadingDocuments,
    fetchDocuments,
    allApplications,
    loadingAllApplications,
    fetchAllApplications,
    adminForms,
    loadingAdminForms,
    fetchAdminForms,
    announcements,
    loadingAnnouncements,
    fetchAnnouncements,
    clearCache,
    refreshData,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
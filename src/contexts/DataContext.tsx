import React, { createContext, useContext, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

interface CacheEntry<T> {
  data: T
  timestamp: number
  loading: boolean
}

interface DataContextType {
  // Scholarship forms
  scholarshipForms: any[]
  loadingScholarshipForms: boolean
  fetchScholarshipForms: () => Promise<void>
  
  // Applications
  applications: any[]
  loadingApplications: boolean
  fetchApplications: () => Promise<void>
  
  // Documents
  documents: any[]
  loadingDocuments: boolean
  fetchDocuments: () => Promise<void>
  
  // Admin data
  allApplications: any[]
  loadingAllApplications: boolean
  fetchAllApplications: () => Promise<void>
  
  // Forms for admin
  adminForms: any[]
  loadingAdminForms: boolean
  fetchAdminForms: () => Promise<void>
  
  // Announcements
  announcements: any[]
  loadingAnnouncements: boolean
  fetchAnnouncements: () => Promise<void>
  
  // Cache management
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
  const { user } = useAuth()
  
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
    return (Date.now() - cached.timestamp) < CACHE_DURATION
  }

  // Helper function to get from cache or fetch
  const getCachedOrFetch = async <T,>(
    key: string,
    fetchFn: () => Promise<T>,
    setData: (data: T) => void,
    setLoading: (loading: boolean) => void
  ): Promise<void> => {
    // Check if we have valid cached data
    if (isCacheValid(key)) {
      const cached = cache.get(key)
      if (cached && !cached.loading) {
        console.log(`Using cached data for ${key}`)
        setData(cached.data)
        return
      }
    }

    // Check if already loading
    const cached = cache.get(key)
    if (cached?.loading) {
      console.log(`Already loading ${key}, skipping...`)
      return
    }

    try {
      setLoading(true)
      
      // Mark as loading in cache
      cache.set(key, { data: [], timestamp: Date.now(), loading: true })
      
      const data = await fetchFn()
      
      // Update cache and state
      cache.set(key, { data, timestamp: Date.now(), loading: false })
      setData(data)
    } catch (error) {
      console.error(`Error fetching ${key}:`, error)
      // Remove loading state from cache on error
      cache.delete(key)
    } finally {
      setLoading(false)
    }
  }

  // Fetch scholarship forms
  const fetchScholarshipForms = useCallback(async () => {
    if (!user) return

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
  }, [user])

  // Fetch user applications
  const fetchApplications = useCallback(async () => {
    if (!user) return

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
  }, [user])

  // Fetch user documents
  const fetchDocuments = useCallback(async () => {
    if (!user) return

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
  }, [user])

  // Fetch all applications (admin)
  const fetchAllApplications = useCallback(async () => {
    if (!user || user.role !== 'admin') return

    await getCachedOrFetch(
      'allApplications',
      async () => {
        // First, get applications with basic info
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

        // Then get user and profile data separately
        const userIds = applications.map(app => app.student_id)
        const [usersResult, profilesResult] = await Promise.allSettled([
          supabase
            .from('users')
            .select('id, email')
            .in('id', userIds),
          supabase
            .from('profiles')
            .select('user_id, full_name, phone')
            .in('user_id', userIds)
        ])

        const users = usersResult.status === 'fulfilled' ? usersResult.value.data || [] : []
        const profiles = profilesResult.status === 'fulfilled' ? profilesResult.value.data || [] : []

        // Combine the data
        const enrichedApplications = applications.map(app => {
          const user = users.find(u => u.id === app.student_id)
          const profile = profiles.find(p => p.user_id === app.student_id)
          
          return {
            ...app,
            users: user ? {
              email: user.email,
              profiles: profile ? { 
                full_name: profile.full_name,
                phone: profile.phone 
              } : null
            } : null
          }
        })

        return enrichedApplications
      },
      setAllApplications,
      setLoadingAllApplications
    )
  }, [user])

  // Fetch admin forms
  const fetchAdminForms = useCallback(async () => {
    if (!user || user.role !== 'admin') return

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
  }, [user])

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
    
    if (user) {
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
  }, [user, fetchScholarshipForms, fetchApplications, fetchDocuments, fetchAnnouncements, fetchAllApplications, fetchAdminForms])

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
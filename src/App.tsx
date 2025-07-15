import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth, AuthContextType } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { usePageVisibilityCallback, usePageVisibility } from './hooks/usePageVisibility'
import { useAutoLogout } from './hooks/useIdleTimer'
import LandingPage from './components/Landing/LandingPage'
import AuthForm from './components/Auth/AuthForm'
import ResetPasswordForm from './components/Auth/ResetPasswordForm'
import ConfirmReset from './components/Auth/ConfirmReset'
import Header from './components/Layout/Header'
import Sidebar from './components/Layout/Sidebar'
import Marquee from './components/Layout/Marquee'
import StudentDashboard from './components/Student/StudentDashboard'
import StudentApplications from './components/Student/StudentApplications'
import StudentDocuments from './components/Student/StudentDocuments'
import StudentHistory from './components/Student/StudentHistory'
import AdminDashboard from './components/Admin/AdminDashboard'
import CreateEditForms from './components/Admin/CreateEditForms'
import ViewApplications from './components/Admin/ViewApplications'
import StudentDetail from './components/Admin/StudentDetail'
import MarqueeEditor from './components/Admin/MarqueeEditor'
import ExportData from './components/Admin/ExportData'
import UserManagement from './components/Admin/UserManagement'

import { User as SupabaseUser } from '@supabase/supabase-js'
import { Profile, User } from './lib/supabase'

const AppContent: React.FC = () => {
  const { signOut, getSession } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showAuth, setShowAuth] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const location = useLocation()
  const isPageVisible = usePageVisibility()

  console.log('🔍 AppContent render - user:', currentUser?.id, 'role:', currentUser?.role, 'loading:', loadingSession, 'path:', location.pathname)

  const fetchAndSetSession = async () => {
    setLoadingSession(true)
    try {
      const { session, user, profile } = await getSession()
      if (session && user && profile) {
        setCurrentUser(user)
        setCurrentProfile(profile)
        console.log('✅ Session and user data loaded:', user.id, user.role)
      } else {
        setCurrentUser(null)
        setCurrentProfile(null)
        console.log('❗ No active session or user data found.')
        // Redirect to landing/login if on a protected route and no session
        if (!['/auth/reset-password', '/auth/confirm-reset', '/'].includes(location.pathname)) {
          navigate('/')
        }
      }
    } catch (error) {
      console.error('❌ Error fetching session:', error)
      setCurrentUser(null)
      setCurrentProfile(null)
      navigate('/') // Force redirect on session fetch error
    } finally {
      setLoadingSession(false)
    }
  }

  // Sign out if accessing reset-password or confirm-reset route with an active session
  useEffect(() => {
    if ((location.pathname === '/auth/reset-password' || location.pathname === '/auth/confirm-reset') && currentUser) {
      console.log('🔐 Active session detected on reset-related route, signing out...')
      signOut().catch(err => console.error('❌ Error signing out:', err))
    }
  }, [location.pathname, currentUser, signOut])

  // Show loading screen while authentication is being determined
  if (loadingSession) {
    console.log('⏳ Showing loading screen')
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-base sm:text-lg">Loading RGA Portal...</p>
          <p className="text-gray-500 text-xs sm:text-sm mt-2">Please wait while we initialize your session</p>
        </div>
      </div>
    )
  }

  // Initial session fetch on component mount
  useEffect(() => {
    fetchAndSetSession()
  }, [])

  // Handle page visibility changes to refresh session
  usePageVisibilityCallback(async () => {
    if (isPageVisible) { // Only re-fetch if page became visible
      console.log('🔄 Page became visible, re-fetching session...')
      await fetchAndSetSession()
    }
  }, [isPageVisible])

  // Show landing page if no user and not showing auth
  if (!currentUser && !showAuth && location.pathname !== '/auth/reset-password' && location.pathname !== '/auth/confirm-reset') {
    console.log('🏠 Showing landing page')
    return <LandingPage onShowAuth={() => setShowAuth(true)} />
  }

  // Show auth form if no user and showing auth
  if (!currentUser && showAuth && location.pathname !== '/auth/reset-password' && location.pathname !== '/auth/confirm-reset') {
    console.log('🔐 Showing auth form')
    return <AuthForm onBackToLanding={() => setShowAuth(false)} onAuthSuccess={fetchAndSetSession} />
  }

  // User is authenticated, show appropriate dashboard
  console.log('🎉 User is authenticated, role:', currentUser?.role, 'showing dashboard')
  
  return (
    <AuthenticatedApp 
      currentUser={currentUser}
      currentProfile={currentProfile}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      fetchAndSetSession={fetchAndSetSession} // Pass down the session refresh function
    />
  )
}

const AuthenticatedApp: React.FC<{
  currentUser: User | null
  currentProfile: Profile | null
  activeTab: string
  setActiveTab: (tab: string) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  fetchAndSetSession: () => Promise<void>
}> = ({ currentUser, currentProfile, activeTab, setActiveTab, sidebarOpen, setSidebarOpen, fetchAndSetSession }) => {
  const { signOut } = useAuth()

  // Auto-logout after 1 hour of inactivity
  useAutoLogout(60, async () => {
    console.log('🚪 Auto-logout: User has been inactive for 1 hour')
    try {
      await signOut()
      fetchAndSetSession() // Re-fetch session to reflect signed out state
    } catch (error) {
      console.error('❌ Error during auto-logout:', error)
      // Force reload if signOut fails
      window.location.reload()
    }
  })

  const renderContent = () => {
    if (!currentUser) {
      // Should not happen if logic in AppContent is correct, but as a fallback
      return <div className="text-center p-8 text-gray-500">Please log in to access the dashboard.</div>
    }

    if (currentUser.role === 'admin') {
      console.log('👨‍💼 Rendering admin dashboard, activeTab:', activeTab)
      switch (activeTab) {
        case 'dashboard':
          return <AdminDashboard onNavigate={setActiveTab} currentUser={currentUser} currentProfile={currentProfile} />
        case 'forms':
          return <CreateEditForms currentUser={currentUser} currentProfile={currentProfile} />
        case 'applications':
          return <ViewApplications currentUser={currentUser} currentProfile={currentProfile} />
        case 'student-detail':
          return <StudentDetail currentUser={currentUser} currentProfile={currentProfile} />
        case 'marquee':
          return <MarqueeEditor currentUser={currentUser} currentProfile={currentProfile} />
        case 'export':
          return <ExportData currentUser={currentUser} currentProfile={currentProfile} />
        case 'user-management':
          return <UserManagement currentUser={currentUser} currentProfile={currentProfile} />
        default:
          return <AdminDashboard onNavigate={setActiveTab} currentUser={currentUser} currentProfile={currentProfile} />
      }
    } else if (currentUser.role === 'student') {
      console.log('👨‍🎓 Rendering student dashboard, activeTab:', activeTab)
      switch (activeTab) {
        case 'dashboard':
          return <StudentDashboard onNavigate={setActiveTab} currentUser={currentUser} currentProfile={currentProfile} />
        case 'applications':
          return <StudentApplications currentUser={currentUser} currentProfile={currentProfile} />
        case 'documents':
          return <StudentDocuments currentUser={currentUser} currentProfile={currentProfile} />
        case 'history':
          return <StudentHistory currentUser={currentUser} currentProfile={currentProfile} />
        default:
          return <StudentDashboard onNavigate={setActiveTab} currentUser={currentUser} currentProfile={currentProfile} />
      }
    } else {
      return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <Marquee currentUser={currentUser} currentProfile={currentProfile} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          activeTab={activeTab} 
          currentUser={currentUser}
          currentProfile={currentProfile}
          setActiveTab={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <LanguageProvider>
          <Routes>
            <Route path="/auth/reset-password" element={<ResetPasswordForm />} />
            <Route path="/auth/confirm-reset" element={<ConfirmReset />} />
            <Route path="/*" element={<AppContent />} />
          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </LanguageProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
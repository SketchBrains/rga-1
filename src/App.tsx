import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { DataProvider } from './contexts/DataContext'
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

const AppContent: React.FC = () => {
  const { user, loading, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showAuth, setShowAuth] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  console.log('🔍 AppContent render - user:', user?.id, 'role:', user?.role, 'loading:', loading, 'path:', location.pathname)

  // Sign out if accessing reset-password or confirm-reset route with an active session
  useEffect(() => {
    if ((location.pathname === '/auth/reset-password' || location.pathname === '/auth/confirm-reset') && user) {
      console.log('🔐 Active session detected on reset-related route, signing out...')
      signOut().catch(err => console.error('❌ Error signing out:', err))
    }
  }, [location.pathname, user, signOut])

  // Show loading screen while authentication is being determined
  if (loading) {
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

  // Show landing page if no user and not showing auth
  if (!user && !showAuth && location.pathname !== '/auth/reset-password' && location.pathname !== '/auth/confirm-reset') {
    console.log('🏠 Showing landing page')
    return <LandingPage onShowAuth={() => setShowAuth(true)} />
  }

  // Show auth form if no user and showing auth
  if (!user && showAuth && location.pathname !== '/auth/reset-password' && location.pathname !== '/auth/confirm-reset') {
    console.log('🔐 Showing auth form')
    return <AuthForm onBackToLanding={() => setShowAuth(false)} />
  }

  // User is authenticated, show appropriate dashboard
  console.log('🎉 User is authenticated, role:', user?.role, 'showing dashboard')
  
  const renderContent = () => {
    if (user && user.role === 'admin') {
      console.log('👨‍💼 Rendering admin dashboard, activeTab:', activeTab)
      switch (activeTab) {
        case 'dashboard':
          return <AdminDashboard onNavigate={setActiveTab} />
        case 'forms':
          return <CreateEditForms />
        case 'applications':
          return <ViewApplications />
        case 'student-detail':
          return <StudentDetail />
        case 'marquee':
          return <MarqueeEditor />
        case 'export':
          return <ExportData />
        default:
          return <AdminDashboard onNavigate={setActiveTab} />
      }
    } else if (user) {
      console.log('👨‍🎓 Rendering student dashboard, activeTab:', activeTab)
      switch (activeTab) {
        case 'dashboard':
          return <StudentDashboard onNavigate={setActiveTab} />
        case 'applications':
          return <StudentApplications />
        case 'documents':
          return <StudentDocuments />
        case 'history':
          return <StudentHistory />
        default:
          return <StudentDashboard onNavigate={setActiveTab} />
      }
    } else {
      return null
    }
  }

  return (
    <DataProvider>
      <div className="min-h-screen bg-gray-50">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <Marquee />
        <div className="flex">
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          <main className="flex-1 overflow-auto min-h-screen lg:ml-0">
            <div className="p-4 sm:p-6">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </DataProvider>
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
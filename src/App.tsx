import React, { useState } from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { DataProvider } from './contexts/DataContext'
import LandingPage from './components/Landing/LandingPage'
import AuthForm from './components/Auth/AuthForm'
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
import MarqueeEditor from './components/Admin/MarqueeEditor'
import ExportData from './components/Admin/ExportData'

const AppContent: React.FC = () => {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showAuth, setShowAuth] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Show loading screen with timeout
  if (loading) {
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
  if (!user && !showAuth) {
    return <LandingPage onShowAuth={() => setShowAuth(true)} />
  }

  // Show auth form if no user and showing auth
  if (!user && showAuth) {
    return <AuthForm onBackToLanding={() => setShowAuth(false)} />
  }

  // User is authenticated, show dashboard
  const renderContent = () => {
    if (user.role === 'admin') {
      switch (activeTab) {
        case 'dashboard':
          return <AdminDashboard />
        case 'forms':
          return <CreateEditForms />
        case 'applications':
          return <ViewApplications />
        case 'marquee':
          return <MarqueeEditor />
        case 'export':
          return <ExportData />
        default:
          return <AdminDashboard />
      }
    } else {
      switch (activeTab) {
        case 'dashboard':
          return <StudentDashboard />
        case 'applications':
          return <StudentApplications />
        case 'documents':
          return <StudentDocuments />
        case 'history':
          return <StudentHistory />
        default:
          return <StudentDashboard />
      }
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
          <AppContent />
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
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../contexts/LanguageContext'
import { BookOpen, Key, Loader, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const GoogleCallback: React.FC = () => {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [settingPassword, setSettingPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    handleGoogleCallback()
  }, [])

  const handleGoogleCallback = async () => {
    try {
      // Check for error in URL parameters
      const urlParams = new URLSearchParams(window.location.search)
      const errorParam = urlParams.get('error')
      const errorDescription = urlParams.get('error_description')
      
      if (errorParam) {
        console.error('OAuth error:', errorParam, errorDescription)
        setError(errorDescription || 'Authentication failed')
        setLoading(false)
        return
      }

      // Get the session from the URL hash
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
        setError('Failed to get authentication session')
        setLoading(false)
        return
      }

      if (data.session) {
        const user = data.session.user
        
        // Check if user exists in our database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (userError && userError.code === 'PGRST116') {
          // User doesn't exist, this is a new Google signup
          setNeedsPassword(true)
          setLoading(false)
        } else if (userData) {
          // Existing user, redirect to dashboard
          toast.success('Welcome back!')
          navigate('/')
        } else {
          // Some other error occurred
          console.error('Error checking user:', userError)
          setError('Failed to verify user account')
          setLoading(false)
        }
      } else {
        setError('No authentication session found')
        setLoading(false)
      }
    } catch (error) {
      console.error('Error in Google callback:', error)
      setError('Authentication failed')
      setLoading(false)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setSettingPassword(true)

    try {
      // Get current session
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user) {
        throw new Error('No active session')
      }

      const user = sessionData.session.user

      // Update user password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password
      })

      if (passwordError) throw passwordError

      // Create user record
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email || '',
          role: 'student',
          language: 'english'
        })

      if (userError) throw userError

      // Create profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
          is_verified: true // Google users are pre-verified
        })

      if (profileError) throw profileError

      toast.success('Account setup complete! Welcome to RGA Portal.')
      navigate('/')
    } catch (error: any) {
      console.error('Error setting password:', error)
      toast.error(error.message || 'Failed to complete account setup')
    } finally {
      setSettingPassword(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    handleGoogleCallback()
  }

  const handleBackToAuth = () => {
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {language === 'hindi' ? 'प्रमाणीकरण हो रहा है...' : 'Authenticating...'}
          </h2>
          <p className="text-gray-600">
            {language === 'hindi' 
              ? 'कृपया प्रतीक्षा करें जब तक हम आपको लॉगिन करते हैं'
              : 'Please wait while we sign you in'}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {language === 'hindi' ? 'प्रमाणीकरण विफल' : 'Authentication Failed'}
            </h2>
            <p className="text-gray-600 mb-4">
              {error}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="space-y-4">
              <button
                onClick={handleRetry}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
              >
                {language === 'hindi' ? 'पुनः प्रयास करें' : 'Try Again'}
              </button>
              
              <button
                onClick={handleBackToAuth}
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                {language === 'hindi' ? 'वापस जाएं' : 'Go Back'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {language === 'hindi' ? 'पासवर्ड सेट करें' : 'Set Your Password'}
            </h2>
            <p className="text-gray-600">
              {language === 'hindi' 
                ? 'अपने खाते के लिए एक पासवर्ड सेट करें'
                : 'Set a password for your account'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {language === 'hindi' 
                ? 'राजस्थानी स्नातक संघ स्वर्ण जयंती शिक्षा न्यास'
                : 'RGA Swarna Jayanti Shiksha Nyas'}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  {language === 'hindi' ? 'पासवर्ड' : 'Password'}
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={language === 'hindi' ? 'कम से कम 6 अक्षर' : 'At least 6 characters'}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  {language === 'hindi' ? 'पासवर्ड की पुष्टि करें' : 'Confirm Password'}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={language === 'hindi' ? 'पासवर्ड दोबारा दर्ज करें' : 'Re-enter password'}
                />
              </div>

              <button
                type="submit"
                disabled={settingPassword}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {settingPassword 
                  ? (language === 'hindi' ? 'सेट कर रहे हैं...' : 'Setting Password...')
                  : (language === 'hindi' ? 'पासवर्ड सेट करें' : 'Set Password')
                }
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default GoogleCallback
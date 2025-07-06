import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, User, Profile } from '../../lib/supabase'
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
      const urlParams = new URLSearchParams(window.location.search)
      const errorParam = urlParams.get('error')
      const errorDescription = urlParams.get('error_description')
      
      if (errorParam) {
        console.error('OAuth error:', errorParam, errorDescription)
        setError(errorDescription || 'Authentication failed')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error.message, error)
        setError(`Failed to get authentication session: ${error.message}`)
        setLoading(false)
        return
      }

      if (data.session) {
        const user = data.session.user
        
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (userError && userError.code === 'PGRST116') {
          setNeedsPassword(true)
          setLoading(false)
        } else if (userData) {
          toast.success('Welcome back!')
          navigate('/')
        } else {
          console.error('Error checking user:', userError?.message, userError)
          setError(`Failed to verify user account: ${userError?.message}`)
          setLoading(false)
        }
      } else {
        setError('No authentication session found')
        setLoading(false)
      }
    } catch (error: any) {
      console.error('Error in Google callback:', error.message, error)
      setError(error.message || 'Authentication failed')
      setLoading(false)
    }
  }

  const createUserRecord = async (userId: string, email: string, fullName: string) => {
    try {
      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()
      
      if (existingUser) {
        throw new Error('Email already registered')
      }
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing user:', checkError.message, checkError)
        throw new Error(`Failed to check existing user: ${checkError.message}`)
      }

      // Validate fullName
      if (!fullName || fullName.trim() === '') {
        throw new Error('Full name is required')
      }

      // Create user record
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email,
          role: 'student',
          language: 'english',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (userError) {
        console.error('Error creating user record:', userError.message, userError)
        throw new Error(`Failed to create user record: ${userError.message}`)
      }

      // Create profile record
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          full_name: fullName,
          is_verified: true, // Google users are pre-verified
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (profileError) {
        console.error('Error creating profile record:', profileError.message, profileError)
        throw new Error(`Failed to create profile record: ${profileError.message}`)
      }

      return { user: userData, profile: profileData }
    } catch (error) {
      console.error('Error creating user/profile records:', error)
      throw error
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error(language === 'hindi' ? 'पासवर्ड मेल नहीं खाते' : 'Passwords do not match')
      return
    }

    if (password.length < 6) {
      toast.error(
        language === 'hindi'
          ? 'पासवर्ड कम से कम 6 अक्षर का होना चाहिए'
          : 'Password must be at least 6 characters'
      )
      return
    }

    setSettingPassword(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user) {
        throw new Error(language === 'hindi' ? 'कोई सक्रिय सत्र नहीं' : 'No active session')
      }

      const user = sessionData.session.user
      const fullName =
        user.user_metadata?.full_name || user.user_metadata?.name || `User_${user.id.slice(0, 8)}`

      // Update user password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password
      })
      if (passwordError) throw new Error(`Failed to set password: ${passwordError.message}`)

      // Create user and profile records
      await createUserRecord(user.id, user.email || '', fullName)

      toast.success(
        language === 'hindi'
          ? 'खाता सेटअप पूर्ण! RGA पोर्टल में आपका स्वागत है।'
          : 'Account setup complete! Welcome to RGA Portal.'
      )
      navigate('/')
    } catch (error: any) {
      console.error('Error setting password:', error.message, error)
      toast.error(
        error.message ||
          (language === 'hindi' ? 'खाता सेटअप विफल' : 'Failed to complete account setup')
      )
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
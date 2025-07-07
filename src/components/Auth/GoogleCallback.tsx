import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../contexts/LanguageContext'
import { BookOpen, AlertCircle, Loader, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const GoogleCallback: React.FC = () => {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    handleAuthCallback()
  }, [])

  const handleAuthCallback = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const errorParam = urlParams.get('error')
      const errorDescription = urlParams.get('error_description')
      
      if (errorParam) {
        console.error('Auth error:', errorParam, errorDescription)
        setError(errorDescription || 'Authentication failed')
        setLoading(false)
        return
      }

      // Check if this is a password reset callback
      const accessToken = urlParams.get('access_token')
      const refreshToken = urlParams.get('refresh_token')
      const type = urlParams.get('type')

      if (type === 'recovery' && accessToken) {
        // This is a password reset callback
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        })

        if (error) {
          setError('Failed to process password reset')
          setLoading(false)
          return
        }

        // Redirect to a password reset form or show success message
        toast.success('You can now set a new password')
        navigate('/')
        return
      }

      // Handle regular OAuth callback
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error.message, error)
        setError(`Failed to get authentication session: ${error.message}`)
        setLoading(false)
        return
      }

      if (data.session) {
        console.log('✅ Authentication successful, session found')
        setSuccess(true)
        toast.success('Authentication successful!')
        
        // Small delay to show success state
        setTimeout(() => {
          navigate('/')
        }, 1500)
      } else {
        setError('No authentication session found')
        setLoading(false)
      }
    } catch (error: any) {
      console.error('Error in auth callback:', error.message, error)
      setError(error.message || 'Authentication failed')
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    handleAuthCallback()
  }

  const handleBackToAuth = () => {
    navigate('/')
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {language === 'hindi' ? 'सफल!' : 'Success!'}
          </h2>
          <p className="text-gray-600">
            {language === 'hindi' 
              ? 'प्रमाणीकरण सफल रहा। आपको डैशबोर्ड पर भेजा जा रहा है...'
              : 'Authentication successful. Redirecting to dashboard...'}
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {language === 'hindi' ? 'प्रमाणीकरण हो रहा है...' : 'Processing...'}
          </h2>
          <p className="text-gray-600">
            {language === 'hindi' 
              ? 'कृपया प्रतीक्षा करें जब तक हम आपके अनुरोध को संसाधित करते हैं'
              : 'Please wait while we process your authentication'}
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

  return null
}

export default GoogleCallback
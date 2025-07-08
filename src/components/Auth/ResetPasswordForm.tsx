import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { Lock, Key, CheckCircle, ArrowLeft, Globe, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

const ResetPasswordForm: React.FC = () => {
  const { verifyOtp, setPassword, signOut } = useAuth()
  const { language, setLanguage } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()

  const [formData, setFormData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: '',
    token: ''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passwordMetrics, setPasswordMetrics] = useState({
    minLength: false,
    uppercase: false,
    number: false,
    specialChar: false,
  })

  useEffect(() => {
    // Sign out any existing session to prevent dashboard redirect
    const ensureNoSession = async () => {
      try {
        console.log('🔐 Ensuring no active session for reset password')
        await signOut()
      } catch (err) {
        console.error('❌ Error signing out:', err)
      }
    }

    // Extract query parameters from URL
    const searchParams = new URLSearchParams(location.search)
    const token = searchParams.get('token')
    const type = searchParams.get('type')
    const email = searchParams.get('email') || ''

    console.log('🔍 Reset password page loaded with:', { token: !!token, type, email })

    if (type !== 'recovery' || !token) {
      console.log('❌ Invalid reset link - missing recovery type or token')
      setError(language === 'hindi' 
        ? 'रीसेट लिंक अमान्य या समाप्त हो गया है'
        : 'Reset link is invalid or expired')
      setTimeout(() => navigate('/'), 3000)
      return
    }

    ensureNoSession().then(() => {
      setFormData(prev => ({ ...prev, token, email }))
    })
  }, [navigate, language, location, signOut])

  const handleLanguageToggle = () => {
    const newLanguage = language === 'english' ? 'hindi' : 'english'
    setLanguage(newLanguage)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    if (name === 'newPassword') {
      setPasswordMetrics({
        minLength: value.length >= 6,
        uppercase: /[A-Z]/.test(value),
        number: /[0-9]/.test(value),
        specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(value),
      })
    }
  }

  const validatePassword = (password: string): string[] => {
    const errors: string[] = []
    
    if (password.length < 6) {
      errors.push(language === 'hindi' 
        ? 'पासवर्ड कम से कम 6 अक्षर का होना चाहिए'
        : 'Password must be at least 6 characters long')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push(language === 'hindi' 
        ? 'पासवर्ड में कम से कम एक बड़ा अक्षर होना चाहिए'
        : 'Password must contain at least one uppercase letter')
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push(language === 'hindi' 
        ? 'पासवर्ड में कम से कम एक संख्या होना चाहिए'
        : 'Password must contain at least one number')
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push(language === 'hindi' 
        ? 'पासवर्ड में कम से कम एक विशेष चिह्न होना चाहिए (!@#$%^&* आदि)'
        : 'Password must contain at least one special character (!@#$%^&* etc.)')
    }
    
    return errors
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate email
      if (!formData.email) {
        toast.error(language === 'hindi' 
          ? 'कृपया अपना ईमेल दर्ज करें'
          : 'Please enter your email')
        setLoading(false)
        return
      }

      // Validate password
      const passwordErrors = validatePassword(formData.newPassword)
      if (passwordErrors.length > 0) {
        passwordErrors.forEach(error => toast.error(error))
        setLoading(false)
        return
      }

      if (formData.newPassword !== formData.confirmPassword) {
        toast.error(language === 'hindi' ? 'पासवर्ड मेल नहीं खाते' : 'Passwords do not match')
        setLoading(false)
        return
      }

      // Verify token
      console.log('🔐 Verifying recovery token for:', formData.email)
      await verifyOtp(formData.email, formData.token, 'recovery')
      
      // Update password
      console.log('🔑 Updating password')
      await setPassword(formData.newPassword)
      
      setSuccess(true)
      toast.success(language === 'hindi' 
        ? 'पासवर्ड सफलतापूर्वक रीसेट हो गया!'
        : 'Password reset successfully!')

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/')
      }, 3000)

    } catch (error: any) {
      console.error('❌ Password reset error:', error.message, { code: error.code, status: error.status })
      const errorMessage = error.message.includes('Invalid token') || error.message.includes('expired')
        ? (language === 'hindi' ? 'रीसेट लिंक अमान्य या समाप्त हो गया है' : 'Reset link is invalid or expired')
        : (language === 'hindi' ? `त्रुटि: ${error.message}` : `Error: ${error.message}`)
      setError(errorMessage)
      setTimeout(() => navigate('/'), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    navigate('/')
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6 sm:space-y-8">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-orange-600 rounded-full flex items-center justify-center">
                <Key className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              {language === 'hindi' ? 'त्रुटि' : 'Error'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {error}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {language === 'hindi' 
                ? 'आप लॉगिन पेज पर रीडायरेक्ट हो रहे हैं...'
                : 'Redirecting to login page...'}
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                {language === 'hindi' 
                  ? 'कृपया पासवर्ड रीसेट दोबारा शुरू करें।'
                  : 'Please try resetting your password again.'}
              </p>
              <button
                onClick={handleBackToLogin}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
              >
                {language === 'hindi' ? 'लॉगिन पेज पर जाएं' : 'Go to Login'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6 sm:space-y-8">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              {language === 'hindi' ? 'सफल!' : 'Success!'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {language === 'hindi' 
                ? 'आपका पासवर्ड सफलतापूर्वक रीसेट हो गया है।'
                : 'Your password has been reset successfully.'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {language === 'hindi' 
                ? 'आप लॉगिन पेज पर रीडायरेक्ट हो रहे हैं...'
                : 'Redirecting to login page...'}
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                {language === 'hindi' 
                  ? 'अब आप अपने नए पासवर्ड से लॉगिन कर सकते हैं।'
                  : 'You can now login with your new password.'}
              </p>
              <button
                onClick={handleBackToLogin}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
              >
                {language === 'hindi' ? 'लॉगिन पेज पर जाएं' : 'Go to Login'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToLogin}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">
              {language === 'hindi' ? 'वापस' : 'Back'}
            </span>
          </button>
          <button
            onClick={handleLanguageToggle}
            className="flex items-center space-x-2 px-2 sm:px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-50 transition-colors"
          >
            <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
            <span className="text-xs sm:text-sm font-medium text-gray-700">
              {language === 'english' ? 'हिंदी' : 'English'}
            </span>
          </button>
        </div>

        <div className="text-center">
          <div className="flex justify-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center">
              <Key className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-4 sm:mt-6 text-2xl sm:text-3xl font-bold text-gray-900">
            {language === 'hindi' ? 'नया पासवर्ड सेट करें' : 'Set New Password'}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-gray-600">
            {language === 'hindi' 
              ? 'अपना नया पासवर्ड दर्ज करें'
              : 'Enter your new password'}
          </p>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            {language === 'hindi' 
              ? 'राजस्थानी स्नातक संघ स्वर्ण जयंती शिक्षा न्यास'
              : 'RGA Swarna Jayanti Shiksha Nyas'}
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
          <form className="space-y-4 sm:space-y-6" onSubmit={handleResetPassword}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {language === 'hindi' ? 'ईमेल पता' : 'Email Address'}
              </label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  placeholder={language === 'hindi' ? 'आपका ईमेल पता' : 'Your email address'}
                />
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                {language === 'hindi' ? 'नया पासवर्ड' : 'New Password'}
              </label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  className="pl-10 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  placeholder={language === 'hindi' ? 'मजबूत पासवर्ड दर्ज करें' : 'Enter a strong password'}
                />
              </div>
              <ul className="mt-2 text-xs text-gray-600 space-y-1">
                <li className="flex items-center">
                  <CheckCircle className={`w-4 h-4 mr-2 ${passwordMetrics.minLength ? 'text-green-500' : 'text-gray-400'}`} />
                  {language === 'hindi' ? 'कम से कम 6 अक्षर' : 'At least 6 characters'}
                </li>
                <li className="flex items-center">
                  <CheckCircle className={`w-4 h-4 mr-2 ${passwordMetrics.uppercase ? 'text-green-500' : 'text-gray-400'}`} />
                  {language === 'hindi' ? 'एक बड़ा अक्षर' : 'One uppercase letter'}
                </li>
                <li className="flex items-center">
                  <CheckCircle className={`w-4 h-4 mr-2 ${passwordMetrics.number ? 'text-green-500' : 'text-gray-400'}`} />
                  {language === 'hindi' ? 'एक संख्या' : 'One number'}
                </li>
                <li className="flex items-center">
                  <CheckCircle className={`w-4 h-4 mr-2 ${passwordMetrics.specialChar ? 'text-green-500' : 'text-gray-400'}`} />
                  {language === 'hindi' ? 'एक विशेष चिह्न (!@#$%^&* आदि)' : 'One special character (!@#$%^&* etc.)'}
                </li>
              </ul>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                {language === 'hindi' ? 'पासवर्ड की पुष्टि करें' : 'Confirm Password'}
              </label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="pl-10 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  placeholder={language === 'hindi' ? 'पासवर्ड दोबारा दर्ज करें' : 'Re-enter password'}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !!error}
                className="w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading 
                  ? (language === 'hindi' ? 'रीसेट कर रहे हैं...' : 'Resetting...')
                  : (language === 'hindi' ? 'पासवर्ड रीसेट करें' : 'Reset Password')
                }
              </button>
            </div>
          </form>
        </div>

        <div className="text-center text-xs sm:text-sm text-gray-600">
          <p>
            {language === 'hindi' 
              ? 'पासवर्ड रीसेट करने के बाद आप नए पासवर्ड से लॉगिन कर सकेंगे।'
              : 'After resetting your password, you can login with your new password.'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordForm
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Lock, Key, CheckCircle, AlertCircle, ArrowLeft, Globe } from 'lucide-react'
import toast from 'react-hot-toast'

const ResetPasswordForm: React.FC = () => {
  const { user, setPassword, signOut } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleLanguageToggle = () => {
    const newLanguage = language === 'english' ? 'hindi' : 'english'
    setLanguage(newLanguage)
  }

  useEffect(() => {
    // If no user session, the reset link is invalid or expired
    if (!user) {
      toast.error(language === 'hindi' 
        ? 'रीसेट लिंक अमान्य या समाप्त हो गया है'
        : 'Reset link is invalid or expired')
      navigate('/')
    }
  }, [user, navigate, language])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
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

    try {
      // Validate password
      const passwordErrors = validatePassword(formData.newPassword)
      if (passwordErrors.length > 0) {
        passwordErrors.forEach(error => toast.error(error))
        setLoading(false)
        return
      }

      // Check if passwords match
      if (formData.newPassword !== formData.confirmPassword) {
        toast.error(language === 'hindi' ? 'पासवर्ड मेल नहीं खाते' : 'Passwords do not match')
        setLoading(false)
        return
      }

      // Update password
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
      console.error('Password reset error:', error)
      toast.error(error.message || (language === 'hindi' 
        ? 'पासवर्ड रीसेट करने में त्रुटि'
        : 'Error resetting password'))
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    navigate('/')
  }

  if (!user) {
    return null // Will redirect in useEffect
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
        {/* Header with back button */}
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
            {/* Password Requirements */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                {language === 'hindi' ? 'पासवर्ड आवश्यकताएं:' : 'Password Requirements:'}
              </h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• {language === 'hindi' ? 'कम से कम 6 अक्षर लंबा' : 'At least 6 characters long'}</li>
                <li>• {language === 'hindi' ? 'कम से कम एक बड़ा अक्षर (A-Z)' : 'At least one uppercase letter (A-Z)'}</li>
                <li>• {language === 'hindi' ? 'कम से कम एक संख्या (0-9)' : 'At least one number (0-9)'}</li>
                <li>• {language === 'hindi' ? 'कम से कम एक विशेष चिह्न (!@#$%^&*)' : 'At least one special character (!@#$%^&*)'}</li>
              </ul>
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
                disabled={loading}
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
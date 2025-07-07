import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { BookOpen, Mail, Lock, User, ArrowLeft, Globe, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface AuthFormProps {
  onBackToLanding: () => void
}

type AuthStep = 'login' | 'signup'

const AuthForm: React.FC<AuthFormProps> = ({ onBackToLanding }) => {
  const [currentStep, setCurrentStep] = useState<AuthStep>('login')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  })

  const { signIn, signUp } = useAuth()
  const { language, setLanguage, t } = useLanguage()

  const handleLanguageToggle = () => {
    const newLanguage = language === 'english' ? 'hindi' : 'english'
    setLanguage(newLanguage)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signIn(formData.email, formData.password)
      toast.success('Welcome back!')
    } catch (error: any) {
      toast.error(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!formData.fullName.trim()) {
      toast.error(language === 'hindi' ? 'पूरा नाम आवश्यक है' : 'Full name is required')
      setLoading(false)
      return
    }
    if (!formData.password || formData.password.length < 6) {
      toast.error(language === 'hindi' ? 'पासवर्ड कम से कम 6 अक्षर का होना चाहिए' : 'Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      await signUp(formData.email, formData.fullName, formData.password)
      toast.success(language === 'hindi' ? 'खाता सफलतापूर्वक बनाया गया!' : 'Account created successfully!')
    } catch (error: any) {
      const errorMessage =
        error.message === 'Email already registered'
          ? language === 'hindi'
            ? 'यह ईमेल पहले से पंजीकृत है'
            : 'This email is already registered'
          : error.message || (language === 'hindi' ? 'साइन अप विफल' : 'Signup failed')
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 'login':
        return language === 'hindi' ? 'स्वागत वापसी' : 'Welcome Back'
      case 'signup':
        return language === 'hindi' ? 'खाता बनाएं' : 'Create Account'
      default:
        return 'Authentication'
    }
  }

  const getStepDescription = () => {
    switch (currentStep) {
      case 'login':
        return language === 'hindi' 
          ? 'अपने खाते में लॉगिन करें'
          : 'Sign in to your account'
      case 'signup':
        return language === 'hindi' 
          ? 'नया खाता बनाएं'
          : 'Create a new account'
      default:
        return ''
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (currentStep === 'signup') {
                setCurrentStep('login')
              } else {
                onBackToLanding()
              }
            }}
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
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-4 sm:mt-6 text-2xl sm:text-3xl font-bold text-gray-900">
            {getStepTitle()}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-gray-600">
            {getStepDescription()}
          </p>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            {language === 'hindi' 
              ? 'राजस्थानी स्नातक संघ स्वर्ण जयंती शिक्षा न्यास'
              : 'RGA Swarna Jayanti Shiksha Nyas'}
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
          {/* Login Form */}
          {currentStep === 'login' && (
            <form className="space-y-4 sm:space-y-6" onSubmit={handleLogin}>
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
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  {language === 'hindi' ? 'पासवर्ड' : 'Password'}
                </label>
                <div className="mt-1 relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder={language === 'hindi' ? 'आपका पासवर्ड' : 'Your password'}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading 
                    ? (language === 'hindi' ? 'कृपया प्रतीक्षा करें...' : 'Please wait...')
                    : (language === 'hindi' ? 'लॉगिन करें' : 'Sign In')
                  }
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setCurrentStep('signup')}
                  className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
                >
                  {language === 'hindi' ? 'खाता नहीं है? साइन अप करें' : "Don't have an account? Sign up"}
                </button>
              </div>
            </form>
          )}

          {/* Signup Form */}
          {currentStep === 'signup' && (
            <form className="space-y-4 sm:space-y-6" onSubmit={handleSignup}>
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  {language === 'hindi' ? 'पूरा नाम' : 'Full Name'}
                </label>
                <div className="mt-1 relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="pl-10 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder={language === 'hindi' ? 'अपना पूरा नाम दर्ज करें' : 'Enter your full name'}
                  />
                </div>
              </div>

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
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  {language === 'hindi' ? 'पासवर्ड' : 'Password'}
                </label>
                <div className="mt-1 relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder={language === 'hindi' ? 'कम से कम 6 अक्षर' : 'At least 6 characters'}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading 
                    ? (language === 'hindi' ? 'खाता बनाया जा रहा है...' : 'Creating account...')
                    : (language === 'hindi' ? 'साइन अप करें' : 'Sign Up')
                  }
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setCurrentStep('login')}
                  className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
                >
                  {language === 'hindi' ? 'पहले से खाता है? लॉगिन करें' : 'Already have an account? Sign in'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="text-center text-xs sm:text-sm text-gray-600">
          <p>
            {language === 'hindi' 
              ? 'खाता बनाकर आप हमारी सेवा की शर्तों और गोपनीयता नीति से सहमत हैं।'
              : 'By creating an account, you agree to our Terms of Service and Privacy Policy.'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthForm
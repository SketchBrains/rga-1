import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { BookOpen, Mail, Lock, User, ArrowLeft, Globe, Shield, Key, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface AuthFormProps {
  onBackToLanding: () => void
  onAuthSuccess: () => void
}

type AuthStep = 'login' | 'signup-request-otp' | 'signup-verify-otp' | 'forgot-password'

const AuthForm: React.FC<AuthFormProps> = ({ onBackToLanding }) => {
  const [currentStep, setCurrentStep] = useState<AuthStep>('login')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    signupPassword: '',
    confirmSignupPassword: '',
    otp: '',
  });
  const [authSuccessHandled, setAuthSuccessHandled] = useState(false);

  const { 
    signIn, 
    signUp, 
    verifyOtp, 
    setPassword,
    resendOtp,
    resetPassword
  } = useAuth()
  const { language, setLanguage, t } = useLanguage()

  // State for password metrics
  const [passwordMetrics, setPasswordMetrics] = useState({
    minLength: false,
    uppercase: false,
    number: false,
    specialChar: false,
  })

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

    // Update password metrics if signupPassword changes
    if (name === 'signupPassword') {
      setPasswordMetrics({
        minLength: value.length >= 6,
        uppercase: /[A-Z]/.test(value),
        number: /[0-9]/.test(value),
        specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(value),
      })
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signIn(formData.email, formData.password)
      if (!authSuccessHandled) {
        setAuthSuccessHandled(true);
        onAuthSuccess(); // Trigger session fetch in App.tsx
      }
      
      toast.success('Welcome back!')
    } catch (error: any) {
      // Enhanced error handling for login
      let errorMessage = 'Login failed'
      if (error.message) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.'
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address before signing in.'
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a few minutes and try again.'
        } else if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.'
        } else {
          errorMessage = error.message
        }
      }
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🚀 handleRequestOtp called with:', { email: formData.email, fullName: formData.fullName, signupPassword: formData.signupPassword })
    setLoading(true)

    if (!formData.fullName.trim()) {
      toast.error(language === 'hindi' ? 'पूरा नाम आवश्यक है' : 'Full name is required')
      setLoading(false)
      return
    }

    // Validate password
    const passwordErrors = validatePassword(formData.signupPassword)
    if (passwordErrors.length > 0) {
      passwordErrors.forEach(error => toast.error(error))
      setLoading(false)
      return
    }

    if (formData.signupPassword !== formData.confirmSignupPassword) {
      toast.error(language === 'hindi' ? 'पासवर्ड मेल नहीं खाते' : 'Passwords do not match')
      setLoading(false)
      return
    }

    try {
      console.log('📧 Calling signUp function...')
      // Pass email, fullName, and password
      const result = await signUp(formData.email, formData.fullName, formData.signupPassword)
      console.log('✅ signUp result:', result)
      
      if (result.user && !result.session) {
        console.log('📨 OTP should be sent, moving to verification step')
        if (!authSuccessHandled) {
          setAuthSuccessHandled(true);
          onAuthSuccess(); // Trigger session fetch in App.tsx
        }
        setCurrentStep('signup-verify-otp')
        toast.success(language === 'hindi' ? 'OTP आपके ईमेल पर भेजा गया!' : 'OTP sent to your email!')
      } else {
        console.log('🔐 User automatically signed in')
        toast.success(language === 'hindi' ? 'खाता सफलतापूर्वक बनाया गया!' : 'Account created successfully!')
      }
    } catch (error: any) {
      console.error('❌ signUp error:', error)
      // Enhanced error handling for signup
      let errorMessage = language === 'hindi' ? 'साइन अप विफल' : 'Signup failed'
      if (error.message) {
        if (error.message.includes('already registered')) {
          errorMessage = language === 'hindi' 
            ? 'यह ईमेल पहले से पंजीकृत है। कृपया लॉगिन करें।'
            : 'This email is already registered. Please sign in instead.'
        } else if (error.message.includes('Invalid email')) {
          errorMessage = language === 'hindi' 
            ? 'अमान्य ईमेल पता। कृपया एक वैध ईमेल दर्ज करें।'
            : 'Invalid email address. Please enter a valid email.'
        } else if (error.message.includes('Password')) {
          errorMessage = language === 'hindi' 
            ? 'पासवर्ड आवश्यकताओं को पूरा नहीं करता।'
            : 'Password does not meet requirements.'
        } else if (error.message.includes('Network')) {
          errorMessage = language === 'hindi' 
            ? 'नेटवर्क त्रुटि। कृपया अपना इंटरनेट कनेक्शन जांचें।'
            : 'Network error. Please check your internet connection.'
        } else {
          errorMessage = error.message
        }
      }
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await verifyOtp(formData.email, formData.otp, 'signup')
      // await signOut()
      toast.success(language === 'hindi' 
        ? 'खाता सफलतापूर्वक बनाया गया! आप अब लॉगिन कर सकते हैं।'
        : 'Account created successfully! You can now login.')
      
      setFormData({
        email: formData.email,
        password: '',
        fullName: '',
        signupPassword: '',
        confirmSignupPassword: '',
        otp: ''
      })
      setCurrentStep('login')
    } catch (error: any) {
      toast.error(error.message || 'Invalid OTP')
    } finally {
      setLoading(false)
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await resetPassword(formData.email)
      toast.success(language === 'hindi' 
        ? 'पासवर्ड रीसेट लिंक आपके ईमेल पर भेजा गया है'
        : 'Password reset link sent to your email')
      setCurrentStep('login')
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    try {
      console.log('🔄 handleResendOtp called with email:', formData.email)
      setLoading(true)
      console.log('📧 Calling resendOtp function...')
      await resendOtp(formData.email)
      console.log('✅ resendOtp completed successfully')
      toast.success('OTP resent to your email!')
    } catch (error: any) {
      console.error('❌ resendOtp error:', error)
      toast.error(error.message || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 'login':
        return language === 'hindi' ? 'स्वागत वापसी' : 'Welcome Back'
      case 'signup-request-otp':
        return language === 'hindi' ? 'खाता बनाएं' : 'Create Account'
      case 'signup-verify-otp':
        return language === 'hindi' ? 'ईमेल सत्यापित करें' : 'Verify Email'
      case 'forgot-password':
        return language === 'hindi' ? 'पासवर्ड भूल गए' : 'Forgot Password'
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
      case 'signup-request-otp':
        return language === 'hindi' 
          ? 'नया खाता बनाने के लिए अपना नाम, ईमेल और पासवर्ड दर्ज करें'
          : 'Enter your name, email, and password to create a new account'
      case 'signup-verify-otp':
        return language === 'hindi' 
          ? 'आपके ईमेल पर भेजा गया OTP दर्ज करें'
          : 'Enter the OTP sent to your email'
      case 'forgot-password':
        return language === 'hindi' 
          ? 'पासवर्ड रीसेट करने के लिए अपना ईमेल दर्ज करें'
          : 'Enter your email to reset password'
      default:
        return ''
    }
  }

  const getStepIcon = () => {
    switch (currentStep) {
      case 'signup-verify-otp':
        return <Mail className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
      case 'forgot-password':
        return <Key className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
      default:
        return <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (currentStep === 'signup-verify-otp') {
                setCurrentStep('signup-request-otp')
              } else if (currentStep === 'signup-request-otp') {
                setCurrentStep('login')
              } else if (currentStep === 'forgot-password') {
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
              {getStepIcon()}
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

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep('forgot-password')}
                  className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
                >
                  {language === 'hindi' ? 'पासवर्ड भूल गए?' : 'Forgot Password?'}
                </button>
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
                  onClick={() => setCurrentStep('signup-request-otp')}
                  className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
                >
                  {language === 'hindi' ? 'खाता नहीं है? साइन अप करें' : "Don't have an account? Sign up"}
                </button>
              </div>
            </form>
          )}

          {/* Request OTP Form */}
          {currentStep === 'signup-request-otp' && (
            <form className="space-y-4 sm:space-y-6" onSubmit={handleRequestOtp}>
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
                <label htmlFor="signupPassword" className="block text-sm font-medium text-gray-700">
                  {language === 'hindi' ? 'पासवर्ड' : 'Password'}
                </label>
                <div className="mt-1 relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    id="signupPassword"
                    name="signupPassword"
                    type="password"
                    required
                    value={formData.signupPassword}
                    onChange={handleInputChange}
                    className="pl-10 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder={language === 'hindi' ? 'पासवर्ड दर्ज करें' : 'Enter password'}
                  />
                </div>
                {/* Password Metrics */}
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
                <label htmlFor="confirmSignupPassword" className="block text-sm font-medium text-gray-700">
                  {language === 'hindi' ? 'पासवर्ड की पुष्टि करें' : 'Confirm Password'}
                </label>
                <div className="mt-1 relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    id="confirmSignupPassword"
                    name="confirmSignupPassword"
                    type="password"
                    required
                    value={formData.confirmSignupPassword}
                    onChange={handleInputChange}
                    className="pl-10 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder={language === 'hindi' ? 'पासवर्ड पुनः दर्ज करें' : 'Re-enter password'}
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
                    ? (language === 'hindi' ? 'OTP भेजा जा रहा है...' : 'Sending OTP...')
                    : (language === 'hindi' ? 'OTP भेजें' : 'Send OTP')
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

          {/* OTP Verification Form */}
          {currentStep === 'signup-verify-otp' && (
            <form className="space-y-4 sm:space-y-6" onSubmit={handleVerifyOtp}>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {language === 'hindi' 
                    ? `हमने ${formData.email} पर एक OTP भेजा है`
                    : `We've sent an OTP to ${formData.email}`}
                </p>
              </div>

              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                  {language === 'hindi' ? 'OTP दर्ज करें' : 'Enter OTP'}
                </label>
                <div className="mt-1">
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    maxLength={6}
                    value={formData.otp}
                    onChange={handleInputChange}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="000000"
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
                    ? (language === 'hindi' ? 'सत्यापित कर रहे हैं...' : 'Verifying...')
                    : (language === 'hindi' ? 'सत्यापित करें' : 'Verify OTP')
                  }
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-500 transition-colors disabled:opacity-50"
                >
                  {language === 'hindi' ? 'OTP दोबारा भेजें' : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}

          {/* Forgot Password Form */}
          {currentStep === 'forgot-password' && (
            <form className="space-y-4 sm:space-y-6" onSubmit={handleForgotPassword}>
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Key className="w-8 h-8 text-orange-600" />
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {language === 'hindi' 
                    ? 'अपना ईमेल पता दर्ज करें और हम आपको पासवर्ड रीसेट लिंक भेजेंगे'
                    : 'Enter your email address and we will send you a password reset link'}
                </p>
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
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading 
                    ? (language === 'hindi' ? 'भेजा जा रहा है...' : 'Sending...')
                    : (language === 'hindi' ? 'रीसेट लिंक भेजें' : 'Send Reset Link')
                  }
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setCurrentStep('login')}
                  className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
                >
                  {language === 'hindi' ? 'लॉगिन पर वापस जाएं' : 'Back to Login'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="text-center text-xs sm:text-sm text-gray-600">
          <p>
            {language === 'hindi' 
              ? currentStep === 'login' 
                ? 'खाता बनाकर आप हमारी सेवा की शर्तों और गोपनीयता नीति से सहमत हैं।'
                : 'OTP सत्यापन के बाद आप अपने खाते में लॉगिन कर सकेंगे।'
              : currentStep === 'login' 
                ? 'By creating an account, you agree to our Terms of Service and Privacy Policy.'
                : 'After OTP verification, you can login to your account.'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthForm

// function signOut() {
//   throw new Error('Function not implemented.')
// }
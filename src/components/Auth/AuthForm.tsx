import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { BookOpen, Mail, Lock, User, ArrowLeft, Globe, Shield, Key, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface AuthFormProps {
  onBackToLanding: () => void
}

type AuthStep = 'login' | 'signup' | 'verify-otp' | 'forgot-password' | 'reset-password'

const AuthForm: React.FC<AuthFormProps> = ({ onBackToLanding }) => {
  const [currentStep, setCurrentStep] = useState<AuthStep>('login')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  })

  const { 
    signIn, 
    signUp, 
    verifyOtp, 
    setPassword,
    resendOtp,
    resetPassword,
    signInWithGoogle
  } = useAuth()
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
      const result = await signUp(formData.email, formData.fullName, formData.password)
      if (!result.session) {
        // User needs to verify email with OTP
        setCurrentStep('verify-otp')
        toast.success(language === 'hindi' ? 'OTP आपके ईमेल पर भेजा गया!' : 'OTP sent to your email!')
      } else {
        // User is automatically signed in
        toast.success(language === 'hindi' ? 'खाता सफलतापूर्वक बनाया गया!' : 'Account created successfully!')
      }
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await verifyOtp(formData.email, formData.otp)
      toast.success('Email verified successfully!')
      // User should be automatically signed in after OTP verification
    } catch (error: any) {
      toast.error(error.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
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
      setLoading(true)
      await resendOtp(formData.email)
      toast.success('OTP resent to your email!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      await signInWithGoogle()
      // The redirect will happen automatically
    } catch (error: any) {
      toast.error(error.message || 'Google sign-in failed')
      setLoading(false)
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 'login':
        return language === 'hindi' ? 'स्वागत वापसी' : 'Welcome Back'
      case 'signup':
        return language === 'hindi' ? 'खाता बनाएं' : 'Create Account'
      case 'verify-otp':
        return language === 'hindi' ? 'ईमेल सत्यापित करें' : 'Verify Email'
      case 'forgot-password':
        return language === 'hindi' ? 'पासवर्ड भूल गए' : 'Forgot Password'
      case 'reset-password':
        return language === 'hindi' ? 'पासवर्ड रीसेट करें' : 'Reset Password'
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
      case 'verify-otp':
        return language === 'hindi' 
          ? 'आपके ईमेल पर भेजा गया OTP दर्ज करें'
          : 'Enter the OTP sent to your email'
      case 'forgot-password':
        return language === 'hindi' 
          ? 'पासवर्ड रीसेट करने के लिए अपना ईमेल दर्ज करें'
          : 'Enter your email to reset password'
      case 'reset-password':
        return language === 'hindi' 
          ? 'अपना नया पासवर्ड सेट करें'
          : 'Set your new password'
      default:
        return ''
    }
  }

  const getStepIcon = () => {
    switch (currentStep) {
      case 'verify-otp':
        return <Mail className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
      case 'forgot-password':
      case 'reset-password':
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
              if (currentStep === 'verify-otp') {
                setCurrentStep('signup')
              } else if (currentStep === 'signup') {
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

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    {language === 'hindi' ? 'या' : 'or'}
                  </span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex justify-center items-center space-x-2 py-2 sm:py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>
                    {language === 'hindi' ? 'Google से लॉगिन करें' : 'Sign in with Google'}
                  </span>
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
                    ? (language === 'hindi' ? 'OTP भेजा जा रहा है...' : 'Sending OTP...')
                    : (language === 'hindi' ? 'साइन अप करें' : 'Sign Up')
                  }
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    {language === 'hindi' ? 'या' : 'or'}
                  </span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex justify-center items-center space-x-2 py-2 sm:py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>
                    {language === 'hindi' ? 'Google से साइन अप करें' : 'Sign up with Google'}
                  </span>
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
          {currentStep === 'verify-otp' && (
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
                    : 'Enter your email address and we\'ll send you a password reset link'}
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
              ? 'खाता बनाकर आप हमारी सेवा की शर्तों और गोपनीयता नीति से सहमत हैं।'
              : 'By creating an account, you agree to our Terms of Service and Privacy Policy.'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthForm
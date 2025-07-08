import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { Key } from 'lucide-react'

const ConfirmReset: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { language } = useLanguage()

  const handleConfirm = () => {
    console.log('🔐 Confirming password reset, redirecting to reset-password...')
    navigate(`/auth/reset-password${location.search}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center">
            <Key className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {language === 'hindi' ? 'पासवर्ड रीसेट की पुष्टि करें' : 'Confirm Password Reset'}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {language === 'hindi'
            ? 'पासवर्ड रीसेट करने के लिए नीचे दिए गए बटन पर क्लिक करें।'
            : 'Click the button below to proceed with password reset.'}
        </p>
        <button
          onClick={handleConfirm}
          className="mt-4 w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
        >
          {language === 'hindi' ? 'पुष्टि करें' : 'Confirm'}
        </button>
      </div>
    </div>
  )
}

export default ConfirmReset
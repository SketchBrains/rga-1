import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { BookOpen, Globe, LogOut, User, Menu } from 'lucide-react'

interface HeaderProps {
  onMenuClick?: () => void
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, profile, signOut } = useAuth()
  const { language, setLanguage, t } = useLanguage()

  const handleLanguageToggle = () => {
    const newLanguage = language === 'english' ? 'hindi' : 'english'
    setLanguage(newLanguage)
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Menu button and Logo */}
          <div className="flex items-center space-x-3">
            {/* Mobile menu button */}
            {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Logo and Title */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg">
                <img src="https://res.cloudinary.com/dqqjonji8/image/upload/v1752142364/Black_and_White_Circular_Art_Design_Logo_irfozi.jpg" alt="Logo" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm sm:text-lg font-semibold text-gray-900">
                  {t('org.name')}
                </h1>
                <p className="text-xs text-gray-500">
                  {t('org.tagline')}
                </p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-sm font-semibold text-gray-900">RGA Portal</h1>
              </div>
            </div>
          </div>

          {/* Right side - Language switcher and user menu */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Language Switcher */}
            <button
              onClick={handleLanguageToggle}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
              <span className="text-xs sm:text-sm font-medium text-gray-700">
                {language === 'english' ? 'हिंदी' : 'English'}
              </span>
            </button>

            {/* User Menu */}
            {user && (
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                  </div>
                  <div className="hidden md:block">
                    <p className="text-xs sm:text-sm font-medium text-gray-900">
                      {profile?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {user.role}
                    </p>
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="p-1 sm:p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title={t('nav.logout')}
                >
                  <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
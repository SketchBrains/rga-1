import React, { createContext, useContext, useState } from 'react'

type Language = 'english' | 'hindi'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, fallback?: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

const translations = {
  // Authentication
  'auth.welcome': { english: 'Welcome to RGA Scholarship Portal', hindi: 'आरजीए छात्रवृत्ति पोर्टल में आपका स्वागत है' },
  'auth.sign_in': { english: 'Sign In', hindi: 'साइन इन' },
  'auth.sign_up': { english: 'Sign Up', hindi: 'साइन अप' },
  'auth.email': { english: 'Email', hindi: 'ईमेल' },
  'auth.password': { english: 'Password', hindi: 'पासवर्ड' },
  'auth.full_name': { english: 'Full Name', hindi: 'पूरा नाम' },
  'auth.login_with_google': { english: 'Login with Google', hindi: 'Google से लॉगिन करें' },
  'auth.forgot_password': { english: 'Forgot Password?', hindi: 'पासवर्ड भूल गए?' },
  'auth.create_account': { english: 'Create Account', hindi: 'खाता बनाएं' },
  'auth.have_account': { english: 'Already have an account?', hindi: 'पहले से खाता है?' },
  'auth.no_account': { english: 'Don\'t have an account?', hindi: 'खाता नहीं है?' },
  
  // Navigation
  'nav.dashboard': { english: 'Dashboard', hindi: 'डैशबोर्ड' },
  'nav.applications': { english: 'Applications', hindi: 'आवेदन' },
  'nav.documents': { english: 'Documents', hindi: 'दस्तावेज़' },
  'nav.history': { english: 'History', hindi: 'इतिहास' },
  'nav.profile': { english: 'Profile', hindi: 'प्रोफाइल' },
  'nav.logout': { english: 'Logout', hindi: 'लॉगआउट' },
  
  // Dashboard
  'dashboard.available_scholarships': { english: 'Available Scholarships', hindi: 'उपलब्ध छात्रवृत्तियां' },
  'dashboard.apply_now': { english: 'Apply Now', hindi: 'अभी आवेदन करें' },
  'dashboard.closed': { english: 'Closed', hindi: 'बंद' },
  'dashboard.applied': { english: 'Applied', hindi: 'आवेदित' },
  
  // Status
  'status.pending': { english: 'Pending', hindi: 'लंबित' },
  'status.approved': { english: 'Approved', hindi: 'स्वीकृत' },
  'status.rejected': { english: 'Rejected', hindi: 'अस्वीकृत' },
  'status.hold': { english: 'On Hold', hindi: 'होल्ड पर' },
  
  // Common
  'common.submit': { english: 'Submit', hindi: 'जमा करें' },
  'common.cancel': { english: 'Cancel', hindi: 'रद्द करें' },
  'common.save': { english: 'Save', hindi: 'सेव करें' },
  'common.edit': { english: 'Edit', hindi: 'संपादित करें' },
  'common.delete': { english: 'Delete', hindi: 'हटाएं' },
  'common.view': { english: 'View', hindi: 'देखें' },
  'common.loading': { english: 'Loading...', hindi: 'लोड हो रहा है...' },
  'common.search': { english: 'Search', hindi: 'खोजें' },
  'common.filter': { english: 'Filter', hindi: 'फिल्टर' },
  'common.export': { english: 'Export', hindi: 'निर्यात' },
  
  // Organization
  'org.name': { english: 'RGA Swarna Jayanti Shiksha Nyas', hindi: 'राजस्थानी स्नातक संघ स्वर्ण जयंती शिक्षा न्यास' },
  'org.tagline': { english: 'Empowering Education, Transforming Lives', hindi: 'शिक्षा को सशक्त बनाना, जीवन को बदलना' },
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('english')

  const t = (key: string, fallback?: string): string => {
    const translation = translations[key as keyof typeof translations]
    if (translation) {
      return translation[language] || translation.english
    }
    return fallback || key
  }

  const value = {
    language,
    setLanguage,
    t,
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
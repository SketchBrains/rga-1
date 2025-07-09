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
  'my_documents': { english: 'My Documents', hindi: 'मेरे दस्तावेज़' },
  'manage_your_documents': { english: 'Manage your uploaded documents', hindi: 'अपने अपलोड किए गए दस्तावेज़ों को प्रबंधित करें' },
  'upload_document': { english: 'Upload Document', hindi: 'दस्तावेज़ अपलोड करें' },
  'search_documents': { english: 'Search documents...', hindi: 'दस्तावेज़ खोजें...' },
  'all_file_types': { english: 'All File Types', hindi: 'सभी फ़ाइल प्रकार' },
  'pdf_documents': { english: 'PDF Documents', hindi: 'पीडीएफ दस्तावेज़' },
  'images': { english: 'Images', hindi: 'चित्र' },
  'word_documents': { english: 'Word Documents', hindi: 'वर्ड दस्तावेज़' },
  'uploading_files': { english: 'Uploading Files', hindi: 'फ़ाइलें अपलोड हो रही हैं' },
  'no_documents_uploaded': { english: 'No documents uploaded', hindi: 'कोई दस्तावेज़ अपलोड नहीं किया गया' },
  'no_documents_match': { english: 'No documents match your search', hindi: 'आपकी खोज से कोई दस्तावेज़ मेल नहीं खाता' },
  'upload_first_document': { english: 'Upload your first document', hindi: 'अपना पहला दस्तावेज़ अपलोड करें' },
  'adjust_search_criteria': { english: 'Try adjusting your search criteria', hindi: 'अपने खोज मानदंड को समायोजित करने का प्रयास करें' },
  'related_to': { english: 'Related to', hindi: 'संबंधित' },
  'field': { english: 'Field', hindi: 'फील्ड' },
  'uploaded': { english: 'Uploaded', hindi: 'अपलोड किया गया' },
  'view': { english: 'View', hindi: 'देखें' },
  'download': { english: 'Download', hindi: 'डाउनलोड करें' },
  'delete_document': { english: 'Delete Document', hindi: 'दस्तावेज़ हटाएं' },
  'upload_guidelines': { english: 'Upload Guidelines', hindi: 'अपलोड दिशानिर्देश' },
  'supported_file_types': { english: 'Supported File Types', hindi: 'समर्थित फ़ाइल प्रकार' },
  'requirements': { english: 'Requirements', hindi: 'आवश्यकताएं' },
  
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
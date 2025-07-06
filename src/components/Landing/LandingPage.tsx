import React from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { 
  BookOpen, 
  Users, 
  Award, 
  Target, 
  Heart, 
  GraduationCap,
  Star,
  CheckCircle,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Globe,
  Calendar,
  TrendingUp,
  Shield,
  Zap,
  FileText,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'

interface LandingPageProps {
  onShowAuth: () => void
}

const LandingPage: React.FC<LandingPageProps> = ({ onShowAuth }) => {
  const { language, setLanguage, t } = useLanguage()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLanguageToggle = () => {
    const newLanguage = language === 'english' ? 'hindi' : 'english'
    setLanguage(newLanguage)
  }

  const stats = [
    { number: '5000+', label: 'Students Helped', labelHindi: 'छात्रों की सहायता' },
    { number: '₹2Cr+', label: 'Scholarships Distributed', labelHindi: 'छात्रवृत्ति वितरित' },
    { number: '15+', label: 'Years of Service', labelHindi: 'सेवा के वर्ष' },
    { number: '50+', label: 'Educational Institutions', labelHindi: 'शैक्षणिक संस्थान' }
  ]

  const features = [
    {
      icon: GraduationCap,
      title: 'Merit-Based Scholarships',
      titleHindi: 'मेधा आधारित छात्रवृत्ति',
      description: 'Supporting academically excellent students from all backgrounds',
      descriptionHindi: 'सभी पृष्ठभूमि के शैक्षणिक रूप से उत्कृष्ट छात्रों का समर्थन'
    },
    {
      icon: Heart,
      title: 'Need-Based Support',
      titleHindi: 'आवश्यकता आधारित सहायता',
      description: 'Financial assistance for economically disadvantaged students',
      descriptionHindi: 'आर्थिक रूप से वंचित छात्रों के लिए वित्तीय सहायता'
    },
    {
      icon: Target,
      title: 'Career Guidance',
      titleHindi: 'करियर मार्गदर्शन',
      description: 'Mentorship and guidance for career development',
      descriptionHindi: 'करियर विकास के लिए मार्गदर्शन और सलाह'
    },
    {
      icon: Users,
      title: 'Community Support',
      titleHindi: 'सामुदायिक सहायता',
      description: 'Building a strong network of educated professionals',
      descriptionHindi: 'शिक्षित पेशेवरों का एक मजबूत नेटवर्क बनाना'
    }
  ]

  const scholarshipTypes = [
    {
      title: 'School Education',
      titleHindi: 'स्कूली शिक्षा',
      description: 'For students in classes 6th to 12th',
      descriptionHindi: 'कक्षा 6वीं से 12वीं तक के छात्रों के लिए',
      amount: '₹5,000 - ₹15,000',
      icon: BookOpen
    },
    {
      title: 'Higher Education',
      titleHindi: 'उच्च शिक्षा',
      description: 'For undergraduate and postgraduate students',
      descriptionHindi: 'स्नातक और स्नातकोत्तर छात्रों के लिए',
      amount: '₹25,000 - ₹50,000',
      icon: GraduationCap
    },
    {
      title: 'Professional Courses',
      titleHindi: 'व्यावसायिक पाठ्यक्रम',
      description: 'For engineering, medical, and other professional courses',
      descriptionHindi: 'इंजीनियरिंग, मेडिकल और अन्य व्यावसायिक पाठ्यक्रमों के लिए',
      amount: '₹50,000 - ₹1,00,000',
      icon: Award
    }
  ]

  const testimonials = [
    {
      name: 'Priya Sharma',
      nameHindi: 'प्रिया शर्मा',
      course: 'B.Tech Computer Science',
      courseHindi: 'बी.टेक कंप्यूटर साइंस',
      text: 'RGA scholarship helped me pursue my engineering dreams. The support was not just financial but also emotional.',
      textHindi: 'आरजीए छात्रवृत्ति ने मुझे अपने इंजीनियरिंग के सपनों को पूरा करने में मदद की। सहायता केवल वित्तीय नहीं बल्कि भावनात्मक भी थी।',
      image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
    },
    {
      name: 'Rahul Gupta',
      nameHindi: 'राहुल गुप्ता',
      course: 'MBBS',
      courseHindi: 'एमबीबीएस',
      text: 'Thanks to RGA, I could focus on my studies without worrying about financial constraints.',
      textHindi: 'आरजीए के कारण, मैं वित्तीय बाधाओं की चिंता किए बिना अपनी पढ़ाई पर ध्यान दे सका।',
      image: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
    },
    {
      name: 'Anita Patel',
      nameHindi: 'अनीता पटेल',
      course: 'CA Final',
      courseHindi: 'सीए फाइनल',
      text: 'The scholarship program is transparent and truly helps deserving students achieve their goals.',
      textHindi: 'छात्रवृत्ति कार्यक्रम पारदर्शी है और वास्तव में योग्य छात्रों को अपने लक्ष्य हासिल करने में मदद करता है।',
      image: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-lg">
                <BookOpen className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm sm:text-lg font-bold text-gray-900">
                  {language === 'hindi' ? 'राजस्थानी स्नातक संघ' : 'RGA Swarna Jayanti'}
                </h1>
                <p className="text-xs text-gray-500">
                  {language === 'hindi' ? 'स्वर्ण जयंती शिक्षा न्यास' : 'Shiksha Nyas'}
                </p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-sm font-bold text-gray-900">RGA</h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              <a href="#about" className="text-gray-700 hover:text-blue-600 transition-colors">
                {language === 'hindi' ? 'हमारे बारे में' : 'About'}
              </a>
              <a href="#scholarships" className="text-gray-700 hover:text-blue-600 transition-colors">
                {language === 'hindi' ? 'छात्रवृत्ति' : 'Scholarships'}
              </a>
              <a href="#testimonials" className="text-gray-700 hover:text-blue-600 transition-colors">
                {language === 'hindi' ? 'प्रशंसापत्र' : 'Testimonials'}
              </a>
              <a href="#contact" className="text-gray-700 hover:text-blue-600 transition-colors">
                {language === 'hindi' ? 'संपर्क' : 'Contact'}
              </a>
            </div>

            {/* Right side - Language switcher and auth buttons */}
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

              {/* Desktop Auth Buttons */}
              <div className="hidden sm:flex items-center space-x-2">
                <button
                  onClick={onShowAuth}
                  className="px-3 sm:px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium text-sm"
                >
                  {language === 'hindi' ? 'लॉगिन' : 'Login'}
                </button>
                <button
                  onClick={onShowAuth}
                  className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg hover:from-blue-700 hover:to-emerald-700 transition-all font-medium text-sm"
                >
                  {language === 'hindi' ? 'साइन अप' : 'Sign Up'}
                </button>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden border-t border-gray-200 py-4">
              <div className="flex flex-col space-y-4">
                <a href="#about" className="text-gray-700 hover:text-blue-600 transition-colors px-2">
                  {language === 'hindi' ? 'हमारे बारे में' : 'About'}
                </a>
                <a href="#scholarships" className="text-gray-700 hover:text-blue-600 transition-colors px-2">
                  {language === 'hindi' ? 'छात्रवृत्ति' : 'Scholarships'}
                </a>
                <a href="#testimonials" className="text-gray-700 hover:text-blue-600 transition-colors px-2">
                  {language === 'hindi' ? 'प्रशंसापत्र' : 'Testimonials'}
                </a>
                <a href="#contact" className="text-gray-700 hover:text-blue-600 transition-colors px-2">
                  {language === 'hindi' ? 'संपर्क' : 'Contact'}
                </a>
                <div className="flex flex-col space-y-2 px-2 pt-2 border-t border-gray-200">
                  <button
                    onClick={onShowAuth}
                    className="w-full px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium text-left"
                  >
                    {language === 'hindi' ? 'लॉगिन' : 'Login'}
                  </button>
                  <button
                    onClick={onShowAuth}
                    className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg hover:from-blue-700 hover:to-emerald-700 transition-all font-medium"
                  >
                    {language === 'hindi' ? 'साइन अप' : 'Sign Up'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6">
                <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{language === 'hindi' ? 'शिक्षा में उत्कृष्टता' : 'Excellence in Education'}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
                {language === 'hindi' ? (
                  <>
                    शिक्षा को <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">सशक्त</span> बनाना
                  </>
                ) : (
                  <>
                    Empowering <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">Education</span>
                  </>
                )}
              </h1>
              <h2 className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-6 sm:mb-8">
                {language === 'hindi' 
                  ? 'जीवन को बदलना, सपनों को साकार करना' 
                  : 'Transforming Lives, Realizing Dreams'}
              </h2>
              <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 leading-relaxed">
                {language === 'hindi' 
                  ? 'राजस्थानी स्नातक संघ स्वर्ण जयंती शिक्षा न्यास योग्य छात्रों को गुणवत्तापूर्ण शिक्षा प्रदान करने के लिए प्रतिबद्ध है। हमारा मिशन है शिक्षा के माध्यम से समाज का कल्याण।'
                  : 'RGA Swarna Jayanti Shiksha Nyas is committed to providing quality education to deserving students. Our mission is to transform society through education and create opportunities for all.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={onShowAuth}
                  className="flex items-center justify-center space-x-2 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg hover:from-blue-700 hover:to-emerald-700 transition-all font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl"
                >
                  <span>{language === 'hindi' ? 'आवेदन करें' : 'Apply Now'}</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <a
                  href="#about"
                  className="flex items-center justify-center space-x-2 px-6 sm:px-8 py-3 sm:py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-blue-600 hover:text-blue-600 transition-all font-semibold text-base sm:text-lg"
                >
                  <span>{language === 'hindi' ? 'और जानें' : 'Learn More'}</span>
                </a>
              </div>
            </div>
            <div className="relative order-first lg:order-last">
              <div className="relative z-10">
                <img
                  src="https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop"
                  alt="Students studying"
                  className="rounded-2xl shadow-2xl w-full"
                />
              </div>
              <div className="absolute -top-4 -right-4 w-48 h-48 sm:w-72 sm:h-72 bg-gradient-to-br from-blue-400 to-emerald-400 rounded-2xl opacity-20 blur-3xl"></div>
              <div className="absolute -bottom-4 -left-4 w-48 h-48 sm:w-72 sm:h-72 bg-gradient-to-br from-emerald-400 to-blue-400 rounded-2xl opacity-20 blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">{stat.number}</div>
                <div className="text-sm sm:text-base text-gray-600 font-medium">
                  {language === 'hindi' ? stat.labelHindi : stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'hindi' ? 'हमारे बारे में' : 'About RGA Shiksha Nyas'}
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              {language === 'hindi' 
                ? 'शिक्षा के क्षेत्र में 15 वर्षों से अधिक का अनुभव और हजारों छात्रों की सफलता की कहानी'
                : 'Over 15 years of experience in education sector with thousands of success stories'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="bg-white rounded-xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    {language === 'hindi' ? feature.titleHindi : feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    {language === 'hindi' ? feature.descriptionHindi : feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Scholarships Section */}
      <section id="scholarships" className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'hindi' ? 'छात्रवृत्ति कार्यक्रम' : 'Scholarship Programs'}
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              {language === 'hindi' 
                ? 'विभिन्न शैक्षणिक स्तरों के लिए व्यापक छात्रवृत्ति योजनाएं'
                : 'Comprehensive scholarship schemes for various educational levels'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {scholarshipTypes.map((scholarship, index) => {
              const Icon = scholarship.icon
              return (
                <div key={index} className="bg-gradient-to-br from-blue-50 to-emerald-50 rounded-xl p-6 sm:p-8 border border-blue-100 hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                    <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                    {language === 'hindi' ? scholarship.titleHindi : scholarship.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">
                    {language === 'hindi' ? scholarship.descriptionHindi : scholarship.description}
                  </p>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-4 sm:mb-6">{scholarship.amount}</div>
                  <button
                    onClick={onShowAuth}
                    className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg hover:from-blue-700 hover:to-emerald-700 transition-all font-semibold text-sm sm:text-base"
                  >
                    {language === 'hindi' ? 'आवेदन करें' : 'Apply Now'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'hindi' ? 'आवेदन प्रक्रिया' : 'Application Process'}
            </h2>
            <p className="text-lg sm:text-xl text-gray-600">
              {language === 'hindi' 
                ? 'सरल और पारदर्शी आवेदन प्रक्रिया'
                : 'Simple and transparent application process'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              {
                step: '1',
                title: 'Register',
                titleHindi: 'पंजीकरण',
                description: 'Create your account with email verification',
                descriptionHindi: 'ईमेल सत्यापन के साथ अपना खाता बनाएं',
                icon: Users
              },
              {
                step: '2',
                title: 'Fill Application',
                titleHindi: 'आवेदन भरें',
                description: 'Complete the scholarship application form',
                descriptionHindi: 'छात्रवृत्ति आवेदन फॉर्म पूरा करें',
                icon: FileText
              },
              {
                step: '3',
                title: 'Upload Documents',
                titleHindi: 'दस्तावेज़ अपलोड करें',
                description: 'Submit required documents and certificates',
                descriptionHindi: 'आवश्यक दस्तावेज़ और प्रमाणपत्र जमा करें',
                icon: Shield
              },
              {
                step: '4',
                title: 'Get Results',
                titleHindi: 'परिणाम प्राप्त करें',
                description: 'Receive notification about your application status',
                descriptionHindi: 'अपने आवेदन की स्थिति के बारे में सूचना प्राप्त करें',
                icon: CheckCircle
              }
            ].map((process, index) => {
              const Icon = process.icon
              return (
                <div key={index} className="text-center">
                  <div className="relative mb-4 sm:mb-6">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
                      {process.step}
                    </div>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    {language === 'hindi' ? process.titleHindi : process.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    {language === 'hindi' ? process.descriptionHindi : process.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'hindi' ? 'छात्रों की सफलता की कहानियां' : 'Student Success Stories'}
            </h2>
            <p className="text-lg sm:text-xl text-gray-600">
              {language === 'hindi' 
                ? 'हमारे छात्रवृत्ति प्राप्तकर्ताओं के अनुभव'
                : 'Experiences from our scholarship recipients'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center mb-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover mr-3 sm:mr-4"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                      {language === 'hindi' ? testimonial.nameHindi : testimonial.name}
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {language === 'hindi' ? testimonial.courseHindi : testimonial.course}
                    </p>
                  </div>
                </div>
                <p className="text-sm sm:text-base text-gray-700 italic mb-3 sm:mb-4">
                  "{language === 'hindi' ? testimonial.textHindi : testimonial.text}"
                </p>
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 sm:py-20 bg-gradient-to-br from-blue-600 to-emerald-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              {language === 'hindi' ? 'संपर्क करें' : 'Get in Touch'}
            </h2>
            <p className="text-lg sm:text-xl opacity-90">
              {language === 'hindi' 
                ? 'हमसे जुड़ें और अपने सवालों के जवाब पाएं'
                : 'Connect with us and get answers to your questions'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">
                {language === 'hindi' ? 'ईमेल' : 'Email'}
              </h3>
              <p className="opacity-90 text-sm sm:text-base">info@rgashiksha.org</p>
              <p className="opacity-90 text-sm sm:text-base">scholarships@rgashiksha.org</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">
                {language === 'hindi' ? 'फोन' : 'Phone'}
              </h3>
              <p className="opacity-90 text-sm sm:text-base">+91 98765 43210</p>
              <p className="opacity-90 text-sm sm:text-base">+91 87654 32109</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">
                {language === 'hindi' ? 'पता' : 'Address'}
              </h3>
              <p className="opacity-90 text-sm sm:text-base">
                {language === 'hindi' 
                  ? 'आरजीए भवन, शिक्षा मार्ग, जयपुर, राजस्थान - 302001'
                  : 'RGA Bhawan, Shiksha Marg, Jaipur, Rajasthan - 302001'}
              </p>
            </div>
          </div>

          <div className="text-center mt-8 sm:mt-12">
            <button
              onClick={onShowAuth}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-base sm:text-lg shadow-lg"
            >
              {language === 'hindi' ? 'अभी शुरू करें' : 'Get Started Today'}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="col-span-1 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-lg">
                  <BookOpen className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    {language === 'hindi' ? 'आरजीए शिक्षा न्यास' : 'RGA Shiksha Nyas'}
                  </h3>
                </div>
              </div>
              <p className="text-gray-400 text-sm sm:text-base">
                {language === 'hindi' 
                  ? 'शिक्षा के माध्यम से समाज का कल्याण और छात्रों के उज्ज्वल भविष्य का निर्माण।'
                  : 'Transforming society through education and building bright futures for students.'}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm sm:text-base">
                {language === 'hindi' ? 'त्वरित लिंक' : 'Quick Links'}
              </h4>
              <ul className="space-y-2 text-gray-400 text-sm sm:text-base">
                <li><a href="#about" className="hover:text-white transition-colors">
                  {language === 'hindi' ? 'हमारे बारे में' : 'About Us'}
                </a></li>
                <li><a href="#scholarships" className="hover:text-white transition-colors">
                  {language === 'hindi' ? 'छात्रवृत्ति' : 'Scholarships'}
                </a></li>
                <li><a href="#testimonials" className="hover:text-white transition-colors">
                  {language === 'hindi' ? 'प्रशंसापत्र' : 'Testimonials'}
                </a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">
                  {language === 'hindi' ? 'संपर्क' : 'Contact'}
                </a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm sm:text-base">
                {language === 'hindi' ? 'छात्रवृत्ति श्रेणियां' : 'Scholarship Categories'}
              </h4>
              <ul className="space-y-2 text-gray-400 text-sm sm:text-base">
                <li>{language === 'hindi' ? 'स्कूली शिक्षा' : 'School Education'}</li>
                <li>{language === 'hindi' ? 'उच्च शिक्षा' : 'Higher Education'}</li>
                <li>{language === 'hindi' ? 'व्यावसायिक पाठ्यक्रम' : 'Professional Courses'}</li>
                <li>{language === 'hindi' ? 'अनुसंधान कार्यक्रम' : 'Research Programs'}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm sm:text-base">
                {language === 'hindi' ? 'संपर्क जानकारी' : 'Contact Info'}
              </h4>
              <ul className="space-y-2 text-gray-400 text-sm sm:text-base">
                <li className="flex items-center space-x-2">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>info@rgashiksha.org</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>+91 98765 43210</span>
                </li>
                <li className="flex items-center space-x-2">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{language === 'hindi' ? 'जयपुर, राजस्थान' : 'Jaipur, Rajasthan'}</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-gray-400 text-sm sm:text-base">
            <p>&copy; 2024 RGA Swarna Jayanti Shiksha Nyas. {language === 'hindi' ? 'सभी अधिकार सुरक्षित।' : 'All rights reserved.'}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
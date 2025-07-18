import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import SkeletonCard from '../common/SkeletonCard'
import { supabase } from '../../lib/supabase' // Import supabase
import { User, Profile } from '../../lib/supabase' // Import User and Profile types
import { Session } from '@supabase/supabase-js' // Import Session type
import { 
  GraduationCap, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Award,
  TrendingUp,
  Users,
  FileText,
  Star,
  ArrowRight,
  Plus
} from 'lucide-react'

interface StudentDashboardProps {
  onNavigate: (tab: string) => void;
  currentUser: User | null;
  currentProfile: Profile | null;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate, currentUser, currentProfile }) => {
  const { getSession } = useAuth(); // Use getSession for on-demand fetching
  const { language } = useLanguage()
  const [scholarshipForms, setScholarshipForms] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loadingScholarshipForms, setLoadingScholarshipForms] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState(true);
  
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0
  })

  const fetchScholarshipForms = async () => {
    setLoadingScholarshipForms(true);
    try {
      const { session } = await getSession();
      if (!session) {
        setScholarshipForms([]);
        return;
      }
      const { data, error } = await supabase
        .from('scholarship_forms')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setScholarshipForms(data || []);
    } catch (error) {
      console.error('Error fetching scholarship forms:', error);
    } finally {
      setLoadingScholarshipForms(false);
    }
  };

  const fetchApplications = async () => {
    setLoadingApplications(true);
    try {
      const { session, user: sessionUser } = await getSession();
      if (!session || !sessionUser) {
        setApplications([]);
        return;
      }
      const { data, error } = await supabase
        .from('applications')
        .select(`*, scholarship_forms (title, title_hindi, education_level)`)
        .eq('student_id', sessionUser.id)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoadingApplications(false);
    }
  }

  useEffect(() => {
    if (currentUser) {
      // Fetch data using the cached data context
      fetchScholarshipForms()
      fetchApplications()
    }
  }, [currentUser, fetchScholarshipForms, fetchApplications])

  useEffect(() => {
    // Calculate stats from applications
    const stats = applications.reduce((acc, app) => {
      acc.totalApplications++
      acc[`${app.status}Applications`]++
      return acc
    }, { totalApplications: 0, pendingApplications: 0, approvedApplications: 0, rejectedApplications: 0, holdApplications: 0 })

    setStats(stats)
  }, [applications])

  const getApplicationStatus = (formId: string) => {
    const application = applications.find(app => app.form_id === formId)
    return application?.status || null
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
      case 'hold':
        return <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
      case 'pending':
        return <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'hold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'pending':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const StatCard: React.FC<{
    title: string
    value: number
    icon: React.ComponentType<any>
    color: string
    bgColor: string
  }> = ({ title, value, icon: Icon, color, bgColor }) => (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${bgColor} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${color}`} />
        </div>
      </div>
    </div>
  )

  const isLoading = loadingScholarshipForms || loadingApplications

  if (isLoading && scholarshipForms.length === 0 && applications.length === 0) {
    return (
      <div className="flex items-center justify-center h-64"> {/* Keep this loading state */}
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const approvalRate = stats.totalApplications > 0 
    ? Math.round((stats.approvedApplications / stats.totalApplications) * 100) 
    : 0

  // Filter out forms that user has already applied to
  const appliedFormIds = applications.map(app => app.form_id)
  const availableForms = scholarshipForms.filter(form => !appliedFormIds.includes(form.id))

  const handleApplyToForm = (formId: string) => {
    // Navigate to applications tab where they can apply
    onNavigate('applications')
  }

  const handleViewAllApplications = () => {
    onNavigate('applications')
  }

  const handleViewDocuments = () => {
    onNavigate('documents')
  }

  const handleViewHistory = () => {
    onNavigate('history')
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-emerald-600 rounded-xl p-6 sm:p-8 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 truncate">
              {language === 'hindi'
                ? `नमस्ते, ${currentProfile?.full_name || 'छात्र'}!`
                : `Welcome, ${currentProfile?.full_name || 'Student'}!`}
            </h1>
            <p className="text-blue-100 text-sm sm:text-lg">
              {language === 'hindi' 
                ? 'आपके शैक्षणिक सपनों को साकार करने के लिए तैयार हैं।' 
                : 'Ready to make your educational dreams come true.'}
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <GraduationCap className="w-8 h-8 sm:w-12 sm:h-12" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      {stats.totalApplications > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            title={language === 'hindi' ? 'कुल आवेदन' : 'Total Applications'}
            value={stats.totalApplications}
            icon={FileText}
            color="text-blue-600"
            bgColor="bg-blue-100"
          />
          <StatCard
            title={language === 'hindi' ? 'लंबित' : 'Pending'}
            value={stats.pendingApplications}
            icon={Clock}
            color="text-yellow-600"
            bgColor="bg-yellow-100"
          />
          <StatCard
            title={language === 'hindi' ? 'स्वीकृत' : 'Approved'}
            value={stats.approvedApplications}
            icon={CheckCircle}
            color="text-green-600"
            bgColor="bg-green-100"
          />
          <StatCard
            title={language === 'hindi' ? 'अस्वीकृत' : 'Rejected'}
            value={stats.rejectedApplications}
            icon={XCircle}
            color="text-red-600"
            bgColor="bg-red-100"
          />
        </div>
      )}

      {/* Available Scholarships Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              {language === 'hindi' ? 'उपलब्ध छात्रवृत्तियां' : 'Available Scholarships'}
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              {language === 'hindi' 
                ? 'अपने शिक्षा स्तर के अनुकूल छात्रवृत्ति के लिए आवेदन करें'
                : 'Apply for scholarships that match your education level'}
            </p>
          </div>
          {availableForms.length > 3 && (
            <button 
              onClick={() => onNavigate('applications')}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base mt-2 sm:mt-0">
              <span>{language === 'hindi' ? 'सभी देखें' : 'View All'}</span>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>

        {availableForms.length === 0 ? (
          <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-xl">
            <GraduationCap className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
              {applications.length > 0 
                ? (language === 'hindi' ? 'सभी उपलब्ध छात्रवृत्तियों के लिए आवेदन किया गया' : 'Applied to all available scholarships')
                : (language === 'hindi' ? 'कोई छात्रवृत्ति उपलब्ध नहीं' : 'No scholarships available')
              }
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              {applications.length > 0
                ? (language === 'hindi' 
                    ? 'नई छात्रवृत्ति के अवसरों के लिए बाद में जांचें'
                    : 'Check back later for new scholarship opportunities')
                : (language === 'hindi' 
                    ? 'नई छात्रवृत्ति के अवसरों के लिए बाद में जांचें'
                    : 'Check back later for new scholarship opportunities')
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {isLoading ? (
              // Show skeleton cards while loading
              Array.from({ length: 3 }).map((_, index) => (
                <SkeletonCard key={index} showImage={false} />
              ))
            ) : (
              availableForms.slice(0, 6).map((form) => {
              const title = language === 'hindi' && form.title_hindi ? form.title_hindi : form.title
              const description = language === 'hindi' && form.description_hindi ? form.description_hindi : form.description

              return (
                <div
                  key={form.id}
                  className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-100 to-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2">{title}</h3>
                        <p className="text-xs sm:text-sm text-gray-500 capitalize">{form.education_level}</p>
                      </div>
                    </div>
                  </div>

                  {description && (
                    <p className="text-gray-600 text-xs sm:text-sm mb-4 line-clamp-3">
                      {description}
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>{new Date(form.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <button 
                      onClick={() => handleApplyToForm(form.id)}
                      className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center space-x-2 w-full sm:w-auto bg-gradient-to-r from-blue-600 to-emerald-600 text-white hover:from-blue-700 hover:to-emerald-700 shadow-md hover:shadow-lg">
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>{language === 'hindi' ? 'आवेदन करें' : 'Apply Now'}</span>
                    </button>
                  </div>
                </div>
              )
              })
            )}
          </div>
        )}
      </div>

      {/* My Applications Section */}
      {applications.length > 0 && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                {language === 'hindi' ? 'मेरे आवेदन' : 'My Applications'}
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                {language === 'hindi' 
                  ? 'आपके हाल के आवेदनों की स्थिति'
                  : 'Status of your recent applications'}
              </p>
            </div>
            <button 
              onClick={handleViewAllApplications}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base mt-2 sm:mt-0">
              <span>{language === 'hindi' ? 'सभी देखें' : 'View All'}</span>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {isLoading ? (
              // Show skeleton cards while loading
              Array.from({ length: 2 }).map((_, index) => (
                <SkeletonCard key={index} showImage={false} showButton={false} />
              ))
            ) : (
              applications.slice(0, 4).map((application) => {
              const title = language === 'hindi' && application.scholarship_forms?.title_hindi 
                ? application.scholarship_forms.title_hindi 
                : application.scholarship_forms?.title

              return (
                <div
                  key={application.id}
                  className={`bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-shadow ${
                    application.status === 'approved' ? 'ring-2 ring-green-200 bg-green-50' : 
                    application.status === 'rejected' ? 'ring-2 ring-red-200 bg-red-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 line-clamp-2">{title}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 mb-2">{application.scholarship_forms?.education_level}</p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {getStatusIcon(application.status)}
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(application.status)}`}>
                        {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Submitted: {new Date(application.submitted_at).toLocaleDateString()}</span>
                  </div>
                </div>
              )
              })
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <button 
          onClick={handleViewAllApplications}
          className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-200 hover:shadow-lg transition-shadow text-left">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
              {language === 'hindi' ? 'आवेदन ट्रैक करें' : 'Track Applications'}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mb-3">
            {language === 'hindi' 
              ? 'अपने आवेदनों की स्थिति देखें'
              : 'View status of your applications'}
          </p>
          <span className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium">
            {language === 'hindi' ? 'देखें →' : 'View →'}
          </span>
        </button>

        <button 
          onClick={handleViewDocuments}
          className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-200 hover:shadow-lg transition-shadow text-left">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Award className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
              {language === 'hindi' ? 'दस्तावेज़ अपलोड करें' : 'Upload Documents'}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mb-3">
            {language === 'hindi' 
              ? 'आवश्यक दस्तावेज़ अपलोड करें'
              : 'Upload required documents'}
          </p>
          <span className="text-green-600 hover:text-green-800 text-xs sm:text-sm font-medium">
            {language === 'hindi' ? 'अपलोड करें →' : 'Upload →'}
          </span>
        </button>

        <button 
          onClick={handleViewHistory}
          className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-200 hover:shadow-lg transition-shadow text-left">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
              {language === 'hindi' ? 'आवेदन इतिहास' : 'Application History'}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mb-3">
            {language === 'hindi' 
              ? 'पिछले आवेदनों का रिकॉर्ड देखें'
              : 'View record of past applications'}
          </p>
          <span className="text-purple-600 hover:text-purple-800 text-xs sm:text-sm font-medium">
            {language === 'hindi' ? 'इतिहास →' : 'History →'}
          </span>
        </button>

        <button 
          onClick={() => window.open('mailto:support@rga.org', '_blank')}
          className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-200 hover:shadow-lg transition-shadow text-left">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
              {language === 'hindi' ? 'सहायता केंद्र' : 'Help Center'}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mb-3">
            {language === 'hindi' 
              ? 'सहायता और मार्गदर्शन प्राप्त करें'
              : 'Get help and guidance'}
          </p>
          <span className="text-orange-600 hover:text-orange-800 text-xs sm:text-sm font-medium">
            {language === 'hindi' ? 'सहायता →' : 'Help →'}
          </span>
        </button>
      </div>

      {/* Success Message for Approved Applications */}
      {stats.approvedApplications > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Star className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-green-900">
                {language === 'hindi' ? 'बधाई हो!' : 'Congratulations!'}
              </h3>
              <p className="text-sm sm:text-base text-green-700">
                {language === 'hindi' 
                  ? `आपके ${stats.approvedApplications} आवेदन स्वीकृत हो गए हैं।`
                  : `You have ${stats.approvedApplications} approved application${stats.approvedApplications > 1 ? 's' : ''}.`}
              </p>
            </div>
          </div>
          <p className="text-sm sm:text-base text-green-600">
            {language === 'hindi' 
              ? 'आपकी मेहनत और समर्पण का फल मिला है। शिक्षा की यात्रा जारी रखें!'
              : 'Your hard work and dedication have paid off. Continue your educational journey!'}
          </p>
        </div>
      )}
    </div>
  )
}

export default StudentDashboard
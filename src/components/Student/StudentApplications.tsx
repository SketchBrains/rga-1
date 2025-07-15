import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { User, Profile } from '../../lib/supabase'
import { Session } from '@supabase/supabase-js'

import ApplicationForm from './ApplicationForm'
import { 
  FileText, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Pause,
  Eye,
  Edit,
  AlertCircle,
  Plus,
  ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'

interface StudentApplicationsProps {
  currentUser: User | null;
  currentProfile: Profile | null;
}

const StudentApplications: React.FC<StudentApplicationsProps> = ({ currentUser, currentProfile }) => {
  const { getSession } = useAuth()
  const { language, t } = useLanguage()
  const [applications, setApplications] = useState<any[]>([])
  const [scholarshipForms, setScholarshipForms] = useState<any[]>([])
  
  const [availableForms, setAvailableForms] = useState<any[]>([])
  const [selectedApplication, setSelectedApplication] = useState<any>(null)
  const [selectedForm, setSelectedForm] = useState<any>(null)
  const [applicationDetails, setApplicationDetails] = useState<any>(null)
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) {
      return
    }
    fetchApplications()
    fetchScholarshipForms()
  }, [currentUser])

  const fetchApplications = async () => {
    try {
      const { user: sessionUser } = await getSession()
      if (!sessionUser) {
        toast.error('Please log in to view applications')
        return
      }

      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          scholarship_forms (title, title_hindi, education_level)
        `)
        .eq('student_id', sessionUser.id)
        .order('submitted_at', { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (error) {
      console.error('Error fetching applications:', error)
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const fetchScholarshipForms = async () => {
    try {
      const { user: sessionUser } = await getSession()
      if (!sessionUser) {
        return
      }

      const { data, error } = await supabase
        .from('scholarship_forms')
        .select('*')
        .eq('is_active', true)
        .order('title')

      if (error) throw error

      // Filter out forms that user has already applied to
      const appliedFormIds = applications.map(app => app.form_id)
      const available = (data || []).filter(form => !appliedFormIds.includes(form.id))
      
      setScholarshipForms(data || [])
      setAvailableForms(available)
    } catch (error) {
      console.error('Error fetching scholarship forms:', error)
      toast.error('Failed to load scholarship forms')
    }
  }

  const handleApplyToForm = async (form: any) => {
    try {
      const { user: sessionUser } = await getSession()
      if (!sessionUser) {
        toast.error('Please log in to apply')
        return
      }

      setSelectedForm(form)
      setShowApplicationForm(true)
    } catch (error) {
      console.error('Error preparing application form:', error)
      toast.error('Failed to open application form')
    }
  }

  const handleFormSuccess = () => {
    setShowApplicationForm(false)
    setSelectedForm(null)
    fetchApplications()
    fetchScholarshipForms()
  }

  const fetchApplicationDetails = async (applicationId: string) => {
    try {
      const { user: sessionUser } = await getSession()
      if (!sessionUser) {
        toast.error('Please log in to view application details')
        return
      }

      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          scholarship_forms (title, title_hindi, description, description_hindi),
          application_responses (
            response_value,
            form_fields (field_label, field_label_hindi, field_type)
          )
        `)
        .eq('id', applicationId)
        .eq('student_id', sessionUser.id)
        .single()

      if (error) throw error
      setApplicationDetails(data)
    } catch (error) {
      console.error('Error fetching application details:', error)
      toast.error('Failed to load application details')
    }
  }

  const handleViewApplication = (application: any) => {
    setSelectedApplication(application)
    fetchApplicationDetails(application.id)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'hold':
        return <Pause className="w-4 h-4 text-yellow-500" />
      default:
        return <Clock className="w-4 h-4 text-blue-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'hold':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (showApplicationForm && selectedForm) {
    return (
      <ApplicationForm
        form={selectedForm}
        currentUser={currentUser}
        currentProfile={currentProfile}
        onSuccess={handleFormSuccess}
        onCancel={() => {
          setShowApplicationForm(false)
          setSelectedForm(null)
        }}
      />
    )
  }

  if (selectedApplication && applicationDetails) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <button
            onClick={() => {
              setSelectedApplication(null)
              setApplicationDetails(null)
            }}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to Applications
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Application Details</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {language === 'hindi' && applicationDetails.scholarship_forms?.title_hindi
                  ? applicationDetails.scholarship_forms.title_hindi
                  : applicationDetails.scholarship_forms?.title}
              </h2>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <span>Submitted: {new Date(applicationDetails.submitted_at).toLocaleDateString()}</span>
                {applicationDetails.reviewed_at && (
                  <span>Reviewed: {new Date(applicationDetails.reviewed_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(applicationDetails.status)}
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(applicationDetails.status)}`}>
                {applicationDetails.status.charAt(0).toUpperCase() + applicationDetails.status.slice(1)}
              </span>
            </div>
          </div>

          {applicationDetails.admin_notes && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-medium text-yellow-800 mb-2">Admin Notes:</h3>
              <p className="text-yellow-700">{applicationDetails.admin_notes}</p>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Application Responses</h3>
            {applicationDetails.application_responses?.map((response: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  {language === 'hindi' && response.form_fields?.field_label_hindi
                    ? response.form_fields.field_label_hindi
                    : response.form_fields?.field_label}
                </h4>
                <p className="text-gray-700">{response.response_value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
        <p className="text-gray-600">View and manage your scholarship applications</p>
      </div>

      {/* Available Forms */}
      {availableForms.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Scholarships</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableForms.map((form) => (
              <div key={form.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {language === 'hindi' && form.title_hindi ? form.title_hindi : form.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3">{form.education_level}</p>
                {form.description && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-3">
                    {language === 'hindi' && form.description_hindi ? form.description_hindi : form.description}
                  </p>
                )}
                <button
                  onClick={() => handleApplyToForm(form)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Apply Now</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Applications */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">My Applications</h2>
        {applications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
            <p className="text-gray-600">Start by applying to available scholarships above</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <div key={application.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {language === 'hindi' && application.scholarship_forms?.title_hindi
                        ? application.scholarship_forms.title_hindi
                        : application.scholarship_forms?.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{application.scholarship_forms?.education_level}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Submitted: {new Date(application.submitted_at).toLocaleDateString()}</span>
                      </span>
                      {application.reviewed_at && (
                        <span>Reviewed: {new Date(application.reviewed_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 ml-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(application.status)}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
                        {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleViewApplication(application)}
                      className="flex items-center space-x-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentApplications
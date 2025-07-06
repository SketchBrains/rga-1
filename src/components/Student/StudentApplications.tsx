import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { useLanguage } from '../../contexts/LanguageContext'
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

const StudentApplications: React.FC = () => {
  const { user } = useAuth()
  const { 
    applications, 
    loadingApplications, 
    fetchApplications,
    scholarshipForms,
    fetchScholarshipForms
  } = useData()
  const { language, t } = useLanguage()
  
  const [availableForms, setAvailableForms] = useState<any[]>([])
  const [selectedApplication, setSelectedApplication] = useState<any>(null)
  const [selectedForm, setSelectedForm] = useState<any>(null)
  const [applicationDetails, setApplicationDetails] = useState<any>(null)
  const [showApplicationForm, setShowApplicationForm] = useState(false)

  useEffect(() => {
    if (user) {
      fetchApplications()
      fetchScholarshipForms()
    }
  }, [user, fetchApplications, fetchScholarshipForms])

  useEffect(() => {
    // Filter out forms that user has already applied to
    const appliedFormIds = applications.map(app => app.form_id)
    const available = scholarshipForms.filter(form => !appliedFormIds.includes(form.id))
    setAvailableForms(available)
  }, [applications, scholarshipForms])

  const handleApplyToForm = (form: any) => {
    setSelectedForm(form)
    setShowApplicationForm(true)
  }

  const handleFormSuccess = () => {
    setShowApplicationForm(false)
    setSelectedForm(null)
    toast.success('Application submitted successfully!')
  }

  const handleBackFromForm = () => {
    setShowApplicationForm(false)
    setSelectedForm(null)
  }

  const fetchApplicationDetails = async (applicationId: string) => {
    try {
      const { data: responses, error: responsesError } = await supabase
        .from('application_responses')
        .select(`
          *,
          form_fields (field_label, field_label_hindi, field_type)
        `)
        .eq('application_id', applicationId)

      if (responsesError) throw responsesError

      const { data: documents, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', applicationId)

      if (documentsError) throw documentsError

      setApplicationDetails({
        responses: responses || [],
        documents: documents || []
      })
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
        return <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
      case 'hold':
        return <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
      default:
        return <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
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
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Congratulations! Your application has been approved.'
      case 'rejected':
        return 'Your application was not approved this time. Please check admin notes for details.'
      case 'hold':
        return 'Your application is on hold. We may need additional information.'
      default:
        return 'Your application is being reviewed. Please wait for updates.'
    }
  }

  // Show application form if selected
  if (showApplicationForm && selectedForm) {
    return (
      <ApplicationForm
        form={selectedForm}
        onBack={handleBackFromForm}
        onSuccess={handleFormSuccess}
      />
    )
  }

  if (loadingApplications && applications.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">My Applications</h1>
        <p className="text-sm sm:text-base text-gray-600">Apply for scholarships and track your application status</p>
      </div>

      {/* Available Forms Section */}
      {availableForms.length > 0 && (
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Available Scholarships</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {availableForms.map((form) => {
              const title = language === 'hindi' && form.title_hindi ? form.title_hindi : form.title
              const description = language === 'hindi' && form.description_hindi ? form.description_hindi : form.description

              return (
                <div key={form.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-100 to-emerald-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2">{title}</h3>
                      <p className="text-xs sm:text-sm text-gray-500 capitalize">{form.education_level}</p>
                    </div>
                  </div>

                  {description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>{new Date(form.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <button
                      onClick={() => handleApplyToForm(form)}
                      className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg hover:from-blue-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg text-xs sm:text-sm font-medium"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>{language === 'hindi' ? 'आवेदन करें' : 'Apply Now'}</span>
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
          <p className="text-sm sm:text-base text-gray-600">You haven't submitted any scholarship applications yet.</p>
          {availableForms.length > 0 && (
            <p className="text-sm sm:text-base text-blue-600 mt-2">Check out the available scholarships above to get started!</p>
          )}
        </div>
      ) : (
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">My Applications</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {applications.map((application) => {
              const title = language === 'hindi' && application.scholarship_forms?.title_hindi 
                ? application.scholarship_forms.title_hindi 
                : application.scholarship_forms?.title

              return (
                <div
                  key={application.id}
                  className={`bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-shadow ${
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

                  <div className={`p-3 rounded-lg mb-4 ${getStatusColor(application.status).replace('border-', 'bg-').replace('text-', 'text-').replace('-800', '-50').replace('-100', '-50')}`}>
                    <p className="text-xs sm:text-sm">{getStatusMessage(application.status)}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm text-gray-500 mb-4 gap-2">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Submitted: {new Date(application.submitted_at).toLocaleDateString()}</span>
                    </div>
                    {application.reviewed_at && (
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>Reviewed: {new Date(application.reviewed_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {application.admin_notes && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <div className="flex items-center space-x-2 mb-1">
                        <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                        <span className="text-xs sm:text-sm font-medium text-gray-700">Admin Notes</span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600">{application.admin_notes}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <button
                      onClick={() => handleViewApplication(application)}
                      className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm w-full sm:w-auto justify-center"
                    >
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>View Details</span>
                    </button>

                    {application.status === 'pending' && (
                      <button className="flex items-center space-x-2 px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs sm:text-sm w-full sm:w-auto justify-center">
                        <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Application Detail Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Application Details</h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    {language === 'hindi' && selectedApplication.scholarship_forms?.title_hindi 
                      ? selectedApplication.scholarship_forms.title_hindi 
                      : selectedApplication.scholarship_forms?.title}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {/* Status Section */}
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-3">
                  {getStatusIcon(selectedApplication.status)}
                  <span className={`px-2 sm:px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedApplication.status)}`}>
                    {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
                  </span>
                </div>
                <p className="text-sm sm:text-base text-gray-600">{getStatusMessage(selectedApplication.status)}</p>
              </div>

              {/* Application Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Submitted Date</label>
                  <p className="text-sm sm:text-base text-gray-900">{new Date(selectedApplication.submitted_at).toLocaleString()}</p>
                </div>
                {selectedApplication.reviewed_at && (
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700">Reviewed Date</label>
                    <p className="text-sm sm:text-base text-gray-900">{new Date(selectedApplication.reviewed_at).toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Education Level</label>
                  <p className="text-sm sm:text-base text-gray-900">{selectedApplication.scholarship_forms?.education_level}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Application ID</label>
                  <p className="text-sm sm:text-base text-gray-900 font-mono">{selectedApplication.id.slice(0, 8)}...</p>
                </div>
              </div>

              {/* Application Responses */}
              {applicationDetails && applicationDetails.responses.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Your Responses</h3>
                  <div className="space-y-4">
                    {applicationDetails.responses.map((response: any) => (
                      <div key={response.id} className="border border-gray-200 rounded-lg p-4">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          {language === 'hindi' && response.form_fields?.field_label_hindi 
                            ? response.form_fields.field_label_hindi 
                            : response.form_fields?.field_label}
                        </label>
                        <p className="text-sm sm:text-base text-gray-900">{response.response_value || 'No response provided'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              {applicationDetails?.documents?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Uploaded Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {applicationDetails.documents.map((doc: any) => (
                      <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-gray-900">{doc.file_name}</p>
                            <p className="text-xs text-gray-500">{(doc.file_size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs sm:text-sm text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          View Document
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              {selectedApplication.admin_notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                    <h3 className="text-base sm:text-lg font-semibold text-blue-900">Admin Notes</h3>
                  </div>
                  <p className="text-sm sm:text-base text-blue-800">{selectedApplication.admin_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentApplications
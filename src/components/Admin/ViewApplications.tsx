import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Pause,
  Download,
  Mail,
  User,
  Calendar,
  FileText,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Application {
  id: string
  form_id: string
  student_id: string
  status: 'pending' | 'approved' | 'rejected' | 'hold'
  submitted_at: string
  reviewed_at?: string
  reviewed_by?: string
  admin_notes?: string
  scholarship_forms: {
    title: string
    education_level: string
  }
  users: {
    email: string
    profiles: {
      full_name: string
      phone?: string
    }
  }
}

const ViewApplications: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([])
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([])
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [applicationDetails, setApplicationDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formFilter, setFormFilter] = useState('all')
  const [forms, setForms] = useState<any[]>([])
  const { user } = useAuth()
  const { t } = useLanguage()

  useEffect(() => {
    fetchApplications()
    fetchForms()
  }, [])

  useEffect(() => {
    filterApplications()
  }, [applications, searchTerm, statusFilter, formFilter])

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          scholarship_forms (title, education_level),
          users (
            email,
            profiles (full_name, phone)
          )
        `)
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

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from('scholarship_forms')
        .select('id, title')
        .order('title')

      if (error) throw error
      setForms(data || [])
    } catch (error) {
      console.error('Error fetching forms:', error)
    }
  }

  const filterApplications = () => {
    let filtered = applications

    if (searchTerm) {
      filtered = filtered.filter(app => 
        app.users?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.scholarship_forms?.title?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter)
    }

    if (formFilter !== 'all') {
      filtered = filtered.filter(app => app.form_id === formFilter)
    }

    setFilteredApplications(filtered)
  }

  const fetchApplicationDetails = async (applicationId: string) => {
    try {
      const { data, error } = await supabase
        .from('application_responses')
        .select(`
          *,
          form_fields (field_label, field_label_hindi, field_type)
        `)
        .eq('application_id', applicationId)

      if (error) throw error

      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', applicationId)

      if (docsError) throw docsError

      setApplicationDetails({
        responses: data || [],
        documents: documents || []
      })
    } catch (error) {
      console.error('Error fetching application details:', error)
      toast.error('Failed to load application details')
    }
  }

  const handleViewApplication = (application: Application) => {
    setSelectedApplication(application)
    fetchApplicationDetails(application.id)
  }

  const updateApplicationStatus = async (applicationId: string, status: string, notes?: string) => {
    try {
      setUpdating(true)
      const { error } = await supabase
        .from('applications')
        .update({
          status,
          admin_notes: notes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)

      if (error) throw error

      toast.success(`Application ${status} successfully`)
      fetchApplications()
      setSelectedApplication(null)
    } catch (error) {
      console.error('Error updating application:', error)
      toast.error('Failed to update application')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'hold':
        return <Pause className="w-5 h-5 text-yellow-500" />
      default:
        return <Clock className="w-5 h-5 text-blue-500" />
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Applications</h1>
        <p className="text-gray-600">Review and manage scholarship applications</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search applications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="hold">On Hold</option>
          </select>
          <select
            value={formFilter}
            onChange={(e) => setFormFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Forms</option>
            {forms.map(form => (
              <option key={form.id} value={form.id}>{form.title}</option>
            ))}
          </select>
          <button 
            onClick={() => window.open('/admin/export', '_blank')}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Form
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredApplications.map((application) => (
                <tr key={application.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {application.users?.profiles?.full_name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {application.users?.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {application.scholarship_forms?.title}
                    </div>
                    <div className="text-sm text-gray-500">
                      {application.scholarship_forms?.education_level}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(application.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                        {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(application.submitted_at).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewApplication(application)}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-900 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredApplications.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
            <p className="text-gray-600">No applications match your current filters</p>
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Application Details
                  </h2>
                  <p className="text-gray-600">
                    {selectedApplication.users?.profiles?.full_name} - {selectedApplication.scholarship_forms?.title}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Student Info */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Student Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <p className="text-gray-900">{selectedApplication.users?.profiles?.full_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{selectedApplication.users?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-gray-900">{selectedApplication.users?.profiles?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Submitted</label>
                    <p className="text-gray-900">{new Date(selectedApplication.submitted_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Application Responses */}
              {applicationDetails && applicationDetails.responses.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Application Responses</h3>
                  <div className="space-y-4">
                    {applicationDetails.responses.map((response: any) => (
                      <div key={response.id} className="border border-gray-200 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {response.form_fields?.field_label}
                        </label>
                        <p className="text-gray-900">{response.response_value || 'No response'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              {applicationDetails?.documents?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {applicationDetails.documents.map((doc: any) => (
                      <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{doc.file_name}</p>
                            <p className="text-xs text-gray-500">{(doc.file_size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Admin Notes</h3>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Add notes about this application..."
                  defaultValue={selectedApplication.admin_notes || ''}
                  id="admin-notes"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    const notes = (document.getElementById('admin-notes') as HTMLTextAreaElement)?.value
                    updateApplicationStatus(selectedApplication.id, 'rejected', notes)
                  }}
                  disabled={updating}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{updating ? 'Updating...' : 'Reject'}</span>
                </button>
                <button
                  onClick={() => {
                    const notes = (document.getElementById('admin-notes') as HTMLTextAreaElement)?.value
                    updateApplicationStatus(selectedApplication.id, 'hold', notes)
                  }}
                  disabled={updating}
                  className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                >
                  <Pause className="w-4 h-4" />
                  <span>{updating ? 'Updating...' : 'Hold'}</span>
                </button>
                <button
                  onClick={() => {
                    const notes = (document.getElementById('admin-notes') as HTMLTextAreaElement)?.value
                    updateApplicationStatus(selectedApplication.id, 'approved', notes)
                  }}
                  disabled={updating}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{updating ? 'Updating...' : 'Approve'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ViewApplications
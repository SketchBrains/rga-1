import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../contexts/LanguageContext'
import { generateSignedUrl, generateDownloadUrl, extractFileKeyFromUrl } from '../../lib/wasabi'
import { 
  Search, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Pause,
  FileText,
  Eye,
  Download,
  Image,
  FileType,
  File,
  Award,
  TrendingUp,
  Users,
  X,
  ArrowLeft
} from 'lucide-react'
import toast from 'react-hot-toast'

const StudentDetail: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [studentDetails, setStudentDetails] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [viewingDocument, setViewingDocument] = useState<any>(null)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const { language } = useLanguage()

  // Get student ID from URL params if navigated from application view
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const studentId = urlParams.get('id')
    if (studentId) {
      fetchStudentById(studentId)
    }
  }, [])

  const searchStudents = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          users (id, email, role)
        `)
        .ilike('full_name', `%${searchTerm}%`)
        .eq('users.role', 'student')
        .limit(10)

      if (error) throw error
      setSearchResults(data || [])
    } catch (error) {
      console.error('Error searching students:', error)
      toast.error('Failed to search students')
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentById = async (studentId: string) => {
    setLoading(true)
    try {
      // Fetch student profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          users (id, email, role, created_at)
        `)
        .eq('user_id', studentId)
        .single()

      if (profileError) throw profileError

      // Fetch applications
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select(`
          *,
          scholarship_forms (title, title_hindi, education_level)
        `)
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false })

      if (appsError) throw appsError

      // Fetch documents
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select(`
          *,
          applications (
            scholarship_forms (title, title_hindi)
          ),
          form_fields (field_label, field_label_hindi)
        `)
        .eq('uploaded_by', studentId)
        .order('created_at', { ascending: false })

      if (docsError) throw docsError

      setSelectedStudent(profile)
      setStudentDetails({
        applications: applications || [],
        documents: documents || []
      })
    } catch (error) {
      console.error('Error fetching student details:', error)
      toast.error('Failed to load student details')
    } finally {
      setLoading(false)
    }
  }

  const handleStudentSelect = (student: any) => {
    fetchStudentById(student.user_id)
    setSearchResults([])
    setSearchTerm('')
  }

  const handleViewDocument = async (document: any) => {
    try {
      let viewUrl: string
      if (document.file_key) {
        viewUrl = await generateSignedUrl(document.file_key, 3600)
      } else if (document.file_url) {
        const fileKey = extractFileKeyFromUrl(document.file_url)
        viewUrl = await generateSignedUrl(fileKey, 3600)
      } else {
        throw new Error('No file key or URL available')
      }
      setDocumentUrl(viewUrl)
      setViewingDocument(document)
    } catch (error) {
      console.error('Error generating presigned URL for viewing:', error)
      toast.error('Failed to open document')
    }
  }

  const handleDownloadDocument = async (document: any) => {
    try {
      let downloadUrl: string
      if (document.file_key) {
        downloadUrl = await generateDownloadUrl(document.file_key, document.file_name, 3600)
      } else if (document.file_url) {
        const fileKey = extractFileKeyFromUrl(document.file_url)
        downloadUrl = await generateDownloadUrl(fileKey, document.file_name, 3600)
      } else {
        throw new Error('No file key or URL available')
      }

      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = document.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Download started')
    } catch (error) {
      console.error('Error downloading document:', error)
      toast.error('Failed to download document')
    }
  }

  const renderDocumentViewer = (document: any, url: string | null) => {
    if (!url) return <div className="text-gray-600 text-center">Loading document...</div>

    const fileType = document.file_type.toLowerCase()

    if (fileType.includes('pdf')) {
      return (
        <iframe
          src={url}
          className="w-full h-[500px] border border-gray-300 rounded-lg"
          title={document.file_name}
        />
      )
    } else if (fileType.includes('image') || fileType.includes('jpeg') || fileType.includes('jpg') || fileType.includes('png')) {
      return (
        <img
          src={url}
          alt={document.file_name}
          className="w-full max-h-[500px] object-contain border border-gray-300 rounded-lg"
        />
      )
    } else {
      return (
        <div className="text-gray-600 text-center p-8">
          <p className="mb-4">Preview not available for this file type</p>
          <button
            onClick={() => handleDownloadDocument(document)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            <span>Download to View</span>
          </button>
        </div>
      )
    }
  }

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase()
    if (type.includes('pdf')) {
      return <FileType className="w-5 h-5 text-red-500" />
    } else if (type.includes('image') || type.includes('jpeg') || type.includes('jpg') || type.includes('png')) {
      return <Image className="w-5 h-5 text-green-500" />
    } else if (type.includes('doc') || type.includes('docx')) {
      return <File className="w-5 h-5 text-blue-500" />
    } else {
      return <FileText className="w-5 h-5 text-gray-500" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

  const calculateStats = () => {
    if (!studentDetails?.applications) return { total: 0, approved: 0, rejected: 0, pending: 0, hold: 0 }
    
    return studentDetails.applications.reduce((acc: any, app: any) => {
      acc.total++
      acc[app.status]++
      return acc
    }, { total: 0, approved: 0, rejected: 0, pending: 0, hold: 0 })
  }

  const stats = calculateStats()

  const StatCard: React.FC<{
    title: string
    value: number
    icon: React.ComponentType<any>
    color: string
    bgColor: string
  }> = ({ title, value, icon: Icon, color, bgColor }) => (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Student Details</h1>
        </div>
        <p className="text-gray-600">Search and view detailed student information</p>
      </div>

      {/* Search Section */}
      {!selectedStudent && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search student by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchStudents()}
              className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
            <button
              onClick={searchStudents}
              disabled={loading}
              className="absolute right-2 top-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
              {searchResults.map((student) => (
                <button
                  key={student.user_id}
                  onClick={() => handleStudentSelect(student)}
                  className="w-full flex items-center space-x-3 p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-left"
                >
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{student.full_name}</p>
                    <p className="text-sm text-gray-500">{student.users?.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Student Details */}
      {selectedStudent && studentDetails && (
        <div className="space-y-6">
          {/* Student Profile Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    {selectedStudent.full_name}
                    {selectedStudent.is_verified && (
                      <CheckCircle className="w-6 h-6 text-green-500 ml-2" />
                    )}
                  </h2>
                  <p className="text-gray-600">{selectedStudent.users?.email}</p>
                  <p className="text-sm text-gray-500">
                    Member since {new Date(selectedStudent.users?.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedStudent(null)
                  setStudentDetails(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{selectedStudent.users?.email}</span>
              </div>
              {selectedStudent.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{selectedStudent.phone}</span>
                </div>
              )}
              {selectedStudent.date_of_birth && (
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {new Date(selectedStudent.date_of_birth).toLocaleDateString()}
                  </span>
                </div>
              )}
              {(selectedStudent.city || selectedStudent.state) && (
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {[selectedStudent.city, selectedStudent.state].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard
              title="Total Applications"
              value={stats.total}
              icon={FileText}
              color="text-blue-600"
              bgColor="bg-blue-100"
            />
            <StatCard
              title="Approved"
              value={stats.approved}
              icon={CheckCircle}
              color="text-green-600"
              bgColor="bg-green-100"
            />
            <StatCard
              title="Rejected"
              value={stats.rejected}
              icon={XCircle}
              color="text-red-600"
              bgColor="bg-red-100"
            />
            <StatCard
              title="Pending"
              value={stats.pending}
              icon={Clock}
              color="text-yellow-600"
              bgColor="bg-yellow-100"
            />
            <StatCard
              title="On Hold"
              value={stats.hold}
              icon={Pause}
              color="text-orange-600"
              bgColor="bg-orange-100"
            />
          </div>

          {/* Applications */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Applications</h3>
            {studentDetails.applications.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No applications submitted yet</p>
            ) : (
              <div className="space-y-4">
                {studentDetails.applications.map((application: any) => (
                  <div key={application.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {language === 'hindi' && application.scholarship_forms?.title_hindi
                            ? application.scholarship_forms.title_hindi
                            : application.scholarship_forms?.title}
                        </h4>
                        <p className="text-sm text-gray-600">{application.scholarship_forms?.education_level}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>Submitted: {new Date(application.submitted_at).toLocaleDateString()}</span>
                          {application.reviewed_at && (
                            <span>Reviewed: {new Date(application.reviewed_at).toLocaleDateString()}</span>
                          )}
                        </div>
                        {application.admin_notes && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                            <strong>Admin Notes:</strong> {application.admin_notes}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {getStatusIcon(application.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Documents</h3>
            {studentDetails.documents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No documents uploaded yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {studentDetails.documents.map((document: any) => (
                  <div key={document.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      {getFileIcon(document.file_type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{document.file_name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(document.file_size)}</p>
                      </div>
                    </div>
                    
                    {document.applications?.scholarship_forms && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-gray-700">Related to:</p>
                        <p className="text-xs text-gray-600">
                          {language === 'hindi' && document.applications.scholarship_forms.title_hindi
                            ? document.applications.scholarship_forms.title_hindi
                            : document.applications.scholarship_forms.title}
                        </p>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mb-3">
                      Uploaded: {new Date(document.created_at).toLocaleDateString()}
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDocument(document)}
                        className="flex-1 flex items-center justify-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => handleDownloadDocument(document)}
                        className="flex-1 flex items-center justify-center space-x-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">{viewingDocument.file_name}</h3>
              <button
                onClick={() => {
                  setViewingDocument(null)
                  setDocumentUrl(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4">
              {renderDocumentViewer(viewingDocument, documentUrl)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentDetail
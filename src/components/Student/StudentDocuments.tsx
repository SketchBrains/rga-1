import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Eye,
  Calendar,
  File,
  Image,
  FileType,
  Search,
  Filter
} from 'lucide-react'
import toast from 'react-hot-toast'

const StudentDocuments: React.FC = () => {
  const { user } = useAuth()
  const { documents, loadingDocuments, fetchDocuments } = useData()
  const { language, t } = useLanguage()
  
  const [filteredDocuments, setFilteredDocuments] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState('all')
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([])

  useEffect(() => {
    if (user) {
      fetchDocuments()
    }
  }, [user, fetchDocuments])

  useEffect(() => {
    filterDocuments()
  }, [documents, searchTerm, fileTypeFilter])

  const filterDocuments = () => {
    let filtered = documents

    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.applications?.scholarship_forms?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.form_fields?.field_label?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (fileTypeFilter !== 'all') {
      filtered = filtered.filter(doc => {
        const type = doc.file_type.toLowerCase()
        switch (fileTypeFilter) {
          case 'pdf':
            return type.includes('pdf')
          case 'image':
            return type.includes('image') || type.includes('jpeg') || type.includes('jpg') || type.includes('png')
          case 'document':
            return type.includes('doc') || type.includes('docx') || type.includes('txt')
          default:
            return true
        }
      })
    }

    setFilteredDocuments(filtered)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const maxSize = 5 * 1024 * 1024 // 5MB
    
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB')
      return
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]

    if (!allowedTypes.includes(file.type)) {
      toast.error('File type not supported. Please upload PDF, DOC, DOCX, or image files.')
      return
    }

    setUploadingFiles(prev => [...prev, file.name])

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      // Save document record
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          application_id: null, // For standalone uploads
          field_id: null,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user?.id
        })

      if (insertError) throw insertError

      toast.success('File uploaded successfully')
      fetchDocuments()
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error('Failed to upload file')
    } finally {
      setUploadingFiles(prev => prev.filter(name => name !== file.name))
    }
  }

  const handleDeleteDocument = async (documentId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)

      if (error) throw error

      toast.success('Document deleted successfully')
      fetchDocuments()
    } catch (error) {
      console.error('Error deleting document:', error)
      toast.error('Failed to delete document')
    }
  }

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase()
    if (type.includes('pdf')) {
      return <FileType className="w-8 h-8 text-red-500" />
    } else if (type.includes('image') || type.includes('jpeg') || type.includes('jpg') || type.includes('png')) {
      return <Image className="w-8 h-8 text-green-500" />
    } else if (type.includes('doc') || type.includes('docx')) {
      return <File className="w-8 h-8 text-blue-500" />
    } else {
      return <FileText className="w-8 h-8 text-gray-500" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loadingDocuments && documents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Documents</h1>
          <p className="text-gray-600">Manage your uploaded documents and files</p>
        </div>
        <div className="relative">
          <input
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />
          <label
            htmlFor="file-upload"
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={fileTypeFilter}
            onChange={(e) => setFileTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All File Types</option>
            <option value="pdf">PDF Documents</option>
            <option value="image">Images</option>
            <option value="document">Word Documents</option>
          </select>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Uploading Files</h3>
          {uploadingFiles.map((fileName) => (
            <div key={fileName} className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-800">{fileName}</span>
            </div>
          ))}
        </div>
      )}

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {documents.length === 0 ? 'No documents uploaded' : 'No documents match your search'}
          </h3>
          <p className="text-gray-600 mb-4">
            {documents.length === 0 
              ? 'Upload your first document to get started' 
              : 'Try adjusting your search or filter criteria'}
          </p>
          {documents.length === 0 && (
            <label
              htmlFor="file-upload"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Your First Document</span>
            </label>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((document) => (
            <div
              key={document.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getFileIcon(document.file_type)}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {document.file_name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(document.file_size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteDocument(document.id, document.file_name)}
                  className="p-1 text-red-500 hover:text-red-700"
                  title="Delete document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Document Info */}
              <div className="space-y-2 mb-4">
                {document.applications?.scholarship_forms && (
                  <div>
                    <p className="text-xs font-medium text-gray-700">Related to:</p>
                    <p className="text-xs text-gray-600">
                      {language === 'hindi' && document.applications.scholarship_forms.title_hindi
                        ? document.applications.scholarship_forms.title_hindi
                        : document.applications.scholarship_forms.title}
                    </p>
                  </div>
                )}
                {document.form_fields && (
                  <div>
                    <p className="text-xs font-medium text-gray-700">Field:</p>
                    <p className="text-xs text-gray-600">
                      {language === 'hindi' && document.form_fields.field_label_hindi
                        ? document.form_fields.field_label_hindi
                        : document.form_fields.field_label}
                    </p>
                  </div>
                )}
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span>Uploaded: {new Date(document.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <a
                  href={document.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  <Eye className="w-4 h-4" />
                  <span>View</span>
                </a>
                <a
                  href={document.file_url}
                  download={document.file_name}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File Upload Guidelines */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Upload Guidelines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Supported File Types:</h4>
            <ul className="space-y-1">
              <li>• PDF documents (.pdf)</li>
              <li>• Word documents (.doc, .docx)</li>
              <li>• Images (.jpg, .jpeg, .png)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Requirements:</h4>
            <ul className="space-y-1">
              <li>• Maximum file size: 5MB</li>
              <li>• Clear and readable documents</li>
              <li>• Original or certified copies preferred</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentDocuments
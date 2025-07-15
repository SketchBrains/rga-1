import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext' // Keep for t()
import { User, Profile } from '../../lib/supabase' // Import User and Profile types
import { 
  FileText, 
  Image, 
  File, 
  FileType, 
  Search, 
  Filter, 
  Check,
  X,
  Calendar,
  Download,
  Eye
} from 'lucide-react'

interface FileLibraryProps {
  onSelectFile: (file: any) => void
  onClose: () => void
  selectedFiles?: string[]
  multiSelect?: boolean;
  currentUser: User | null; // Pass currentUser as prop
  currentProfile: Profile | null; // Pass currentProfile as prop
}

const FileLibrary: React.FC<FileLibraryProps> = ({ 
  currentUser,
  currentProfile,
  onSelectFile, 
  onClose, 
  selectedFiles = [], 
  multiSelect = false 
}) => {
  const { user } = useAuth()
  const { language } = useLanguage()
  const [documents, setDocuments] = useState<any[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState('all')
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>(selectedFiles)

  const { getSession } = useAuth(); // Use getSession for on-demand fetching

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    fetchDocuments()
  }, [currentUser]) // Re-run when currentUser changes
  
  useEffect(() => {
    filterDocuments()
  }, [documents, searchTerm, fileTypeFilter])

  const fetchDocuments = async () => {
    if (!user) return

    const { user: sessionUser } = await getSession();
    if (!sessionUser) {
      console.error('Unauthorized access to fetch documents');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          applications (
            scholarship_forms (title, title_hindi) // Keep this for related form info
          ),
          form_fields (field_label, field_label_hindi)
        `)
        .eq('uploaded_by', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const handleFileSelect = (file: any) => {
    if (multiSelect) {
      const newSelectedIds = selectedFileIds.includes(file.id)
        ? selectedFileIds.filter(id => id !== file.id)
        : [...selectedFileIds, file.id]
      setSelectedFileIds(newSelectedIds)
    } else {
      onSelectFile(file)
    }
  }

  const handleConfirmSelection = () => {
    if (multiSelect) {
      const selectedFiles = documents.filter(doc => selectedFileIds.includes(doc.id))
      selectedFiles.forEach(file => onSelectFile(file))
    }
    onClose()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4">Loading your files...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">File Library</h2>
              <p className="text-gray-600">Select from your previously uploaded files</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search files..."
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

        {/* File Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {documents.length === 0 ? 'No files uploaded' : 'No files match your search'}
              </h3>
              <p className="text-gray-600">
                {documents.length === 0 
                  ? 'Upload your first file to get started' 
                  : 'Try adjusting your search or filter criteria'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDocuments.map((document) => (
                <div
                  key={document.id}
                  className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedFileIds.includes(document.id) 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleFileSelect(document)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {getFileIcon(document.file_type)}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {document.file_name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(document.file_size)}
                        </p>
                      </div>
                    </div>
                    {selectedFileIds.includes(document.id) && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Document Info */}
                  <div className="space-y-1 mb-3">
                    {document.applications?.scholarship_forms && (
                      <div>
                        <p className="text-xs font-medium text-gray-700">Related to:</p>
                        <p className="text-xs text-gray-600 truncate">
                          {language === 'hindi' && document.applications.scholarship_forms.title_hindi
                            ? document.applications.scholarship_forms.title_hindi
                            : document.applications.scholarship_forms.title}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(document.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // Generate signed URL for viewing
                        const handleView = async () => {
                          try {
                            const { generateSignedUrl, extractFileKeyFromUrl } = await import('../../lib/wasabi')
                            const fileKey = extractFileKeyFromUrl(document.file_url)
                            const viewUrl = await generateSignedUrl(fileKey, 3600)
                            window.open(viewUrl, '_blank')
                          } catch (error) {
                            console.warn('Could not generate signed URL, using direct URL:', error)
                            window.open(document.file_url, '_blank')
                          }
                        }
                        handleView()
                      }}
                      className="flex-1 flex items-center justify-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // Generate signed download URL
                        const handleDownload = async () => {
                          try {
                            const { generateDownloadUrl, extractFileKeyFromUrl } = await import('../../lib/wasabi')
                            const fileKey = extractFileKeyFromUrl(document.file_url)
                            const downloadUrl = await generateDownloadUrl(fileKey, document.file_name, 3600)
                            const link = document.createElement('a')
                            link.href = downloadUrl
                            link.download = document.file_name
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                          } catch (error) {
                            console.warn('Could not generate download URL, using direct URL:', error)
                            const link = document.createElement('a')
                            link.href = document.file_url
                            link.download = document.file_name
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                          }
                        }
                        handleDownload()
                      }}
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

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {multiSelect && selectedFileIds.length > 0 
                ? `${selectedFileIds.length} file${selectedFileIds.length > 1 ? 's' : ''} selected`
                : 'Click on a file to select it'}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              {multiSelect && (
                <button
                  onClick={handleConfirmSelection}
                  disabled={selectedFileIds.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Select Files ({selectedFileIds.length})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FileLibrary
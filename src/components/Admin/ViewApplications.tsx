import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { generateSignedUrl, generateDownloadUrl, extractFileKeyFromUrl } from '../../lib/wasabi';
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
  AlertCircle,
  X,
  ExternalLink,
  Image,
  FileType,
  File
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Application {
  id: string;
  form_id: string;
  student_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'hold';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  admin_notes?: string;
  scholarship_forms: {
    title: string;
    education_level: string;
  };
  users: {
    email: string;
    profiles: {
      full_name: string;
      phone?: string;
      is_verified?: boolean;
    };
  };
}

// Utility function to sanitize text content
const sanitizeText = (text: string): string => {
  // Basic XSS prevention - remove potentially dangerous characters
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

const ViewApplications: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [applicationDetails, setApplicationDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formFilter, setFormFilter] = useState('all');
  const [forms, setForms] = useState<any[]>([]);
  const [viewingDocument, setViewingDocument] = useState<any>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    fetchApplications();
    fetchForms();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, statusFilter, formFilter]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          scholarship_forms (title, education_level),
          users (
            email,
            profiles (full_name, phone, is_verified)
          )
        `)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from('scholarship_forms')
        .select('id, title')
        .order('title');

      if (error) throw error;
      setForms(data || []);
    } catch (error) {
      console.error('Error fetching forms:', error);
    }
  };

  const filterApplications = () => {
    let filtered = applications;

    if (searchTerm) {
      filtered = filtered.filter(
        (app) =>
          app.users?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.scholarship_forms?.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    if (formFilter !== 'all') {
      filtered = filtered.filter((app) => app.form_id === formFilter);
    }

    setFilteredApplications(filtered);
  };

  const fetchApplicationDetails = async (applicationId: string) => {
    try {
      const { data: responses, error: responsesError } = await supabase
        .from('application_responses')
        .select(`
          *,
          form_fields (field_label, field_label_hindi, field_type)
        `)
        .eq('application_id', applicationId);

      if (responsesError) throw responsesError;

      const { data: documents, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', applicationId);

      if (documentsError) throw documentsError;

      setApplicationDetails({
        responses: responses || [],
        documents: documents || [],
      });
    } catch (error) {
      console.error('Error fetching application details:', error);
      toast.error('Failed to load application details');
    }
  };

  const handleViewApplication = (application: Application) => {
    setSelectedApplication(application);
    fetchApplicationDetails(application.id);
  };

  const handleViewDocument = async (document: any) => {
    try {
      let viewUrl: string;
      if (document.file_key) {
        viewUrl = await generateSignedUrl(document.file_key, 3600);
      } else if (document.file_url) {
        const fileKey = extractFileKeyFromUrl(document.file_url);
        viewUrl = await generateSignedUrl(fileKey, 3600);
      } else {
        throw new Error('No file key or URL available');
      }
      setDocumentUrl(viewUrl);
      setViewingDocument(document);
    } catch (error) {
      console.error('Error generating presigned URL for viewing:', error);
      toast.error('Failed to open document');
    }
  };

  const handleDownloadDocument = async (document: any) => {
    try {
      let downloadUrl: string;
      if (document.file_key) {
        downloadUrl = await generateDownloadUrl(document.file_key, document.file_name, 3600);
      } else if (document.file_url) {
        const fileKey = extractFileKeyFromUrl(document.file_url);
        downloadUrl = await generateDownloadUrl(fileKey, document.file_name, 3600);
      } else {
        throw new Error('No file key or URL available');
      }

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = document.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const handleViewStudentProfile = (studentId: string) => {
    // Navigate to student detail page
    window.open(`/admin/student-detail?id=${studentId}`, '_blank');
  };

  const renderDocumentViewer = (document: any, url: string | null) => {
    if (!url) return <div className="text-gray-600 text-center">Loading document...</div>;

    const fileType = document.file_type.toLowerCase();

    if (fileType.includes('pdf')) {
      return (
        <iframe
          src={url}
          className="w-full h-[500px] border border-gray-300 rounded-lg"
          title={document.file_name}
        />
      );
    } else if (fileType.includes('image') || fileType.includes('jpeg') || fileType.includes('jpg') || fileType.includes('png')) {
      return (
        <img
          src={url}
          alt={document.file_name}
          className="w-full max-h-[500px] object-contain border border-gray-300 rounded-lg"
        />
      );
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
      );
    }
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) {
      return <FileType className="w-5 h-5 text-red-500" />;
    } else if (type.includes('image') || type.includes('jpeg') || type.includes('jpg') || type.includes('png')) {
      return <Image className="w-5 h-5 text-green-500" />;
    } else if (type.includes('doc') || type.includes('docx')) {
      return <File className="w-5 h-5 text-blue-500" />;
    } else {
      return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const updateApplicationStatus = async (applicationId: string, status: string, notes?: string) => {
    try {
      setUpdating(true);

      const currentApplication = applications.find((app) => app.id === applicationId);
      if (!currentApplication) {
        throw new Error('Application not found');
      }

      const { error } = await supabase
        .from('applications')
        .update({
          status,
          admin_notes: notes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      if (error) throw error;

      if (status === 'approved') {
        console.log('🎉 Application approved, marking student as verified...');
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            is_verified: true,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', currentApplication.student_id);

        if (profileError) {
          console.error('❌ Error updating profile verification:', profileError);
        } else {
          console.log('✅ Student profile marked as verified');
        }
      }

      toast.success(`Application ${status} successfully`);
      await fetchApplications();
      setSelectedApplication(null);
    } catch (error) {
      console.error('Error updating application:', error);
      toast.error('Failed to update application');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'hold':
        return <Pause className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'hold':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
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
            {forms.map((form) => (
              <option key={form.id} value={form.id}>
                {form.title}
              </option>
            ))}
          </select>
          <button
            onClick={() => window.open('/admin/export', '_blank')}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
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
                        <div className="text-sm font-medium text-gray-900 flex items-center">
                          {application.users?.profiles?.full_name || 'N/A'}
                          {application.users?.profiles?.is_verified && (
                            <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{application.users?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{application.scholarship_forms?.title}</div>
                    <div className="text-sm text-gray-500">{application.scholarship_forms?.education_level}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(application.status)}
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}
                      >
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
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Application Details</h2>
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-600">
                      {selectedApplication.users?.profiles?.full_name} -{' '}
                      {selectedApplication.scholarship_forms?.title}
                    </p>
                    {selectedApplication.users?.profiles?.is_verified && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified Student
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewStudentProfile(selectedApplication.student_id)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View Complete Profile</span>
                  </button>
                  <button
                    onClick={() => setSelectedApplication(null)}
                    className="text-gray-400 hover:text-gray-600 p-2"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Uploaded Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {applicationDetails.documents.map((doc: any) => (
                      <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          {getFileIcon(doc.file_type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(doc.file_size)}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewDocument(doc)}
                            className="flex-1 flex items-center justify-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => handleDownloadDocument(doc)}
                            className="flex-1 flex items-center justify-center space-x-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </button>
                        </div>
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
                  id="admin-notes"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    const notes = (document.getElementById('admin-notes') as HTMLTextAreaElement)?.value;
                    updateApplicationStatus(selectedApplication.id, 'rejected', notes);
                  }}
                  disabled={updating}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{updating ? 'Updating...' : 'Reject'}</span>
                </button>
                <button
                  onClick={() => {
                    const notes = (document.getElementById('admin-notes') as HTMLTextAreaElement)?.value;
                    updateApplicationStatus(selectedApplication.id, 'hold', notes);
                  }}
                  disabled={updating}
                  className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                >
                  <Pause className="w-4 h-4" />
                  <span>{updating ? 'Updating...' : 'Hold'}</span>
                </button>
                <button
                  onClick={() => {
                    const notes = (document.getElementById('admin-notes') as HTMLTextAreaElement)?.value;
                    updateApplicationStatus(selectedApplication.id, 'approved', notes);
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

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">{viewingDocument.file_name}</h3>
              <button
                onClick={() => {
                  setViewingDocument(null);
                  setDocumentUrl(null);
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
  );
};

export default ViewApplications;
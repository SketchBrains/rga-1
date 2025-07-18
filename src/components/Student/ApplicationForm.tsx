import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { User, Profile } from '../../lib/supabase'; // Import User and Profile types
import { Session } from '@supabase/supabase-js'; // Import Session type
import { uploadToWasabi } from '../../lib/wasabi';
import FileLibrary from './FileLibrary';
import {
  ArrowLeft,
  Save,
  Send,
  Upload,
  X,
  FileText,
  AlertCircle,
  CheckCircle,
  Calendar,
  Mail,
  Phone,
  Hash,
  Type,
  List,
  AlignLeft,
  FolderOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ApplicationFormProps {
  form: any;
  onBack: () => void;
  onSuccess: (applicationId: string) => void; // Pass application ID on success
  currentUser: User | null;
  currentProfile: Profile | null;
}

interface FormResponse {
  [fieldId: string]: string | File | null;
}

const ApplicationForm: React.FC<ApplicationFormProps> = ({
  form,
  onBack,
  onSuccess,
  currentUser,
  currentProfile,
}) => {
  const { getSession } = useAuth(); // Use getSession for on-demand fetching
  // Use currentUser and currentProfile from props
  const user = currentUser;
  const profile = currentProfile;

  const { language } = useLanguage();

  const [formFields, setFormFields] = useState<any[]>([]);
  const [responses, setResponses] = useState<FormResponse>({});
  const [uploadedFiles, setUploadedFiles] = useState<{ [fieldId: string]: string }>({});
  const [selectedExistingFiles, setSelectedExistingFiles] = useState<{ [fieldId: string]: any }>({});
  const [showFileLibrary, setShowFileLibrary] = useState(false);
  const [currentFileFieldId, setCurrentFileFieldId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ [fieldId: string]: string }>({});

  useEffect(() => {
    if (!user) {
      toast.error('User not authenticated. Please log in.');
      onBack(); // Go back if no user
      return;
    }
    fetchFormFields();
  }, [form.id, user, onBack]);

  const fetchFormFields = async () => {
    try {
      // Ensure session is valid before fetching
      const { session } = await getSession();
      if (!session) {
        toast.error('Session expired. Please log in again.');
        onBack();
        return;
      }

      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', form.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      setFormFields(data || []);

      // Initialize responses with empty values
      const initialResponses: FormResponse = {};
      data?.forEach((field) => {
        initialResponses[field.id] = '';
      });
      setResponses(initialResponses);
    } catch (error) {
      console.error('Error fetching form fields:', error);
      toast.error('Failed to load form fields');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldId: string, value: string | File) => {
    setResponses((prev) => ({
      ...prev,
      [fieldId]: value,
    }));

    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors((prev) => ({
        ...prev,
        [fieldId]: '',
      }));
    }
  };

  const handleFileUpload = async (fieldId: string, file: File) => {
    try {
      const maxSize = 50 * 1024 * 1024; // 50MB for Wasabi
      if (file.size > maxSize) {
        toast.error('File size must be less than 50MB');
        return;
      }

      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error('File type not supported. Please upload PDF, DOC, DOCX, images, or text files.');
        return;
      }

      // Upload file to Wasabi
      const { fileKey } = await uploadToWasabi(file, user?.id || '');

      setUploadedFiles((prev) => ({
        ...prev,
        [fieldId]: fileKey,
      }));

      handleInputChange(fieldId, file);
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Error uploading file to Wasabi:', error);
      toast.error('Failed to upload file');
    }
  };

  const handleSelectExistingFile = (document: any) => {
    if (!currentFileFieldId) return;

    // Store the selected document metadata
    setSelectedExistingFiles((prev) => ({
      ...prev,
      [currentFileFieldId]: document,
    }));

    // Update the response with the file URL
    handleInputChange(currentFileFieldId, document.file_url);

    // Close the file library
    setShowFileLibrary(false);
    setCurrentFileFieldId(null);

    toast.success('File selected from library');
  };

  const handleOpenFileLibrary = (fieldId: string) => {
    setCurrentFileFieldId(fieldId);
    setShowFileLibrary(true);
  };

  const validateForm = (): boolean => {
    const newErrors: { [fieldId: string]: string } = {};
    let isValid = true;

    formFields.forEach((field) => {
      if (field.is_required) {
        const value = responses[field.id];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          newErrors[field.id] = `${field.field_label} is required`;
          isValid = false;
        }
      }

      // Additional validation based on field type
      const value = responses[field.id] as string;
      if (value && typeof value === 'string') {
        switch (field.field_type) {
          case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              newErrors[field.id] = 'Please enter a valid email address';
              isValid = false;
            }
            break;
          case 'phone':
            const phoneRegex = /^[0-9]{10}$/;
            if (!phoneRegex.test(value.replace(/\D/g, ''))) {
              newErrors[field.id] = 'Please enter a valid 10-digit phone number';
              isValid = false;
            }
            break;
          case 'number':
            if (isNaN(Number(value))) {
              newErrors[field.id] = 'Please enter a valid number';
              isValid = false;
            }
            break;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const submitApplication = async () => {
    const { session, user: sessionUser, profile: sessionProfile } = await getSession();
    if (!session || !sessionUser || !sessionProfile) {
      toast.error('Session expired. Please log in again.');
      onBack();
      return;
    }

    if (!sessionProfile.full_name || !sessionProfile.phone) {
      toast.error('Please complete your profile first. Go to your profile settings to add required information.');
      return;
    }

    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly. Check for any highlighted errors above.');
      return;
    }

    setSubmitting(true);
    try {
      // Create application
      const { data: application, error: appError } = await supabase
        .from('applications')
        .insert({
          form_id: form.id,
          student_id: sessionUser.id,
          status: 'pending',
        })
        .select()
        .single();

      if (appError) {
        console.error('Supabase application insert error:', appError);
        if (appError.message.includes('duplicate key')) {
          throw new Error('You have already submitted an application for this scholarship.');
        } else if (appError.message.includes('foreign key')) {
          throw new Error('Invalid form or user data. Please refresh the page and try again.');
        }
        throw appError;
      }

      // Save responses
      const responsesToSave = Object.entries(responses)
        .filter(([_, value]) => value && value !== '')
        .map(([fieldId, value]) => ({
          application_id: application.id,
          field_id: fieldId,
          response_value: typeof value === 'string' ? value : (value ? value.name : ''),
        }));

      if (responsesToSave.length > 0) {
        const { error: responseError } = await supabase
          .from('application_responses')
          .insert(responsesToSave);

        if (responseError) {
          console.error('Supabase response insert error:', responseError);
          throw responseError;
        }
      }

      // Save uploaded files
      const filesToSave = Object.entries(uploadedFiles).map(([fieldId, fileUrl]) => ({
        application_id: application.id,
        field_id: fieldId,
        file_name: (responses[fieldId] as File)?.name || 'uploaded_file',
        file_url: fileUrl,
        file_type: (responses[fieldId] as File)?.type || 'application/octet-stream',
        file_size: (responses[fieldId] as File)?.size || 0,
        uploaded_by: sessionUser.id,
      }));

      if (filesToSave.length > 0) {
        const { error: fileError } = await supabase
          .from('documents')
          .insert(filesToSave);

        if (fileError) {
          console.error('Supabase document insert error:', fileError);
          toast.error(`Failed to save documents: ${fileError.message}. Your application was submitted but some files may not have been saved properly.`);
          throw fileError;
        }
      }

      toast.success('Application submitted successfully! You will receive email updates about your application status.');
      onSuccess(application.id);
    } catch (error) {
      console.error('Error submitting application:', error);
      let errorMessage = 'Failed to submit application';
      if (error instanceof Error) {
        const errMsg = error.message;
        if (errMsg.includes('duplicate key') || errMsg.includes('already submitted')) {
          errorMessage = 'You have already submitted an application for this scholarship.';
        } else if (errMsg.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (errMsg.includes('permission')) {
          errorMessage = 'You do not have permission to submit this application. Please contact support.';
        } else {
          errorMessage = errMsg;
        }
      }
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const saveAsDraft = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): Promise<void> => {
    event.preventDefault();

    const { session, user: sessionUser, profile: sessionProfile } = await getSession();
    if (!session || !sessionUser || !sessionProfile) {
      toast.error('Session expired. Please log in again.');
      onBack();
      return;
    }

    if (!sessionProfile.full_name || !sessionProfile.phone) {
      toast.error('Please complete your profile first. Go to your profile settings to add required information.');
      return;
    }

    setSaving(true);
    try {
      // Check if a draft already exists
      const { data: existingDraft, error: fetchError } = await supabase
        .from('applications')
        .select('*')
        .eq('form_id', form.id)
        .eq('student_id', sessionUser.id)
        .eq('status', 'draft')
        .single();

      let applicationId: string;

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingDraft) {
        // Update the draft application
        const { error: updateError } = await supabase
          .from('applications')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', existingDraft.id);

        if (updateError) throw updateError;
        applicationId = existingDraft.id;
      } else {
        // Insert a new draft application
        const { data: newDraft, error: insertError } = await supabase
          .from('applications')
          .insert({
            form_id: form.id,
            student_id: sessionUser.id,
            status: 'draft',
          })
          .select()
          .single();

        if (insertError) throw insertError;
        applicationId = newDraft.id;
      }

      // Upsert responses for the draft
      const responsesToSave = Object.entries(responses)
        .filter(([_, value]) => value && value !== '')
        .map(([fieldId, value]) => ({
          application_id: applicationId,
          field_id: fieldId,
          response_value: typeof value === 'string' ? value : (value ? value.name : ''),
        }));

      if (responsesToSave.length > 0) {
        // Delete previous responses for this draft
        await supabase
          .from('application_responses')
          .delete()
          .eq('application_id', applicationId);

        // Insert new responses
        const { error: responseError } = await supabase
          .from('application_responses')
          .insert(responsesToSave);

        if (responseError) throw responseError;
      }

      // Save uploaded files for the draft
      const filesToSave = Object.entries(uploadedFiles).map(([fieldId, fileUrl]) => ({
        application_id: applicationId,
        field_id: fieldId,
        file_name: (responses[fieldId] as File)?.name || 'uploaded_file',
        file_url: fileUrl,
        file_type: (responses[fieldId] as File)?.type || 'application/octet-stream',
        file_size: (responses[fieldId] as File)?.size || 0,
        uploaded_by: sessionUser.id,
      }));

      if (filesToSave.length > 0) {
        // Delete previous files for this draft
        await supabase
          .from('documents')
          .delete()
          .eq('application_id', applicationId);

        // Insert new files
        const { error: fileError } = await supabase
          .from('documents')
          .insert(filesToSave);

        if (fileError) throw fileError;
      }

      toast.success('Draft saved successfully!');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'text':
        return <Type className="w-4 h-4" />;
      case 'number':
        return <Hash className="w-4 h-4" />;
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'phone':
        return <Phone className="w-4 h-4" />;
      case 'date':
        return <Calendar className="w-4 h-4" />;
      case 'file':
        return <FileText className="w-4 h-4" />;
      case 'select':
        return <List className="w-4 h-4" />;
      case 'textarea':
        return <AlignLeft className="w-4 h-4" />;
      default:
        return <Type className="w-4 h-4" />;
    }
  };

  const renderField = (field: any) => {
    const fieldLabel = language === 'hindi' && field.field_label_hindi ? field.field_label_hindi : field.field_label;
    const value = responses[field.id] || '';
    const error = errors[field.id];

    const baseInputClasses = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
      error ? 'border-red-500' : 'border-gray-300'
    }`;

    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <input
            type={field.field_type === 'email' ? 'email' : field.field_type === 'phone' ? 'tel' : 'text'}
            value={value as string}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={baseInputClasses}
            placeholder={`Enter ${fieldLabel.toLowerCase()}`}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value as string}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={baseInputClasses}
            placeholder={`Enter ${fieldLabel.toLowerCase()}`}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value as string}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={baseInputClasses}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value as string}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={baseInputClasses}
            rows={4}
            placeholder={`Enter ${fieldLabel.toLowerCase()}`}
          />
        );

      case 'select':
        return (
          <select
            value={value as string}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={baseInputClasses}
          >
            <option value="">Select {fieldLabel.toLowerCase()}</option>
            {field.field_options?.map((option: string, index: number) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'file':
        return (
          <div>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileUpload(field.id, file);
                }
              }}
              className="hidden"
              id={`file-${field.id}`}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.txt"
            />
            <label
              htmlFor={`file-${field.id}`}
              className={`flex items-center justify-center space-x-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600">
                {uploadedFiles[field.id] ? 'File uploaded' : `Upload ${fieldLabel.toLowerCase()}`}
              </span>
            </label>
            {uploadedFiles[field.id] && (
              <div className="mt-2 flex items-center space-x-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>File uploaded successfully</span>
              </div>
            )}
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value as string}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={baseInputClasses}
            placeholder={`Enter ${fieldLabel.toLowerCase()}`}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const title = language === 'hindi' && form.title_hindi ? form.title_hindi : form.title;
  const description = language === 'hindi' && form.description_hindi ? form.description_hindi : form.description;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Applications</span>
          </button>
        </div>

        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-gray-600 mb-4">{form.education_level}</p>
          {description && (
            <p className="text-gray-700 max-w-2xl mx-auto">{description}</p>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-6">
          {formFields.map((field) => {
            const fieldLabel = language === 'hindi' && field.field_label_hindi ? field.field_label_hindi : field.field_label;
            const error = errors[field.id];

            return (
              <div key={field.id} className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  {getFieldIcon(field.field_type)}
                  <span>
                    {fieldLabel}
                    {field.is_required && <span className="text-red-500 ml-1">*</span>}
                  </span>
                </label>

                {renderField(field)}

                {error && (
                  <div className="flex items-center space-x-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 sm:space-x-4 mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <AlertCircle className="w-4 h-4" />
            <span>All fields marked with * are required</span>
          </div>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
            <button
              onClick={saveAsDraft}
              disabled={saving || submitting}
              className="flex items-center justify-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save as Draft'}</span>
            </button>

            <button
              onClick={submitApplication}
              disabled={saving || submitting}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg hover:from-blue-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting...' : 'Submit Application'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* File Library Modal */}
      {showFileLibrary && (
        <FileLibrary
          onSelectFile={handleSelectExistingFile}
          onClose={() => {
            setShowFileLibrary(false);
            setCurrentFileFieldId(null);
          }}
        />
      )}
    </div>
  );
};

export default ApplicationForm;
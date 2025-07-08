import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  GripVertical,
  Type,
  Hash,
  Mail,
  Phone,
  Calendar,
  FileText,
  List,
  AlignLeft,
  Eye,
  EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'

interface FormField {
  id?: string
  field_name: string
  field_label: string
  field_label_hindi: string
  field_type: string
  field_options?: string[]
  is_required: boolean
  validation_rules?: any
  sort_order: number
}

interface ScholarshipForm {
  id?: string
  title: string
  title_hindi: string
  description: string
  description_hindi: string
  education_level: string
  is_active: boolean
  fields: FormField[]
}

const CreateEditForms: React.FC = () => {
  const [forms, setForms] = useState<any[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [editingForm, setEditingForm] = useState<ScholarshipForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const { t } = useLanguage()

  const [formData, setFormData] = useState<ScholarshipForm>({
    title: '',
    title_hindi: '',
    description: '',
    description_hindi: '',
    education_level: '',
    is_active: true,
    fields: []
  })

  const fieldTypes = [
    { value: 'text', label: 'Text', icon: Type },
    { value: 'number', label: 'Number', icon: Hash },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'phone', label: 'Phone', icon: Phone },
    { value: 'date', label: 'Date', icon: Calendar },
    { value: 'file', label: 'File Upload', icon: FileText },
    { value: 'select', label: 'Dropdown', icon: List },
    { value: 'textarea', label: 'Long Text', icon: AlignLeft }
  ]

  const educationLevels = [
    'High School',
    'Intermediate',
    'Undergraduate',
    'Postgraduate',
    'Diploma',
    'Professional Course'
  ]

  useEffect(() => {
    fetchForms()
  }, [])

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from('scholarship_forms')
        .select(`
          *,
          form_fields (*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setForms(data || [])
    } catch (error) {
      console.error('Error fetching forms:', error)
      toast.error('Failed to load forms')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateForm = () => {
    setIsCreating(true)
    setEditingForm(null)
    setFormData({
      title: '',
      title_hindi: '',
      description: '',
      description_hindi: '',
      education_level: '',
      is_active: true,
      fields: []
    })
  }

  const handleEditForm = (form: any) => {
    setEditingForm(form)
    setIsCreating(true)
    setFormData({
      ...form,
      fields: (form.form_fields || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    })
  }

  const addField = () => {
    const newField: FormField = {
      field_name: `field_${formData.fields.length + 1}`,
      field_label: '',
      field_label_hindi: '',
      field_type: 'text',
      is_required: false,
      sort_order: formData.fields.length
    }
    setFormData({
      ...formData,
      fields: [...formData.fields, newField]
    })
  }

  const updateField = (index: number, field: Partial<FormField>) => {
    const updatedFields = [...formData.fields]
    updatedFields[index] = { ...updatedFields[index], ...field }
    
    // Auto-generate field_name from field_label if field_name is empty
    if (field.field_label && !updatedFields[index].field_name) {
      updatedFields[index].field_name = field.field_label
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
    }
    
    setFormData({ ...formData, fields: updatedFields })
  }

  const removeField = (index: number) => {
    const updatedFields = formData.fields.filter((_, i) => i !== index)
    // Update sort_order for remaining fields
    updatedFields.forEach((field, i) => {
      field.sort_order = i
    })
    setFormData({ ...formData, fields: updatedFields })
  }

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...formData.fields]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (targetIndex >= 0 && targetIndex < newFields.length) {
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]]
      // Update sort_order
      newFields.forEach((field, i) => {
        field.sort_order = i
      })
      setFormData({ ...formData, fields: newFields })
    }
  }

  const handleSaveForm = async () => {
    try {
      if (!formData.title || !formData.education_level) {
        toast.error('Please fill in required fields')
        return
      }

      if (formData.fields.length === 0) {
        toast.error('Please add at least one form field')
        return
      }

      // Validate fields
      for (const field of formData.fields) {
        if (!field.field_label || !field.field_name) {
          toast.error('All fields must have a label and name')
          return
        }
      }

      setSaving(true)
      let formId = editingForm?.id

      if (editingForm) {
        // Update existing form
        const { error } = await supabase
          .from('scholarship_forms')
          .update({
            title: formData.title,
            title_hindi: formData.title_hindi || null,
            description: formData.description || null,
            description_hindi: formData.description_hindi || null,
            education_level: formData.education_level,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingForm.id)

        if (error) throw error

        // Delete existing fields
        await supabase
          .from('form_fields')
          .delete()
          .eq('form_id', editingForm.id)
      } else {
        // Create new form
        const { data, error } = await supabase
          .from('scholarship_forms')
          .insert({
            title: formData.title,
            title_hindi: formData.title_hindi || null,
            description: formData.description || null,
            description_hindi: formData.description_hindi || null,
            education_level: formData.education_level,
            is_active: formData.is_active,
            created_by: user?.id
          })
          .select()
          .single()

        if (error) throw error
        formId = data.id
      }

      // Insert new fields
      if (formData.fields.length > 0) {
        const fieldsToInsert = formData.fields.map((field, index) => ({
          form_id: formId,
          field_name: field.field_name,
          field_label: field.field_label,
          field_label_hindi: field.field_label_hindi || null,
          field_type: field.field_type,
          field_options: field.field_options ? field.field_options : null,
          is_required: field.is_required,
          validation_rules: field.validation_rules || null,
          sort_order: index
        }))

        const { error: fieldsError } = await supabase
          .from('form_fields')
          .insert(fieldsToInsert)

        if (fieldsError) throw fieldsError
      }

      toast.success(editingForm ? 'Form updated successfully' : 'Form created successfully')
      setIsCreating(false)
      setEditingForm(null)
      fetchForms()
    } catch (error) {
      console.error('Error saving form:', error)
      toast.error('Failed to save form')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This will also delete all associated applications.')) return

    try {
      const { error } = await supabase
        .from('scholarship_forms')
        .delete()
        .eq('id', formId)

      if (error) throw error
      toast.success('Form deleted successfully')
      fetchForms()
    } catch (error) {
      console.error('Error deleting form:', error)
      toast.error('Failed to delete form')
    }
  }

  const toggleFormStatus = async (formId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('scholarship_forms')
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', formId)

      if (error) throw error
      toast.success(`Form ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      fetchForms()
    } catch (error) {
      console.error('Error updating form status:', error)
      toast.error('Failed to update form status')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isCreating) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {editingForm ? 'Edit Form' : 'Create New Form'}
            </h2>
            <button
              onClick={() => setIsCreating(false)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Form Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Form Title (English) *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter form title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Form Title (Hindi)
                </label>
                <input
                  type="text"
                  value={formData.title_hindi}
                  onChange={(e) => setFormData({ ...formData, title_hindi: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="फॉर्म का शीर्षक"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (English)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter form description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Hindi)
                </label>
                <textarea
                  value={formData.description_hindi}
                  onChange={(e) => setFormData({ ...formData, description_hindi: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="फॉर्म का विवरण"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Education Level *
                </label>
                <select
                  value={formData.education_level}
                  onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select education level</option>
                  {educationLevels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Form Fields</h3>
                <button
                  onClick={addField}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Field</span>
                </button>
              </div>

              <div className="space-y-4">
                {formData.fields.map((field, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Field {index + 1}</span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => moveField(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveField(index, 'down')}
                            disabled={index === formData.fields.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => removeField(index)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Field Name *
                        </label>
                        <input
                          type="text"
                          value={field.field_name}
                          onChange={(e) => updateField(index, { field_name: e.target.value })}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          placeholder="field_name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Label (English) *
                        </label>
                        <input
                          type="text"
                          value={field.field_label}
                          onChange={(e) => updateField(index, { field_label: e.target.value })}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          placeholder="Field Label"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Label (Hindi)
                        </label>
                        <input
                          type="text"
                          value={field.field_label_hindi}
                          onChange={(e) => updateField(index, { field_label_hindi: e.target.value })}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          placeholder="फील्ड लेबल"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Field Type
                        </label>
                        <select
                          value={field.field_type}
                          onChange={(e) => updateField(index, { field_type: e.target.value })}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          {fieldTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center space-x-4 pt-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={field.is_required}
                            onChange={(e) => updateField(index, { is_required: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-xs text-gray-700">Required</span>
                        </label>
                      </div>
                    </div>

                    {field.field_type === 'select' && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Options (one per line)
                        </label>
                        <textarea
                          value={field.field_options?.join('\n') || ''}
                          onChange={(e) => updateField(index, { 
                            field_options: e.target.value.split('\n').filter(opt => opt.trim()) 
                          })}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          rows={3}
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                        />
                      </div>
                    )}
                  </div>
                ))}

                {formData.fields.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No fields added yet</p>
                    <button
                      onClick={addField}
                      className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Add your first field
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                onClick={() => setIsCreating(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveForm}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : (editingForm ? 'Update Form' : 'Create Form')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scholarship Forms</h1>
          <p className="text-gray-600">Create and manage scholarship application forms</p>
        </div>
        <button
          onClick={handleCreateForm}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Form</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {forms.map((form) => (
          <div key={form.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{form.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{form.education_level}</p>
                {form.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{form.description}</p>
                )}
              </div>
              <div className="flex items-center space-x-1 ml-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  form.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {form.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="text-sm text-gray-500 mb-4">
              <p>Fields: {form.form_fields?.length || 0}</p>
              <p>Created: {new Date(form.created_at).toLocaleDateString()}</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEditForm(form)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Edit Form"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleFormStatus(form.id, form.is_active)}
                  className={`p-2 rounded transition-colors ${
                    form.is_active 
                      ? 'text-yellow-600 hover:bg-yellow-50' 
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                  title={form.is_active ? 'Deactivate' : 'Activate'}
                >
                  {form.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDeleteForm(form.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete Form"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {forms.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No forms created yet</h3>
          <p className="text-gray-600 mb-4">Create your first scholarship form to get started</p>
          <button
            onClick={handleCreateForm}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Form</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default CreateEditForms
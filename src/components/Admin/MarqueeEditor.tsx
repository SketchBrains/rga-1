import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { User } from '../../lib/supabase' // Import User type
import { Profile } from '../../lib/supabase' // Import Profile type
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  Eye, 
  EyeOff,
  Megaphone,
  Globe
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Announcement {
  id: string
  message: string
  message_hindi?: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

interface MarqueeEditorProps {
  currentUser: User | null;
  currentProfile: Profile | null;
}

const MarqueeEditor: React.FC<MarqueeEditorProps> = ({ currentUser, currentProfile }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { getSession } = useAuth() // Use getSession for on-demand fetching
  const { language } = useLanguage()

  const [formData, setFormData] = useState({
    message: '',
    message_hindi: '',
    is_active: true
  })

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      setLoading(false);
      toast.error('Unauthorized access.');
      return;
    }
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      console.log('🔍 Fetching announcements...')
      const { user: sessionUser } = await getSession();
      if (!sessionUser || sessionUser.role !== 'admin') {
        console.error('Unauthorized access to fetch announcements');
        return;
      }

      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching announcements:', error)
        throw error
      }
      
      console.log('✅ Announcements fetched successfully:', data?.length || 0, 'items')
      setAnnouncements(data || [])
    } catch (error) {
      console.error('Error fetching announcements:', error)
      toast.error('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setIsCreating(true)
    // setEditingAnnouncement(null) // This state is not used in the component, remove it
    setFormData({
      message: '',
      message_hindi: '',
      is_active: true
    })
  }

  const handleEdit = (announcement: Announcement) => {
    setIsCreating(true)
    // setEditingAnnouncement(announcement) // This state is not used in the component, remove it
    setFormData({
      message: announcement.message,
      message_hindi: announcement.message_hindi || '',
      is_active: announcement.is_active
    })
  }

  const handleSave = async () => {
    try {
      if (!formData.message.trim()) {
        toast.error('Please enter a message')
        return
      }

      const { user: sessionUser } = await getSession();
      if (!sessionUser || sessionUser.role !== 'admin') {
        console.error('❌ No user found in context')
        toast.error('User not authenticated. Please refresh and try again.')
        return;
      }

      console.log('🔍 Current user ID for created_by:', user.id)
      console.log('📝 Form data to save:', {
        message: formData.message,
        message_hindi: formData.message_hindi,
        is_active: formData.is_active,
        created_by: user.id
      })

      setSaving(true)

      if (editingAnnouncement) { // This variable is not defined, it should be `editingAnnouncement` from state
        // Update existing announcement
        console.log('📝 Updating announcement:', editingAnnouncement.id)
        const { error } = await supabase
          .from('announcements')
          .update({
            message: formData.message,
            message_hindi: formData.message_hindi || null,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAnnouncement.id)

        if (error) {
          console.error('❌ Error updating announcement:', error)
          throw error
        }
        
        console.log('✅ Announcement updated successfully')
        toast.success('Announcement updated successfully')
      } else {
        // Create new announcement
        console.log('📝 Creating new announcement...')
        const insertData = {
          message: formData.message,
          message_hindi: formData.message_hindi || null,
          is_active: formData.is_active,
          created_by: sessionUser.id // Use the ID from the fetched session
        }
        
        console.log('📤 Inserting data:', insertData)
        
        const { data, error } = await supabase
          .from('announcements')
          .insert(insertData)
          .select()

        if (error) {
          console.error('❌ Error creating announcement:', error)
          console.error('❌ Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          throw error
        }

        console.log('✅ Announcement created successfully:', data)
        toast.success('Announcement created successfully')
      }

      setIsCreating(false)
      // setEditingAnnouncement(null) // This state is not used in the component, remove it
      await fetchAnnouncements()
    } catch (error: any) {
      console.error('Error saving announcement:', error)
      
      // Provide more specific error messages
      let errorMessage = 'Failed to save announcement'
      if (error.message) {
        if (error.message.includes('foreign key')) {
          errorMessage = 'User authentication error. Please refresh and try again.'
        } else if (error.message.includes('permission')) {
          errorMessage = 'Permission denied. Please check your admin privileges.'
        } else if (error.message.includes('violates')) {
          errorMessage = 'Data validation error. Please check your input.'
        } else {
          errorMessage = `Error: ${error.message}`
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const { user: sessionUser } = await getSession();
    if (!sessionUser || sessionUser.role !== 'admin') {
      console.error('Unauthorized access to delete announcement');
      toast.error('User not authenticated or unauthorized. Please refresh and try again.');
      return;
    }

    if (!confirm('Are you sure you want to delete this announcement?')) return

    try {
      console.log('🗑️ Deleting announcement:', id)
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ Error deleting announcement:', error)
        throw error
      }
      
      console.log('✅ Announcement deleted successfully')
      toast.success('Announcement deleted successfully')
      await fetchAnnouncements()
    } catch (error) {
      console.error('Error deleting announcement:', error)
      toast.error('Failed to delete announcement')
    }
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { user: sessionUser } = await getSession();
    if (!sessionUser || sessionUser.role !== 'admin') {
      console.error('Unauthorized access to toggle announcement status');
      toast.error('User not authenticated or unauthorized. Please refresh and try again.');
      return;
    }

    try {
      console.log('🔄 Toggling announcement status:', id, 'from', currentStatus, 'to', !currentStatus)
      const { error } = await supabase
        .from('announcements')
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('❌ Error updating announcement status:', error)
        throw error
      }
      
      console.log('✅ Announcement status updated successfully')
      toast.success(`Announcement ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      await fetchAnnouncements()
    } catch (error) {
      console.error('Error updating announcement status:', error)
      toast.error('Failed to update announcement status')
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marquee Editor</h1>
          <p className="text-gray-600">Manage announcements displayed on the student portal</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>New Announcement</span>
        </button>
      </div>

      {/* Preview Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Live Preview</h2>
        <div className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white py-2 overflow-hidden rounded-lg">
          <div className="animate-marquee whitespace-nowrap">
            {announcements
              .filter(ann => ann.is_active)
              .map((announcement, index) => (
                <span key={announcement.id} className="mx-8 inline-flex items-center">
                  <span className="bg-white text-blue-600 px-2 py-1 rounded-full text-xs font-bold mr-2">
                    NEW
                  </span>
                  {announcement.message}
                </span>
              ))}
            {announcements.filter(ann => ann.is_active).length === 0 && (
              <span className="mx-8">No active announcements</span>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
            </h2>
            <button
              onClick={() => setIsCreating(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message (English) *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Enter announcement message in English"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message (Hindi)
              </label>
              <textarea
                value={formData.message_hindi}
                onChange={(e) => setFormData({ ...formData, message_hindi: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="हिंदी में घोषणा संदेश दर्ज करें"
              />
            </div>

            <div className="flex items-center space-x-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active (show on marquee)</span>
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : (editingAnnouncement ? 'Update' : 'Create')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcements List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Announcements</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Megaphone className="w-5 h-5 text-blue-500" />
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      announcement.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {announcement.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">English</span>
                      </div>
                      <p className="text-gray-900 pl-6">{announcement.message}</p>
                    </div>

                    {announcement.message_hindi && (
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">Hindi</span>
                        </div>
                        <p className="text-gray-900 pl-6">{announcement.message_hindi}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(announcement)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleStatus(announcement.id, announcement.is_active)}
                    className={`p-2 rounded transition-colors ${
                      announcement.is_active 
                        ? 'text-yellow-600 hover:bg-yellow-50' 
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={announcement.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {announcement.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {announcements.length === 0 && (
          <div className="text-center py-12">
            <Megaphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements yet</h3>
            <p className="text-gray-600 mb-4">Create your first announcement to display on the marquee</p>
            <button
              onClick={handleCreateNew}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create Announcement</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default MarqueeEditor
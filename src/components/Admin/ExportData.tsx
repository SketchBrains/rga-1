import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext' // Import useAuth
import { User, Profile } from '../../lib/supabase' // Import User and Profile types
import { 
  Download, 
  FileText, 
  Users, 
  Calendar,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Pause
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ExportFilters {
  formId: string
  status: string
  dateFrom: string
  dateTo: string
  includeDocuments: boolean
}

interface ExportDataProps {
  currentUser: User | null;
  currentProfile: Profile | null;
}

const ExportData: React.FC<ExportDataProps> = ({ currentUser, currentProfile }) => {
  const [forms, setForms] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ totalApplications: 0, pendingApplications: 0, approvedApplications: 0, rejectedApplications: 0 });
  const { t } = useLanguage();
  const { getSession } = useAuth(); // Use getSession for on-demand fetching

  const [filters, setFilters] = useState<ExportFilters>({
    formId: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    includeDocuments: false
  })

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      setLoading(false);
      toast.error('Unauthorized access.');
      return;
    }

    fetchForms()
    fetchStats()
  }, [])

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        const { user: sessionUser } = await getSession();
        if (!sessionUser || sessionUser.role !== 'admin') {
          console.error('Unauthorized access to fetch forms');
          return;
        }

        .from('scholarship_forms')
        .select('id, title')
        .order('title')

      if (error) throw error
      setForms(data || [])
    } catch (error) {
      console.error('Error fetching forms:', error)
      toast.error('Failed to load forms')
    }
  }

  const fetchStats = async () => {
    try {
      const { user: sessionUser } = await getSession();
      if (!sessionUser || sessionUser.role !== 'admin') {
        console.error('Unauthorized access to fetch stats');
        return;
      }

      const { count: totalApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })

      const { count: pendingApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      const { count: approvedApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')

      const { count: rejectedApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected')

      setStats({
        totalApplications: totalApplications || 0,
        pendingApplications: pendingApplications || 0,
        approvedApplications: approvedApplications || 0,
        rejectedApplications: rejectedApplications || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const buildQuery = () => {
    let query = supabase
      // No session check here, as it's called by exportToCSV which does the check
      // This function just builds the query object
      // The actual execution will happen in exportToCSV
      // If this function were to be called directly, it would need a session check
      // For now, it's an internal helper for exportToCSV

      .from('applications')
      .select(`
        *,
        scholarship_forms (title, education_level),
        users!applications_student_id_fkey (
          email,
          profiles (full_name, phone, date_of_birth, address, city, state, pincode)
        ),
        application_responses (
          response_value,
          form_fields (field_label, field_type)
        )
      `)

    if (filters.formId !== 'all') {
      query = query.eq('form_id', filters.formId)
    }

    if (filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters.dateFrom) {
      query = query.gte('submitted_at', filters.dateFrom)
    }

    if (filters.dateTo) {
      query = query.lte('submitted_at', filters.dateTo + 'T23:59:59')
    }

    return query.order('submitted_at', { ascending: false })
  }

  const exportToCSV = async () => {
    if (loading) {
      console.log('Export already in progress, skipping...')
      return
    }

    setLoading(true)
    const { user: sessionUser } = await getSession();
    if (!sessionUser || sessionUser.role !== 'admin') {
      console.error('Unauthorized access to export data');
      toast.error('User not authenticated or unauthorized. Please refresh and try again.');
      setLoading(false);
      return;
    }
    try {
      console.log('Starting export with filters:', filters)
      const { data, error } = await buildQuery()

      if (error) throw error

      if (!data || data.length === 0) {
        toast.error('No data found for the selected filters')
        return
      }

      console.log('Data fetched for export:', data.length, 'records')

      // Prepare CSV headers
      const headers = [
        'Application ID',
        'Student Name',
        'Email',
        'Phone',
        'Date of Birth',
        'Address',
        'City',
        'State',
        'Pincode',
        'Form Title',
        'Education Level',
        'Status',
        'Submitted Date',
        'Reviewed Date',
        'Admin Notes'
      ]

      // Add dynamic field headers
      const allFields = new Set<string>()
      data.forEach(app => {
        app.application_responses?.forEach((response: any) => {
          allFields.add(response.form_fields?.field_label || 'Unknown Field')
        })
      })
      headers.push(...Array.from(allFields))

      // Prepare CSV rows
      const rows = data.map(app => {
        const baseRow = [
          app.id,
          app.users?.profiles?.full_name || '',
          app.users?.email || '',
          app.users?.profiles?.phone || '',
          app.users?.profiles?.date_of_birth || '',
          app.users?.profiles?.address || '',
          app.users?.profiles?.city || '',
          app.users?.profiles?.state || '',
          app.users?.profiles?.pincode || '',
          app.scholarship_forms?.title || '',
          app.scholarship_forms?.education_level || '',
          app.status,
          new Date(app.submitted_at).toLocaleDateString(),
          app.reviewed_at ? new Date(app.reviewed_at).toLocaleDateString() : '',
          app.admin_notes || ''
        ]

        // Add response values
        const responseMap = new Map()
        app.application_responses?.forEach((response: any) => {
          responseMap.set(response.form_fields?.field_label, response.response_value)
        })

        allFields.forEach(field => {
          baseRow.push(responseMap.get(field) || '')
        })

        return baseRow
      })

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `scholarship_applications_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url) // Clean up the URL object

      console.log('Export completed successfully')
      toast.success(`Exported ${data.length} applications successfully`)
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export data')
    } finally {
      setLoading(false)
    }
  }

  const exportApplicationSummary = async () => {
    if (loading) {
      console.log('Export already in progress, skipping...')
      return
    }

    setLoading(true)
    const { user: sessionUser } = await getSession();
    if (!sessionUser || sessionUser.role !== 'admin') {
      console.error('Unauthorized access to export summary');
      toast.error('User not authenticated or unauthorized. Please refresh and try again.');
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          status,
          scholarship_forms (title, education_level),
          submitted_at
        `)

      if (error) throw error

      // Group by form and status
      const summary = data?.reduce((acc: any, app) => {
        const formObj = Array.isArray(app.scholarship_forms) ? app.scholarship_forms[0] : app.scholarship_forms
        const formTitle = formObj?.title || 'Unknown Form'
        if (!acc[formTitle]) {
          acc[formTitle] = {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            hold: 0,
            education_level: formObj?.education_level || ''
          }
        }
        acc[formTitle].total++
        acc[formTitle][app.status]++
        return acc
      }, {})

      // Create CSV content
      const headers = ['Form Title', 'Education Level', 'Total Applications', 'Pending', 'Approved', 'Rejected', 'On Hold']
      const rows = Object.entries(summary || {}).map(([formTitle, stats]: [string, any]) => [
        formTitle,
        stats.education_level,
        stats.total,
        stats.pending,
        stats.approved,
        stats.rejected,
        stats.hold
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `application_summary_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url) // Clean up the URL object

      toast.success('Summary exported successfully')
    } catch (error) {
      console.error('Error exporting summary:', error)
      toast.error('Failed to export summary')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAction = async (status: string, dateRange?: { from: string; to: string }) => {
    if (loading) {
      console.log('Export already in progress, skipping quick action...')
      return
    }

    const newFilters = {
      ...filters,
      status,
      dateFrom: dateRange?.from || '',
      dateTo: dateRange?.to || ''
    }
    
    setFilters(newFilters)
    
    // Wait a moment for state to update, then export
    setTimeout(() => {
      exportToCSV()
    }, 100)
  }

  const StatCard: React.FC<{
    title: string
    value: number
    icon: React.ComponentType<any>
    color: string
    bgColor: string
  }> = ({ title, value, icon: Icon, color, bgColor }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Export Data</h1>
        <p className="text-gray-600">Export application data and generate reports</p>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Applications"
          value={stats.totalApplications}
          icon={FileText}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatCard
          title="Pending"
          value={stats.pendingApplications}
          icon={Clock}
          color="text-yellow-600"
          bgColor="bg-yellow-100"
        />
        <StatCard
          title="Approved"
          value={stats.approvedApplications}
          icon={CheckCircle}
          color="text-green-600"
          bgColor="bg-green-100"
        />
        <StatCard
          title="Rejected"
          value={stats.rejectedApplications}
          icon={XCircle}
          color="text-red-600"
          bgColor="bg-red-100"
        />
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detailed Export */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3 mb-4">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Detailed Export</h2>
          </div>
          <p className="text-gray-600 mb-6">Export detailed application data with filters</p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Form
                </label>
                <select
                  value={filters.formId}
                  onChange={(e) => setFilters({ ...filters, formId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Forms</option>
                  {forms.map(form => (
                    <option key={form.id} value={form.id}>{form.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="hold">On Hold</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.includeDocuments}
                  onChange={(e) => setFilters({ ...filters, includeDocuments: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Include document information</span>
              </label>
            </div>

            <button
              onClick={exportToCSV}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              <span>{loading ? 'Exporting...' : 'Export Detailed Data'}</span>
            </button>
          </div>
        </div>

        {/* Summary Export */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Users className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Summary Export</h2>
          </div>
          <p className="text-gray-600 mb-6">Export application summary by form and status</p>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Summary includes:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Applications count by form</li>
                <li>• Status breakdown (Pending, Approved, Rejected, Hold)</li>
                <li>• Education level categorization</li>
                <li>• Total applications per form</li>
              </ul>
            </div>

            <button
              onClick={exportApplicationSummary}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              <span>{loading ? 'Exporting...' : 'Export Summary'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleQuickAction('approved')}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
          >
            <CheckCircle className="w-5 h-5" />
            <span>{loading ? 'Exporting...' : 'Export Approved'}</span>
          </button>
          <button
            onClick={() => handleQuickAction('pending')}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50"
          >
            <Clock className="w-5 h-5" />
            <span>{loading ? 'Exporting...' : 'Export Pending'}</span>
          </button>
          <button
            onClick={() => {
              const today = new Date()
              const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
              handleQuickAction('all', {
                from: lastMonth.toISOString().split('T')[0],
                to: today.toISOString().split('T')[0]
              })
            }}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
          >
            <Calendar className="w-5 h-5" />
            <span>{loading ? 'Exporting...' : 'Export Last Month'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportData
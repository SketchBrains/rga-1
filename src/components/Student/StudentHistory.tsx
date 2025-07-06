import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Pause,
  FileText,
  TrendingUp,
  Award,
  AlertCircle,
  Filter,
  Download
} from 'lucide-react'

interface StatusStats {
  total: number
  pending: number
  approved: number
  rejected: number
  hold: number
}

const StudentHistory: React.FC = () => {
  const { user } = useAuth()
  const { applications, loadingApplications, fetchApplications } = useData()
  const { language, t } = useLanguage()
  
  const [filteredApplications, setFilteredApplications] = useState<any[]>([])
  const [stats, setStats] = useState<StatusStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    hold: 0
  })
  const [statusFilter, setStatusFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')

  useEffect(() => {
    if (user) {
      fetchApplications()
    }
  }, [user, fetchApplications])

  useEffect(() => {
    filterApplications()
    calculateStats()
  }, [applications, statusFilter, yearFilter])

  const filterApplications = () => {
    let filtered = applications

    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter)
    }

    if (yearFilter !== 'all') {
      const year = parseInt(yearFilter)
      filtered = filtered.filter(app => 
        new Date(app.submitted_at).getFullYear() === year
      )
    }

    setFilteredApplications(filtered)
  }

  const calculateStats = () => {
    const stats = filteredApplications.reduce((acc, app) => {
      acc.total++
      acc[app.status]++
      return acc
    }, { total: 0, pending: 0, approved: 0, rejected: 0, hold: 0 })

    setStats(stats)
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
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'hold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getUniqueYears = () => {
    const years = applications.map(app => new Date(app.submitted_at).getFullYear())
    return [...new Set(years)].sort((a, b) => b - a)
  }

  const exportHistory = () => {
    const csvContent = [
      ['Date', 'Form Title', 'Education Level', 'Status', 'Reviewed Date', 'Notes'].join(','),
      ...filteredApplications.map(app => [
        new Date(app.submitted_at).toLocaleDateString(),
        `"${app.scholarship_forms?.title || ''}"`,
        `"${app.scholarship_forms?.education_level || ''}"`,
        app.status,
        app.reviewed_at ? new Date(app.reviewed_at).toLocaleDateString() : '',
        `"${app.admin_notes || ''}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `application_history_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

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

  if (loadingApplications && applications.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Application History</h1>
          <p className="text-gray-600">Track your scholarship application journey</p>
        </div>
        {filteredApplications.length > 0 && (
          <button
            onClick={exportHistory}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard
          title="Total"
          value={stats.total}
          icon={FileText}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={Clock}
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
          title="On Hold"
          value={stats.hold}
          icon={Pause}
          color="text-yellow-600"
          bgColor="bg-yellow-100"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="hold">On Hold</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Year</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Years</option>
              {getUniqueYears().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setStatusFilter('all')
                setYearFilter('all')
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Success Rate */}
      {stats.total > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Success Rate</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {Math.round((stats.approved / stats.total) * 100)}%
              </div>
              <p className="text-sm text-gray-600">Approval Rate</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {Math.round(((stats.approved + stats.pending) / stats.total) * 100)}%
              </div>
              <p className="text-sm text-gray-600">Success + Pending</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600">
                {stats.total}
              </div>
              <p className="text-sm text-gray-600">Total Applications</p>
            </div>
          </div>
        </div>
      )}

      {/* Application Timeline */}
      {filteredApplications.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {applications.length === 0 ? 'No application history' : 'No applications match your filters'}
          </h3>
          <p className="text-gray-600">
            {applications.length === 0 
              ? 'You haven\'t submitted any scholarship applications yet.' 
              : 'Try adjusting your filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Application Timeline</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredApplications.map((application, index) => {
              const title = language === 'hindi' && application.scholarship_forms?.title_hindi
                ? application.scholarship_forms.title_hindi
                : application.scholarship_forms?.title

              return (
                <div key={application.id} className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(application.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(application.status)}`}>
                          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{application.scholarship_forms?.education_level}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Submitted: {new Date(application.submitted_at).toLocaleDateString()}</span>
                        </div>
                        {application.reviewed_at && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-4 h-4" />
                            <span>Reviewed: {new Date(application.reviewed_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {application.admin_notes && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <AlertCircle className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium text-gray-700">Admin Notes</span>
                          </div>
                          <p className="text-sm text-gray-600">{application.admin_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Achievement Section */}
      {stats.approved > 0 && (
        <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
          <div className="flex items-center space-x-3 mb-4">
            <Award className="w-8 h-8 text-green-600" />
            <div>
              <h2 className="text-xl font-semibold text-green-900">Congratulations!</h2>
              <p className="text-green-700">
                You have {stats.approved} approved scholarship{stats.approved > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <p className="text-green-600">
            Your dedication to education has been recognized. Keep up the excellent work!
          </p>
        </div>
      )}
    </div>
  )
}

export default StudentHistory
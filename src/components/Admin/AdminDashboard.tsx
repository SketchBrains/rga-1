import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../contexts/LanguageContext' // Keep for t()
import { useAuth } from '../../contexts/AuthContext' // Keep for getSession
import { User, Profile } from '../../lib/supabase' // Import types
import { 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle, // Keep for XCircle
  XCircle, 
  AlertCircle,
  TrendingUp,
  Calendar,
  Award,
  Clock,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
  currentUser: User | null;
  currentProfile: Profile | null;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, currentUser, currentProfile }) => {
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0, // Keep for approvedApplications
    approvedApplications: 0,
    rejectedApplications: 0,
    holdApplications: 0,
    totalForms: 0,
    totalStudents: 0,
    activeForms: 0,
  })
  const [recentApplications, setRecentApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage(); // For translations
  const { getSession } = useAuth(); // For on-demand session fetching

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    // Fetch data only if currentUser is available
    fetchStats()
    fetchRecentApplications()
  }, [])

  const fetchStats = async () => {
    try {
      // Get total applications
      const { user: sessionUser } = await getSession();
      if (!sessionUser || sessionUser.role !== 'admin') {
        console.error('Unauthorized access to admin stats');
        setLoading(false);
        return;
      }

      const { count: totalApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })

      // Get pending applications
      const { count: pendingApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // Get approved applications
      const { count: approvedApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')

      // Get rejected applications
      const { count: rejectedApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected')

      // Get hold applications
      const { count: holdApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'hold')

      // Get total forms
      const { count: totalForms } = await supabase
        .from('scholarship_forms')
        .select('*', { count: 'exact', head: true })

      // Get active forms
      const { count: activeForms } = await supabase
        .from('scholarship_forms')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Get total students
      const { count: totalStudents } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')

      setStats({
        totalApplications: totalApplications || 0,
        pendingApplications: pendingApplications || 0,
        approvedApplications: approvedApplications || 0,
        rejectedApplications: rejectedApplications || 0,
        holdApplications: holdApplications || 0,
        totalForms: totalForms || 0,
        activeForms: activeForms || 0,
        totalStudents: totalStudents || 0,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentApplications = async () => {
    try {
      const { user: sessionUser } = await getSession();
      if (!sessionUser || sessionUser.role !== 'admin') {
        console.error('Unauthorized access to recent applications');
        setRecentApplications([]);
        return;
      }

      // First, get applications with basic info
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select(`
          *,
          scholarship_forms (title)
        `)
        .order('submitted_at', { ascending: false })
        .limit(5)

      if (appsError) throw appsError

      if (!applications || applications.length === 0) {
        setRecentApplications([])
        return
      }

      // Then get user and profile data separately
      const userIds = applications.map(app => app.student_id)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds)

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds)

      if (usersError) {
        console.error('Error fetching users:', usersError)
      }
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
      }

      // Combine the data
      const enrichedApplications = applications.map(app => {
        const user = users?.find(u => u.id === app.student_id)
        const profile = profiles?.find(p => p.user_id === app.student_id)
        
        return {
          ...app,
          users: user ? {
            email: user.email,
            profiles: profile ? { full_name: profile.full_name } : null
          } : null
        }
      })

      setRecentApplications(enrichedApplications)
    } catch (error) {
      console.error('Error fetching recent applications:', error)
      setRecentApplications([])
    }
  }

  const StatCard: React.FC<{
    title: string
    value: number
    icon: React.ComponentType<any>
    color: string
    bgColor: string
    trend?: string
  }> = ({ title, value, icon: Icon, color, bgColor, trend }) => (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className="text-xs sm:text-sm text-green-600 mt-1">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              {trend}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 sm:w-14 sm:h-14 ${bgColor} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 sm:w-7 sm:h-7 ${color}`} />
        </div>
      </div>
    </div>
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
      case 'rejected':
        return <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
      case 'hold':
        return <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
      default:
        return <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
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
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const approvalRate = stats.totalApplications > 0 
    ? Math.round((stats.approvedApplications / stats.totalApplications) * 100) 
    : 0

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Admin Dashboard
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Overview of scholarship applications and system statistics
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Applications"
          value={stats.totalApplications}
          icon={FileText}
          color="text-blue-600"
          bgColor="bg-blue-100"
          trend="+12% this month"
        />
        <StatCard
          title="Pending Reviews"
          value={stats.pendingApplications}
          icon={Clock}
          color="text-yellow-600"
          bgColor="bg-yellow-100"
        />
        <StatCard
          title="Approved Applications"
          value={stats.approvedApplications}
          icon={CheckCircle}
          color="text-green-600"
          bgColor="bg-green-100"
          trend={`${approvalRate}% approval rate`}
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          color="text-purple-600"
          bgColor="bg-purple-100"
          trend="+8% this month"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          title="Rejected Applications"
          value={stats.rejectedApplications}
          icon={XCircle}
          color="text-red-600"
          bgColor="bg-red-100"
        />
        <StatCard
          title="On Hold"
          value={stats.holdApplications}
          icon={AlertCircle}
          color="text-orange-600"
          bgColor="bg-orange-100"
        />
        <StatCard
          title="Active Forms"
          value={stats.activeForms}
          icon={Award}
          color="text-emerald-600"
          bgColor="bg-emerald-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-200">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600" />
            Quick Actions
          </h3>
          <div className="space-y-3 sm:space-y-4">
            <button 
              onClick={() => onNavigate('forms')}
              className="w-full flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all group">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="text-left">
                  <span className="text-blue-700 font-semibold block text-sm sm:text-base">Create New Form</span>
                  <span className="text-blue-600 text-xs sm:text-sm">Design scholarship application</span>
                </div>
              </div>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
            </button>

            <button 
              onClick={() => onNavigate('applications')}
              className="w-full flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg hover:from-green-100 hover:to-green-200 transition-all group">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="text-left">
                  <span className="text-green-700 font-semibold block text-sm sm:text-base">Review Applications</span>
                  <span className="text-green-600 text-xs sm:text-sm">{stats.pendingApplications} pending review</span>
                </div>
              </div>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 group-hover:translate-x-1 transition-transform" />
            </button>

            <button 
              onClick={() => onNavigate('export')}
              className="w-full flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all group">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="text-left">
                  <span className="text-purple-700 font-semibold block text-sm sm:text-base">Export Data</span>
                  <span className="text-purple-600 text-xs sm:text-sm">Generate reports</span>
                </div>
              </div>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
            </button>

            <button 
              onClick={() => onNavigate('marquee')}
              className="w-full flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg hover:from-orange-100 hover:to-orange-200 transition-all group">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="text-left">
                  <span className="text-orange-700 font-semibold block text-sm sm:text-base">Manage Announcements</span>
                  <span className="text-orange-600 text-xs sm:text-sm">Update marquee messages</span>
                </div>
              </div>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-200">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-green-600" />
            Recent Applications
          </h3> 
          <div className="space-y-3 sm:space-y-4">
            {recentApplications.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <FileText className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm sm:text-base">No recent applications</p>
              </div>
            ) : (
              recentApplications.map((application) => (
                <div key={application.id} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                      <div className="relative">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                        {application.users?.profiles?.is_verified && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full border border-white"></div>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 text-sm sm:text-base truncate">
                        <div className="flex items-center space-x-1">
                          <span>{application.users?.profiles?.full_name || 'Unknown Student'}</span>
                          {application.users?.profiles?.is_verified && (
                            <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">
                        {application.scholarship_forms?.title || 'Unknown Form'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(application.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    {getStatusIcon(application.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                      {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          {recentApplications.length > 0 && (
            <div className="mt-4 text-center">
              <button 
                onClick={() => onNavigate('applications')}
                className="text-blue-600 hover:text-blue-800 font-medium text-xs sm:text-sm">
                View All Applications →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-xl p-4 sm:p-6 border border-blue-200">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <PieChart className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600" />
          System Performance
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">{approvalRate}%</div>
            <p className="text-xs sm:text-sm text-gray-600">Approval Rate</p>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">
              {stats.totalApplications > 0 ? Math.round((stats.pendingApplications / stats.totalApplications) * 100) : 0}%
            </div>
            <p className="text-xs sm:text-sm text-gray-600">Pending Review</p>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-1">{stats.activeForms}</div>
            <p className="text-xs sm:text-sm text-gray-600">Active Forms</p>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-orange-600 mb-1">
              {stats.totalApplications > 0 ? Math.round(stats.totalApplications / stats.activeForms) : 0}
            </div>
            <p className="text-xs sm:text-sm text-gray-600">Avg. Applications per Form</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
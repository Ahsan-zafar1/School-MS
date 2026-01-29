import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  RefreshCw,
  Building2,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Award
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useSettings } from '../contexts/SettingsContext';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalRevenue: number;
  studentGrowth: number;
  teacherGrowth: number;
  recentActivities: Array<{
    id: string;
    action: string;
    description: string;
    timestamp: string;
    user: string;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
  }>;
  attendanceData: Array<{
    date: string;
    present: number;
    absent: number;
  }>;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { formatCurrency, getSchoolName } = useSettings();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/dashboard');
      const dashboardData = response.data.data || response.data;
      
      // Transform the response to match the expected format
      setStats({
        totalStudents: dashboardData.summary?.totalStudents || 0,
        totalTeachers: dashboardData.summary?.totalTeachers || 0,
        totalClasses: dashboardData.summary?.totalClasses || 0,
        totalRevenue: dashboardData.summary?.totalRevenue || 0,
        studentGrowth: dashboardData.growth?.studentGrowth || 0,
        teacherGrowth: dashboardData.growth?.teacherGrowth || 0,
        recentActivities: dashboardData.recentActivities || [],
        monthlyRevenue: dashboardData.monthlyRevenue || [],
        attendanceData: dashboardData.attendance?.labels?.map((date: string, index: number) => ({
          date,
          present: dashboardData.attendance?.present?.[index] || 0,
          absent: dashboardData.attendance?.absent?.[index] || 0
        })) || []
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      toast.error(error.response?.data?.message || 'Failed to load dashboard data');
      // Set empty stats on error
      setStats({
        totalStudents: 0,
        totalTeachers: 0,
        totalClasses: 0,
        totalRevenue: 0,
        studentGrowth: 0,
        teacherGrowth: 0,
        recentActivities: [],
        monthlyRevenue: [],
        attendanceData: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-purple-500"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-600 dark:text-gray-400">
        Error loading dashboard
      </div>
    );
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Stats Cards - Colorful Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Schools Card - Pink */}
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-pink-100 text-sm font-medium mb-1">Schools</p>
              <p className="text-3xl font-bold">{stats.totalClasses}</p>
            </div>
            <Building2 className="h-12 w-12 text-pink-200 opacity-80" />
          </div>
        </div>

        {/* Students Card - Purple */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Students</p>
              <p className="text-3xl font-bold">{stats.totalStudents.toLocaleString()}</p>
              {stats.studentGrowth !== 0 && (
                <div className="flex items-center text-xs mt-1">
                  {stats.studentGrowth > 0 ? (
                    <span className="text-purple-100">+{stats.studentGrowth}%</span>
                  ) : (
                    <span className="text-purple-200">{stats.studentGrowth}%</span>
                  )}
                </div>
              )}
            </div>
            <Users className="h-12 w-12 text-purple-200 opacity-80" />
          </div>
        </div>

        {/* Teachers Card - Yellow */}
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium mb-1">Teachers</p>
              <p className="text-3xl font-bold">{stats.totalTeachers}</p>
              {stats.teacherGrowth !== 0 && (
                <div className="flex items-center text-xs mt-1">
                  {stats.teacherGrowth > 0 ? (
                    <span className="text-yellow-100">+{stats.teacherGrowth}%</span>
                  ) : (
                    <span className="text-yellow-200">{stats.teacherGrowth}%</span>
                  )}
                </div>
              )}
            </div>
            <GraduationCap className="h-12 w-12 text-yellow-200 opacity-80" />
          </div>
        </div>

        {/* Revenue Card - Green */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Revenue</p>
              <p className="text-3xl font-bold">
                {formatCurrency(stats.totalRevenue / 1000).replace('.00', '')}K
              </p>
            </div>
            <DollarSign className="h-12 w-12 text-green-200 opacity-80" />
          </div>
        </div>
      </div>

      {/* Calendar & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar & Attendance Widget */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Calendar & Attendance</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[140px] text-center">
                {currentMonth.getDate()} {monthNames[currentMonth.getMonth()]}, {currentMonth.getFullYear()}
              </span>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 py-2">
                {day}
              </div>
            ))}
            {getDaysInMonth(currentMonth).map((day, index) => (
              <div
                key={index}
                className={`aspect-square flex items-center justify-center text-sm rounded-lg ${
                  day === null
                    ? 'bg-transparent'
                    : day === new Date().getDate() && currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()
                    ? 'bg-purple-600 dark:bg-purple-500 text-white font-semibold'
                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-pointer'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Attendance Summary */}
          {stats.attendanceData.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Today's Attendance</p>
              <div className="flex gap-4">
                <div className="flex-1 bg-green-50 dark:bg-green-900/30 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Present</p>
                  <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                    {stats.attendanceData[stats.attendanceData.length - 1]?.present || 0}
                  </p>
                </div>
                <div className="flex-1 bg-red-50 dark:bg-red-900/30 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Absent</p>
                  <p className="text-lg font-semibold text-red-700 dark:text-red-400">
                    {stats.attendanceData[stats.attendanceData.length - 1]?.absent || 0}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* School Performance Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">School Performance</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">All the data in percentage (%)</p>
          {stats.attendanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="present" fill="#8B5CF6" name="Present %" />
                <Bar dataKey="absent" fill="#F59E0B" name="Absent %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-500">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No performance data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section - News & Top Scorers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities / News */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activities</h3>
            <button className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {stats.recentActivities.length > 0 ? (
              stats.recentActivities.slice(0, 3).map((activity) => (
                <div key={activity.id} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{activity.action}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {new Date(activity.timestamp).toLocaleDateString('en-GB', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{activity.description}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                <p className="text-sm">No recent activities</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Scorers / Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Top Performers</h3>
            <select className="text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg px-2 py-1">
              <option>2024 - 2025</option>
              <option>2023 - 2024</option>
            </select>
          </div>
          <div className="space-y-3">
            {stats.recentActivities.length > 0 ? (
              stats.recentActivities.slice(0, 3).map((activity, index) => (
                <div
                  key={activity.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    index === 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                    index === 1 ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800' :
                    'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                  }`}
                >
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-green-500 dark:bg-green-600' :
                    index === 1 ? 'bg-purple-500 dark:bg-purple-600' :
                    'bg-yellow-500 dark:bg-yellow-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{activity.user}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{activity.action}</p>
                  </div>
                  <Award className={`h-5 w-5 ${
                    index === 0 ? 'text-green-600 dark:text-green-400' :
                    index === 1 ? 'text-purple-600 dark:text-purple-400' :
                    'text-yellow-600 dark:text-yellow-400'
                  }`} />
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Award className="h-12 w-12 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                <p className="text-sm">No performance data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      {stats.monthlyRevenue.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Monthly Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Line type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 
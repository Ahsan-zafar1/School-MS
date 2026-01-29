import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Filter,
  BarChart3,
  TrendingUp,
  Users,
  GraduationCap,
  BookOpen,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useClasses } from '../hooks/useClasses';

// Currency helper function
const formatCurrency = (amount: number, currency: string = 'PKR') => {
  if (currency === 'PKR' || !currency) {
    return `PKR ${amount.toLocaleString()}`;
  }
  // For other currencies, you can add more logic here
  return `${currency} ${amount.toLocaleString()}`;
};

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface ReportData {
  [key: string]: any;
}

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const { classes } = useClasses();

  // Filters
  const [filters, setFilters] = useState({
    studentId: '',
    teacherId: '',
    className: '',
    examId: '',
    dateFrom: '',
    dateTo: '',
    academicYear: new Date().getFullYear().toString(),
    status: '',
    type: 'student',
    currency: ''
  });

  // Fetch report data
  const fetchReport = async (reportType: string) => {
    setLoading(true);
    try {
      let endpoint = '';
      const params = new URLSearchParams();

      switch (reportType) {
        case 'overview':
          endpoint = '/api/reports/overview';
          if (filters.academicYear) params.append('academicYear', filters.academicYear);
          break;
        case 'student-performance':
          endpoint = '/api/reports/student/performance';
          if (filters.studentId) params.append('studentId', filters.studentId);
          if (filters.className) params.append('class', filters.className);
          if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
          if (filters.dateTo) params.append('dateTo', filters.dateTo);
          if (filters.academicYear) params.append('academicYear', filters.academicYear);
          break;
        case 'student-attendance':
          endpoint = '/api/reports/student/attendance';
          if (filters.studentId) params.append('studentId', filters.studentId);
          if (filters.className) params.append('class', filters.className);
          if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
          if (filters.dateTo) params.append('dateTo', filters.dateTo);
          if (filters.academicYear) params.append('academicYear', filters.academicYear);
          break;
        case 'student-fee':
          endpoint = '/api/reports/student/fee';
          if (filters.studentId) params.append('studentId', filters.studentId);
          if (filters.className) params.append('class', filters.className);
          if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
          if (filters.dateTo) params.append('dateTo', filters.dateTo);
          if (filters.status) params.append('status', filters.status);
          if (filters.academicYear) params.append('academicYear', filters.academicYear);
          break;
        case 'teacher-attendance':
          endpoint = '/api/reports/teacher/attendance';
          if (filters.teacherId) params.append('teacherId', filters.teacherId);
          if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
          if (filters.dateTo) params.append('dateTo', filters.dateTo);
          if (filters.academicYear) params.append('academicYear', filters.academicYear);
          break;
        case 'class-performance':
          endpoint = '/api/reports/class/performance';
          if (filters.className) params.append('class', filters.className);
          if (filters.academicYear) params.append('academicYear', filters.academicYear);
          if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
          if (filters.dateTo) params.append('dateTo', filters.dateTo);
          break;
        case 'class-attendance':
          endpoint = '/api/reports/class/attendance';
          if (filters.className) params.append('class', filters.className);
          if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
          if (filters.dateTo) params.append('dateTo', filters.dateTo);
          if (filters.academicYear) params.append('academicYear', filters.academicYear);
          break;
        case 'exam-results':
          endpoint = '/api/reports/exam/results';
          if (filters.examId) params.append('examId', filters.examId);
          if (filters.className) params.append('class', filters.className);
          if (filters.academicYear) params.append('academicYear', filters.academicYear);
          break;
        case 'fee-collection':
          endpoint = '/api/reports/fee/collection';
          if (filters.className) params.append('class', filters.className);
          if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
          if (filters.dateTo) params.append('dateTo', filters.dateTo);
          if (filters.status) params.append('status', filters.status);
          if (filters.currency) params.append('currency', filters.currency);
          if (filters.academicYear) params.append('academicYear', filters.academicYear);
          break;
        case 'attendance-overall':
          endpoint = '/api/reports/attendance/overall';
          if (filters.type) params.append('type', filters.type);
          if (filters.className) params.append('class', filters.className);
          if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
          if (filters.dateTo) params.append('dateTo', filters.dateTo);
          if (filters.academicYear) params.append('academicYear', filters.academicYear);
          break;
        default:
          return;
      }

      const response = await api.get(`${endpoint}?${params.toString()}`);
      setReportData(response.data.data);
    } catch (error: any) {
      console.error('Error fetching report:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab) {
      fetchReport(activeTab);
    }
  }, [activeTab, filters]);

  const handleExport = async (format: 'excel' | 'pdf' = 'excel') => {
    try {
      toast.success(`Exporting report as ${format.toUpperCase()}...`);
      // Export functionality will be implemented
      toast.success('Export feature coming soon');
    } catch (error: any) {
      toast.error('Failed to export report');
    }
  };

  const renderOverviewReport = () => {
    if (!reportData?.overview) return null;

    const { overview, attendance, fees, results } = reportData;

    return (
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Students</p>
                <p className="text-3xl font-bold">{overview.totalStudents || 0}</p>
              </div>
              <Users className="h-12 w-12 text-blue-200" />
            </div>
          </div>
          <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Teachers</p>
                <p className="text-3xl font-bold">{overview.totalTeachers || 0}</p>
              </div>
              <GraduationCap className="h-12 w-12 text-green-200" />
            </div>
          </div>
          <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Classes</p>
                <p className="text-3xl font-bold">{overview.totalClasses || 0}</p>
              </div>
              <BookOpen className="h-12 w-12 text-purple-200" />
            </div>
          </div>
          <div className="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">Total Exams</p>
                <p className="text-3xl font-bold">{overview.totalExams || 0}</p>
              </div>
              <FileText className="h-12 w-12 text-yellow-200" />
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Attendance Stats */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Today's Attendance</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Present</span>
                <span className="font-semibold text-green-600">{attendance?.todayPresent || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Absent</span>
                <span className="font-semibold text-red-600">{attendance?.todayAbsent || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total</span>
                <span className="font-semibold">{attendance?.todayTotal || 0}</span>
              </div>
            </div>
          </div>

          {/* Fee Stats */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Fee Collection</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-semibold">{formatCurrency(fees?.totalAmount || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Paid</span>
                <span className="font-semibold text-green-600">{formatCurrency(fees?.totalPaid || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Pending</span>
                <span className="font-semibold text-red-600">{formatCurrency(fees?.totalPending || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Collection Rate</span>
                <span className="font-semibold">{fees?.collectionPercentage?.toFixed(1) || 0}%</span>
              </div>
            </div>
          </div>

          {/* Results Stats */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Exam Results</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Results</span>
                <span className="font-semibold">{results?.totalResults || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Passed</span>
                <span className="font-semibold text-green-600">{results?.passed || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Failed</span>
                <span className="font-semibold text-red-600">{results?.failed || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Pass Rate</span>
                <span className="font-semibold">{results?.passPercentage?.toFixed(1) || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStudentPerformanceReport = () => {
    if (!reportData?.results && !reportData?.statistics) {
      return (
        <div className="card">
          <div className="text-center py-12">
            <p className="text-gray-600">No performance data available</p>
            <p className="text-sm text-gray-500 mt-2">Please select a student or class to view performance report</p>
          </div>
        </div>
      );
    }

    const { results, statistics } = reportData;
    
    // Ensure results is an array
    const resultsArray = Array.isArray(results) ? results : [];
    const chartData = resultsArray.slice(0, 10).map((r: any) => ({
      name: r.exam?.examName || 'Exam',
      marks: r.marksObtained || 0,
      total: r.totalMarks || 0
    }));

    if (resultsArray.length === 0) {
      return (
        <div className="card">
          <div className="text-center py-12">
            <p className="text-gray-600">No exam results found</p>
            <p className="text-sm text-gray-500 mt-2">Try adjusting your filters</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">Total Exams</p>
            <p className="text-2xl font-bold">{statistics?.totalExams || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Average %</p>
            <p className="text-2xl font-bold">{statistics?.averagePercentage?.toFixed(1) || 0}%</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Passed</p>
            <p className="text-2xl font-bold text-green-600">{statistics?.passed || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Failed</p>
            <p className="text-2xl font-bold text-red-600">{statistics?.failed || 0}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Performance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="marks" fill="#3B82F6" name="Obtained Marks" />
              <Bar dataKey="total" fill="#E5E7EB" name="Total Marks" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Results Table */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Exam Results</h3>
            <button
              onClick={() => handleExport('excel')}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Obtained</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {resultsArray.map((result: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{result.exam?.examName || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{result.exam?.subject || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {result.exam?.date ? new Date(result.exam.date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{result.marksObtained || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{result.totalMarks || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{result.percentage?.toFixed(1) || 0}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{result.grade || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        result.status === 'Pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {result.status || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderStudentAttendanceReport = () => {
    if (!reportData?.attendance) return null;
    const { attendance, statistics } = reportData;
    
    // Ensure attendance is an array
    const attendanceArray = Array.isArray(attendance) ? attendance : [];
    
    const chartData = [
      { name: 'Present', value: statistics?.present || 0, color: '#10B981' },
      { name: 'Absent', value: statistics?.absent || 0, color: '#EF4444' },
      { name: 'Late', value: statistics?.late || 0, color: '#F59E0B' },
      { name: 'Excused', value: statistics?.excused || 0, color: '#8B5CF6' }
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">Total Days</p>
            <p className="text-2xl font-bold">{statistics?.totalDays || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Present</p>
            <p className="text-2xl font-bold text-green-600">{statistics?.present || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Absent</p>
            <p className="text-2xl font-bold text-red-600">{statistics?.absent || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Attendance %</p>
            <p className="text-2xl font-bold">{statistics?.attendancePercentage?.toFixed(1) || 0}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Attendance Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Attendance Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceArray.slice(0, 30).map((a: any) => ({
                date: new Date(a.date).toLocaleDateString(),
                present: a.status === 'present' ? 1 : 0,
                absent: a.status === 'absent' ? 1 : 0
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="#10B981" name="Present" />
                <Line type="monotone" dataKey="absent" stroke="#EF4444" name="Absent" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Attendance Records</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceArray.slice(0, 50).map((record: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {record.student?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        record.status === 'present' ? 'bg-green-100 text-green-800' :
                        record.status === 'absent' ? 'bg-red-100 text-red-800' :
                        record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {record.status || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{record.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderFeeCollectionReport = () => {
    if (!reportData?.fees && !reportData?.statistics) {
      return (
        <div className="card">
          <div className="text-center py-12">
            <p className="text-gray-600">No fee collection data available</p>
            <p className="text-sm text-gray-500 mt-2">Please adjust your filters to view fee collection report</p>
          </div>
        </div>
      );
    }
    
    const { fees, monthlyBreakdown, statistics } = reportData;
    
    // Ensure fees is an array
    const feesArray = Array.isArray(fees) ? fees : [];
    
    const monthlyData = Object.entries(monthlyBreakdown || {}).map(([month, data]: [string, any]) => ({
      month,
      amount: data.amount,
      paid: data.paid,
      pending: data.pending
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">Total Fees</p>
            <p className="text-2xl font-bold">{statistics?.totalFees || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-2xl font-bold">{formatCurrency(statistics?.totalAmount || 0)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(statistics?.totalPaid || 0)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Collection %</p>
            <p className="text-2xl font-bold">{statistics?.collectionPercentage?.toFixed(1) || 0}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">Paid</p>
            <p className="text-2xl font-bold text-green-600">{statistics?.paid || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{statistics?.pending || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Overdue</p>
            <p className="text-2xl font-bold text-red-600">{statistics?.overdue || 0}</p>
          </div>
        </div>

        {monthlyData.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Monthly Collection Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="paid" fill="#10B981" name="Paid" />
                <Bar dataKey="pending" fill="#EF4444" name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Fee Records</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {feesArray.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No fee records found</td>
                  </tr>
                ) : (
                  feesArray.slice(0, 50).map((fee: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{fee.student?.name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{fee.feeType || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(fee.amount || 0, fee.currency)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(fee.paidAmount || 0, fee.currency)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          fee.status === 'Paid' ? 'bg-green-100 text-green-800' :
                          fee.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          fee.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {fee.status || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderStudentFeeReport = () => {
    if (!reportData?.fees && !reportData?.statistics) {
      return (
        <div className="card">
          <div className="text-center py-12">
            <p className="text-gray-600">No fee data available</p>
            <p className="text-sm text-gray-500 mt-2">Please select a student or class to view fee report</p>
          </div>
        </div>
      );
    }

    const { fees, statistics } = reportData;
    const feesArray = Array.isArray(fees) ? fees : [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">Total Fees</p>
            <p className="text-2xl font-bold">{statistics?.totalFees || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-2xl font-bold">{formatCurrency(statistics?.totalAmount || 0)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(statistics?.totalPaid || 0)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(statistics?.totalPending || 0)}</p>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Fee Records</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {feesArray.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No fee records found</td>
                  </tr>
                ) : (
                  feesArray.slice(0, 50).map((fee: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{fee.student?.name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{fee.feeType || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(fee.amount || 0, fee.currency)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(fee.paidAmount || 0, fee.currency)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          fee.status === 'Paid' ? 'bg-green-100 text-green-800' :
                          fee.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          fee.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {fee.status || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderTeacherAttendanceReport = () => {
    if (!reportData?.attendance && !reportData?.statistics) {
      return (
        <div className="card">
          <div className="text-center py-12">
            <p className="text-gray-600">No attendance data available</p>
            <p className="text-sm text-gray-500 mt-2">Please select a teacher to view attendance report</p>
          </div>
        </div>
      );
    }

    const { attendance, statistics } = reportData;
    const attendanceArray = Array.isArray(attendance) ? attendance : [];

    const chartData = [
      { name: 'Present', value: statistics?.present || 0, color: '#10B981' },
      { name: 'Absent', value: statistics?.absent || 0, color: '#EF4444' },
      { name: 'Late', value: statistics?.late || 0, color: '#F59E0B' }
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">Total Days</p>
            <p className="text-2xl font-bold">{statistics?.totalDays || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Present</p>
            <p className="text-2xl font-bold text-green-600">{statistics?.present || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Absent</p>
            <p className="text-2xl font-bold text-red-600">{statistics?.absent || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Attendance %</p>
            <p className="text-2xl font-bold">{statistics?.attendancePercentage?.toFixed(1) || 0}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Attendance Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Attendance Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceArray.slice(0, 30).map((a: any) => ({
                date: new Date(a.date).toLocaleDateString(),
                present: a.status === 'present' ? 1 : 0,
                absent: a.status === 'absent' ? 1 : 0
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="#10B981" name="Present" />
                <Line type="monotone" dataKey="absent" stroke="#EF4444" name="Absent" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Attendance Records</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceArray.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No attendance records found</td>
                  </tr>
                ) : (
                  attendanceArray.slice(0, 50).map((record: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {record.teacher?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          record.status === 'present' ? 'bg-green-100 text-green-800' :
                          record.status === 'absent' ? 'bg-red-100 text-red-800' :
                          record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {record.status || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{record.remarks || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderClassPerformanceReport = () => {
    if (!reportData?.students && !reportData?.statistics) {
      return (
        <div className="card">
          <div className="text-center py-12">
            <p className="text-gray-600">No performance data available</p>
            <p className="text-sm text-gray-500 mt-2">Please select a class to view performance report</p>
          </div>
        </div>
      );
    }

    const { students, statistics, className } = reportData;
    const studentsArray = Array.isArray(students) ? students : [];

    const chartData = studentsArray.map((s: any) => ({
      name: s.student?.name || 'Student',
      percentage: s.averagePercentage || 0
    }));

    return (
      <div className="space-y-6">
        <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <h2 className="text-2xl font-bold">Class: {className || 'N/A'}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">Total Students</p>
            <p className="text-2xl font-bold">{statistics?.totalStudents || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Total Exams</p>
            <p className="text-2xl font-bold">{statistics?.totalExams || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Average %</p>
            <p className="text-2xl font-bold">{statistics?.averagePercentage?.toFixed(1) || 0}%</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Pass Rate</p>
            <p className="text-2xl font-bold">{statistics?.passPercentage?.toFixed(1) || 0}%</p>
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Student Performance Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.slice(0, 20)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="percentage" fill="#3B82F6" name="Average %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Student Performance Details</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Exams</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Failed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Average %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {studentsArray.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No student data found</td>
                  </tr>
                ) : (
                  studentsArray.map((student: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{student.student?.name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{student.student?.rollNumber || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{student.totalExams || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{student.passed || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{student.failed || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">{student.averagePercentage?.toFixed(1) || 0}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderClassAttendanceReport = () => {
    if (!reportData?.students && !reportData?.statistics) {
      return (
        <div className="card">
          <div className="text-center py-12">
            <p className="text-gray-600">No attendance data available</p>
            <p className="text-sm text-gray-500 mt-2">Please select a class to view attendance report</p>
          </div>
        </div>
      );
    }

    const { students, statistics, className } = reportData;
    const studentsArray = Array.isArray(students) ? students : [];

    const chartData = studentsArray.map((s: any) => ({
      name: s.student?.name || 'Student',
      present: s.present || 0,
      absent: s.absent || 0,
      percentage: s.attendancePercentage || 0
    }));

    return (
      <div className="space-y-6">
        <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
          <h2 className="text-2xl font-bold">Class: {className || 'N/A'}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">Total Students</p>
            <p className="text-2xl font-bold">{statistics?.totalStudents || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Total Days</p>
            <p className="text-2xl font-bold">{statistics?.totalDays || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Present</p>
            <p className="text-2xl font-bold text-green-600">{statistics?.present || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Avg Attendance %</p>
            <p className="text-2xl font-bold">{statistics?.averageAttendancePercentage?.toFixed(1) || 0}%</p>
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Student Attendance Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.slice(0, 20)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" fill="#10B981" name="Present" />
                <Bar dataKey="absent" fill="#EF4444" name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Student Attendance Details</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Present</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Absent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Late</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {studentsArray.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No student data found</td>
                  </tr>
                ) : (
                  studentsArray.map((student: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{student.student?.name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{student.student?.rollNumber || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{student.present || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{student.absent || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">{student.late || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">{student.attendancePercentage?.toFixed(1) || 0}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderExamResultsReport = () => {
    if (!reportData?.results && !reportData?.statistics) {
      return (
        <div className="card">
          <div className="text-center py-12">
            <p className="text-gray-600">No exam results available</p>
            <p className="text-sm text-gray-500 mt-2">Please select an exam or class to view results</p>
          </div>
        </div>
      );
    }

    const { results, statistics } = reportData;
    const resultsArray = Array.isArray(results) ? results : [];

    const chartData = [
      { name: 'Passed', value: statistics?.passed || 0, color: '#10B981' },
      { name: 'Failed', value: statistics?.failed || 0, color: '#EF4444' }
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">Total Students</p>
            <p className="text-2xl font-bold">{statistics?.totalStudents || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Passed</p>
            <p className="text-2xl font-bold text-green-600">{statistics?.passed || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Failed</p>
            <p className="text-2xl font-bold text-red-600">{statistics?.failed || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Pass Rate</p>
            <p className="text-2xl font-bold">{statistics?.passPercentage?.toFixed(1) || 0}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Pass/Fail Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Average Statistics</h3>
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Average Marks</span>
                <span className="text-2xl font-bold">{statistics?.averageMarks?.toFixed(1) || 0}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Average Percentage</span>
                <span className="text-2xl font-bold">{statistics?.averagePercentage?.toFixed(1) || 0}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Exam Results</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Obtained</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {resultsArray.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-gray-500">No results found</td>
                  </tr>
                ) : (
                  resultsArray.map((result: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{result.student?.name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{result.student?.rollNumber || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{result.exam?.examName || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{result.exam?.subject || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{result.marksObtained || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{result.totalMarks || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{result.percentage?.toFixed(1) || 0}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{result.grade || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          result.status === 'Pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {result.status || '-'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderOverallAttendanceReport = () => {
    if (!reportData?.attendance && !reportData?.statistics) {
      return (
        <div className="card">
          <div className="text-center py-12">
            <p className="text-gray-600">No attendance data available</p>
            <p className="text-sm text-gray-500 mt-2">Please adjust your filters to view attendance report</p>
          </div>
        </div>
      );
    }

    const { attendance, dailyBreakdown, statistics } = reportData;
    const attendanceArray = Array.isArray(attendance) ? attendance : [];

    const dailyData = Object.entries(dailyBreakdown || {}).map(([date, data]: [string, any]) => ({
      date,
      present: data.present || 0,
      absent: data.absent || 0,
      late: data.late || 0
    })).sort((a, b) => a.date.localeCompare(b.date));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">Total Records</p>
            <p className="text-2xl font-bold">{statistics?.totalRecords || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Present</p>
            <p className="text-2xl font-bold text-green-600">{statistics?.present || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Absent</p>
            <p className="text-2xl font-bold text-red-600">{statistics?.absent || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Late</p>
            <p className="text-2xl font-bold text-yellow-600">{statistics?.late || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Attendance %</p>
            <p className="text-2xl font-bold">{statistics?.attendancePercentage?.toFixed(1) || 0}%</p>
          </div>
        </div>

        {dailyData.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Daily Attendance Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData.slice(-30)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="#10B981" name="Present" />
                <Line type="monotone" dataKey="absent" stroke="#EF4444" name="Absent" />
                <Line type="monotone" dataKey="late" stroke="#F59E0B" name="Late" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Attendance Records</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceArray.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No attendance records found</td>
                  </tr>
                ) : (
                  attendanceArray.slice(0, 50).map((record: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{record.type || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {record.student?.name || record.teacher?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{record.class || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          record.status === 'present' ? 'bg-green-100 text-green-800' :
                          record.status === 'absent' ? 'bg-red-100 text-red-800' :
                          record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {record.status || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{record.remarks || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading report...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return renderOverviewReport();
      case 'student-performance':
        return renderStudentPerformanceReport();
      case 'student-attendance':
        return renderStudentAttendanceReport();
      case 'student-fee':
        return renderStudentFeeReport();
      case 'teacher-attendance':
        return renderTeacherAttendanceReport();
      case 'class-performance':
        return renderClassPerformanceReport();
      case 'class-attendance':
        return renderClassAttendanceReport();
      case 'exam-results':
        return renderExamResultsReport();
      case 'fee-collection':
        return renderFeeCollectionReport();
      case 'attendance-overall':
        return renderOverallAttendanceReport();
      default:
        return (
          <div className="card">
            <div className="text-center py-12">
              <p className="text-gray-600">Report view for {activeTab} is being implemented...</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Generate and view comprehensive reports</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('excel')}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="btn-secondary flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'student-performance', label: 'Student Performance', icon: TrendingUp },
            { id: 'student-attendance', label: 'Student Attendance', icon: Calendar },
            { id: 'student-fee', label: 'Student Fee', icon: DollarSign },
            { id: 'teacher-attendance', label: 'Teacher Attendance', icon: Users },
            { id: 'class-performance', label: 'Class Performance', icon: GraduationCap },
            { id: 'class-attendance', label: 'Class Attendance', icon: Calendar },
            { id: 'exam-results', label: 'Exam Results', icon: FileText },
            { id: 'fee-collection', label: 'Fee Collection', icon: DollarSign },
            { id: 'attendance-overall', label: 'Overall Attendance', icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Student ID"
            value={filters.studentId}
            onChange={(e) => setFilters({ ...filters, studentId: e.target.value })}
            className="input-field"
          />
          <input
            type="text"
            placeholder="Teacher ID"
            value={filters.teacherId}
            onChange={(e) => setFilters({ ...filters, teacherId: e.target.value })}
            className="input-field"
          />
          <select
            value={filters.className}
            onChange={(e) => setFilters({ ...filters, className: e.target.value })}
            className="input-field"
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls.name}>
                {cls.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Academic Year"
            value={filters.academicYear}
            onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })}
            className="input-field"
          />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            className="input-field"
            placeholder="From Date"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="input-field"
            placeholder="To Date"
          />
          <input
            type="text"
            placeholder="Exam ID"
            value={filters.examId}
            onChange={(e) => setFilters({ ...filters, examId: e.target.value })}
            className="input-field"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="input-field"
          >
            <option value="">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
            <option value="Partial">Partial</option>
          </select>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="input-field"
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
        </div>
      </div>

      {/* Report Content */}
      {renderReportContent()}
    </div>
  );
};

export default Reports;

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckSquare,
  Square,
  TrendingUp,
  FileText,
  Printer,
  X,
  UserCheck,
  UserX,
  Calendar as CalendarIcon,
  Table,
  BarChart3,
  Settings,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { useClasses } from '../hooks/useClasses';

interface Attendance {
  _id?: string;
  attendanceId?: string;
  date: string;
  student?: {
    _id: string;
    name: string;
    rollNumber: string;
    studentId?: string;
    class?: string;
  };
  teacher?: {
    _id: string;
    name: string;
    teacherId?: string;
    department?: string;
  };
  type: 'student' | 'teacher';
  class?: string;
  status: 'present' | 'absent' | 'late' | 'excused' | 'half-day' | 'unmarked';
  checkInTime?: string;
  checkOutTime?: string;
  isLate?: boolean;
  lateMinutes?: number;
  isEarlyDeparture?: boolean;
  earlyDepartureMinutes?: number;
  recordedBy?: 'manual' | 'machine' | 'api';
  machineId?: string;
  remarks?: string;
  academicYear?: string;
  isActive?: boolean;
}

// Calendar View Component
const AttendanceCalendarView: React.FC<{ 
  attendance: Attendance[]; 
  onDateClick: (date: string) => void;
  getStatusColor: (status: string) => string;
}> = ({ attendance, onDateClick, getStatusColor }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Group attendance by date
  const attendanceByDate: Record<string, { present: number; absent: number; late: number; total: number }> = {};
  attendance.forEach(record => {
    const recordDate = new Date(record.date);
    const year = recordDate.getFullYear();
    const month = String(recordDate.getMonth() + 1).padStart(2, '0');
    const day = String(recordDate.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    
    if (!attendanceByDate[dateKey]) {
      attendanceByDate[dateKey] = { present: 0, absent: 0, late: 0, total: 0 };
    }
    
    attendanceByDate[dateKey].total++;
    if (record.status === 'present') attendanceByDate[dateKey].present++;
    if (record.status === 'absent') attendanceByDate[dateKey].absent++;
    if (record.status === 'late') attendanceByDate[dateKey].late++;
  });

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(month - 1);
      } else {
        newDate.setMonth(month + 1);
      }
      return newDate;
    });
  };

  const getAttendanceForDate = (day: number) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return attendanceByDate[dateKey] || { present: 0, absent: 0, late: 0, total: 0 };
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-xl font-bold">
          {monthNames[month]} {year}
        </h3>
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day Headers */}
        {dayNames.map(day => (
          <div key={day} className="text-center font-semibold text-gray-700 py-2">
            {day}
          </div>
        ))}

        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-24"></div>
        ))}

        {/* Calendar Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayAttendance = getAttendanceForDate(day);
          const isCurrentDay = isToday(day);
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

          return (
            <div
              key={day}
              onClick={() => onDateClick(dateKey)}
              className={`h-24 border rounded-lg p-2 cursor-pointer transition-all ${
                isCurrentDay
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className={`text-sm font-medium mb-1 ${isCurrentDay ? 'text-primary-600' : 'text-gray-700'}`}>
                {day}
              </div>
              {dayAttendance.total > 0 && (
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-gray-600">{dayAttendance.present}</span>
                  </div>
                  {dayAttendance.absent > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-gray-600">{dayAttendance.absent}</span>
                    </div>
                  )}
                  {dayAttendance.late > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <span className="text-gray-600">{dayAttendance.late}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-4 border-t">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-sm text-gray-600">Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-sm text-gray-600">Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-sm text-gray-600">Late</span>
        </div>
      </div>
    </div>
  );
};

interface AttendanceMarkingData {
  studentId?: string;
  teacherId?: string;
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
  isLate?: boolean;
  lateMinutes?: number;
  isEarlyDeparture?: boolean;
  earlyDepartureMinutes?: number;
  remarks?: string;
}

const Attendance: React.FC = () => {
  // Main tab: Student or Teacher
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
  
  // View mode for each tab
  const [viewMode, setViewMode] = useState<'mark' | 'table' | 'calendar' | 'stats'>('mark');
  
  // Student-specific states
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingLoading, setMarkingLoading] = useState(false);
  
  // Table view states
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('');
  const [filterRecordedBy, setFilterRecordedBy] = useState('');
  const [filterActive, setFilterActive] = useState('');
  
  // Selection
  const [selectedAttendances, setSelectedAttendances] = useState<string[]>([]);
  
  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewAttendance, setPreviewAttendance] = useState<Attendance | null>(null);
  
  // Statistics
  const [todayStats, setTodayStats] = useState<any>(null);
  const [overviewStats, setOverviewStats] = useState<any>(null);
  const [calendarData, setCalendarData] = useState<Attendance[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  
  const { classNames } = useClasses({ activeOnly: false });

  // Fetch attendance for marking
  const fetchAttendanceForMarking = async () => {
    if (!selectedDate) return;
    
    setMarkingLoading(true);
    try {
      if (activeTab === 'student' && selectedClass) {
        const response = await api.get(`/api/attendance/mark/${selectedDate}/${selectedClass}`);
        setAttendanceData(response.data.data || []);
      } else if (activeTab === 'teacher') {
        const response = await api.get(`/api/attendance/teachers/mark/${selectedDate}`);
        const data = response.data.data || [];
        console.log('📥 Fetched teacher attendance data:', {
          total: data.length,
          sample: data[0] ? {
            teacher: data[0].teacher,
            teacherId: data[0].teacher?._id,
            teacherIdString: data[0].teacher?._id?.toString(),
            status: data[0].status
          } : null
        });
        setAttendanceData(data);
      }
    } catch (error: any) {
      console.error('Error fetching attendance for marking:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch attendance data');
    } finally {
      setMarkingLoading(false);
    }
  };

  // Fetch attendance records for table view
  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy: sortBy,
        sortOrder: sortOrder
      });
      
      if (searchTerm) params.append('search', searchTerm);
      // Always filter by the active tab type
      params.append('type', activeTab);
      if (filterStatus) params.append('status', filterStatus);
      if (filterClass) params.append('class', filterClass);
      if (filterDateFrom) params.append('dateFrom', filterDateFrom);
      if (filterDateTo) params.append('dateTo', filterDateTo);
      if (filterAcademicYear) params.append('academicYear', filterAcademicYear);
      if (filterRecordedBy) params.append('recordedBy', filterRecordedBy);
      if (filterActive !== '') params.append('isActive', filterActive);
      
      const response = await api.get(`/api/attendance?${params.toString()}`);
      setAttendanceRecords(response.data.data || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalItems(response.data.pagination?.totalItems || 0);
    } catch (error: any) {
      console.error('Error fetching attendance records:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  // Fetch today's statistics
  const fetchTodayStats = async () => {
    try {
      const params = new URLSearchParams();
      if (filterClass) params.append('class', filterClass);
      params.append('type', activeTab);
      
      const response = await api.get(`/api/attendance/today-stats?${params.toString()}`);
      if (response.data.success && response.data.data) {
        setTodayStats(response.data.data);
      } else {
        console.error('Invalid response format:', response.data);
      }
    } catch (error: any) {
      console.error('Error fetching today stats:', error);
      toast.error('Failed to fetch today\'s statistics');
    }
  };

  // Fetch overview statistics
  const fetchOverviewStats = async () => {
    try {
      const params = new URLSearchParams();
      if (filterClass) params.append('class', filterClass);
      params.append('type', activeTab);
      if (filterDateFrom) params.append('dateFrom', filterDateFrom);
      if (filterDateTo) params.append('dateTo', filterDateTo);
      if (filterAcademicYear) params.append('academicYear', filterAcademicYear);
      
      const response = await api.get(`/api/attendance/statistics/overview?${params.toString()}`);
      setOverviewStats(response.data.data);
    } catch (error: any) {
      console.error('Error fetching overview stats:', error);
    }
  };

  // Fetch calendar data
  const fetchCalendarData = async () => {
    setCalendarLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '1000' // Get more records for calendar
      });
      
      if (filterClass) params.append('class', filterClass);
      params.append('type', activeTab);
      if (filterDateFrom) params.append('dateFrom', filterDateFrom);
      if (filterDateTo) params.append('dateTo', filterDateTo);
      
      const response = await api.get(`/api/attendance?${params.toString()}`);
      setCalendarData(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching calendar data:', error);
      toast.error('Failed to fetch calendar data');
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'mark') {
      fetchAttendanceForMarking();
    } else if (viewMode === 'table') {
      fetchAttendanceRecords();
    } else if (viewMode === 'stats') {
      fetchTodayStats();
      fetchOverviewStats();
    } else if (viewMode === 'calendar') {
      fetchCalendarData();
    }
  }, [viewMode, selectedDate, selectedClass, activeTab, currentPage, itemsPerPage, sortBy, sortOrder, searchTerm, filterStatus, filterClass, filterDateFrom, filterDateTo, filterAcademicYear, filterRecordedBy, filterActive]);

  // Refresh stats when filters change in stats view
  useEffect(() => {
    if (viewMode === 'stats') {
      fetchTodayStats();
      fetchOverviewStats();
    }
  }, [filterClass, activeTab]);

  // Mark attendance
  const handleMarkAttendance = async () => {
    if (activeTab === 'student' && !selectedClass) {
      toast.error('Please select a class');
      return;
    }
    
    setMarkingLoading(true);
    try {
      // Build attendance data to send - use a loop to ensure all records are processed
      const attendanceDataToSend: AttendanceMarkingData[] = [];
      
      console.log('📋 Processing attendance data:', {
        totalItems: attendanceData.length,
        activeTab: activeTab
      });
      
      for (let i = 0; i < attendanceData.length; i++) {
        const item = attendanceData[i];
        
        // Skip unmarked items
        if (!item.status || item.status === 'unmarked') {
          console.log(`  Item ${i}: Skipped (unmarked)`);
          continue;
        }
        
        let teacherId: string | undefined;
        let studentId: string | undefined;
        
        if (activeTab === 'teacher') {
          // Extract teacher ID - handle different object structures
          if (item.teacher) {
            // Try multiple ways to get the ID
            teacherId = item.teacher._id || 
                       (item.teacher as any)?._id || 
                       (item.teacher as any)?.id;
            
            // If _id is an object (Mongoose ObjectId), convert to string
            if (teacherId) {
              if (typeof teacherId === 'object') {
                // It's an ObjectId object, convert to string
                if ((teacherId as any).toString) {
                  teacherId = (teacherId as any).toString();
                } else {
                  teacherId = String(teacherId);
                }
              } else if (typeof teacherId !== 'string') {
                teacherId = String(teacherId);
              }
            }
          }
          
          if (!teacherId) {
            console.error(`  ❌ Item ${i}: Skipped - No teacher ID found`, {
              teacher: item.teacher,
              teacherKeys: item.teacher ? Object.keys(item.teacher) : [],
              itemKeys: Object.keys(item),
              fullItem: item
            });
            continue;
          }
          
          console.log(`  ✅ Item ${i}: Teacher "${item.teacher?.name}" (ID: ${teacherId}) - Status: ${item.status}`);
        } else {
          // Extract student ID
          if (item.student) {
            studentId = item.student._id || 
                       (item.student as any)?._id || 
                       (item.student as any)?.id;
            
            if (studentId && typeof studentId === 'object' && (studentId as any).toString) {
              studentId = (studentId as any).toString();
            } else if (studentId && typeof studentId !== 'string') {
              studentId = String(studentId);
            }
          }
          
          if (!studentId) {
            console.warn(`  Item ${i}: Skipped - No student ID found`, item);
            continue;
          }
        }
        
        attendanceDataToSend.push({
          studentId: studentId,
          teacherId: teacherId,
          status: item.status!,
          checkInTime: item.checkInTime,
          checkOutTime: item.checkOutTime,
          isLate: item.isLate,
          lateMinutes: item.lateMinutes,
          isEarlyDeparture: item.isEarlyDeparture,
          earlyDepartureMinutes: item.earlyDepartureMinutes,
          remarks: item.remarks
        });
      }
      
      // Debug: Log what we're sending
      console.log('📤 Sending attendance data:', {
        totalItems: attendanceData.length,
        itemsWithStatus: attendanceData.filter(i => i.status && i.status !== 'unmarked').length,
        itemsBeingSent: attendanceDataToSend.length,
        teacherIds: attendanceDataToSend.map(a => a.teacherId).filter(Boolean),
        studentIds: attendanceDataToSend.map(a => a.studentId).filter(Boolean)
      });
      
      if (attendanceDataToSend.length === 0) {
        toast.error('No valid attendance records to save. Please mark at least one teacher/student.');
        setMarkingLoading(false);
        return;
      }
      
      if (activeTab === 'student') {
        const response = await api.post('/api/attendance/mark', {
          date: selectedDate,
          class: selectedClass,
          attendanceData: attendanceDataToSend,
          academicYear: new Date().getFullYear().toString()
        });
        toast.success(`Student attendance marked successfully (${response.data.data?.length || 0} records)`);
      } else {
        const response = await api.post('/api/attendance/teachers/mark', {
          date: selectedDate,
          attendanceData: attendanceDataToSend,
          academicYear: new Date().getFullYear().toString()
        });
        const savedCount = response.data.savedCount || response.data.data?.length || 0;
        const totalCount = response.data.totalCount || attendanceDataToSend.length;
        
        if (savedCount === totalCount) {
          toast.success(`Teacher attendance marked successfully (${savedCount} teachers)`);
        } else {
          toast.error(
            `Teacher attendance partially saved (${savedCount} of ${totalCount} teachers). ` +
            `This is likely due to an old database index. Please run: node server/scripts/dropOldAttendanceIndex.js`,
            { duration: 8000 }
          );
          
          // Offer to drop the index via API
          if (window.confirm(
            `Only ${savedCount} of ${totalCount} teachers were saved. ` +
            `This is caused by an old database index. Would you like to try dropping it now? ` +
            `(You may need to refresh the page after this)`
          )) {
            try {
              await api.post('/api/attendance/drop-old-index');
              toast.success('Old index dropped. Please refresh the page and try marking attendance again.');
            } catch (dropError: any) {
              console.error('Error dropping index:', dropError);
              toast.error('Failed to drop index. Please run the script manually: node server/scripts/dropOldAttendanceIndex.js');
            }
          }
        }
      }
      
      // Refresh the attendance data
      await fetchAttendanceForMarking();
      
      // Refresh stats if in stats view
      if (viewMode === 'stats') {
        fetchTodayStats();
      }
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      toast.error(error.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setMarkingLoading(false);
    }
  };

  // Update attendance status
  const handleStatusChange = (index: number, status: string) => {
    const updated = [...attendanceData];
    const currentItem = updated[index];
    
    // Preserve all existing data, especially teacher/student objects with their _id
    updated[index] = {
      ...currentItem,
      status: status as any,
      // Explicitly preserve teacher/student objects with all their properties
      teacher: currentItem.teacher ? {
        ...currentItem.teacher,
        _id: currentItem.teacher._id // Ensure _id is preserved
      } : undefined,
      student: currentItem.student ? {
        ...currentItem.student,
        _id: currentItem.student._id // Ensure _id is preserved
      } : undefined
    };
    
    setAttendanceData(updated);
    
    // Debug log for teacher attendance
    if (activeTab === 'teacher') {
      const teacher = updated[index].teacher;
      if (teacher) {
        console.log(`✅ Updated teacher ${index} (${teacher.name}):`, {
          teacherId: teacher._id,
          teacherIdString: teacher._id?.toString(),
          status: updated[index].status
        });
      }
    }
  };
  
  // Update remarks
  const handleRemarksChange = (index: number, remarks: string) => {
    const updated = [...attendanceData];
    const currentItem = updated[index];
    
    // Preserve all existing data including teacher/student objects with their _id
    updated[index] = {
      ...currentItem,
      remarks: remarks,
      // Explicitly preserve teacher/student objects with all their properties
      teacher: currentItem.teacher ? {
        ...currentItem.teacher,
        _id: currentItem.teacher._id // Ensure _id is preserved
      } : undefined,
      student: currentItem.student ? {
        ...currentItem.student,
        _id: currentItem.student._id // Ensure _id is preserved
      } : undefined
    };
    setAttendanceData(updated);
  };

  // Bulk status change
  const handleBulkStatusChange = (status: string) => {
    const updated = attendanceData.map(item => ({
      ...item,
      status: status as any
    }));
    setAttendanceData(updated);
  };

  // Handle sort
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedAttendances.length === attendanceRecords.length) {
      setSelectedAttendances([]);
    } else {
      setSelectedAttendances(attendanceRecords.map(a => a._id!));
    }
  };

  const handleSelectAttendance = (id: string) => {
    if (selectedAttendances.includes(id)) {
      setSelectedAttendances(selectedAttendances.filter(a => a !== id));
    } else {
      setSelectedAttendances([...selectedAttendances, id]);
    }
  };

  // Bulk actions
  const handleBulkActivate = async () => {
    if (selectedAttendances.length === 0) {
      toast.error('Please select attendance records');
      return;
    }
    
    try {
      await api.post('/api/attendance/bulk-update', {
        ids: selectedAttendances,
        isActive: true
      });
      toast.success(`${selectedAttendances.length} attendance records activated`);
      setSelectedAttendances([]);
      fetchAttendanceRecords();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to activate records');
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedAttendances.length === 0) {
      toast.error('Please select attendance records');
      return;
    }
    
    try {
      await api.post('/api/attendance/bulk-update', {
        ids: selectedAttendances,
        isActive: false
      });
      toast.success(`${selectedAttendances.length} attendance records deactivated`);
      setSelectedAttendances([]);
      fetchAttendanceRecords();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to deactivate records');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAttendances.length === 0) {
      toast.error('Please select attendance records');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete ${selectedAttendances.length} attendance records?`)) {
      return;
    }
    
    try {
      await api.post('/api/attendance/bulk-delete', {
        ids: selectedAttendances
      });
      toast.success(`${selectedAttendances.length} attendance records deleted`);
      setSelectedAttendances([]);
      fetchAttendanceRecords();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete records');
    }
  };

  // Delete single attendance record
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this attendance record?')) {
      return;
    }
    
    try {
      await api.delete(`/api/attendance/${id}`);
      toast.success('Attendance record deleted successfully');
      fetchAttendanceRecords();
      // Also refresh stats if in stats view
      if (viewMode === 'stats') {
        fetchTodayStats();
        fetchOverviewStats();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete attendance record');
    }
  };

  // Export
  const handleExport = async (format: 'excel' | 'csv' = 'excel') => {
    try {
      const params = new URLSearchParams({
        format: format
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (filterType) params.append('type', filterType);
      if (filterStatus) params.append('status', filterStatus);
      if (filterClass) params.append('class', filterClass);
      if (filterDateFrom) params.append('dateFrom', filterDateFrom);
      if (filterDateTo) params.append('dateTo', filterDateTo);
      if (filterAcademicYear) params.append('academicYear', filterAcademicYear);
      if (filterRecordedBy) params.append('recordedBy', filterRecordedBy);
      if (filterActive !== '') params.append('isActive', filterActive);
      
      const response = await api.get(`/api/attendance/export?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Attendance exported as ${format.toUpperCase()}`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to export attendance');
    }
  };

  // Import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/api/attendance/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(response.data.message);
      if (response.data.data?.errors && response.data.data.errors.length > 0) {
        console.warn('Import errors:', response.data.data.errors);
      }
      fetchAttendanceRecords();
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.response?.data?.message || 'Failed to import attendance');
    }
    
    e.target.value = '';
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      case 'excused':
        return 'bg-blue-100 text-blue-800';
      case 'half-day':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'late':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'excused':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'half-day':
        return <Clock className="h-5 w-5 text-purple-600" />;
      default:
        return <Square className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-600">Manage student and teacher attendance</p>
        </div>
      </div>

      {/* Main Tabs: Student / Teacher */}
      <div className="card">
        <div className="flex gap-2 border-b border-gray-200 pb-4 mb-4">
          <button
            onClick={() => {
              setActiveTab('student');
              setViewMode('mark');
              setSelectedClass('');
              setFilterClass('');
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'student'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Attendance
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('teacher');
              setViewMode('mark');
              setSelectedClass('');
              setFilterClass('');
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'teacher'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Teacher Attendance
            </div>
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 border-b border-gray-200 pb-4">
          <button
            onClick={() => setViewMode('mark')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'mark'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Mark Attendance
            </div>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              Records
            </div>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'calendar'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendar
            </div>
          </button>
          <button
            onClick={() => setViewMode('stats')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'stats'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Dashboard
            </div>
          </button>
        </div>
      </div>

      {/* Mark Attendance View */}
      {viewMode === 'mark' && (
        <div className="card">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4">Mark Attendance</h2>
            
            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {activeTab === 'student' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select class</option>
                    {classNames.map((className) => (
                      <option key={className} value={className}>{className}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-field"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={fetchAttendanceForMarking}
                  disabled={markingLoading || (activeTab === 'student' && !selectedClass)}
                  className="btn-primary w-full"
                >
                  {markingLoading ? 'Loading...' : 'Load'}
                </button>
              </div>
            </div>
            
            {/* Bulk Actions */}
            {attendanceData.length > 0 && (
              <div className="flex gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
                <button
                  onClick={() => handleBulkStatusChange('present')}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  Mark All Present
                </button>
                <button
                  onClick={() => handleBulkStatusChange('absent')}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Mark All Absent
                </button>
                <button
                  onClick={() => handleBulkStatusChange('unmarked')}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
          
          {/* Attendance List */}
          {markingLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-gray-600">Loading attendance data...</p>
            </div>
          ) : attendanceData.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No data</h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === 'student' && !selectedClass
                  ? 'Please select a class and date'
                  : 'No attendance data found for the selected criteria'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {activeTab === 'student' ? 'Roll No' : 'ID'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      {activeTab === 'student' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Student ID
                        </th>
                      )}
                      {activeTab === 'teacher' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Teacher ID
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceData.map((item, index) => (
                      <tr key={item._id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {activeTab === 'student' 
                            ? item.student?.rollNumber || 'N/A'
                            : item.teacher?.teacherId || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {activeTab === 'student' 
                            ? item.student?.name || 'N/A'
                            : item.teacher?.name || 'N/A'}
                        </td>
                        {activeTab === 'student' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.student?.studentId || 'N/A'}
                          </td>
                        )}
                        {activeTab === 'teacher' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.teacher?.teacherId || 'N/A'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={item.status || 'unmarked'}
                            onChange={(e) => handleStatusChange(index, e.target.value)}
                            className="input-field text-sm"
                          >
                            <option value="unmarked">Unmarked</option>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                            <option value="excused">Excused</option>
                            <option value="half-day">Half Day</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={item.remarks || ''}
                            onChange={(e) => handleRemarksChange(index, e.target.value)}
                            placeholder="Remarks..."
                            className="input-field text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleMarkAttendance}
                  disabled={markingLoading}
                  className="btn-primary"
                >
                  {markingLoading ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="card">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search attendance..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input-field"
              >
                <option value="">All Types</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-field"
              >
                <option value="">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="excused">Excused</option>
                <option value="half-day">Half Day</option>
                <option value="unmarked">Unmarked</option>
              </select>
              {activeTab === 'student' && (
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Classes</option>
                  {classNames.map((className) => (
                    <option key={className} value={className}>{className}</option>
                  ))}
                </select>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                placeholder="From Date"
                className="input-field"
              />
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                placeholder="To Date"
                className="input-field"
              />
              <select
                value={filterRecordedBy}
                onChange={(e) => setFilterRecordedBy(e.target.value)}
                className="input-field"
              >
                <option value="">All Sources</option>
                <option value="manual">Manual</option>
                <option value="machine">Machine</option>
                <option value="api">API</option>
              </select>
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="input-field"
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleExport('excel')}
                className="btn-secondary flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Excel
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="btn-secondary flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <label className="btn-secondary flex items-center gap-2 cursor-pointer">
                <Upload className="h-4 w-4" />
                Import
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
              </label>
              {selectedAttendances.length > 0 && (
                <>
                  <button
                    onClick={handleBulkActivate}
                    className="btn-secondary flex items-center gap-2"
                  >
                    Activate ({selectedAttendances.length})
                  </button>
                  <button
                    onClick={handleBulkDeactivate}
                    className="btn-secondary flex items-center gap-2"
                  >
                    Deactivate ({selectedAttendances.length})
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="btn-danger flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete ({selectedAttendances.length})
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Table */}
          <div className="card overflow-x-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <p className="mt-2 text-gray-600">Loading attendance records...</p>
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No attendance records</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by marking attendance</p>
              </div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <button onClick={handleSelectAll} className="text-gray-400 hover:text-gray-600">
                          {selectedAttendances.length === attendanceRecords.length ? (
                            <CheckSquare className="h-5 w-5" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('attendanceId')}>
                        <div className="flex items-center gap-1">
                          ID
                          {getSortIcon('attendanceId')}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')}>
                        <div className="flex items-center gap-1">
                          Date
                          {getSortIcon('date')}
                        </div>
                      </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        {activeTab === 'student' && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                        )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                        <div className="flex items-center gap-1">
                          Status
                          {getSortIcon('status')}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceRecords.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedAttendances.includes(record._id!)}
                            onChange={() => handleSelectAttendance(record._id!)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.attendanceId ? (
                            <span className="font-mono text-xs">{record.attendanceId}</span>
                          ) : (
                            <span className="text-gray-400 italic">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.date ? new Date(record.date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div>
                            {activeTab === 'student' 
                              ? record.student?.name || 'N/A'
                              : record.teacher?.name || 'N/A'}
                          </div>
                          {activeTab === 'student' && record.student?.rollNumber && (
                            <div className="text-xs text-gray-500">Roll: {record.student.rollNumber}</div>
                          )}
                          {activeTab === 'teacher' && record.teacher?.teacherId && (
                            <div className="text-xs text-gray-500">ID: {record.teacher.teacherId}</div>
                          )}
                        </td>
                        {activeTab === 'student' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.class || 'N/A'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(record.status)}`}>
                            {getStatusIcon(record.status)}
                            <span className="ml-1 capitalize">{record.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.checkInTime ? (
                            <div>
                              <div>{new Date(record.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                              {record.isLate && (
                                <div className="text-xs text-yellow-600">Late: {record.lateMinutes}m</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.checkOutTime ? (
                            <div>
                              <div>{new Date(record.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                              {record.isEarlyDeparture && (
                                <div className="text-xs text-orange-600">Early: {record.earlyDepartureMinutes}m</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 py-1 rounded text-xs ${
                            record.recordedBy === 'machine' ? 'bg-green-100 text-green-800' :
                            record.recordedBy === 'api' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {record.recordedBy || 'manual'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setPreviewAttendance(record);
                                setShowPreviewModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingAttendance(record);
                                setShowEditModal(true);
                              }}
                              className="text-primary-600 hover:text-primary-900"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(record._id!)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Pagination */}
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="btn-secondary"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="btn-secondary"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
                        <span className="font-medium">{totalItems}</span> results
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="input-field text-sm"
                      >
                        <option value="10">10 per page</option>
                        <option value="25">25 per page</option>
                        <option value="50">50 per page</option>
                        <option value="100">100 per page</option>
                      </select>
                      <div className="flex items-center">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === pageNum
                                  ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="card">
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-4">Attendance Calendar</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="input-field"
              >
                <option value="">All Classes</option>
                {classNames.map((className) => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input-field"
              >
                <option value="">All Types</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
              <input
                type="month"
                value={filterDateFrom ? filterDateFrom.slice(0, 7) : new Date().toISOString().slice(0, 7)}
                onChange={(e) => {
                  const month = e.target.value;
                  setFilterDateFrom(month ? `${month}-01` : '');
                  if (month) {
                    const lastDay = new Date(new Date(month + '-01').getFullYear(), new Date(month + '-01').getMonth() + 1, 0).getDate();
                    setFilterDateTo(`${month}-${lastDay.toString().padStart(2, '0')}`);
                  }
                }}
                className="input-field"
              />
            </div>
          </div>
          
          {calendarLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-gray-600">Loading calendar...</p>
            </div>
          ) : (
            <AttendanceCalendarView 
              attendance={calendarData}
              onDateClick={(date: string) => {
                setSelectedDate(date);
                setViewMode('mark');
              }}
              getStatusColor={getStatusBadgeColor}
            />
          )}
        </div>
      )}

      {/* Statistics Dashboard */}
      {viewMode === 'stats' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Statistics Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="input-field"
              >
                <option value="">All Classes</option>
                {classNames.map((className) => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input-field"
              >
                <option value="">All Types</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                placeholder="From Date"
                className="input-field"
              />
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                placeholder="To Date"
                className="input-field"
              />
            </div>
          </div>

          {/* Today's Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Today - Present</p>
                  <p className="text-3xl font-bold">{todayStats?.present || 0}</p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-200" />
              </div>
            </div>
            <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Today - Absent</p>
                  <p className="text-3xl font-bold">{todayStats?.absent || 0}</p>
                </div>
                <XCircle className="h-12 w-12 text-red-200" />
              </div>
            </div>
            <div className="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">Today - Late</p>
                  <p className="text-3xl font-bold">{todayStats?.late || 0}</p>
                </div>
                <AlertCircle className="h-12 w-12 text-yellow-200" />
              </div>
            </div>
            <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Today - Total</p>
                  <p className="text-3xl font-bold">
                    {todayStats?.totalRecords !== undefined 
                      ? todayStats.totalRecords 
                      : (todayStats?.present || 0) + (todayStats?.absent || 0) + (todayStats?.late || 0) + (todayStats?.excused || 0) + (todayStats?.halfDay || 0)
                    }
                  </p>
                  <p className="text-blue-200 text-xs mt-1">of {todayStats?.totalPeople || 0} people</p>
                </div>
                <Users className="h-12 w-12 text-blue-200" />
              </div>
            </div>
          </div>

          {/* Overview Stats */}
          {overviewStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="text-lg font-bold mb-4">Period Overview</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">Total Records</span>
                    <span className="text-2xl font-bold text-gray-900">{overviewStats.totalRecords || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-gray-700">Present</span>
                    <span className="text-2xl font-bold text-green-600">{overviewStats.present || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-gray-700">Absent</span>
                    <span className="text-2xl font-bold text-red-600">{overviewStats.absent || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <span className="text-gray-700">Late</span>
                    <span className="text-2xl font-bold text-yellow-600">{overviewStats.late || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-gray-700">Excused</span>
                    <span className="text-2xl font-bold text-blue-600">{overviewStats.excused || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-gray-700">Half Day</span>
                    <span className="text-2xl font-bold text-purple-600">{overviewStats.halfDay || 0}</span>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <h3 className="text-lg font-bold mb-4">Attendance Percentage</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Present Rate</span>
                      <span className="text-sm font-bold text-gray-900">{overviewStats.presentPercentage || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div 
                        className="bg-green-500 h-4 rounded-full transition-all"
                        style={{ width: `${overviewStats.presentPercentage || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Absent Rate</span>
                      <span className="text-sm font-bold text-gray-900">{overviewStats.absentPercentage || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div 
                        className="bg-red-500 h-4 rounded-full transition-all"
                        style={{ width: `${overviewStats.absentPercentage || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Average Attendance</span>
                      <span className="text-2xl font-bold text-primary-600">{overviewStats.averageAttendance || 0}%</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Based on {overviewStats.uniqueDates || 0} days and {overviewStats.totalPeople || 0} people
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingAttendance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Edit Attendance</h2>
              <button onClick={() => { setShowEditModal(false); setEditingAttendance(null); }} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={editingAttendance.status}
                  onChange={(e) => setEditingAttendance({ ...editingAttendance, status: e.target.value as any })}
                  className="input-field"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="excused">Excused</option>
                  <option value="half-day">Half Day</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Remarks</label>
                <textarea
                  value={editingAttendance.remarks || ''}
                  onChange={(e) => setEditingAttendance({ ...editingAttendance, remarks: e.target.value })}
                  className="input-field"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setShowEditModal(false); setEditingAttendance(null); }} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await api.put(`/api/attendance/${editingAttendance._id}`, editingAttendance);
                      toast.success('Attendance updated successfully');
                      setShowEditModal(false);
                      setEditingAttendance(null);
                      fetchAttendanceRecords();
                    } catch (error: any) {
                      toast.error(error.response?.data?.message || 'Failed to update attendance');
                    }
                  }}
                  className="btn-primary"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewAttendance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Attendance Details</h2>
              <button onClick={() => { setShowPreviewModal(false); setPreviewAttendance(null); }} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Attendance ID</p>
                  <p className="font-medium">{previewAttendance.attendanceId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium">{new Date(previewAttendance.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="font-medium capitalize">{previewAttendance.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(previewAttendance.status)}`}>
                    {previewAttendance.status}
                  </span>
                </div>
                {previewAttendance.type === 'student' && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Student Name</p>
                      <p className="font-medium">{previewAttendance.student?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Roll Number</p>
                      <p className="font-medium">{previewAttendance.student?.rollNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Class</p>
                      <p className="font-medium">{previewAttendance.class || 'N/A'}</p>
                    </div>
                  </>
                )}
                {previewAttendance.type === 'teacher' && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Teacher Name</p>
                      <p className="font-medium">{previewAttendance.teacher?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Teacher ID</p>
                      <p className="font-medium">{previewAttendance.teacher?.teacherId || 'N/A'}</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-sm text-gray-600">Check In</p>
                  <p className="font-medium">{previewAttendance.checkInTime ? new Date(previewAttendance.checkInTime).toLocaleString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Check Out</p>
                  <p className="font-medium">{previewAttendance.checkOutTime ? new Date(previewAttendance.checkOutTime).toLocaleString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Recorded By</p>
                  <p className="font-medium capitalize">{previewAttendance.recordedBy || 'manual'}</p>
                </div>
                {previewAttendance.machineId && (
                  <div>
                    <p className="text-sm text-gray-600">Machine ID</p>
                    <p className="font-medium">{previewAttendance.machineId}</p>
                  </div>
                )}
              </div>
              {previewAttendance.remarks && (
                <div>
                  <p className="text-sm text-gray-600">Remarks</p>
                  <p className="font-medium">{previewAttendance.remarks}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;

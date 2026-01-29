import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Filter,
  Download,
  Upload,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  Printer,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  FileText,
  Users
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useClasses } from '../hooks/useClasses';
import { useSettings } from '../contexts/SettingsContext';

interface Exam {
  _id: string;
  examId?: string;
  examName: string;
  examType: string;
  subject: string;
  class: string;
  academicYear: string;
  date: string;
  startTime: string;
  endTime?: string;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  roomNumber?: string;
  instructions?: string;
  description?: string;
  status: string;
  isActive: boolean;
  studentCount?: number;
  createdBy?: {
    _id: string;
    name: string;
    email?: string;
  };
}

// Calendar View Component
const ExamCalendarView: React.FC<{ 
  exams: Exam[]; 
  onExamClick: (exam: Exam) => void;
  getStatusColor: (status: string) => string;
  getExamTypeColor: (type: string) => string;
}> = ({ exams, onExamClick, getStatusColor, getExamTypeColor }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Group exams by date (using local date to avoid timezone issues)
  const examsByDate: Record<string, Exam[]> = {};
  exams.forEach(exam => {
    const examDate = new Date(exam.date);
    // Use local date components instead of ISO string to avoid timezone conversion
    const year = examDate.getFullYear();
    const month = String(examDate.getMonth() + 1).padStart(2, '0');
    const day = String(examDate.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    if (!examsByDate[dateKey]) {
      examsByDate[dateKey] = [];
    }
    examsByDate[dateKey].push(exam);
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

  const getExamsForDate = (day: number): Exam[] => {
    const date = new Date(year, month, day);
    // Use local date components to match the grouping logic
    const yearStr = date.getFullYear();
    const monthStr = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(date.getDate()).padStart(2, '0');
    const dateKey = `${yearStr}-${monthStr}-${dayStr}`;
    return examsByDate[dateKey] || [];
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">
          {monthNames[month]} {year}
        </h2>
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day Headers */}
        {dayNames.map(day => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}

        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-24 border border-gray-200 rounded-lg bg-gray-50"></div>
        ))}

        {/* Calendar Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayExams = getExamsForDate(day);
          const isCurrentDay = isToday(day);
          const isSelectedDay = isSelected(day);

          return (
            <div
              key={day}
              onClick={() => setSelectedDate(new Date(year, month, day))}
              className={`h-24 border rounded-lg p-2 cursor-pointer transition-all ${
                isCurrentDay
                  ? 'border-primary-500 bg-primary-50'
                  : isSelectedDay
                  ? 'border-primary-600 bg-primary-100'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className={`text-sm font-medium mb-1 ${isCurrentDay ? 'text-primary-600' : 'text-gray-700'}`}>
                {day}
              </div>
              <div className="space-y-1 overflow-y-auto max-h-16">
                {dayExams.slice(0, 3).map(exam => (
                  <div
                    key={exam._id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onExamClick(exam);
                    }}
                    className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${getExamTypeColor(exam.examType)}`}
                    title={`${exam.examName} - ${exam.startTime}`}
                  >
                    {exam.examName}
                  </div>
                ))}
                {dayExams.length > 3 && (
                  <div className="text-xs text-gray-500 font-medium">
                    +{dayExams.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Date Exams */}
      {selectedDate && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900">
              Exams on {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          {getExamsForDate(selectedDate.getDate()).length === 0 ? (
            <p className="text-gray-500 text-sm">No exams scheduled for this date</p>
          ) : (
            <div className="space-y-2">
              {getExamsForDate(selectedDate.getDate()).map(exam => (
                <div
                  key={exam._id}
                  onClick={() => onExamClick(exam)}
                  className="p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{exam.examName}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getExamTypeColor(exam.examType)}`}>
                          {exam.examType}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(exam.status)}`}>
                          {exam.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {exam.subject}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {exam.class}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {exam.startTime}{exam.endTime ? ` - ${exam.endTime}` : ''}
                          </span>
                          {exam.roomNumber && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {exam.roomNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Exam Types:</h4>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">Final</span>
          <span className="px-2 py-1 rounded text-xs bg-indigo-100 text-indigo-800">Midterm</span>
          <span className="px-2 py-1 rounded text-xs bg-pink-100 text-pink-800">Quiz</span>
          <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">Other</span>
        </div>
      </div>
    </div>
  );
};

interface ExamForm {
  examName: string;
  examType: string;
  subject: string;
  class: string;
  academicYear: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  roomNumber: string;
  instructions: string;
  description: string;
  status: string;
  isActive: string;
}

const Exams: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [previewExam, setPreviewExam] = useState<Exam | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterExamType, setFilterExamType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const { getItemsPerPage, getDefaultAcademicYear } = useSettings();
  const [itemsPerPage, setItemsPerPage] = useState(getItemsPerPage());
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Sorting state
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { classNames } = useClasses({ activeOnly: false });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExamForm>();

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterClass, filterSubject, filterExamType, filterStatus, filterAcademicYear, filterDateFrom, filterDateTo, filterActive]);

  useEffect(() => {
    fetchExams();
  }, [currentPage, itemsPerPage, sortBy, sortOrder, searchTerm, filterClass, filterSubject, filterExamType, filterStatus, filterAcademicYear, filterDateFrom, filterDateTo, filterActive]);

  // Fetch all exams for filters (to get unique subjects and academic years)
  const [allExamsForFilters, setAllExamsForFilters] = useState<Exam[]>([]);

  useEffect(() => {
    fetchAllExamsForFilters();
  }, []);

  const fetchAllExamsForFilters = async () => {
    try {
      const response = await api.get('/api/exams?limit=1000&sortBy=date&sortOrder=desc');
      setAllExamsForFilters(response.data.data || []);
    } catch (error) {
      console.error('Error fetching exams for filters:', error);
    }
  };

  // Get unique subjects
  const getUniqueSubjects = (): string[] => {
    const subjects = new Set<string>();
    allExamsForFilters.forEach(exam => {
      if (exam.subject && exam.subject.trim()) {
        subjects.add(exam.subject.trim());
      }
    });
    return Array.from(subjects).sort();
  };

  // Get unique academic years
  const getUniqueAcademicYears = (): string[] => {
    const years = new Set<string>();
    allExamsForFilters.forEach(exam => {
      if (exam.academicYear && exam.academicYear.trim()) {
        years.add(exam.academicYear);
      }
    });
    return Array.from(years).sort().reverse();
  };

  const fetchExams = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy: sortBy,
        sortOrder: sortOrder,
      });

      if (searchTerm) params.append('search', searchTerm);
      if (filterClass) params.append('class', filterClass);
      if (filterSubject) params.append('subject', filterSubject);
      if (filterExamType) params.append('examType', filterExamType);
      if (filterStatus) params.append('status', filterStatus);
      if (filterAcademicYear) params.append('academicYear', filterAcademicYear);
      if (filterDateFrom) params.append('dateFrom', filterDateFrom);
      if (filterDateTo) params.append('dateTo', filterDateTo);
      if (filterActive) params.append('isActive', filterActive);

      const response = await api.get(`/api/exams?${params.toString()}`);
      setExams(response.data.data || []);
      
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.totalPages);
        setTotalItems(response.data.pagination.totalItems);
      } else {
        setTotalPages(1);
        setTotalItems(response.data.data?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error('Failed to fetch exams');
      setExams([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ExamForm) => {
    try {
      const examData = {
        ...data,
        isActive: data.isActive === 'true',
        duration: parseInt(data.duration.toString()),
        totalMarks: parseInt(data.totalMarks.toString()),
        passingMarks: parseInt(data.passingMarks.toString()),
      };

      if (editingExam) {
        await api.put(`/api/exams/${editingExam._id}`, examData);
        toast.success('Exam updated successfully!');
      } else {
        await api.post('/api/exams', examData);
        toast.success('Exam added successfully!');
      }
      fetchExams();
      fetchAllExamsForFilters();
      handleCloseModal();
      setSelectedExams([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this exam?')) {
      try {
        await api.delete(`/api/exams/${id}`);
        toast.success('Exam deleted successfully!');
        fetchExams();
        fetchAllExamsForFilters();
        setSelectedExams([]);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Delete failed');
      }
    }
  };

  const handleEdit = (exam: Exam) => {
    setEditingExam(exam);
    const examDate = exam.date ? new Date(exam.date).toISOString().split('T')[0] : '';
    reset({
      examName: exam.examName || '',
      examType: exam.examType || 'Midterm',
      subject: exam.subject || '',
      class: exam.class || '',
      academicYear: exam.academicYear || '',
      date: examDate,
      startTime: exam.startTime || '',
      endTime: exam.endTime || '',
      duration: exam.duration || 60,
      totalMarks: exam.totalMarks || 100,
      passingMarks: exam.passingMarks || 50,
      roomNumber: exam.roomNumber || '',
      instructions: exam.instructions || '',
      description: exam.description || '',
      status: exam.status || 'Scheduled',
      isActive: exam.isActive ? 'true' : 'false',
    });
    setShowModal(true);
  };

  const handlePreview = (exam: Exam) => {
    setPreviewExam(exam);
    setShowPreviewModal(true);
  };

  const handlePrintProfile = () => {
    if (!previewExam) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Exam Profile - ${previewExam.examName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; color: #555; }
            .value { margin-left: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            .footer { margin-top: 30px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Exam Profile</h1>
            <p><strong>Tracking ID:</strong> ${previewExam.examId || 'N/A'}</p>
          </div>
          <div class="section">
            <h2>Basic Information</h2>
            <table>
              <tr><td class="label">Exam Name:</td><td>${previewExam.examName}</td></tr>
              <tr><td class="label">Exam Type:</td><td>${previewExam.examType}</td></tr>
              <tr><td class="label">Subject:</td><td>${previewExam.subject}</td></tr>
              <tr><td class="label">Class:</td><td>${previewExam.class}</td></tr>
              <tr><td class="label">Academic Year:</td><td>${previewExam.academicYear}</td></tr>
              <tr><td class="label">Status:</td><td>${previewExam.status}</td></tr>
            </table>
          </div>
          <div class="section">
            <h2>Schedule</h2>
            <table>
              <tr><td class="label">Date:</td><td>${new Date(previewExam.date).toLocaleDateString()}</td></tr>
              <tr><td class="label">Start Time:</td><td>${previewExam.startTime}</td></tr>
              <tr><td class="label">End Time:</td><td>${previewExam.endTime || 'N/A'}</td></tr>
              <tr><td class="label">Duration:</td><td>${previewExam.duration} minutes</td></tr>
              <tr><td class="label">Room Number:</td><td>${previewExam.roomNumber || 'N/A'}</td></tr>
            </table>
          </div>
          <div class="section">
            <h2>Marks Information</h2>
            <table>
              <tr><td class="label">Total Marks:</td><td>${previewExam.totalMarks}</td></tr>
              <tr><td class="label">Passing Marks:</td><td>${previewExam.passingMarks}</td></tr>
              <tr><td class="label">Students:</td><td>${previewExam.studentCount || 0}</td></tr>
            </table>
          </div>
          ${previewExam.instructions ? `
          <div class="section">
            <h2>Instructions</h2>
            <p>${previewExam.instructions}</p>
          </div>
          ` : ''}
          ${previewExam.description ? `
          <div class="section">
            <h2>Description</h2>
            <p>${previewExam.description}</p>
          </div>
          ` : ''}
          <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePrintDateSheet = async (exam?: Exam) => {
    try {
      let examsToPrint: Exam[] = [];
      
      if (exam) {
        // Print single exam date sheet
        examsToPrint = [exam];
      } else {
        // Print all exams (with current filters applied)
        const params = new URLSearchParams({
          limit: '1000', // Get all matching exams
          sortBy: 'date',
          sortOrder: 'asc',
        });

        if (searchTerm) params.append('search', searchTerm);
        if (filterClass) params.append('class', filterClass);
        if (filterSubject) params.append('subject', filterSubject);
        if (filterExamType) params.append('examType', filterExamType);
        if (filterStatus) params.append('status', filterStatus);
        if (filterAcademicYear) params.append('academicYear', filterAcademicYear);
        if (filterDateFrom) params.append('dateFrom', filterDateFrom);
        if (filterDateTo) params.append('dateTo', filterDateTo);

        const response = await api.get(`/api/exams?${params.toString()}`);
        examsToPrint = response.data.data || [];
        
        if (examsToPrint.length === 0) {
          toast.error('No exams found to print');
          return;
        }
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      // Sort exams by date and time
      const sortedExams = [...examsToPrint].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.startTime.localeCompare(b.startTime);
      });

      // Group exams by date
      const examsByDate: Record<string, Exam[]> = {};
      sortedExams.forEach(exam => {
        const dateKey = new Date(exam.date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        if (!examsByDate[dateKey]) {
          examsByDate[dateKey] = [];
        }
        examsByDate[dateKey].push(exam);
      });

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Exam Date Sheet - ${exam ? exam.examName : 'All Exams'}</title>
            <style>
              @media print {
                body { margin: 0; padding: 15px; }
                .no-print { display: none; }
                .page-break { page-break-after: always; }
              }
              body { 
                font-family: 'Arial', sans-serif; 
                padding: 20px; 
                color: #333;
                line-height: 1.6;
              }
              .header { 
                text-align: center; 
                border-bottom: 3px solid #2563eb; 
                padding-bottom: 20px; 
                margin-bottom: 30px; 
              }
              .header h1 { 
                color: #2563eb; 
                margin: 0; 
                font-size: 28px;
                font-weight: bold;
              }
              .header h2 { 
                color: #64748b; 
                margin: 10px 0 0 0; 
                font-size: 18px;
                font-weight: normal;
              }
              .info-section {
                background: #f8fafc;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 25px;
                border-left: 4px solid #2563eb;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                padding: 5px 0;
              }
              .info-label {
                font-weight: 600;
                color: #475569;
                min-width: 150px;
              }
              .info-value {
                color: #1e293b;
                flex: 1;
              }
              .date-section {
                margin-bottom: 40px;
                page-break-inside: avoid;
              }
              .date-header {
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                color: white;
                padding: 12px 20px;
                border-radius: 8px 8px 0 0;
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 0;
              }
              .exam-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                background: white;
              }
              .exam-table thead {
                background: #f1f5f9;
              }
              .exam-table th {
                padding: 12px 15px;
                text-align: left;
                font-weight: 600;
                color: #1e293b;
                border-bottom: 2px solid #e2e8f0;
                font-size: 14px;
              }
              .exam-table td {
                padding: 12px 15px;
                border-bottom: 1px solid #e2e8f0;
                color: #475569;
              }
              .exam-table tbody tr:hover {
                background: #f8fafc;
              }
              .exam-table tbody tr:last-child td {
                border-bottom: none;
              }
              .badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
              }
              .badge-type {
                background: #e0e7ff;
                color: #4338ca;
              }
              .badge-status {
                background: #dbeafe;
                color: #1e40af;
              }
              .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 2px solid #e2e8f0;
                text-align: center;
                color: #64748b;
                font-size: 12px;
              }
              .instructions-box {
                background: #fff7ed;
                border-left: 4px solid #f59e0b;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .instructions-box h3 {
                margin-top: 0;
                color: #92400e;
                font-size: 16px;
              }
              .instructions-box p {
                margin: 5px 0;
                color: #78350f;
                white-space: pre-wrap;
              }
              @media print {
                .exam-table { page-break-inside: auto; }
                .exam-table tr { page-break-inside: avoid; page-break-after: auto; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>EXAM DATE SHEET</h1>
              <h2>${exam ? exam.examName : 'All Scheduled Examinations'}</h2>
              ${exam ? `<p style="margin: 5px 0; color: #64748b;">${exam.academicYear}</p>` : ''}
            </div>

            ${exam ? `
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Exam Type:</span>
                <span class="info-value">${exam.examType}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Subject:</span>
                <span class="info-value">${exam.subject}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Class:</span>
                <span class="info-value">${exam.class}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Academic Year:</span>
                <span class="info-value">${exam.academicYear}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Total Marks:</span>
                <span class="info-value">${exam.totalMarks}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Passing Marks:</span>
                <span class="info-value">${exam.passingMarks}</span>
              </div>
            </div>
            ` : ''}

            ${Object.entries(examsByDate).map(([date, dateExams]) => `
              <div class="date-section">
                <div class="date-header">${date}</div>
                <table class="exam-table">
                  <thead>
                    <tr>
                      <th style="width: 8%;">S.No</th>
                      <th style="width: 20%;">Exam Name</th>
                      <th style="width: 12%;">Type</th>
                      <th style="width: 15%;">Subject</th>
                      <th style="width: 10%;">Class</th>
                      <th style="width: 10%;">Time</th>
                      <th style="width: 10%;">Duration</th>
                      <th style="width: 10%;">Room</th>
                      <th style="width: 5%;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${dateExams.map((exam, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td style="font-weight: 600;">${exam.examName}</td>
                        <td><span class="badge badge-type">${exam.examType}</span></td>
                        <td>${exam.subject}</td>
                        <td>${exam.class}</td>
                        <td>${exam.startTime}${exam.endTime ? ' - ' + exam.endTime : ''}</td>
                        <td>${exam.duration} min</td>
                        <td>${exam.roomNumber || '-'}</td>
                        <td><span class="badge badge-status">${exam.status}</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `).join('')}

            ${exam && exam.instructions ? `
            <div class="instructions-box">
              <h3>📋 Important Instructions</h3>
              <p>${exam.instructions}</p>
            </div>
            ` : ''}

            <div class="footer">
              <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
              <p style="margin-top: 5px;">This is a computer-generated document. Please verify all details before the examination.</p>
            </div>

            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      
      toast.success(`Date sheet ${exam ? 'generated' : 'generated for ' + sortedExams.length + ' exam(s)'}`);
    } catch (error: any) {
      console.error('Error printing date sheet:', error);
      toast.error('Failed to generate date sheet');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExam(null);
    reset({
      examName: '',
      examType: 'Midterm',
      subject: '',
      class: '',
      academicYear: '',
      date: '',
      startTime: '',
      endTime: '',
      duration: 60,
      totalMarks: 100,
      passingMarks: 50,
      roomNumber: '',
      instructions: '',
      description: '',
      status: 'Scheduled',
      isActive: 'true',
    });
  };

  const handleSelectAll = () => {
    if (selectedExams.length === exams.length) {
      setSelectedExams([]);
    } else {
      setSelectedExams(exams.map(exam => exam._id));
    }
  };

  const handleSelectExam = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedExams([...selectedExams, id]);
    } else {
      setSelectedExams(selectedExams.filter(e => e !== id));
    }
  };

  const handleBulkUpdate = async (action: 'activate' | 'deactivate') => {
    if (selectedExams.length === 0) {
      toast.error('Please select at least one exam');
      return;
    }

    try {
      await api.post('/api/exams/bulk-update', {
        ids: selectedExams,
        action: action
      });
      toast.success(`Exams ${action === 'activate' ? 'activated' : 'deactivated'} successfully!`);
      fetchExams();
      setSelectedExams([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Bulk update failed');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedExams.length === 0) {
      toast.error('Please select at least one exam');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedExams.length} exam(s)?`)) {
      return;
    }

    try {
      await api.post('/api/exams/bulk-delete', { ids: selectedExams });
      toast.success('Exams deleted successfully!');
      fetchExams();
      fetchAllExamsForFilters();
      setSelectedExams([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Bulk delete failed');
    }
  };

  const handleExport = async (format: 'csv' | 'excel' = 'csv') => {
    try {
      const toastId = toast.loading('Exporting exams...');
      
      const params = new URLSearchParams({
        format: format === 'excel' ? 'excel' : 'csv',
      });

      if (searchTerm) params.append('search', searchTerm);
      if (filterClass) params.append('class', filterClass);
      if (filterSubject) params.append('subject', filterSubject);
      if (filterExamType) params.append('examType', filterExamType);
      if (filterStatus) params.append('status', filterStatus);
      if (filterAcademicYear) params.append('academicYear', filterAcademicYear);
      if (filterDateFrom) params.append('dateFrom', filterDateFrom);
      if (filterDateTo) params.append('dateTo', filterDateTo);

      const response = await api.get(`/api/exams/export?${params.toString()}`, {
        responseType: 'blob',
        timeout: 30000,
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      if (format === 'excel') {
        link.download = `exams-${new Date().toISOString().split('T')[0]}.xlsx`;
      } else {
        link.download = `exams-${new Date().toISOString().split('T')[0]}.csv`;
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Exams exported as ${format.toUpperCase()}`, { id: toastId });
    } catch (error: any) {
      console.error('Export error:', error);
      if (error.response?.data) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const json = JSON.parse(reader.result as string);
            toast.error(json.message || 'Export failed');
          } catch {
            toast.error('Export failed');
          }
        };
        reader.readAsText(error.response.data);
      } else {
        toast.error('Export failed');
      }
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const toastId = toast.loading('Importing exams...');
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/exams/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success(
        `Import completed: ${response.data.summary.successful} successful, ${response.data.summary.errors} errors`,
        { id: toastId, duration: 5000 }
      );

      if (response.data.errors && response.data.errors.length > 0) {
        console.error('Import errors:', response.data.errors);
      }

      fetchExams();
      fetchAllExamsForFilters();
      e.target.value = ''; // Reset file input
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Import failed');
      e.target.value = ''; // Reset file input
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setSelectedExams([]);
  };

  const handleItemsPerPageChange = (newLimit: number) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) {
      return <ArrowUp className="h-3 w-3 text-gray-400" />;
    }
    return sortOrder === 'asc' ? 
      <ArrowUp className="h-3 w-3 text-primary-600" /> : 
      <ArrowDown className="h-3 w-3 text-primary-600" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-100 text-blue-800';
      case 'Ongoing': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      case 'Postponed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getExamTypeColor = (type: string) => {
    switch (type) {
      case 'Final': return 'bg-purple-100 text-purple-800';
      case 'Midterm': return 'bg-indigo-100 text-indigo-800';
      case 'Quiz': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && exams.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading exams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exams</h1>
          <p className="text-gray-600 mt-1">Manage examinations and schedules</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Exam
        </button>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search exams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="input-field"
          >
            <option value="">All Classes</option>
            {classNames.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="input-field"
          >
            <option value="">All Subjects</option>
            {getUniqueSubjects().map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
          <select
            value={filterExamType}
            onChange={(e) => setFilterExamType(e.target.value)}
            className="input-field"
          >
            <option value="">All Types</option>
            <option value="Midterm">Midterm</option>
            <option value="Final">Final</option>
            <option value="Quiz">Quiz</option>
            <option value="Assignment">Assignment</option>
            <option value="Project">Project</option>
            <option value="Practical">Practical</option>
            <option value="Oral">Oral</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field"
          >
            <option value="">All Status</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Postponed">Postponed</option>
          </select>
          <select
            value={filterAcademicYear}
            onChange={(e) => setFilterAcademicYear(e.target.value)}
            className="input-field"
          >
            <option value="">All Academic Years</option>
            {getUniqueAcademicYears().map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            placeholder="Date From"
            className="input-field"
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            placeholder="Date To"
            className="input-field"
          />
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="input-field"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        {/* Data Management Buttons */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handlePrintDateSheet()}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
            >
              <Printer className="h-4 w-4" />
              Print All Date Sheets
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <label className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 font-medium cursor-pointer">
              <Upload className="h-4 w-4" />
              Import
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Table View
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'calendar'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Calendar View
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="card">
          <ExamCalendarView 
            exams={exams} 
            onExamClick={handlePreview}
            getStatusColor={getStatusColor}
            getExamTypeColor={getExamTypeColor}
          />
        </div>
      )}

      {/* Bulk Actions */}
      {selectedExams.length > 0 && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {selectedExams.length} exam(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkUpdate('activate')}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkUpdate('deactivate')}
                className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
              >
                Deactivate
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exams Table */}
      {viewMode === 'table' && (
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedExams.length === exams.length && exams.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('examName')}
                >
                  <div className="flex items-center gap-2">
                    Exam Name
                    <SortIcon column="examName" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('examType')}
                >
                  <div className="flex items-center gap-2">
                    Type
                    <SortIcon column="examType" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('subject')}
                >
                  <div className="flex items-center gap-2">
                    Subject
                    <SortIcon column="subject" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('class')}
                >
                  <div className="flex items-center gap-2">
                    Class
                    <SortIcon column="class" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-2">
                    Date
                    <SortIcon column="date" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Students
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {exams.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    No exams found
                  </td>
                </tr>
              ) : (
                exams.map((exam) => (
                  <tr key={exam._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedExams.includes(exam._id)}
                        onChange={(e) => handleSelectExam(exam._id, e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {exam.examName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getExamTypeColor(exam.examType)}`}>
                        {exam.examType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {exam.subject}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {exam.class}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(exam.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {exam.startTime}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(exam.status)}`}>
                        {exam.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {exam.studentCount || 0}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handlePrintDateSheet(exam)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Print Date Sheet"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handlePreview(exam)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(exam)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(exam._id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                  className="input-field py-1 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages} ({totalItems} total)
                </span>
                <div className="flex items-center">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
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
                          onClick={() => handlePageChange(pageNum)}
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
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingExam ? 'Edit Exam' : 'Add New Exam'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exam Name *
                  </label>
                  <input
                    {...register('examName', { required: 'Exam name is required' })}
                    className="input-field"
                    placeholder="e.g., Mathematics Midterm"
                  />
                  {errors.examName && (
                    <p className="text-red-500 text-xs mt-1">{errors.examName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exam Type *
                  </label>
                  <select
                    {...register('examType', { required: 'Exam type is required' })}
                    className="input-field"
                  >
                    <option value="1st term">1st term</option>
                    <option value="2nd term">2nd term</option>
                    <option value="3rd term">3rd term</option>
                    <option value="Midterm">Midterm</option>
                    <option value="Final">Final</option>
                    <option value="Quiz">Quiz</option>
                    <option value="Assignment">Assignment</option>
                    <option value="Project">Project</option>
                    <option value="Practical">Practical</option>
                    <option value="Oral">Oral</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    {...register('subject', { required: 'Subject is required' })}
                    className="input-field"
                    placeholder="e.g., Mathematics"
                  />
                  {errors.subject && (
                    <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class *
                  </label>
                  <select
                    {...register('class', { required: 'Class is required' })}
                    className="input-field"
                  >
                    <option value="">Select class</option>
                    {classNames.map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                  {errors.class && (
                    <p className="text-red-500 text-xs mt-1">{errors.class.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Academic Year *
                  </label>
                  <input
                    {...register('academicYear', { required: 'Academic year is required' })}
                    className="input-field"
                    placeholder="e.g., 2024-2025"
                  />
                  {errors.academicYear && (
                    <p className="text-red-500 text-xs mt-1">{errors.academicYear.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    {...register('date', { required: 'Date is required' })}
                    className="input-field"
                  />
                  {errors.date && (
                    <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    {...register('startTime', { required: 'Start time is required' })}
                    className="input-field"
                  />
                  {errors.startTime && (
                    <p className="text-red-500 text-xs mt-1">{errors.startTime.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    {...register('endTime')}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    {...register('duration', { required: 'Duration is required', min: 1 })}
                    className="input-field"
                    placeholder="60"
                  />
                  {errors.duration && (
                    <p className="text-red-500 text-xs mt-1">{errors.duration.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Marks *
                  </label>
                  <input
                    type="number"
                    {...register('totalMarks', { required: 'Total marks is required', min: 1 })}
                    className="input-field"
                    placeholder="100"
                  />
                  {errors.totalMarks && (
                    <p className="text-red-500 text-xs mt-1">{errors.totalMarks.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Passing Marks *
                  </label>
                  <input
                    type="number"
                    {...register('passingMarks', { required: 'Passing marks is required', min: 1 })}
                    className="input-field"
                    placeholder="50"
                  />
                  {errors.passingMarks && (
                    <p className="text-red-500 text-xs mt-1">{errors.passingMarks.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Number
                  </label>
                  <input
                    {...register('roomNumber')}
                    className="input-field"
                    placeholder="e.g., Room 101"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    {...register('status', { required: 'Status is required' })}
                    className="input-field"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Postponed">Postponed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Active
                  </label>
                  <select
                    {...register('isActive')}
                    className="input-field"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructions
                </label>
                <textarea
                  {...register('instructions')}
                  className="input-field"
                  rows={3}
                  placeholder="Exam instructions for students..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  className="input-field"
                  rows={3}
                  placeholder="Additional exam description..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingExam ? 'Update Exam' : 'Add Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewExam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Exam Profile</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => previewExam && handlePrintDateSheet(previewExam)}
                  className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded"
                  title="Print Date Sheet"
                >
                  <FileText className="h-5 w-5" />
                </button>
                <button
                  onClick={handlePrintProfile}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  title="Print Profile"
                >
                  <Printer className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Tracking ID</p>
                    <p className="text-sm font-medium text-gray-900">{previewExam.examId || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Exam Name</p>
                    <p className="text-sm font-medium text-gray-900">{previewExam.examName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Exam Type</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getExamTypeColor(previewExam.examType)}`}>
                      {previewExam.examType}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Subject</p>
                    <p className="text-sm font-medium text-gray-900">{previewExam.subject}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Class</p>
                    <p className="text-sm font-medium text-gray-900">{previewExam.class}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Academic Year</p>
                    <p className="text-sm font-medium text-gray-900">{previewExam.academicYear}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(previewExam.status)}`}>
                      {previewExam.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Active</p>
                    <p className="text-sm font-medium text-gray-900">{previewExam.isActive ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(previewExam.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Start Time</p>
                    <p className="text-sm font-medium text-gray-900">{previewExam.startTime}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">End Time</p>
                    <p className="text-sm font-medium text-gray-900">{previewExam.endTime || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="text-sm font-medium text-gray-900">{previewExam.duration} minutes</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Room Number</p>
                    <p className="text-sm font-medium text-gray-900">{previewExam.roomNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Students</p>
                    <p className="text-sm font-medium text-gray-900">{previewExam.studentCount || 0}</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Marks Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Marks</p>
                    <p className="text-sm font-medium text-gray-900">{previewExam.totalMarks}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Passing Marks</p>
                    <p className="text-sm font-medium text-gray-900">{previewExam.passingMarks}</p>
                  </div>
                </div>
              </div>
              {previewExam.instructions && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Instructions</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{previewExam.instructions}</p>
                </div>
              )}
              {previewExam.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{previewExam.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exams;

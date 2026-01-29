import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Filter,
  Download,
  Upload,
  Users,
  Award,
  TrendingUp,
  FileText,
  Printer,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  BarChart3
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useClasses } from '../hooks/useClasses';
import { useSettings } from '../contexts/SettingsContext';

interface Result {
  _id: string;
  resultId?: string;
  student: {
    _id: string;
    name: string;
    rollNumber: string;
    studentId?: string;
    email?: string;
    phone?: string;
    class?: string;
  };
  exam?: {
    _id: string;
    examName: string;
    examType?: string;
    subject?: string;
  };
  subject: string;
  class: string;
  term: string;
  academicYear: string;
  marksObtained: number;
  totalMarks: number;
  passingPercentage?: number;
  percentage: number;
  grade: string;
  position?: number;
  status: string;
  remarks?: string;
  isActive: boolean;
  createdBy?: {
    _id: string;
    name: string;
    email?: string;
  };
}

interface ResultForm {
  student: string;
  exam?: string;
  subject: string;
  class: string;
  term: string;
  academicYear: string;
  marksObtained: number;
  totalMarks: number;
  passingPercentage?: number;
  remarks?: string;
  isActive: string;
}

const Results: React.FC = () => {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingResult, setEditingResult] = useState<Result | null>(null);
  const [previewResult, setPreviewResult] = useState<Result | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<any>(null);
  
  // Fetch students and exams for dropdowns
  const [students, setStudents] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const { classNames } = useClasses({ activeOnly: false });
  const { getItemsPerPage, getDefaultAcademicYear, getPassingPercentage } = useSettings();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => getItemsPerPage());
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Sorting state
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    control,
  } = useForm<ResultForm>();

  // Watch the class field to filter students
  const selectedClass = useWatch({
    control,
    name: 'class',
  });

  // Filter students based on selected class
  const filteredStudents = useMemo(() => {
    if (!selectedClass) {
      return students;
    }
    return students.filter(student => student.class === selectedClass);
  }, [students, selectedClass]);

  // Fetch all results for filters
  const [allResultsForFilters, setAllResultsForFilters] = useState<Result[]>([]);

  useEffect(() => {
    fetchAllResultsForFilters();
    fetchStudents();
    fetchExams();
  }, []);

  const fetchAllResultsForFilters = async () => {
    try {
      const response = await api.get('/api/exam-marks?limit=1000');
      setAllResultsForFilters(response.data.data || []);
    } catch (error) {
      console.error('Error fetching results for filters:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/api/students?limit=1000&sortBy=name&sortOrder=asc');
      setStudents(response.data.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchExams = async () => {
    try {
      const response = await api.get('/api/exams?limit=1000&sortBy=examName&sortOrder=asc');
      setExams(response.data.data || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  // Get unique subjects, terms, academic years, grades
  const getUniqueSubjects = (): string[] => {
    const subjects = new Set<string>();
    allResultsForFilters.forEach(result => {
      if (result.subject && result.subject.trim()) {
        subjects.add(result.subject.trim());
      }
    });
    return Array.from(subjects).sort();
  };

  const getUniqueTerms = (): string[] => {
    return ['1st Term', '2nd Term', '3rd Term', 'Final Term'];
  };

  const getUniqueAcademicYears = (): string[] => {
    const years = new Set<string>();
    allResultsForFilters.forEach(result => {
      if (result.academicYear && result.academicYear.trim()) {
        years.add(result.academicYear);
      }
    });
    return Array.from(years).sort().reverse();
  };

  const getUniqueGrades = (): string[] => {
    return ['A+', 'A', 'B', 'C', 'D', 'F'];
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterClass, filterSubject, filterTerm, filterAcademicYear, filterGrade, filterStatus, filterActive]);

  useEffect(() => {
    fetchResults();
  }, [currentPage, itemsPerPage, sortBy, sortOrder, searchTerm, filterClass, filterSubject, filterTerm, filterAcademicYear, filterGrade, filterStatus, filterActive]);

  const fetchResults = async () => {
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
      if (filterTerm) params.append('term', filterTerm);
      if (filterAcademicYear) params.append('academicYear', filterAcademicYear);
      if (filterGrade) params.append('grade', filterGrade);
      if (filterStatus) params.append('status', filterStatus);
      if (filterActive) params.append('isActive', filterActive);

      const response = await api.get(`/api/exam-marks?${params.toString()}`);
      setResults(response.data.data || []);
      
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.totalPages);
        setTotalItems(response.data.pagination.totalItems);
      } else {
        setTotalPages(1);
        setTotalItems(response.data.data?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Failed to fetch results');
      setResults([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (filterClass) params.append('class', filterClass);
      if (filterTerm) params.append('term', filterTerm);
      if (filterAcademicYear) params.append('academicYear', filterAcademicYear);

      const response = await api.get(`/api/exam-marks/stats/overview?${params.toString()}`);
      setStats(response.data.data);
      setShowStats(true);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to fetch statistics');
    }
  };

  const onSubmit = async (data: ResultForm) => {
    try {
      const resultData = {
        ...data,
        isActive: data.isActive === 'true',
        marksObtained: parseFloat(data.marksObtained.toString()),
        totalMarks: parseFloat(data.totalMarks.toString()),
        passingPercentage: data.passingPercentage !== undefined && data.passingPercentage !== null 
          ? parseFloat(data.passingPercentage.toString()) 
          : getPassingPercentage(), // Use settings default
      };

      if (editingResult) {
        await api.put(`/api/exam-marks/${editingResult._id}`, resultData);
        toast.success('Result updated successfully!');
      } else {
        await api.post('/api/exam-marks/create', resultData);
        toast.success('Result added successfully!');
      }
      fetchResults();
      fetchAllResultsForFilters();
      handleCloseModal();
      setSelectedResults([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this result?')) {
      try {
        await api.delete(`/api/exam-marks/${id}`);
        toast.success('Result deleted successfully!');
        fetchResults();
        fetchAllResultsForFilters();
        setSelectedResults([]);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Delete failed');
      }
    }
  };

  const handleEdit = (result: Result) => {
    setEditingResult(result);
    reset({
      student: result.student?._id || '',
      exam: result.exam?._id || '',
      subject: result.subject || '',
      class: result.class || '',
      term: result.term || '',
      academicYear: result.academicYear || '',
      marksObtained: result.marksObtained ?? 0,
      totalMarks: result.totalMarks ?? 100,
      passingPercentage: result.passingPercentage ?? 50,
      remarks: result.remarks || '',
      isActive: result.isActive ? 'true' : 'false',
    });
    setShowModal(true);
  };

  const handlePreview = (result: Result) => {
    setPreviewResult(result);
    setShowPreviewModal(true);
  };

  const handlePrintProfile = () => {
    if (!previewResult) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Result Profile - ${previewResult.student.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            .footer { margin-top: 30px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Result Profile</h1>
            <p><strong>Result ID:</strong> ${previewResult.resultId || 'N/A'}</p>
          </div>
          <div class="section">
            <h2>Student Information</h2>
            <table>
              <tr><td class="label">Name:</td><td>${previewResult.student.name}</td></tr>
              <tr><td class="label">Roll Number:</td><td>${previewResult.student.rollNumber}</td></tr>
              <tr><td class="label">Tracking ID:</td><td>${previewResult.student.studentId || 'N/A'}</td></tr>
              <tr><td class="label">Class:</td><td>${previewResult.class}</td></tr>
            </table>
          </div>
          <div class="section">
            <h2>Exam Details</h2>
            <table>
              <tr><td class="label">Subject:</td><td>${previewResult.subject}</td></tr>
              <tr><td class="label">Exam:</td><td>${previewResult.exam?.examName || 'N/A'}</td></tr>
              <tr><td class="label">Term:</td><td>${previewResult.term}</td></tr>
              <tr><td class="label">Academic Year:</td><td>${previewResult.academicYear}</td></tr>
            </table>
          </div>
          <div class="section">
            <h2>Marks & Performance</h2>
            <table>
              <tr><td class="label">Marks Obtained:</td><td>${previewResult.marksObtained}</td></tr>
              <tr><td class="label">Total Marks:</td><td>${previewResult.totalMarks}</td></tr>
              <tr><td class="label">Percentage:</td><td>${previewResult.percentage.toFixed(2)}%</td></tr>
              <tr><td class="label">Grade:</td><td>${previewResult.grade}</td></tr>
              <tr><td class="label">Status:</td><td>${previewResult.status}</td></tr>
              ${previewResult.position ? `<tr><td class="label">Position:</td><td>${previewResult.position}</td></tr>` : ''}
              ${previewResult.remarks ? `<tr><td class="label">Remarks:</td><td>${previewResult.remarks}</td></tr>` : ''}
            </table>
          </div>
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

  const handleGenerateReportCard = async (studentId: string) => {
    try {
      const year = filterAcademicYear || new Date().getFullYear().toString();
      const response = await api.get(`/api/exam-marks/report/${studentId}/${year}`);
      const reportData = response.data.data;

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Report Card - ${reportData.student.name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 30px; }
              .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
              .student-info { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
              .term-section { margin-bottom: 30px; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
              th { background: #2563eb; color: white; }
              .summary { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin-top: 20px; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Report Card</h1>
              <h2>Academic Year: ${reportData.academicYear}</h2>
            </div>
            <div class="student-info">
              <h3>Student Information</h3>
              <p><strong>Name:</strong> ${reportData.student.name}</p>
              <p><strong>Roll Number:</strong> ${reportData.student.rollNumber}</p>
              <p><strong>Class:</strong> ${reportData.student.class}</p>
            </div>
            ${reportData.termResults.map((term: any) => `
              <div class="term-section">
                <h3>${term.term}</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Marks Obtained</th>
                      <th>Total Marks</th>
                      <th>Percentage</th>
                      <th>Grade</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${term.subjectDetails.map((sub: any) => `
                      <tr>
                        <td>${sub.subject}</td>
                        <td>${sub.marksObtained}</td>
                        <td>${sub.totalMarks}</td>
                        <td>${sub.percentage.toFixed(2)}%</td>
                        <td>${sub.grade}</td>
                        <td>${sub.status}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                <p><strong>Term Total:</strong> ${term.obtainedMarks} / ${term.totalMarks} (${term.percentage.toFixed(2)}%)</p>
              </div>
            `).join('')}
            <div class="summary">
              <h3>Overall Summary</h3>
              <p><strong>Total Subjects:</strong> ${reportData.overall.totalSubjects}</p>
              <p><strong>Total Marks:</strong> ${reportData.overall.obtainedMarks} / ${reportData.overall.totalMarks}</p>
              <p><strong>Average Percentage:</strong> ${reportData.overall.averagePercentage.toFixed(2)}%</p>
            </div>
            <div class="footer">
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
            <script>window.onload = function() { window.print(); };</script>
          </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      toast.success('Report card generated successfully!');
    } catch (error: any) {
      console.error('Error generating report card:', error);
      toast.error(error.response?.data?.message || 'Failed to generate report card');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingResult(null);
    reset({
      student: '',
      exam: '',
      subject: '',
      class: '',
      term: '',
      academicYear: '',
      marksObtained: 0,
      totalMarks: 100,
      passingPercentage: 50,
      remarks: '',
      isActive: 'true',
    });
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
    setSelectedResults([]);
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

  const handleSelectAll = () => {
    if (selectedResults.length === results.length) {
      setSelectedResults([]);
    } else {
      setSelectedResults(results.map(result => result._id));
    }
  };

  const handleSelectResult = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedResults([...selectedResults, id]);
    } else {
      setSelectedResults(selectedResults.filter(r => r !== id));
    }
  };

  const handleBulkUpdate = async (action: 'activate' | 'deactivate') => {
    if (selectedResults.length === 0) {
      toast.error('Please select at least one result');
      return;
    }

    try {
      await api.post('/api/exam-marks/bulk-update', {
        ids: selectedResults,
        isActive: action === 'activate'
      });
      toast.success(`Results ${action === 'activate' ? 'activated' : 'deactivated'} successfully!`);
      fetchResults();
      setSelectedResults([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Bulk update failed');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedResults.length === 0) {
      toast.error('Please select at least one result');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedResults.length} result(s)?`)) {
      return;
    }

    try {
      await api.post('/api/exam-marks/bulk-delete', { ids: selectedResults });
      toast.success('Results deleted successfully!');
      fetchResults();
      fetchAllResultsForFilters();
      setSelectedResults([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Bulk delete failed');
    }
  };

  const handleExport = async (format: 'csv' | 'excel' = 'csv') => {
    try {
      const toastId = toast.loading('Exporting results...');
      
      const params = new URLSearchParams({
        format: format === 'excel' ? 'excel' : 'csv',
      });

      if (searchTerm) params.append('search', searchTerm);
      if (filterClass) params.append('class', filterClass);
      if (filterSubject) params.append('subject', filterSubject);
      if (filterTerm) params.append('term', filterTerm);
      if (filterAcademicYear) params.append('academicYear', filterAcademicYear);
      if (filterGrade) params.append('grade', filterGrade);
      if (filterStatus) params.append('status', filterStatus);

      const response = await api.get(`/api/exam-marks/export?${params.toString()}`, {
        responseType: 'blob',
        timeout: 30000,
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      if (format === 'excel') {
        link.download = `results-${new Date().toISOString().split('T')[0]}.xlsx`;
      } else {
        link.download = `results-${new Date().toISOString().split('T')[0]}.csv`;
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.dismiss(toastId);
      toast.success(`Exported results as ${format.toUpperCase()}`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(`Failed to export results as ${format.toUpperCase()}`);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      toast.error('Invalid file type. Please upload a CSV or Excel file');
      e.target.value = '';
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post('/api/exam-marks/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      if (response.data.summary) {
        const { total, success, errors } = response.data.summary;
        if (errors > 0) {
          toast.error(
            `Import completed with errors: ${success} succeeded, ${errors} failed out of ${total} total`,
            { duration: 5000 }
          );
        } else {
          toast.success(`Successfully imported ${success} result(s)`);
        }
      } else {
        toast.success('Imported results successfully');
      }
      
      fetchResults();
      fetchAllResultsForFilters();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to import results');
    } finally {
      e.target.value = '';
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return 'bg-green-100 text-green-800';
      case 'A': return 'bg-blue-100 text-blue-800';
      case 'B': return 'bg-indigo-100 text-indigo-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      case 'F': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pass': return 'bg-green-100 text-green-800';
      case 'Fail': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Results Management</h1>
          <p className="text-gray-600">Manage student exam results and generate report cards</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            <BarChart3 className="h-4 w-4" />
            View Statistics
          </button>
          <button
            onClick={() => {
              setEditingResult(null);
              reset({
                student: '',
                exam: '',
                subject: '',
                class: '',
                term: '',
                academicYear: getDefaultAcademicYear(),
                marksObtained: 0,
                totalMarks: 100,
                remarks: '',
                isActive: 'true',
              });
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Result
          </button>
        </div>
      </div>

      {/* Statistics Modal */}
      {showStats && stats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Performance Statistics</h2>
                <button onClick={() => setShowStats(false)} className="text-gray-500 hover:text-gray-700">
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-600 font-medium">Total Results</div>
                  <div className="text-2xl font-bold text-blue-900">{stats.totalResults}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-sm text-green-600 font-medium">Pass</div>
                  <div className="text-2xl font-bold text-green-900">{stats.passCount}</div>
                  <div className="text-xs text-green-600">{stats.passRate.toFixed(1)}% Pass Rate</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="text-sm text-red-600 font-medium">Fail</div>
                  <div className="text-2xl font-bold text-red-900">{stats.failCount}</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="text-sm text-yellow-600 font-medium">Average</div>
                  <div className="text-2xl font-bold text-yellow-900">{stats.averagePercentage.toFixed(1)}%</div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 text-gray-900">Grade Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(stats.gradeDistribution).map(([grade, count]: [string, any]) => (
                    <div key={grade} className="flex items-center justify-between bg-white p-3 rounded border">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getGradeColor(grade)}`}>
                        {grade}
                      </span>
                      <span className="text-lg font-bold text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search results..."
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
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
            className="input-field"
          >
            <option value="">All Terms</option>
            {getUniqueTerms().map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <select
            value={filterAcademicYear}
            onChange={(e) => setFilterAcademicYear(e.target.value)}
            className="input-field"
          >
            <option value="">All Years</option>
            {getUniqueAcademicYears().map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="input-field"
          >
            <option value="">All Grades</option>
            {getUniqueGrades().map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field"
          >
            <option value="">All Status</option>
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
            <option value="Pending">Pending</option>
          </select>
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
        
        {/* Import/Export Buttons */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Data Management:
            </span>
            <button 
              onClick={() => handleExport('csv')}
              className="group relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
            <button 
              onClick={() => handleExport('excel')}
              className="group relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out"
            >
              <Download className="h-4 w-4" />
              <span>Export Excel</span>
            </button>
            <label className="group relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out cursor-pointer">
              <Upload className="h-4 w-4" />
              <span>Import Data</span>
              <input 
                type="file" 
                accept=".csv,.xlsx,.xls" 
                onChange={handleImport} 
                className="hidden" 
              />
            </label>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedResults.length > 0 && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <span className="text-sm text-yellow-800 font-medium">
              {selectedResults.length} result(s) selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleBulkUpdate('activate')}
                className="btn-primary text-sm px-3 py-1"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkUpdate('deactivate')}
                className="btn-secondary text-sm px-3 py-1"
              >
                Deactivate
              </button>
              <button
                onClick={handleBulkDelete}
                className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded-lg"
              >
                <Trash2 className="h-3 w-3 inline mr-1" />
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedResults.length === results.length && results.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('student')}
                >
                  <div className="flex items-center gap-1">
                    Student
                    <SortIcon column="student" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('subject')}
                >
                  <div className="flex items-center gap-1">
                    Subject
                    <SortIcon column="subject" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Term
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('marksObtained')}
                >
                  <div className="flex items-center gap-1">
                    Marks
                    <SortIcon column="marksObtained" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('percentage')}
                >
                  <div className="flex items-center gap-1">
                    %
                    <SortIcon column="percentage" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('grade')}
                >
                  <div className="flex items-center gap-1">
                    Grade
                    <SortIcon column="grade" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm || filterClass || filterSubject || filterTerm || filterAcademicYear
                        ? 'Try adjusting your search or filters.'
                        : 'Get started by adding a new result.'}
                    </p>
                  </td>
                </tr>
              ) : (
                results.map((result) => (
                  <tr key={result._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedResults.includes(result._id)}
                        onChange={(e) => handleSelectResult(result._id, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{result.student.name}</div>
                      <div className="text-sm text-gray-500">{result.student.rollNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{result.subject}</div>
                      {result.exam && (
                        <div className="text-xs text-gray-500">{result.exam.examName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {result.class}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{result.term}</div>
                      <div className="text-xs text-gray-500">{result.academicYear}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {result.marksObtained} / {result.totalMarks}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {result.percentage.toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGradeColor(result.grade)}`}>
                        {result.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                        {result.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handlePreview(result)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Profile"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleGenerateReportCard(result.student._id)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Generate Report Card"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(result)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(result._id)}
                          className="text-red-600 hover:text-red-900"
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
        
        {/* Pagination Controls */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, totalItems)}
                </span>{' '}
                of <span className="font-medium">{totalItems}</span> results
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                  className="input-field text-sm py-1"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  disabled={currentPage >= totalPages}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">
                  {editingResult ? 'Edit Result' : 'Add New Result'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Class *</label>
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
                    {errors.class && <p className="text-red-500 text-sm mt-1">{errors.class.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Student *</label>
                    <select
                      {...register('student', { required: 'Student is required' })}
                      className="input-field"
                      disabled={!selectedClass}
                    >
                      <option value="">
                        {!selectedClass 
                          ? 'Select class first' 
                          : filteredStudents.length === 0 
                            ? 'No students in this class' 
                            : 'Select student'}
                      </option>
                      {filteredStudents.map((student) => (
                        <option key={student._id} value={student._id}>
                          {student.name} ({student.rollNumber})
                        </option>
                      ))}
                    </select>
                    {errors.student && <p className="text-red-500 text-sm mt-1">{errors.student.message}</p>}
                    {!selectedClass && (
                      <p className="text-blue-500 text-xs mt-1">
                        Please select a class to see available students
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Exam (Optional)</label>
                    <select
                      {...register('exam')}
                      className="input-field"
                    >
                      <option value="">Select exam</option>
                      {exams.map((exam) => (
                        <option key={exam._id} value={exam._id}>
                          {exam.examName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subject *</label>
                    <input
                      {...register('subject', { required: 'Subject is required' })}
                      type="text"
                      className="input-field"
                      placeholder="Enter subject"
                    />
                    {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Term *</label>
                    <select
                      {...register('term', { required: 'Term is required' })}
                      className="input-field"
                    >
                      <option value="">Select term</option>
                      {getUniqueTerms().map((term) => (
                        <option key={term} value={term}>
                          {term}
                        </option>
                      ))}
                    </select>
                    {errors.term && <p className="text-red-500 text-sm mt-1">{errors.term.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Academic Year *</label>
                    <input
                      {...register('academicYear', { required: 'Academic year is required' })}
                      type="text"
                      className="input-field"
                      placeholder="e.g., 2024-2025"
                    />
                    {errors.academicYear && <p className="text-red-500 text-sm mt-1">{errors.academicYear.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Marks Obtained *</label>
                    <input
                      {...register('marksObtained', { 
                        required: 'Marks obtained is required',
                        min: { value: 0, message: 'Marks cannot be negative' }
                      })}
                      type="number"
                      step="0.01"
                      className="input-field"
                      placeholder="Enter marks obtained"
                    />
                    {errors.marksObtained && <p className="text-red-500 text-sm mt-1">{errors.marksObtained.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Marks *</label>
                    <input
                      {...register('totalMarks', { 
                        required: 'Total marks is required',
                        min: { value: 1, message: 'Total marks must be at least 1' }
                      })}
                      type="number"
                      step="0.01"
                      className="input-field"
                      placeholder="Enter total marks"
                    />
                    {errors.totalMarks && <p className="text-red-500 text-sm mt-1">{errors.totalMarks.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Passing Percentage (%) 
                      <span className="text-xs text-gray-500 ml-1">(Default: 50%)</span>
                    </label>
                    <input
                      {...register('passingPercentage', { 
                        min: { value: 0, message: 'Percentage cannot be negative' },
                        max: { value: 100, message: 'Percentage cannot exceed 100' }
                      })}
                      type="number"
                      step="0.01"
                      className="input-field"
                      placeholder="e.g., 33 for 33%"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Students below this percentage will be marked as "Fail"
                    </p>
                    {errors.passingPercentage && <p className="text-red-500 text-sm mt-1">{errors.passingPercentage.message}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Remarks</label>
                    <textarea
                      {...register('remarks')}
                      className="input-field"
                      rows={3}
                      placeholder="Enter any remarks or comments"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      {...register('isActive')}
                      className="input-field"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    {editingResult ? 'Update Result' : 'Add Result'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Result Details</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrintProfile}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Result ID */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-600 font-medium">Result ID</div>
                  <div className="text-lg font-bold text-blue-900">{previewResult.resultId || 'N/A'}</div>
                </div>

                {/* Student Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Student Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Name:</span>
                      <div className="font-medium text-gray-900">{previewResult.student.name}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Roll Number:</span>
                      <div className="font-medium text-gray-900">{previewResult.student.rollNumber}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Tracking ID:</span>
                      <div className="font-medium text-gray-900">{previewResult.student.studentId || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Class:</span>
                      <div className="font-medium text-gray-900">{previewResult.class}</div>
                    </div>
                  </div>
                </div>

                {/* Exam Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Exam Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Subject:</span>
                      <div className="font-medium text-gray-900">{previewResult.subject}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Exam:</span>
                      <div className="font-medium text-gray-900">{previewResult.exam?.examName || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Term:</span>
                      <div className="font-medium text-gray-900">{previewResult.term}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Academic Year:</span>
                      <div className="font-medium text-gray-900">{previewResult.academicYear}</div>
                    </div>
                  </div>
                </div>

                {/* Performance */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Performance</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Marks Obtained:</span>
                      <div className="font-medium text-gray-900">{previewResult.marksObtained}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Total Marks:</span>
                      <div className="font-medium text-gray-900">{previewResult.totalMarks}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Percentage:</span>
                      <div className="font-bold text-xl text-gray-900">{previewResult.percentage.toFixed(2)}%</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Grade:</span>
                      <div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getGradeColor(previewResult.grade)}`}>
                          {previewResult.grade}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Status:</span>
                      <div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(previewResult.status)}`}>
                          {previewResult.status}
                        </span>
                      </div>
                    </div>
                    {previewResult.position && (
                      <div>
                        <span className="text-sm text-gray-600">Position:</span>
                        <div className="font-medium text-gray-900">{previewResult.position}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Remarks */}
                {previewResult.remarks && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Remarks</h3>
                    <p className="text-gray-700">{previewResult.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Results;

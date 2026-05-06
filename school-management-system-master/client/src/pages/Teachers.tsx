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
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BookOpen,
  Award,
  Printer,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  Users
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { useSettings } from '../contexts/SettingsContext';
import { useSubjects } from '../hooks/useSubjects';
import IconActionButton from '../components/IconActionButton';

interface Teacher {
  _id: string;
  teacherId?: string; // Unique tracking ID
  name: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  qualification: string;
  experience: number;
  subject: string;
  joiningDate: string;
  salary: number;
  isActive: boolean;
  photo?: string;
}

interface TeacherForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  qualification: string;
  experience: number;
  subject: string;
  joiningDate: string;
  salary: number;
  isActive: string;
  photo?: FileList;
}

const Teachers: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [previewTeacher, setPreviewTeacher] = useState<Teacher | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTrackingId, setFilterTrackingId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const { getItemsPerPage } = useSettings();
  const { subjectNames: catalogSubjectNames } = useSubjects();
  const [itemsPerPage, setItemsPerPage] = useState(getItemsPerPage());
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Sorting state
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TeacherForm>();

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterSubject, filterTrackingId, filterStatus]);

  useEffect(() => {
    fetchTeachers();
  }, [currentPage, itemsPerPage, sortBy, sortOrder, searchTerm, filterSubject, filterTrackingId, filterStatus]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy: sortBy,
        sortOrder: sortOrder,
      });

      if (searchTerm) params.append('search', searchTerm);
      if (filterSubject) params.append('subject', filterSubject);
      if (filterTrackingId) params.append('trackingId', filterTrackingId);
      if (filterStatus) params.append('status', filterStatus);

      const response = await api.get(`/api/teachers?${params.toString()}`);
      setTeachers(response.data.data || []);
      
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.totalPages || 1);
        setTotalItems(response.data.pagination.totalItems || 0);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to fetch teachers');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: TeacherForm) => {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'photo' && value && value.length > 0) {
          formData.append('photo', value[0]);
        } else if (key === 'isActive') {
          formData.append('isActive', value === 'true' ? 'true' : 'false');
        } else {
          formData.append(key, value as string);
        }
      });

      if (editingTeacher) {
        await api.put(`/api/teachers/${editingTeacher._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Teacher updated successfully!');
      } else {
        await api.post('/api/teachers', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Teacher added successfully!');
      }
      fetchTeachers();
      handleCloseModal();
    } catch (error: any) {
      const backendErrors = error.response?.data?.errors;
      if (backendErrors) {
        Object.values(backendErrors).forEach((msg: any) => toast.error(msg));
      } else {
        toast.error(error.response?.data?.message || 'Operation failed');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        await api.delete(`/api/teachers/${id}`);
        toast.success('Teacher deleted successfully!');
        fetchTeachers();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Delete failed');
      }
    }
  };

  const handleEdit = (teacher: Teacher) => {
    console.log('Editing teacher:', teacher);
    setEditingTeacher(teacher);
    const genderValue: 'male' | 'female' | 'other' | undefined =
      teacher.gender?.toLowerCase() === 'male' ? 'male' :
      teacher.gender?.toLowerCase() === 'female' ? 'female' :
      teacher.gender?.toLowerCase() === 'other' ? 'other' : undefined;

    const formValues = {
      name: teacher.name || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
      address: teacher.address || '',
      dateOfBirth: teacher.dateOfBirth ? teacher.dateOfBirth.slice(0, 10) : '',
      gender: genderValue,
      qualification: teacher.qualification || '',
      experience: teacher.experience || 0,
      subject: teacher.subject || '',
      joiningDate: teacher.joiningDate ? teacher.joiningDate.slice(0, 10) : '',
      salary: teacher.salary || 0,
      isActive: teacher.isActive !== undefined ? (teacher.isActive ? 'true' : 'false') : 'true',
      photo: undefined, // Don't prefill photo
    };
    
    console.log('Form values to reset:', formValues);
    reset(formValues);
    
    // Explicitly set the problematic fields using setValue to ensure they're set
    setTimeout(() => {
      setValue('isActive', teacher.isActive !== undefined ? (teacher.isActive ? 'true' : 'false') : 'true');
    }, 0);
    
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTeacher(null);
    reset();
  };

  // Filtered teachers (already filtered on server, but keep for client-side if needed)
  const filteredTeachers = teachers;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all teachers on current page
      const currentPageIds = teachers.map(t => t._id);
      const combined = [...selectedTeachers, ...currentPageIds];
      setSelectedTeachers(Array.from(new Set(combined)));
    } else {
      // Deselect only current page teachers
      const currentPageIds = teachers.map(t => t._id);
      setSelectedTeachers(selectedTeachers.filter(id => !currentPageIds.includes(id)));
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order if same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) {
      return <ArrowUp className="h-3 w-3 text-gray-400" />;
    }
    return sortOrder === 'asc' ? 
      <ArrowUp className="h-3 w-3 text-primary-600" /> : 
      <ArrowDown className="h-3 w-3 text-primary-600" />;
  };

  const handleSelectTeacher = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedTeachers([...selectedTeachers, id]);
    } else {
      setSelectedTeachers(selectedTeachers.filter(t => t !== id));
    }
  };

  const handleExport = async (format: 'csv' | 'excel' = 'csv') => {
    try {
      toast.loading(`Exporting teachers as ${format.toUpperCase()}...`, { id: 'export' });
      
      // Build query string with current filters
      const params = new URLSearchParams();
      params.append('format', format);
      
      if (searchTerm) params.append('search', searchTerm);
      if (filterSubject) params.append('subject', filterSubject);
      if (filterStatus) params.append('status', filterStatus);
      
      const response = await api.get(`/api/teachers/export?${params.toString()}`, { 
        responseType: 'blob',
        timeout: 30000 // 30 second timeout for large exports
      });
      
      // Check if response is actually an error (JSON error response)
      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        toast.error(errorData.message || `Failed to export teachers as ${format.toUpperCase()}`, { id: 'export' });
        return;
      }
      
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = format === 'excel' 
        ? `teachers-${dateStr}.xlsx` 
        : `teachers-${dateStr}.csv`;
      
      saveAs(response.data, filename);
      toast.success(`Successfully exported ${totalItems || 'all'} teacher(s) as ${format.toUpperCase()}`, { id: 'export' });
    } catch (error: any) {
      console.error('Export error:', error);
      const errorMessage = error.response?.data?.message 
        || error.message 
        || `Failed to export teachers as ${format.toUpperCase()}`;
      toast.error(errorMessage, { id: 'export' });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      toast.error('Invalid file type. Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      e.target.value = ''; // Reset input
      return;
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 10MB limit. Please upload a smaller file.');
      e.target.value = ''; // Reset input
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const importToastId = toast.loading('Importing teachers...', { id: 'import' });
    
    try {
      const response = await api.post('/api/teachers/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000 // 60 second timeout for large imports
      });
      
      // Show detailed import summary
      if (response.data.summary) {
        const { total, success, errors, errorDetails } = response.data.summary;
        if (errors > 0) {
          toast.error(
            `Import completed with errors: ${success} succeeded, ${errors} failed out of ${total} total. Check console for details.`,
            { 
              id: 'import',
              duration: 8000 
            }
          );
          if (errorDetails && errorDetails.length > 0) {
            console.error('Import error details:', errorDetails);
            // Show first few errors in console
            console.warn('First 5 errors:', errorDetails.slice(0, 5));
          }
        } else {
          toast.success(
            `Successfully imported ${success} teacher(s) out of ${total} total`,
            { id: 'import' }
          );
        }
      } else {
        toast.success('Imported teachers successfully', { id: 'import' });
      }
      
      // Refresh the teacher list
      fetchTeachers();
    } catch (error: any) {
      console.error('Import error:', error);
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error 
        || error.message 
        || 'Failed to import teachers';
      toast.error(errorMessage, { id: 'import' });
    } finally {
      e.target.value = ''; // Reset input
    }
  };

  const handleBulkUpdate = async (action: 'activate' | 'deactivate') => {
    if (selectedTeachers.length === 0) {
      toast.error('Please select teachers to update');
      return;
    }
    
    try {
      await api.post('/api/teachers/bulk-update', {
        ids: selectedTeachers,
        action: action
      });
      toast.success(`${selectedTeachers.length} teacher(s) ${action}d successfully!`);
      setSelectedTeachers([]);
      fetchTeachers();
    } catch (error: any) {
      toast.error(`Failed to ${action} teachers`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTeachers.length === 0) {
      toast.error('Please select teachers to delete');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete ${selectedTeachers.length} teachers?`)) {
      try {
        await api.post('/api/teachers/bulk-delete', { ids: selectedTeachers });
        toast.success(`${selectedTeachers.length} teachers deleted successfully!`);
        setSelectedTeachers([]);
        fetchTeachers();
      } catch (error: any) {
        toast.error('Bulk delete failed');
      }
    }
  };

  const handlePreview = (teacher: Teacher) => {
    setPreviewTeacher(teacher);
    setShowPreviewModal(true);
  };

  const handlePrintProfile = () => {
    if (!previewTeacher) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Teacher Profile - ${previewTeacher.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .profile-section { margin-bottom: 20px; }
            .profile-section h3 { color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px; }
            .info-item { margin-bottom: 10px; }
            .info-label { font-weight: bold; color: #1e40af; }
            .photo { text-align: center; margin: 20px 0; }
            .photo img { max-width: 200px; border-radius: 50%; border: 4px solid #1e3a8a; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Teacher Profile</h1>
            <h2>${previewTeacher.name}</h2>
          </div>
          <div class="photo">
            <img src="${previewTeacher.photo || '/default-avatar.png'}" alt="${previewTeacher.name}" />
          </div>
          <div class="profile-section">
            <h3>Personal Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Tracking ID:</span> ${previewTeacher.teacherId || 'N/A'}
              </div>
              <div class="info-item">
                <span class="info-label">Email:</span> ${previewTeacher.email}
              </div>
              <div class="info-item">
                <span class="info-label">Phone:</span> ${previewTeacher.phone}
              </div>
              <div class="info-item">
                <span class="info-label">Date of Birth:</span> ${previewTeacher.dateOfBirth ? new Date(previewTeacher.dateOfBirth).toLocaleDateString() : 'N/A'}
              </div>
              <div class="info-item">
                <span class="info-label">Gender:</span> ${previewTeacher.gender || 'N/A'}
              </div>
              <div class="info-item">
                <span class="info-label">Address:</span> ${previewTeacher.address || 'N/A'}
              </div>
            </div>
          </div>
          <div class="profile-section">
            <h3>Professional Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Subject:</span> ${previewTeacher.subject}
              </div>
              <div class="info-item">
                <span class="info-label">Qualification:</span> ${previewTeacher.qualification}
              </div>
              <div class="info-item">
                <span class="info-label">Experience:</span> ${previewTeacher.experience} years
              </div>
              <div class="info-item">
                <span class="info-label">Joining Date:</span> ${previewTeacher.joiningDate ? new Date(previewTeacher.joiningDate).toLocaleDateString() : 'N/A'}
              </div>
              <div class="info-item">
                <span class="info-label">Salary:</span> $${previewTeacher.salary.toLocaleString()}/year
              </div>
              <div class="info-item">
                <span class="info-label">Status:</span> ${previewTeacher.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleGenerateIDCard = async (teacherId?: string) => {
    try {
      let url = '/api/teachers/id-card';
      
      if (teacherId) {
        // Single teacher
        url = `/api/teachers/id-card/${teacherId}`;
      } else if (selectedTeachers.length > 0) {
        // Batch generation for selected teachers
        const ids = selectedTeachers.join(',');
        url = `/api/teachers/id-card?ids=${ids}`;
      } else {
        toast.error('Please select at least one teacher or click on a specific teacher\'s ID card button');
        return;
      }
      
      const response = await api.get(url, {
        responseType: 'blob',
      });
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url_blob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url_blob;
      link.download = teacherId ? 'teacher-id-card.pdf' : 'teacher-id-cards.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url_blob);
      
      toast.success(
        teacherId 
          ? 'ID card generated successfully!' 
          : `Generated ID cards for ${selectedTeachers.length} teacher(s)!`
      );
    } catch (error: any) {
      console.error('Error generating ID card:', error);
      toast.error('Failed to generate ID card');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-gray-600">Manage teacher information and assignments</p>
        </div>
        <button
          type="button"
          title="Open form to add a new teacher"
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Teacher
        </button>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search teachers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="input-field"
          >
            <option value="">All Subjects</option>
            {catalogSubjectNames.map((s: string) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by Tracking ID..."
              value={filterTrackingId}
              onChange={(e) => setFilterTrackingId(e.target.value)}
              className="input-field"
            />
          </div>
        </div>
        
        {/* Import/Export Buttons */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Data Management:
            </span>
            <button 
              type="button"
              title="Download teacher list as CSV"
              onClick={() => handleExport('csv')}
              className="group relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-lg transition-opacity"></div>
              <Download className="h-4 w-4 group-hover:animate-bounce" />
              <span>Export CSV</span>
            </button>
            <button 
              type="button"
              title="Download teacher list as Excel"
              onClick={() => handleExport('excel')}
              className="group relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-lg transition-opacity"></div>
              <Download className="h-4 w-4 group-hover:animate-bounce" />
              <span>Export Excel</span>
            </button>
            <label
              title="Import teachers from CSV or Excel"
              className="group relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out cursor-pointer"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-lg transition-opacity"></div>
              <Upload className="h-4 w-4 group-hover:animate-bounce" />
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
      {selectedTeachers.length > 0 && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <span className="text-sm text-yellow-800 font-medium">
              {selectedTeachers.length} teacher(s) selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                title="Set selected teachers to active"
                onClick={() => handleBulkUpdate('activate')}
                className="btn-primary text-sm px-3 py-1"
              >
                Activate
              </button>
              <button
                type="button"
                title="Set selected teachers to inactive"
                onClick={() => handleBulkUpdate('deactivate')}
                className="btn-secondary text-sm px-3 py-1"
              >
                Deactivate
              </button>
              <button
                type="button"
                onClick={() => handleGenerateIDCard()}
                className="flex items-center gap-1 text-sm px-3 py-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                title="Generate ID cards PDF for selected teachers"
              >
                <CreditCard className="h-3 w-3" />
                Generate ID Cards
              </button>
              <button
                type="button"
                title="Permanently delete selected teachers"
                onClick={handleBulkDelete}
                className="btn-danger text-sm px-3 py-1"
              >
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teachers Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    title="Select all teachers on this page"
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    checked={teachers.every(t => selectedTeachers.includes(t._id)) && teachers.length > 0}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('teacherId')}>
                    Tracking ID
                    <SortIcon column="teacherId" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('name')}>
                    Teacher
                    <SortIcon column="name" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('subject')}>
                    Subject
                    <SortIcon column="subject" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Experience
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('isActive')}>
                    Status
                    <SortIcon column="isActive" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTeachers.map((teacher) => (
                <tr key={teacher._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedTeachers.includes(teacher._id)}
                      onChange={(e) => handleSelectTeacher(teacher._id, e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {teacher.teacherId && <span className="font-semibold text-primary-600">{teacher.teacherId}</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img
                          className="h-10 w-10 rounded-full object-cover"
                          src={teacher.photo || '/default-avatar.png'}
                          alt={teacher.name}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                        <div className="text-sm text-gray-500">{teacher.qualification}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{teacher.email}</div>
                    <div className="text-sm text-gray-500">{teacher.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {teacher.subject}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{teacher.experience} years</div>
                    <div className="text-sm text-gray-500">${teacher.salary.toLocaleString()}/year</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      teacher.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {teacher.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePreview(teacher)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Profile"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleGenerateIDCard(teacher._id)}
                        className="text-purple-600 hover:text-purple-900"
                        title="Generate ID Card"
                      >
                        <CreditCard className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(teacher)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(teacher._id)}
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
          
          {filteredTeachers.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No teachers found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || filterSubject || filterTrackingId
                  ? 'Try adjusting your search or filters.'
                  : 'Get started by adding a new teacher.'}
              </p>
            </div>
          )}
        </div>
        
        {/* Pagination Controls */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              type="button"
              title="Go to previous page"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              title="Go to next page"
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
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  type="button"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="First page"
                >
                  <ChevronsLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous page"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                {/* Page Numbers */}
                {totalPages > 0 && (
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
                          type="button"
                          title={`Go to page ${pageNum}`}
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
                )}
                
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next page"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Last page"
                >
                  <ChevronsRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Preview Modal */}
      {showPreviewModal && previewTeacher && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Teacher Profile</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  title="Open print dialog for this profile"
                  onClick={handlePrintProfile}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Printer className="h-4 w-4" />
                  Print Profile
                </button>
                <IconActionButton
                  onClick={() => setShowPreviewModal(false)}
                  tooltip="Close profile preview"
                  className="text-gray-400 hover:text-gray-600 focus:ring-gray-400"
                  sizeClass="p-1 rounded-md"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </IconActionButton>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="text-center">
                  <img
                    src={previewTeacher.photo || '/default-avatar.png'}
                    alt={previewTeacher.name}
                    className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-primary-200"
                  />
                  <h2 className="mt-4 text-xl font-bold text-gray-900">{previewTeacher.name}</h2>
                  <p className="text-sm text-gray-500">{previewTeacher.qualification}</p>
                  <span className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    previewTeacher.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {previewTeacher.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="md:col-span-2 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary-600" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Tracking ID</p>
                      <p className="font-medium">{previewTeacher.teacherId || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {previewTeacher.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {previewTeacher.phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {previewTeacher.dateOfBirth ? new Date(previewTeacher.dateOfBirth).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Gender</p>
                      <p className="font-medium">{previewTeacher.gender || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {previewTeacher.address || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary-600" />
                    Professional Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Subject</p>
                      <p className="font-medium">{previewTeacher.subject}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Qualification</p>
                      <p className="font-medium">{previewTeacher.qualification}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Experience</p>
                      <p className="font-medium">{previewTeacher.experience} years</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Joining Date</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {previewTeacher.joiningDate ? new Date(previewTeacher.joiningDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Salary</p>
                      <p className="font-medium flex items-center gap-1">
                        <Award className="h-4 w-4" />
                        ${previewTeacher.salary.toLocaleString()}/year
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
              </h3>
              <IconActionButton
                onClick={handleCloseModal}
                tooltip="Close dialog"
                className="text-gray-400 hover:text-gray-600 focus:ring-gray-400"
                sizeClass="p-1 rounded-md"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </IconActionButton>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    {...register('name', { required: 'Name is required' })}
                    className="input-field"
                    placeholder="Enter full name"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    className="input-field"
                    placeholder="Enter email"
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    {...register('phone', { required: 'Phone is required' })}
                    className="input-field"
                    placeholder="Enter phone number"
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <input
                    {...register('dateOfBirth', { required: 'Date of birth is required' })}
                    type="date"
                    className="input-field"
                  />
                  {errors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Gender</label>
                  <select
                    {...register('gender', { required: 'Gender is required' })}
                    className="input-field"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                  <select
                    {...register('subject', { required: 'Subject is required' })}
                    className="input-field"
                  >
                    <option value="">Select subject</option>
                    {(() => {
                      const names = new Set<string>(catalogSubjectNames);
                      if (editingTeacher?.subject?.trim()) {
                        names.add(editingTeacher.subject.trim());
                      }
                      return Array.from(names)
                        .sort()
                        .map((s: string) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ));
                    })()}
                  </select>
                  {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Qualification</label>
                  <input
                    {...register('qualification', { required: 'Qualification is required' })}
                    className="input-field"
                    placeholder="e.g., M.Sc. in Physics"
                  />
                  {errors.qualification && <p className="text-red-500 text-sm mt-1">{errors.qualification.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Experience (years)</label>
                  <input
                    {...register('experience', { 
                      required: 'Experience is required',
                      min: { value: 0, message: 'Experience must be 0 or more' }
                    })}
                    type="number"
                    className="input-field"
                    placeholder="Enter years of experience"
                  />
                  {errors.experience && <p className="text-red-500 text-sm mt-1">{errors.experience.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Joining Date</label>
                  <input
                    {...register('joiningDate', { required: 'Joining date is required' })}
                    type="date"
                    className="input-field"
                  />
                  {errors.joiningDate && <p className="text-red-500 text-sm mt-1">{errors.joiningDate.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Annual Salary (RS)</label>
                  <input
                    {...register('salary', { 
                      required: 'Salary is required',
                      min: { value: 0, message: 'Salary must be positive' }
                    })}
                    type="number"
                    className="input-field"
                    placeholder="Enter annual salary"
                  />
                  {errors.salary && <p className="text-red-500 text-sm mt-1">{errors.salary.message}</p>}
                </div>

                <div>
                  <label htmlFor="photo" className="block text-sm font-medium text-gray-700">Photo</label>
                  <input
                    type="file"
                    id="photo"
                    {...register('photo')}
                    accept="image/*"
                    className="input-field"
                  />
                </div>

                <div>
                  <label htmlFor="isActive" className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    {...register('isActive', { required: 'Status is required' })}
                    id="isActive"
                    name="isActive"
                    className="input-field"
                    defaultValue=""
                  >
                    <option value="">Select status</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                  {errors.isActive && <p className="text-red-500 text-sm mt-1">{errors.isActive.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <textarea
                  {...register('address', { required: 'Address is required' })}
                  rows={3}
                  className="input-field"
                  placeholder="Enter address"
                />
                {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary"
                  title="Discard changes and close"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  title={editingTeacher ? 'Save changes to this teacher' : 'Create teacher record'}
                >
                  {editingTeacher ? 'Update Teacher' : 'Add Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teachers; 
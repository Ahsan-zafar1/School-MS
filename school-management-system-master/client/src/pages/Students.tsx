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
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Printer,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { useClasses } from '../hooks/useClasses';
import { useSettings } from '../contexts/SettingsContext';

interface Student {
  _id: string;
  studentId?: string; // Unique tracking ID (permanent)
  name: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  class: string;
  rollNumber: string;
  parentName: string;
  parentPhone: string;
  admissionDate: string;
  isActive: boolean;
  photo?: string;
}

interface StudentForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  class: string;
  rollNumber?: string; // Optional - will be auto-generated if not provided
  parentName: string;
  parentPhone: string;
  admissionDate: string;
  isActive: string;
  photo?: FileList;
}

const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterTrackingId, setFilterTrackingId] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  
  // Fetch classes dynamically
  const { classNames, refetch: refetchClasses } = useClasses({ activeOnly: false });
  
  const { getItemsPerPage } = useSettings();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
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
    watch,
    formState: { errors },
  } = useForm<StudentForm>({
    defaultValues: {
      rollNumber: '' // Explicitly set to empty string
    }
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterClass, filterTrackingId]);

  useEffect(() => {
    fetchStudents();
  }, [currentPage, itemsPerPage, sortBy, sortOrder, searchTerm, filterClass, filterTrackingId]);

  // Listen for class updates
  useEffect(() => {
    const handleClassesUpdate = () => {
      refetchClasses();
    };
    window.addEventListener('classesUpdated', handleClassesUpdate);
    return () => {
      window.removeEventListener('classesUpdated', handleClassesUpdate);
    };
  }, [refetchClasses]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy: sortBy,
        sortOrder: sortOrder,
      });

      // Add filters if they exist
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (filterClass) {
        params.append('class', filterClass);
      }
      if (filterTrackingId) {
        params.append('trackingId', filterTrackingId);
      }

      const response = await api.get(`/api/students?${params.toString()}`);
      setStudents(response.data.data || []);
      
      // Update pagination info
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.totalPages);
        setTotalItems(response.data.pagination.totalItems);
      } else {
        // Fallback if pagination info is missing
        setTotalPages(1);
        setTotalItems(response.data.data?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students');
      setStudents([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: StudentForm) => {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'photo' && value && value.length > 0) {
          formData.append('photo', value[0]);
        } else if (key === 'isActive') {
          formData.append('isActive', value === 'true' ? 'true' : 'false');
        } else if (key === 'rollNumber') {
          // For new students: NEVER send rollNumber - let backend always generate it
          // For editing: only send if it's provided and not empty
          if (editingStudent && value && value.trim() !== '') {
            formData.append(key, value as string);
          }
          // For new students, skip this field completely
        } else {
          formData.append(key, value as string);
        }
      });
      
      console.log('Form submission - editingStudent:', editingStudent);
      console.log('Form data rollNumber:', data.rollNumber);
      
      if (editingStudent) {
        await api.put(`/api/students/${editingStudent._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Student updated successfully!');
      } else {
        // For new students, explicitly ensure rollNumber is not sent
        formData.delete('rollNumber');
        console.log('Creating new student - rollNumber removed from FormData');
        await api.post('/api/students', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Student added successfully!');
      }
      await fetchStudents();
      handleCloseModal();
      // Reset to first page if we're on a page that might not exist after deletion
      if (currentPage > 1 && filteredStudents.length === 1) {
        setCurrentPage(currentPage - 1);
      }
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
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await api.delete(`/api/students/${id}`);
        toast.success('Student deleted successfully!');
        await fetchStudents();
        // Reset to first page if we're on a page that might not exist after deletion
        if (currentPage > 1 && filteredStudents.length === 1) {
          setCurrentPage(currentPage - 1);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Delete failed');
      }
    }
  };

  const handleEdit = (student: Student) => {
    console.log('Editing student:', student);
    console.log('Parent Name:', student.parentName);
    console.log('Parent Phone:', student.parentPhone);
    console.log('Is Active:', student.isActive);
    setEditingStudent(student);
    
    // Explicitly set all fields to ensure proper prefilling
    const genderValue: 'Male' | 'Female' | 'Other' | undefined = 
      student.gender?.toLowerCase() === 'male' ? 'Male' :
      student.gender?.toLowerCase() === 'female' ? 'Female' :
      student.gender?.toLowerCase() === 'other' ? 'Other' : undefined;
    
    const formValues: Partial<StudentForm> = {
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || '',
      address: student.address || '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
      gender: genderValue,
      class: student.class || '',
      rollNumber: student.rollNumber || '',
      admissionDate: student.admissionDate ? student.admissionDate.slice(0, 10) : '',
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      isActive: student.isActive !== undefined ? (student.isActive ? 'true' : 'false') : 'true',
      photo: undefined, // Don't prefill photo
    };
    
    console.log('Form values to reset:', formValues);
    reset(formValues);
    
    // Explicitly set the problematic fields using setValue to ensure they're set
    setTimeout(() => {
      setValue('parentName', student.parentName || '');
      setValue('parentPhone', student.parentPhone || '');
      setValue('isActive', student.isActive !== undefined ? (student.isActive ? 'true' : 'false') : 'true');
    }, 0);
    
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStudent(null);
    reset({
      name: '',
      email: '',
      phone: '',
      address: '',
      dateOfBirth: '',
      gender: undefined,
      class: '',
      rollNumber: '', // Explicitly clear roll number
      parentName: '',
      parentPhone: '',
      admissionDate: '',
      isActive: '',
      photo: undefined,
    });
  };

  // Filtering is now done on the server, but we keep this for backward compatibility
  // and for any client-side operations that might need it
  const filteredStudents = students;

  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select students to delete');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete ${selectedStudents.length} students?`)) {
      try {
        await api.post('/api/students/bulk-delete', { ids: selectedStudents });
        toast.success(`${selectedStudents.length} students deleted successfully!`);
        setSelectedStudents([]);
        await fetchStudents();
        // Reset to first page if needed
        if (currentPage > 1) {
          setCurrentPage(1);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Bulk delete failed');
      }
    }
  };

  const handlePrintProfile = (student: Student) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Profile - ${student.name}</title>
          <style>
            @media print {
              @page {
                margin: 20mm;
              }
              body {
                font-family: Arial, sans-serif;
                color: #000;
              }
              .no-print {
                display: none;
              }
            }
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              color: #2563eb;
              font-size: 28px;
            }
            .profile-section {
              display: flex;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
            }
            .profile-photo {
              width: 150px;
              height: 150px;
              border-radius: 50%;
              object-fit: cover;
              border: 4px solid #2563eb;
              margin-right: 30px;
            }
            .profile-info h2 {
              margin: 0 0 10px 0;
              font-size: 24px;
              color: #111827;
            }
            .info-row {
              margin: 8px 0;
              font-size: 14px;
            }
            .info-label {
              font-weight: bold;
              color: #4b5563;
              display: inline-block;
              width: 140px;
            }
            .section {
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 1px solid #e5e7eb;
            }
            .section h3 {
              color: #2563eb;
              font-size: 20px;
              margin-bottom: 15px;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 5px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
            }
            .info-item {
              margin-bottom: 12px;
            }
            .info-item-label {
              font-weight: bold;
              color: #6b7280;
              font-size: 12px;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .info-item-value {
              color: #111827;
              font-size: 14px;
            }
            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
            }
            .badge-blue {
              background-color: #dbeafe;
              color: #1e40af;
            }
            .badge-green {
              background-color: #d1fae5;
              color: #065f46;
            }
            .badge-red {
              background-color: #fee2e2;
              color: #991b1b;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Student Profile</h1>
            <p style="margin: 5px 0; color: #6b7280;">Generated on ${new Date().toLocaleString()}</p>
          </div>

          <div class="profile-section">
            <img src="${student.photo || '/default-avatar.png'}" alt="${student.name}" class="profile-photo" onerror="this.src='/default-avatar.png'">
            <div class="profile-info">
              <h2>${student.name}</h2>
              <div class="info-row">
                <span class="info-label">Tracking ID:</span>
                <span>${student.studentId || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Roll Number:</span>
                <span>${student.rollNumber || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Class:</span>
                <span class="badge badge-blue">${student.class || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="badge ${student.isActive ? 'badge-green' : 'badge-red'}">
                  ${student.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>Personal Information</h3>
            <div class="grid">
              <div class="info-item">
                <div class="info-item-label">Email</div>
                <div class="info-item-value">${student.email || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-item-label">Phone</div>
                <div class="info-item-value">${student.phone || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-item-label">Address</div>
                <div class="info-item-value">${student.address || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-item-label">Date of Birth</div>
                <div class="info-item-value">${student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-item-label">Gender</div>
                <div class="info-item-value">${student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-item-label">Admission Date</div>
                <div class="info-item-value">${student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : 'N/A'}</div>
              </div>
            </div>
          </div>

          ${(student.parentName || student.parentPhone) ? `
          <div class="section">
            <h3>Parent/Guardian Information</h3>
            <div class="grid">
              ${student.parentName ? `
              <div class="info-item">
                <div class="info-item-label">Parent Name</div>
                <div class="info-item-value">${student.parentName}</div>
              </div>
              ` : ''}
              ${student.parentPhone ? `
              <div class="info-item">
                <div class="info-item-label">Parent Phone</div>
                <div class="info-item-value">${student.parentPhone}</div>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}

          <div class="footer">
            <p>This is a computer-generated document. For official records, please contact the school administration.</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleBulkUpdate = async (action: string, className?: string) => {
    if (selectedStudents.length === 0) {
      toast.error('Please select students');
      return;
    }

    let confirmMessage = '';
    if (action === 'activate') {
      confirmMessage = `Are you sure you want to activate ${selectedStudents.length} student(s)?`;
    } else if (action === 'deactivate') {
      confirmMessage = `Are you sure you want to deactivate ${selectedStudents.length} student(s)?`;
    } else if (action === 'assignClass') {
      if (!className) {
        toast.error('Please select a class');
        return;
      }
      confirmMessage = `Are you sure you want to assign ${selectedStudents.length} student(s) to class ${className}?`;
    }

    if (window.confirm(confirmMessage)) {
      try {
        const payload: any = { ids: selectedStudents, action };
        if (action === 'assignClass' && className) {
          payload.className = className;
        }
        await api.post('/api/students/bulk-update', payload);
        toast.success(`Bulk ${action} successful!`);
        setSelectedStudents([]);
        await fetchStudents();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Bulk update failed');
      }
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all students on current page
      const currentPageIds = students.map(s => s._id);
      // Add to existing selection (don't replace, in case user wants to select across pages)
      const combined = [...selectedStudents, ...currentPageIds];
      setSelectedStudents(Array.from(new Set(combined)));
    } else {
      // Deselect only current page students
      const currentPageIds = students.map(s => s._id);
      setSelectedStudents(selectedStudents.filter(id => !currentPageIds.includes(id)));
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
    setCurrentPage(newPage);
    setSelectedStudents([]); // Clear selection when changing pages
  };

  const handleItemsPerPageChange = (newLimit: number) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1); // Reset to first page
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) {
      return <ArrowUp className="h-3 w-3 text-gray-400" />;
    }
    return sortOrder === 'asc' ? 
      <ArrowUp className="h-3 w-3 text-primary-600" /> : 
      <ArrowDown className="h-3 w-3 text-primary-600" />;
  };

  const handleSelectStudent = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents([...selectedStudents, id]);
    } else {
      setSelectedStudents(selectedStudents.filter(s => s !== id));
    }
  };

  const handleExport = async (format: 'csv' | 'excel' = 'csv') => {
    try {
      const response = await api.get(`/api/students/export?format=${format}`, { responseType: 'blob' });
      const filename = format === 'excel' ? 'students.xlsx' : 'students.csv';
      saveAs(response.data, filename);
      toast.success(`Exported students as ${format.toUpperCase()}`);
    } catch (error: any) {
      toast.error(`Failed to export students as ${format.toUpperCase()}`);
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
    
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post('/api/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      // Show detailed import summary
      if (response.data.summary) {
        const { total, success, errors, errorDetails } = response.data.summary;
        if (errors > 0) {
          toast.error(
            `Import completed with errors: ${success} succeeded, ${errors} failed out of ${total} total`,
            { duration: 5000 }
          );
          if (errorDetails && errorDetails.length > 0) {
            console.error('Import errors:', errorDetails);
          }
        } else {
          toast.success(`Successfully imported ${success} student(s) out of ${total} total`);
        }
      } else {
        toast.success('Imported students successfully');
      }
      
      fetchStudents();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to import students';
      toast.error(errorMessage);
    } finally {
      e.target.value = ''; // Reset input
    }
  };

  const handleGenerateIDCard = async (studentId?: string) => {
    try {
      let url = '/api/students/id-card';
      
      if (studentId) {
        // Single student
        url = `/api/students/id-card/${studentId}`;
      } else if (selectedStudents.length > 0) {
        // Batch generation for selected students
        const ids = selectedStudents.join(',');
        url = `/api/students/id-card?ids=${ids}`;
      } else {
        toast.error('Please select at least one student or click on a specific student\'s ID card button');
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
      link.download = studentId ? 'student-id-card.pdf' : 'student-id-cards.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url_blob);
      
      toast.success(
        studentId 
          ? 'ID card generated successfully!' 
          : `Generated ID cards for ${selectedStudents.length} student(s)!`
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
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600">Manage student information and records</p>
        </div>
        <button
          onClick={() => {
            reset({
              name: '',
              email: '',
              phone: '',
              address: '',
              dateOfBirth: '',
              gender: undefined,
              class: '',
              rollNumber: '', // Explicitly clear roll number for new student
              parentName: '',
              parentPhone: '',
              admissionDate: '',
              isActive: '',
              photo: undefined,
            });
            setEditingStudent(null);
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Student
        </button>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
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
              onClick={() => handleExport('csv')}
              className="group relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-lg transition-opacity"></div>
              <Download className="h-4 w-4 group-hover:animate-bounce" />
              <span>Export CSV</span>
            </button>
            <button 
              onClick={() => handleExport('excel')}
              className="group relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-lg transition-opacity"></div>
              <Download className="h-4 w-4 group-hover:animate-bounce" />
              <span>Export Excel</span>
            </button>
            <label className="group relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out cursor-pointer">
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
      {selectedStudents.length > 0 && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <span className="text-sm text-yellow-800 font-medium">
              {selectedStudents.length} student(s) selected
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
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkUpdate('assignClass', e.target.value);
                    e.target.value = '';
                  }
                }}
                className="input-field text-sm px-3 py-1"
                defaultValue=""
              >
                <option value="">Assign to Class...</option>
                {classNames.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleGenerateIDCard()}
                className="flex items-center gap-1 text-sm px-3 py-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                title="Generate ID Cards for Selected Students"
              >
                <CreditCard className="h-3 w-3" />
                Generate ID Cards
              </button>
              <button
                onClick={handleBulkDelete}
                className="btn-danger text-sm px-3 py-1"
              >
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    checked={students.length > 0 && students.every(s => selectedStudents.includes(s._id))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('studentId')}
                >
                  <div className="flex items-center gap-1">
                    Tracking ID
                    <SortIcon column="studentId" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Student
                    <SortIcon column="name" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('class')}
                >
                  <div className="flex items-center gap-1">
                    Class
                    <SortIcon column="class" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('isActive')}
                >
                  <div className="flex items-center gap-1">
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
              {filteredStudents.map((student) => (
                <tr key={student._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student._id)}
                      onChange={(e) => handleSelectStudent(student._id, e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                  {student.studentId && <span className="font-semibold text-primary-600"> {student.studentId}</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img
                          className="h-10 w-10 rounded-full object-cover"
                          src={student.photo || '/default-avatar.png'}
                          alt={student.name}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500">
                          <span>Roll: {student.rollNumber}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{student.email}</div>
                    <div className="text-sm text-gray-500">{student.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {student.class}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      student.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {student.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setPreviewStudent(student);
                          setShowPreviewModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Profile"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleGenerateIDCard(student._id)}
                        className="text-purple-600 hover:text-purple-900"
                        title="Generate ID Card"
                      >
                        <CreditCard className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(student)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(student._id)}
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
          
          {filteredStudents.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || filterClass || filterTrackingId
                  ? 'Try adjusting your search or filters.'
                  : 'Get started by adding a new student.'}
              </p>
            </div>
          )}
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
              <div className="hidden items-center gap-2">
                <span className="text-sm text-gray-700">Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="input-field text-sm py-1 px-2"
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
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next page"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <button
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingStudent ? 'Edit Student' : 'Add New Student'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
                    id="gender"
                    name="gender"
                    className="input-field"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Class</label>
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
                  <label className="block text-sm font-medium text-gray-700">
                    Roll Number
                    <span className="text-xs text-gray-500 ml-2">(Auto-generated if left empty)</span>
                  </label>
                  <input
                    {...register('rollNumber')}
                    className="input-field"
                    placeholder="Leave empty for auto-generation (e.g., 10A-001)"
                    disabled={!watch('class')}
                  />
                  {watch('class') && !watch('rollNumber') && (
                    <p className="text-xs text-blue-600 mt-1">
                      Will be auto-generated as: {watch('class')}-XXX
                    </p>
                  )}
                  {errors.rollNumber && <p className="text-red-500 text-sm mt-1">{errors.rollNumber.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Admission Date</label>
                  <input
                    {...register('admissionDate', { required: 'Admission date is required' })}
                    type="date"
                    className="input-field"
                  />
                  {errors.admissionDate && <p className="text-red-500 text-sm mt-1">{errors.admissionDate.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Parent Name</label>
                  <input
                    {...register('parentName', { required: 'Parent name is required' })}
                    className="input-field"
                    placeholder="Enter parent name"
                  />
                  {errors.parentName && <p className="text-red-500 text-sm mt-1">{errors.parentName.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Parent Phone</label>
                  <input
                    {...register('parentPhone', { required: 'Parent phone is required' })}
                    className="input-field"
                    placeholder="Enter parent phone"
                  />
                  {errors.parentPhone && <p className="text-red-500 text-sm mt-1">{errors.parentPhone.message}</p>}
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
                  id="address"
                  name="address"
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
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {editingStudent ? 'Update Student' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Preview Modal */}
      {showPreviewModal && previewStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Student Profile</h3>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewStudent(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-start space-x-6 pb-6 border-b">
                <div className="flex-shrink-0">
                  <img
                    className="h-32 w-32 rounded-full object-cover border-4 border-primary-200"
                    src={previewStudent.photo || '/default-avatar.png'}
                    alt={previewStudent.name}
                  />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">{previewStudent.name}</h2>
                  <div className="mt-2 space-y-1">
                    {previewStudent.studentId && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-semibold text-primary-600 mr-2">Tracking ID:</span>
                        <span>{previewStudent.studentId}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <GraduationCap className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="font-semibold mr-2">Roll Number:</span>
                      <span>{previewStudent.rollNumber}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-semibold mr-2">Class:</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {previewStudent.class}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        previewStudent.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {previewStudent.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start">
                    <Mail className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-sm text-gray-900">{previewStudent.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Phone className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="text-sm text-gray-900">{previewStudent.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Address</p>
                      <p className="text-sm text-gray-900">{previewStudent.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Date of Birth</p>
                      <p className="text-sm text-gray-900">
                        {previewStudent.dateOfBirth ? new Date(previewStudent.dateOfBirth).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Users className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Gender</p>
                      <p className="text-sm text-gray-900 capitalize">{previewStudent.gender || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Admission Date</p>
                      <p className="text-sm text-gray-900">
                        {previewStudent.admissionDate ? new Date(previewStudent.admissionDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parent/Guardian Information */}
              {(previewStudent.parentName || previewStudent.parentPhone) && (
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Parent/Guardian Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {previewStudent.parentName && (
                      <div className="flex items-start">
                        <Users className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Parent Name</p>
                          <p className="text-sm text-gray-900">{previewStudent.parentName}</p>
                        </div>
                      </div>
                    )}
                    {previewStudent.parentPhone && (
                      <div className="flex items-start">
                        <Phone className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Parent Phone</p>
                          <p className="text-sm text-gray-900">{previewStudent.parentPhone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setPreviewStudent(null);
                  }}
                  className="btn-secondary"
                >
                  Close
                </button>
                <button
                  onClick={() => handlePrintProfile(previewStudent)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print Profile
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    handleEdit(previewStudent);
                  }}
                  className="btn-primary"
                >
                  Edit Student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students; 
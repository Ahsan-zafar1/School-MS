import React, { useState, useEffect, useMemo } from 'react';
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
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  GraduationCap,
  Printer,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square
} from 'lucide-react';
import axios from 'axios';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { useSubjects } from '../hooks/useSubjects';
import { useSettings } from '../contexts/SettingsContext';
import PromoteStudentsModal, {
  type PromotionFormValues,
  type PromotionPreviewState,
  type PromotionCandidatePreview,
} from '../components/PromoteStudentsModal';
import IconActionButton from '../components/IconActionButton';

interface Class {
  _id: string;
  classId?: string;
  name: string;
  grade?: string;
  section: string;
  capacity: number;
  currentStudents?: number;
  classTeacher?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  roomNumber?: string;
  academicYear: string;
  isActive: boolean;
  subjects?: Array<{ name: string; teacher?: { name: string } }>;
  description?: string;
  students?: Array<{ _id: string; name: string; rollNumber?: string }>;
}

interface ClassForm {
  name: string;
  grade: string;
  section: string;
  capacity: number;
  classTeacher: string;
  roomNumber: string;
  academicYear: string;
  subjects: string[];
  description: string;
  isActive: string;
}

interface ClassStudent {
  _id: string;
  name: string;
  rollNumber?: string;
  email?: string;
  phone?: string;
}

const Classes: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [previewClass, setPreviewClass] = useState<Class | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showClassStudentsModal, setShowClassStudentsModal] = useState(false);
  const [classStudentsLoading, setClassStudentsLoading] = useState(false);
  const [classStudentsTarget, setClassStudentsTarget] = useState<Class | null>(null);
  const [classStudentsList, setClassStudentsList] = useState<ClassStudent[]>([]);
  const [classStudentsSelectedIds, setClassStudentsSelectedIds] = useState<string[]>([]);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteDryRunLoading, setPromoteDryRunLoading] = useState(false);
  const [promotionMode, setPromotionMode] = useState<'class' | 'students'>('class');
  const [promotionStudentIds, setPromotionStudentIds] = useState<string[]>([]);
  const [promotionPreview, setPromotionPreview] = useState<PromotionPreviewState | null>(null);
  const [promotionForm, setPromotionForm] = useState<PromotionFormValues>({
    fromClass: '',
    toClass: '',
    toSection: '',
    fromAcademicYear: '',
    toAcademicYear: String(new Date().getFullYear()),
    includeInactive: false,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('');
  const [academicYearFilterInitialized, setAcademicYearFilterInitialized] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const { getDefaultAcademicYear, loading: settingsLoading } = useSettings();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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
  } = useForm<ClassForm>();

  const { subjectNames: catalogSubjectNames } = useSubjects();
  const watchedSubjects = watch('subjects', []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterGrade, filterStatus, filterAcademicYear]);

  // Fetch all classes to get unique grades and academic years (without pagination)
  const [allClassesForFilters, setAllClassesForFilters] = useState<Class[]>([]);
  const [filterSourceLoaded, setFilterSourceLoaded] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (!filterSourceLoaded || settingsLoading || !academicYearFilterInitialized) return;
    const controller = new AbortController();
    fetchClasses(controller.signal);
    return () => controller.abort();
  }, [
    filterSourceLoaded,
    settingsLoading,
    academicYearFilterInitialized,
    currentPage,
    itemsPerPage,
    sortBy,
    sortOrder,
    searchTerm,
    filterGrade,
    filterStatus,
    filterAcademicYear,
  ]);

  // Fetch all classes for filters separately (only once or when classes are updated)
  useEffect(() => {
    fetchAllClassesForFilters();
  }, []); // Only fetch once on mount

  // Also refresh when classes are updated
  useEffect(() => {
    const handleClassesUpdate = () => {
      fetchAllClassesForFilters();
    };
    window.addEventListener('classesUpdated', handleClassesUpdate);
    return () => {
      window.removeEventListener('classesUpdated', handleClassesUpdate);
    };
  }, []);

  const fetchAllClassesForFilters = async () => {
    try {
      const response = await api.get('/api/classes?limit=1000&sortBy=name&sortOrder=asc');
      const fetchedClasses = response.data.data || [];
      setAllClassesForFilters(fetchedClasses);
    } catch (error) {
      console.error('Error fetching classes for filters:', error);
    } finally {
      setFilterSourceLoaded(true);
    }
  };

  // Get unique grades from all classes
  const getUniqueGrades = (): string[] => {
    // In this filter, user wants exact generated class names (e.g. "1-A", "KG-B").
    const grades = new Set<string>();
    allClassesForFilters.forEach((cls) => {
      const className = (cls.name || '').trim();
      if (className) {
        grades.add(className);
      }
    });

    return Array.from(grades).sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  // Get unique academic years from all classes
  const getUniqueAcademicYears = (): string[] => {
    const years = new Set<string>();
    allClassesForFilters.forEach(cls => {
      if (cls.academicYear && cls.academicYear.trim()) {
        years.add(cls.academicYear);
      }
    });
    return Array.from(years).sort().reverse(); // Most recent first
  };

  const academicYearOptions = useMemo(() => getUniqueAcademicYears(), [allClassesForFilters]);
  const classNameOptions = useMemo(() => getUniqueGrades(), [allClassesForFilters]);
  const promotionSectionOptions = useMemo(() => {
    const sections = new Set<string>();
    allClassesForFilters.forEach((cls) => {
      if (cls.name === promotionForm.toClass && cls.section) {
        sections.add(cls.section.trim());
      }
    });
    return Array.from(sections).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allClassesForFilters, promotionForm.toClass]);

  // Auto-select current/default year once (do not override manual selection).
  // Wait for filter-source fetch + settings so the default matches school config.
  useEffect(() => {
    if (!filterSourceLoaded || settingsLoading) return;
    if (academicYearFilterInitialized) return;
    if (filterAcademicYear) {
      setAcademicYearFilterInitialized(true);
      return;
    }

    const configuredDefaultYear = getDefaultAcademicYear();

    if (academicYearOptions.length === 0) {
      setFilterAcademicYear(configuredDefaultYear || '');
      setAcademicYearFilterInitialized(true);
      return;
    }

    const exact = academicYearOptions.find((y) => y === configuredDefaultYear);
    if (exact) {
      setFilterAcademicYear(exact);
      setAcademicYearFilterInitialized(true);
      return;
    }

    const startYear = configuredDefaultYear?.match(/^(\d{4})/)?.[1];
    if (startYear) {
      const sameStartYear = academicYearOptions.find(
        (y) => y === startYear || y.startsWith(`${startYear}-`)
      );
      if (sameStartYear) {
        setFilterAcademicYear(sameStartYear);
        setAcademicYearFilterInitialized(true);
        return;
      }
    }

    setFilterAcademicYear(academicYearOptions[0]);
    setAcademicYearFilterInitialized(true);
  }, [
    filterSourceLoaded,
    settingsLoading,
    academicYearFilterInitialized,
    filterAcademicYear,
    academicYearOptions,
    getDefaultAcademicYear,
  ]);

  const fetchClasses = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy: sortBy,
        sortOrder: sortOrder,
      });

      if (searchTerm) params.append('search', searchTerm);
      if (filterGrade) params.append('grade', filterGrade);
      if (filterStatus) params.append('status', filterStatus);
      if (filterAcademicYear) params.append('academicYear', filterAcademicYear);

      const response = await api.get(`/api/classes?${params.toString()}`, { signal });
      setClasses(response.data.data || []);
      
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.totalPages);
        setTotalItems(response.data.pagination.totalItems);
      } else {
        setTotalPages(1);
        setTotalItems(response.data.data?.length || 0);
      }
    } catch (error: unknown) {
      if (axios.isCancel(error)) return;
      console.error('Error fetching classes:', error);
      toast.error('Failed to fetch classes');
      setClasses([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/api/teachers?limit=1000');
      setTeachers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const onSubmit = async (data: ClassForm) => {
    try {
      const classData = {
        ...data,
        classTeacher: data.classTeacher || undefined,
        subjects: data.subjects.map(name => ({ name })),
        isActive: data.isActive === 'true'
      };

      if (editingClass) {
        const res = await api.put(`/api/classes/${editingClass._id}`, classData);
        const cascade = res.data?.classNameCascade;
        if (cascade && !cascade.error) {
          const parts = [
            cascade.studentsModified && `${cascade.studentsModified} students`,
            cascade.examsModified && `${cascade.examsModified} exams`,
            cascade.examMarksModified && `${cascade.examMarksModified} exam marks`,
            cascade.feesModified && `${cascade.feesModified} fees`,
            cascade.attendanceModified && `${cascade.attendanceModified} attendance`,
          ].filter(Boolean);
          toast.success(
            parts.length
              ? `Class updated. Linked records updated: ${parts.join(', ')}.`
              : 'Class updated successfully!'
          );
        } else {
          toast.success('Class updated successfully!');
        }
      } else {
        await api.post('/api/classes', classData);
        toast.success('Class added successfully!');
      }
      fetchClasses();
      fetchAllClassesForFilters(); // Refresh filter options
      handleCloseModal();
      setSelectedClasses([]);
      // Notify other components that classes have been updated
      window.dispatchEvent(new CustomEvent('classesUpdated'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      try {
        await api.delete(`/api/classes/${id}`);
        toast.success('Class deleted successfully!');
        fetchClasses();
        fetchAllClassesForFilters(); // Refresh filter options
        setSelectedClasses([]);
        window.dispatchEvent(new CustomEvent('classesUpdated'));
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Delete failed');
      }
    }
  };

  const handleEdit = (classItem: Class) => {
    setEditingClass(classItem);
    const formValues = {
      name: classItem.name || '',
      grade: classItem.grade || '',
      section: classItem.section || '',
      capacity: classItem.capacity || 40,
      classTeacher: classItem.classTeacher?._id || '',
      roomNumber: classItem.roomNumber || '',
      academicYear: classItem.academicYear || '',
      subjects: classItem.subjects ? classItem.subjects.map(s => s.name) : [],
      description: classItem.description || '',
      isActive: classItem.isActive !== undefined ? (classItem.isActive ? 'true' : 'false') : 'true',
    };
    
    reset(formValues);
    
    setTimeout(() => {
      setValue('isActive', classItem.isActive !== undefined ? (classItem.isActive ? 'true' : 'false') : 'true');
    }, 0);
    
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClass(null);
    reset({
      name: '',
      grade: '',
      section: '',
      capacity: 40,
      classTeacher: '',
      roomNumber: '',
      academicYear: '',
      subjects: [],
      description: '',
      isActive: 'true',
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedClasses(classes.map(c => c._id));
    } else {
      setSelectedClasses([]);
    }
  };

  const handleSelectClass = (id: string) => {
    if (selectedClasses.includes(id)) {
      setSelectedClasses(selectedClasses.filter(c => c !== id));
    } else {
      setSelectedClasses([...selectedClasses, id]);
    }
  };

  const handleBulkUpdate = async (isActive: boolean) => {
    if (selectedClasses.length === 0) {
      toast.error('Please select at least one class');
      return;
    }

    if (window.confirm(`Are you sure you want to ${isActive ? 'activate' : 'deactivate'} ${selectedClasses.length} class(es)?`)) {
      try {
        await api.post('/api/classes/bulk-update', {
          classIds: selectedClasses,
          isActive
        });
        toast.success(`Successfully ${isActive ? 'activated' : 'deactivated'} ${selectedClasses.length} class(es)`);
        fetchClasses();
        fetchAllClassesForFilters(); // Refresh filter options
        setSelectedClasses([]);
        window.dispatchEvent(new CustomEvent('classesUpdated'));
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Bulk update failed');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedClasses.length === 0) {
      toast.error('Please select at least one class');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedClasses.length} class(es)? This action cannot be undone.`)) {
      try {
        await api.post('/api/classes/bulk-delete', {
          classIds: selectedClasses
        });
        toast.success(`Successfully deleted ${selectedClasses.length} class(es)`);
        fetchClasses();
        fetchAllClassesForFilters(); // Refresh filter options
        setSelectedClasses([]);
        window.dispatchEvent(new CustomEvent('classesUpdated'));
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Bulk delete failed');
      }
    }
  };

  const handleExport = async (format: 'csv' | 'excel' = 'csv') => {
    try {
      const toastId = toast.loading('Exporting classes...');
      
      const params = new URLSearchParams({
        format: format === 'excel' ? 'excel' : 'csv',
      });

      if (searchTerm) params.append('search', searchTerm);
      if (filterGrade) params.append('grade', filterGrade);
      if (filterStatus) params.append('status', filterStatus);
      if (filterAcademicYear) params.append('academicYear', filterAcademicYear);

      const response = await api.get(`/api/classes/export?${params.toString()}`, {
        responseType: 'blob',
        timeout: 30000,
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      if (format === 'excel') {
        link.download = `classes-${new Date().toISOString().split('T')[0]}.xlsx`;
      } else {
        link.download = `classes-${new Date().toISOString().split('T')[0]}.csv`;
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Classes exported as ${format.toUpperCase()}`, { id: toastId });
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

    const validTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(fileExtension)) {
      toast.error('Invalid file type. Please upload a CSV or Excel file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const toastId = toast.loading('Importing classes...');
      
      const response = await api.post('/api/classes/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });

      toast.success(
        `Import completed: ${response.data.imported} imported, ${response.data.errors} errors`,
        { id: toastId, duration: 5000 }
      );

      if (response.data.errorDetails && response.data.errorDetails.length > 0) {
        console.error('Import errors:', response.data.errorDetails);
        toast.error(`Some rows had errors. Check console for details.`, { duration: 5000 });
      }

      fetchClasses();
      e.target.value = ''; // Reset file input
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.response?.data?.message || 'Import failed');
      e.target.value = '';
    }
  };

  const handlePreview = (classItem: Class) => {
    setPreviewClass(classItem);
    setShowPreviewModal(true);
  };

  const handleViewClassStudents = async (classItem: Class) => {
    setClassStudentsTarget(classItem);
    setShowClassStudentsModal(true);
    setClassStudentsLoading(true);
    setClassStudentsSelectedIds([]);
    try {
      const response = await api.get(
        `/api/students/class/${encodeURIComponent(classItem.name)}?classId=${classItem._id}`
      );
      setClassStudentsList(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching class students:', error);
      setClassStudentsList((classItem.students || []) as ClassStudent[]);
      toast.error('Could not load latest class students. Showing available data.');
    } finally {
      setClassStudentsLoading(false);
    }
  };

  const openPromoteClassModal = (classItem: Class) => {
    setPromotionMode('class');
    setPromotionStudentIds([]);
    setPromotionPreview(null);
    setPromotionForm((prev) => ({
      ...prev,
      fromClass: classItem.name || '',
      toClass: '',
      toSection: '',
      fromAcademicYear: classItem.academicYear || prev.fromAcademicYear || '',
    }));
    setShowPromoteModal(true);
  };

  const openPromoteSelectedStudentsModal = () => {
    if (!classStudentsTarget || classStudentsSelectedIds.length === 0) {
      toast.error('Please select student(s) first');
      return;
    }
    setPromotionMode('students');
    setPromotionStudentIds(classStudentsSelectedIds);
    setPromotionPreview(null);
    setPromotionForm((prev) => ({
      ...prev,
      fromClass: classStudentsTarget.name || '',
      toClass: '',
      toSection: '',
      fromAcademicYear: classStudentsTarget.academicYear || prev.fromAcademicYear || '',
    }));
    setShowPromoteModal(true);
  };

  const runPromotion = async (dryRun: boolean) => {
    if (!promotionForm.toClass) {
      toast.error('Please select To Class');
      return;
    }
    if (promotionMode === 'class' && !promotionForm.fromClass) {
      toast.error('Please select From Class');
      return;
    }
    if (promotionMode === 'class' && promotionForm.fromClass === promotionForm.toClass) {
      toast.error('From Class and To Class must be different');
      return;
    }
    if (promotionMode === 'students' && promotionStudentIds.length === 0) {
      toast.error('No students selected');
      return;
    }

    try {
      if (dryRun) setPromoteDryRunLoading(true);
      else setPromoteLoading(true);

      const payload: any = {
        toClass: promotionForm.toClass,
        toSection: promotionForm.toSection,
        fromAcademicYear: promotionForm.fromAcademicYear,
        toAcademicYear: promotionForm.toAcademicYear,
        includeInactive: promotionForm.includeInactive,
        dryRun,
      };
      if (promotionMode === 'class') {
        payload.fromClass = promotionForm.fromClass;
      } else {
        payload.studentIds = promotionStudentIds;
        if (promotionForm.fromClass) payload.fromClass = promotionForm.fromClass;
      }

      const res = await api.post('/api/students/promote-class', payload);
      if (dryRun) {
        setPromotionPreview({
          candidateCount: Number(res.data?.candidateCount || 0),
          candidates: (res.data?.candidates || []) as PromotionCandidatePreview[],
        });
        toast.success(`Dry run complete. ${res.data?.candidateCount || 0} candidate(s).`);
      } else {
        const summary = res.data?.summary;
        toast.success(
          summary
            ? `Promoted: ${summary.promotedCount}, Skipped: ${summary.skippedCount}`
            : (res.data?.message || 'Promotion completed')
        );
        setShowPromoteModal(false);
        setPromotionStudentIds([]);
        setPromotionPreview(null);
        setClassStudentsSelectedIds([]);
        fetchClasses();
        fetchAllClassesForFilters();
        if (classStudentsTarget) {
          handleViewClassStudents(classStudentsTarget);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Promotion failed');
    } finally {
      if (dryRun) setPromoteDryRunLoading(false);
      else setPromoteLoading(false);
    }
  };

  const handlePrintProfile = () => {
    if (!previewClass) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const subjectsList = previewClass.subjects?.map(s => s.name).join(', ') || 'None';
    const studentsCount = previewClass.currentStudents || previewClass.students?.length || 0;
    const occupancyPercentage = Math.round((studentsCount / previewClass.capacity) * 100);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Class Profile - ${previewClass.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; color: #555; }
            .value { margin-left: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Class Profile: ${previewClass.name}</h1>
            <p><strong>Tracking ID:</strong> ${previewClass.classId || 'N/A'}</p>
          </div>
          
          <div class="section">
            <h2>Basic Information</h2>
            <p><span class="label">Name:</span><span class="value">${previewClass.name}</span></p>
            <p><span class="label">Grade:</span><span class="value">${previewClass.grade || 'N/A'}</span></p>
            <p><span class="label">Section:</span><span class="value">${previewClass.section}</span></p>
            <p><span class="label">Academic Year:</span><span class="value">${previewClass.academicYear}</span></p>
            <p><span class="label">Room Number:</span><span class="value">${previewClass.roomNumber || 'N/A'}</span></p>
            <p><span class="label">Status:</span><span class="value">${previewClass.isActive ? 'Active' : 'Inactive'}</span></p>
          </div>

          <div class="section">
            <h2>Capacity & Enrollment</h2>
            <p><span class="label">Capacity:</span><span class="value">${previewClass.capacity}</span></p>
            <p><span class="label">Current Students:</span><span class="value">${studentsCount}</span></p>
            <p><span class="label">Available Seats:</span><span class="value">${previewClass.capacity - studentsCount}</span></p>
            <p><span class="label">Occupancy:</span><span class="value">${occupancyPercentage}%</span></p>
          </div>

          <div class="section">
            <h2>Class Teacher</h2>
            <p><span class="label">Name:</span><span class="value">${previewClass.classTeacher?.name || 'Not Assigned'}</span></p>
            ${previewClass.classTeacher?.email ? `<p><span class="label">Email:</span><span class="value">${previewClass.classTeacher.email}</span></p>` : ''}
            ${previewClass.classTeacher?.phone ? `<p><span class="label">Phone:</span><span class="value">${previewClass.classTeacher.phone}</span></p>` : ''}
          </div>

          <div class="section">
            <h2>Subjects</h2>
            <p>${subjectsList}</p>
          </div>

          ${previewClass.description ? `
          <div class="section">
            <h2>Description</h2>
            <p>${previewClass.description}</p>
          </div>
          ` : ''}

          <div class="section">
            <p><em>Printed on: ${new Date().toLocaleString()}</em></p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const SortIcon: React.FC<{ column: string }> = ({ column }) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const getOccupancyPercentage = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100);
  };

  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-100 text-red-800';
    if (percentage >= 75) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  if (loading && classes.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="text-gray-600">Manage class information and schedules</p>
        </div>
        <button
          type="button"
          title="Open form to add a new class"
          onClick={() => {
            handleCloseModal();
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Class
        </button>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
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
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <select
            value={filterAcademicYear}
            onChange={(e) => {
              setAcademicYearFilterInitialized(true);
              setFilterAcademicYear(e.target.value);
            }}
            className="input-field"
          >
            <option value="">All Academic Years</option>
            {academicYearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Data Management Buttons */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">Data Management</div>
            <div className="flex gap-2 flex-wrap">
              <label
                title="Import classes from CSV or Excel"
                className="relative inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg cursor-pointer hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Upload className="h-4 w-4" />
                <span>Import</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                title="Download class list as CSV"
                onClick={() => handleExport('csv')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Download className="h-4 w-4" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                title="Download class list as Excel"
                onClick={() => handleExport('excel')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Download className="h-4 w-4" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedClasses.length > 0 && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedClasses.length} class(es) selected
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                title="Set selected classes to active"
                onClick={() => handleBulkUpdate(true)}
                className="btn-secondary text-sm"
              >
                Activate
              </button>
              <button
                type="button"
                title="Set selected classes to inactive"
                onClick={() => handleBulkUpdate(false)}
                className="btn-secondary text-sm"
              >
                Deactivate
              </button>
              <button
                type="button"
                title="Permanently delete selected classes"
                onClick={handleBulkDelete}
                className="btn-secondary text-sm text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="flex justify-end">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            title="Show classes as cards"
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Grid View
          </button>
          <button
            type="button"
            title="Show classes as a table"
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Table View
          </button>
        </div>
      </div>

      {/* Classes Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((classItem) => {
            const occupancyPercentage = getOccupancyPercentage(
              classItem.currentStudents || classItem.students?.length || 0,
              classItem.capacity
            );
            return (
              <div key={classItem._id} className="card hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {classItem.name}
                      {classItem.section && (
                        <span className="ml-2 text-base font-normal text-danger-500">
                          ({classItem.section})
                        </span>
                      )}
                    </h3>
               
                    {classItem.classId && (
                      <p className="text-xs text-gray-500">ID: {classItem.classId}</p>
                    )}
                    {classItem.section && (
                      <p className="text-xs text-gray-500">Section: {classItem.section}</p>
                    )}
                    {classItem.description && (
                      <p className="text-sm text-gray-600 mt-1">{classItem.description}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    classItem.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {classItem.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {classItem.classTeacher && (
                    <div className="flex items-center text-sm text-gray-600">
                      <GraduationCap className="h-4 w-4 mr-2" />
                      <span>{classItem.classTeacher.name}</span>
                    </div>
                  )}

                  {classItem.roomNumber && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>Room {classItem.roomNumber}</span>
                    </div>
                  )}

                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    <span>{classItem.currentStudents || classItem.students?.length || 0}/{classItem.capacity} students</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className={`h-2 rounded-full ${
                          occupancyPercentage >= 90 ? 'bg-red-500' : 
                          occupancyPercentage >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${occupancyPercentage}%` }}
                      ></div>
                    </div>
                    <span className={`text-xs font-medium ${getOccupancyColor(occupancyPercentage)} px-2 py-1 rounded-full`}>
                      {occupancyPercentage}%
                    </span>
                  </div>

                  {classItem.subjects && classItem.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {classItem.subjects.slice(0, 3).map((subject, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {subject.name}
                        </span>
                      ))}
                      {classItem.subjects.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          +{classItem.subjects.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <span className="text-sm text-gray-500">{classItem.academicYear}</span>
                    <div className="flex items-center space-x-2">
                      <IconActionButton
                        onClick={() => handlePreview(classItem)}
                        tooltip="View Profile"
                        className="text-primary-600 hover:text-primary-900 focus:ring-primary-300"
                      >
                        <Eye className="h-4 w-4" />
                      </IconActionButton>
                      <IconActionButton
                        onClick={() => handleEdit(classItem)}
                        tooltip="Edit Class"
                        className="text-primary-600 hover:text-primary-900 focus:ring-primary-300"
                      >
                        <Edit className="h-4 w-4" />
                      </IconActionButton>
                      <IconActionButton
                        onClick={() => openPromoteClassModal(classItem)}
                        tooltip="Promote Class"
                        className="text-amber-600 hover:text-amber-900 focus:ring-amber-300"
                      >
                        <GraduationCap className="h-4 w-4" />
                      </IconActionButton>
                      <IconActionButton
                        onClick={() => handleViewClassStudents(classItem)}
                        tooltip="View Students in Class"
                        className="text-indigo-600 hover:text-indigo-900 focus:ring-indigo-300"
                      >
                        <Users className="h-4 w-4" />
                      </IconActionButton>
                      <IconActionButton
                        onClick={() => handleDelete(classItem._id)}
                        tooltip="Delete Class"
                        className="text-red-600 hover:text-red-900 focus:ring-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconActionButton>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    title="Select all classes on this page"
                    checked={classes.length > 0 && classes.every(c => selectedClasses.includes(c._id))}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th 
                  title="Sort by name"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Name
                    <SortIcon column="name" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tracking ID
                </th>
                <th 
                  title="Sort by grade"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('grade')}
                >
                  <div className="flex items-center gap-1">
                    Grade
                    <SortIcon column="grade" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Section
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Students
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teacher
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    No classes found
                  </td>
                </tr>
              ) : (
                classes.map((classItem) => {
                  const studentsCount = classItem.currentStudents || classItem.students?.length || 0;
                  const occupancyPercentage = getOccupancyPercentage(studentsCount, classItem.capacity);
                  return (
                    <tr key={classItem._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedClasses.includes(classItem._id)}
                          onChange={() => handleSelectClass(classItem._id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {classItem.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {classItem.classId || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {classItem.grade || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {classItem.section}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <span>{studentsCount}/{classItem.capacity}</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                occupancyPercentage >= 90 ? 'bg-red-500' : 
                                occupancyPercentage >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${occupancyPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {classItem.capacity}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {classItem.classTeacher?.name || 'Not Assigned'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          classItem.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {classItem.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <IconActionButton
                            onClick={() => handlePreview(classItem)}
                            tooltip="View Profile"
                            className="text-primary-600 hover:text-primary-900 focus:ring-primary-300"
                          >
                            <Eye className="h-4 w-4" />
                          </IconActionButton>
                          <IconActionButton
                            onClick={() => handleEdit(classItem)}
                            tooltip="Edit Class"
                            className="text-primary-600 hover:text-primary-900 focus:ring-primary-300"
                          >
                            <Edit className="h-4 w-4" />
                          </IconActionButton>
                          <IconActionButton
                            onClick={() => openPromoteClassModal(classItem)}
                            tooltip="Promote Class"
                            className="text-amber-600 hover:text-amber-900 focus:ring-amber-300"
                          >
                            <GraduationCap className="h-4 w-4" />
                          </IconActionButton>
                          <IconActionButton
                            onClick={() => handleViewClassStudents(classItem)}
                            tooltip="View Students in Class"
                            className="text-indigo-600 hover:text-indigo-900 focus:ring-indigo-300"
                          >
                            <Users className="h-4 w-4" />
                          </IconActionButton>
                          <IconActionButton
                            onClick={() => handleDelete(classItem._id)}
                            tooltip="Delete Class"
                            className="text-red-600 hover:text-red-900 focus:ring-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconActionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Items per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="input-field text-sm py-1"
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
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="First page"
                  aria-label="First page"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Previous page"
                  aria-label="Previous page"
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
                <button
                  type="button"
                  title="Next page"
                  aria-label="Next page"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Last page"
                  aria-label="Last page"
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingClass ? 'Edit Class' : 'Add New Class'}
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
                  <label className="block text-sm font-medium text-gray-700">Class Name *</label>
                  <input
                    {...register('name', { required: 'Class name is required' })}
                    className="input-field"
                    placeholder="e.g., Class 10A"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Grade</label>
                  <select
                    {...register('grade')}
                    className="input-field"
                  >
                    <option value="">Select grade</option>
                    <option value="nursury">Nursury</option>
                    <option value="play">Play</option>
                    <option value="prep">Prep</option>
                    <option value="kg">KG</option>
                    <option value="1">Grade 1</option>
                    <option value="2">Grade 2</option>
                    <option value="3">Grade 3</option>
                    <option value="4">Grade 4</option>
                    <option value="5">Grade 5</option>
                    <option value="6">Grade 6</option>
                    <option value="7">Grade 7</option>
                    <option value="8">Grade 8</option>
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Section *</label>
                  <input
                    {...register('section', { required: 'Section is required' })}
                    className="input-field"
                    placeholder="e.g., A, B, C"
                  />
                  {errors.section && <p className="text-red-500 text-sm mt-1">{errors.section.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Capacity *</label>
                  <input
                    {...register('capacity', { 
                      required: 'Capacity is required',
                      min: { value: 1, message: 'Capacity must be at least 1' }
                    })}
                    type="number"
                    className="input-field"
                    placeholder="Enter capacity"
                  />
                  {errors.capacity && <p className="text-red-500 text-sm mt-1">{errors.capacity.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Class Teacher</label>
                  <select
                    {...register('classTeacher')}
                    className="input-field"
                  >
                    <option value="">Select teacher</option>
                    {teachers.map(teacher => (
                      <option key={teacher._id} value={teacher._id}>
                        {teacher.name} {teacher.subject ? `- ${teacher.subject}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Room Number</label>
                  <input
                    {...register('roomNumber')}
                    className="input-field"
                    placeholder="e.g., 101, 205"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Academic Year *</label>
                  <input
                    {...register('academicYear', { required: 'Academic year is required' })}
                    className="input-field"
                    placeholder="e.g., 2024-2025"
                  />
                  {errors.academicYear && <p className="text-red-500 text-sm mt-1">{errors.academicYear.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Status *</label>
                  <select
                    {...register('isActive', { required: 'Status is required' })}
                    className="input-field"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                  {errors.isActive && <p className="text-red-500 text-sm mt-1">{errors.isActive.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subjects</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Managed in Subjects. Add or reorder subjects from the admin menu.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 max-h-48 overflow-y-auto">
                  {(() => {
                    const names = new Set(catalogSubjectNames);
                    (editingClass?.subjects || []).forEach((s) => {
                      if (s.name?.trim()) names.add(s.name.trim());
                    });
                    return Array.from(names)
                      .sort()
                      .map((subject) => (
                        <label key={subject} className="flex items-center">
                          <input
                            type="checkbox"
                            value={subject}
                            {...register('subjects')}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{subject}</span>
                        </label>
                      ));
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="input-field"
                  placeholder="Enter class description"
                />
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
                  title={editingClass ? 'Save changes to this class' : 'Create class'}
                >
                  {editingClass ? 'Update Class' : 'Add Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Students Modal */}
      {showClassStudentsModal && classStudentsTarget && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Students in {classStudentsTarget.name}
                {classStudentsTarget.section ? ` (${classStudentsTarget.section})` : ''}
              </h3>
              <IconActionButton
                onClick={() => {
                  setShowClassStudentsModal(false);
                  setClassStudentsTarget(null);
                  setClassStudentsList([]);
                  setClassStudentsSelectedIds([]);
                }}
                tooltip="Close dialog"
                className="text-gray-400 hover:text-gray-600 focus:ring-gray-400"
                sizeClass="p-1 rounded-md"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </IconActionButton>
            </div>

            {classStudentsLoading ? (
              <div className="py-10 text-center text-gray-500">Loading students...</div>
            ) : classStudentsList.length === 0 ? (
              <div className="py-10 text-center text-gray-500">No students found in this class.</div>
            ) : (
              <div className="overflow-x-auto border rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        <input
                          type="checkbox"
                          title="Select all students in list"
                          checked={classStudentsList.length > 0 && classStudentsSelectedIds.length === classStudentsList.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setClassStudentsSelectedIds(classStudentsList.map((s) => s._id));
                            } else {
                              setClassStudentsSelectedIds([]);
                            }
                          }}
                        />
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Roll Number</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {classStudentsList.map((student) => (
                      <tr key={student._id}>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            title={`Select ${student.name}`}
                            checked={classStudentsSelectedIds.includes(student._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setClassStudentsSelectedIds((prev) => [...prev, student._id]);
                              } else {
                                setClassStudentsSelectedIds((prev) => prev.filter((id) => id !== student._id));
                              }
                            }}
                          />
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{student.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{student.rollNumber || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{student.email || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{student.phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-between items-center pt-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  title="Promote every student in this class"
                  onClick={() => classStudentsTarget && openPromoteClassModal(classStudentsTarget)}
                  className="btn-secondary"
                >
                  Promote Whole Class
                </button>
                <button
                  type="button"
                  title="Promote only checked students"
                  onClick={openPromoteSelectedStudentsModal}
                  className="btn-secondary"
                  disabled={classStudentsSelectedIds.length === 0}
                >
                  Promote Selected ({classStudentsSelectedIds.length})
                </button>
              </div>
              <button
                type="button"
                title="Close student list"
                onClick={() => {
                  setShowClassStudentsModal(false);
                  setClassStudentsTarget(null);
                  setClassStudentsList([]);
                  setClassStudentsSelectedIds([]);
                }}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <PromoteStudentsModal
        open={showPromoteModal}
        mode={promotionMode}
        selectedStudentCount={promotionStudentIds.length}
        form={promotionForm}
        onFormChange={(partial) => setPromotionForm((p) => ({ ...p, ...partial }))}
        classNameOptions={classNameOptions}
        sectionOptionsForToClass={promotionSectionOptions}
        fromClassControl="readonly"
        promotionPreview={promotionPreview}
        promoteLoading={promoteLoading}
        promoteDryRunLoading={promoteDryRunLoading}
        onClose={() => {
          setShowPromoteModal(false);
          setPromotionPreview(null);
          setPromotionStudentIds([]);
        }}
        onDryRun={() => runPromotion(true)}
        onPromote={() => runPromotion(false)}
      />

      {/* Profile Preview Modal */}
      {showPreviewModal && previewClass && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Class Profile</h3>
              <div className="flex gap-2">
                <IconActionButton
                  onClick={handlePrintProfile}
                  tooltip="Print Profile"
                  className="text-primary-600 hover:text-primary-900 focus:ring-primary-300"
                  sizeClass="p-1 rounded-md"
                >
                  <Printer className="h-5 w-5" />
                </IconActionButton>
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

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Class Name</label>
                  <p className="text-sm text-gray-900">{previewClass.name}</p>
                </div>
                {previewClass.classId && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tracking ID</label>
                    <p className="text-sm text-gray-900">{previewClass.classId}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Grade</label>
                  <p className="text-sm text-gray-900">{previewClass.grade || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Section</label>
                  <p className="text-sm text-gray-900">{previewClass.section}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Capacity</label>
                  <p className="text-sm text-gray-900">{previewClass.capacity}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Current Students</label>
                  <p className="text-sm text-gray-900">
                    {previewClass.currentStudents || previewClass.students?.length || 0}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Academic Year</label>
                  <p className="text-sm text-gray-900">{previewClass.academicYear}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-sm text-gray-900">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      previewClass.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {previewClass.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
                {previewClass.roomNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Room Number</label>
                    <p className="text-sm text-gray-900">{previewClass.roomNumber}</p>
                  </div>
                )}
                {previewClass.classTeacher && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Class Teacher</label>
                    <p className="text-sm text-gray-900">{previewClass.classTeacher.name}</p>
                    {previewClass.classTeacher.email && (
                      <p className="text-xs text-gray-500">{previewClass.classTeacher.email}</p>
                    )}
                  </div>
                )}
              </div>

              {previewClass.subjects && previewClass.subjects.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Subjects</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {previewClass.subjects.map((subject, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {subject.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {previewClass.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-sm text-gray-900 mt-1">{previewClass.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;

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
  DollarSign,
  CreditCard,
  Printer,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  TrendingUp,
  Calendar,
  X,
  Users,
  FileText
} from 'lucide-react';
import api, { getApiBaseUrl } from '../utils/api';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { useClasses } from '../hooks/useClasses';
import { useSettings } from '../contexts/SettingsContext';
import IconActionButton from '../components/IconActionButton';

interface Fee {
  _id: string;
  feeId?: string;
  student: {
    _id: string;
    name: string;
    rollNumber: string;
    studentId?: string;
    email?: string;
    phone?: string;
    class?: string;
  };
  class?: string;
  academicYear?: string;
  amount: number;
  currency: string;
  feeType: string;
  month?: string;
  dueDate: string;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Partial' | 'Waived';
  paymentDate?: string;
  paymentMethod?: string;
  transactionId?: string;
  paidAmount?: number;
  discount?: number;
  description?: string;
  remarks?: string;
  isActive: boolean;
  createdBy?: {
    _id: string;
    name: string;
    email?: string;
  };
}

interface FeeForm {
  student: string;
  class?: string;
  academicYear: string;
  amount: number;
  currency: string;
  feeType: string;
  dueDate: string;
  status: string;
  paymentDate?: string;
  paymentMethod?: string;
  transactionId?: string;
  paidAmount?: number;
  discount?: number;
  description?: string;
  remarks?: string;
  isActive: string;
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

const Fees: React.FC = () => {
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [previewFee, setPreviewFee] = useState<Fee | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState<Fee | null>(null);
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'monthly'>('table');
  const [groupedFees, setGroupedFees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterFeeType, setFilterFeeType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [selectedFees, setSelectedFees] = useState<string[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [feeTypes, setFeeTypes] = useState<string[]>([]);
  const [filterClassForStudent, setFilterClassForStudent] = useState('');
  
  const { getItemsPerPage, formatCurrency, getDefaultAcademicYear } = useSettings();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(getItemsPerPage());
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Sorting state
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch students and classes
  const [students, setStudents] = useState<any[]>([]);
  const { classNames } = useClasses({ activeOnly: false });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeeForm>();

  const paymentForm = useForm<{ paidAmount: number; paymentMethod: string; transactionId?: string; remarks?: string }>();
  const bulkCreateForm = useForm<{ class: string; feeType: string; amount: number; currency: string; dueDate: string; academicYear: string; description?: string }>();

  // Fetch currencies and fee types
  useEffect(() => {
    fetchCurrencies();
    fetchFeeTypes();
    fetchStudents();
  }, []);

  // Fetch grouped fees when in monthly view
  useEffect(() => {
    if (viewMode === 'monthly') {
      fetchGroupedFees();
    }
  }, [viewMode, searchTerm, filterClass, filterFeeType, filterAcademicYear, filterActive]);
  
  // Fetch fees when in table view
  useEffect(() => {
    if (viewMode === 'table') {
      fetchFees();
    }
  }, [viewMode, currentPage, itemsPerPage, sortBy, sortOrder, searchTerm, filterClass, filterFeeType, filterStatus, filterCurrency, filterAcademicYear, filterActive]);

  const fetchCurrencies = async () => {
    try {
      const response = await api.get('/api/fees/currencies/list');
      setCurrencies(response.data.data || []);
    } catch (error) {
      console.error('Error fetching currencies:', error);
    }
  };

  const fetchFeeTypes = async () => {
    try {
      const response = await api.get('/api/fees/types/list');
      setFeeTypes(response.data.data || []);
    } catch (error) {
      console.error('Error fetching fee types:', error);
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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterClass, filterFeeType, filterStatus, filterCurrency, filterAcademicYear, filterActive]);

  useEffect(() => {
    if (viewMode === 'table') {
      fetchFees();
    } else if (viewMode === 'monthly') {
      fetchGroupedFees();
    }
  }, [currentPage, itemsPerPage, sortBy, sortOrder, searchTerm, filterClass, filterFeeType, filterStatus, filterCurrency, filterAcademicYear, filterActive, viewMode]);

  const fetchFees = async () => {
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
      if (filterFeeType) params.append('feeType', filterFeeType);
      if (filterStatus) params.append('status', filterStatus);
      if (filterCurrency) params.append('currency', filterCurrency);
      if (filterAcademicYear) params.append('academicYear', filterAcademicYear);
      if (filterActive) params.append('isActive', filterActive);

      const response = await api.get(`/api/fees?${params.toString()}`);
      setFees(response.data.data || []);
      
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.totalPages);
        setTotalItems(response.data.pagination.totalItems);
      } else {
        setTotalPages(1);
        setTotalItems(response.data.data?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching fees:', error);
      toast.error('Failed to fetch fees');
      setFees([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupedFees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (filterClass) params.append('class', filterClass);
      if (filterFeeType) params.append('feeType', filterFeeType);
      if (filterAcademicYear) params.append('academicYear', filterAcademicYear);
      if (filterActive) params.append('isActive', filterActive);

      const response = await api.get(`/api/fees/grouped-by-month?${params.toString()}`);
      setGroupedFees(response.data.data || []);
    } catch (error) {
      console.error('Error fetching grouped fees:', error);
      toast.error('Failed to fetch grouped fees');
      setGroupedFees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/fees/statistics/overview');
      setStats(response.data.data);
      setShowStats(true);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast.error('Failed to fetch statistics');
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

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const onSubmit = async (data: FeeForm) => {
    try {
      const feeData = {
        ...data,
        amount: parseFloat(data.amount.toString()),
        paidAmount: data.paidAmount ? parseFloat(data.paidAmount.toString()) : 0,
        discount: data.discount ? parseFloat(data.discount.toString()) : 0,
        status: data.status || 'Pending', // Explicitly include status
        isActive: data.isActive === 'true',
      };

      console.log('Submitting fee data:', feeData); // Debug log
      console.log('Status value:', feeData.status); // Debug log

      if (editingFee) {
        await api.put(`/api/fees/${editingFee._id}`, feeData);
        toast.success('Fee updated successfully');
      } else {
        await api.post('/api/fees', feeData);
        toast.success('Fee created successfully');
      }
      
      // Refresh data based on current view mode
      if (viewMode === 'table') {
        fetchFees();
      } else if (viewMode === 'monthly') {
        fetchGroupedFees();
      }
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving fee:', error);
      toast.error(error.response?.data?.message || 'Failed to save fee');
    }
  };

  const handleEdit = (fee: Fee) => {
    setEditingFee(fee);
    reset({
      student: fee.student._id || '',
      class: fee.class || '',
      academicYear: fee.academicYear || new Date().getFullYear().toString(),
      amount: fee.amount || 0,
      currency: fee.currency || 'PKR',
      feeType: fee.feeType || '',
      dueDate: fee.dueDate ? fee.dueDate.slice(0, 10) : '',
      status: fee.status || 'Pending',
      paymentDate: fee.paymentDate ? fee.paymentDate.slice(0, 10) : '',
      paymentMethod: fee.paymentMethod || '',
      transactionId: fee.transactionId || '',
      paidAmount: fee.paidAmount || 0,
      discount: fee.discount || 0,
      description: fee.description || '',
      remarks: fee.remarks || '',
      isActive: fee.isActive ? 'true' : 'false',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this fee?')) return;
    
    try {
      await api.delete(`/api/fees/${id}`);
      toast.success('Fee deleted successfully');
      fetchFees();
    } catch (error: any) {
      console.error('Error deleting fee:', error);
      toast.error(error.response?.data?.message || 'Failed to delete fee');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFee(null);
    reset({
      student: '',
      academicYear: new Date().getFullYear().toString(),
      amount: 0,
      currency: 'PKR',
      feeType: '',
      dueDate: '',
      status: 'Pending',
      paidAmount: 0,
      discount: 0,
      isActive: 'true',
    });
  };

  const handlePreview = (fee: Fee) => {
    setPreviewFee(fee);
    setShowPreviewModal(true);
  };

  const handlePrintProfile = () => {
    if (!previewFee) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fee Details - ${previewFee.feeId || previewFee._id}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
              .no-print { display: none; }
            }
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .section { margin-bottom: 30px; }
            .section h3 { color: #1e3a8a; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
            .row { display: flex; margin-bottom: 10px; }
            .label { font-weight: bold; width: 200px; }
            .value { flex: 1; }
            .status { padding: 5px 10px; border-radius: 5px; display: inline-block; }
            .status.Paid { background: #10b981; color: white; }
            .status.Pending { background: #f59e0b; color: white; }
            .status.Overdue { background: #ef4444; color: white; }
            .status.Partial { background: #3b82f6; color: white; }
            .status.Waived { background: #6b7280; color: white; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Fee Details</h1>
            <p>Fee ID: ${previewFee.feeId || previewFee._id}</p>
          </div>
          
          <div class="section">
            <h3>Student Information</h3>
            <div class="row"><div class="label">Name:</div><div class="value">${previewFee.student.name}</div></div>
            <div class="row"><div class="label">Student ID:</div><div class="value">${previewFee.student.studentId || 'N/A'}</div></div>
            <div class="row"><div class="label">Roll Number:</div><div class="value">${previewFee.student.rollNumber}</div></div>
            <div class="row"><div class="label">Class:</div><div class="value">${previewFee.student.class || previewFee.class || 'N/A'}</div></div>
          </div>
          
          <div class="section">
            <h3>Fee Information</h3>
            <div class="row"><div class="label">Fee Type:</div><div class="value">${previewFee.feeType}</div></div>
            <div class="row"><div class="label">Amount:</div><div class="value">${getCurrencySymbol(previewFee.currency)} ${previewFee.amount.toLocaleString()}</div></div>
            <div class="row"><div class="label">Currency:</div><div class="value">${previewFee.currency}</div></div>
            <div class="row"><div class="label">Paid Amount:</div><div class="value">${getCurrencySymbol(previewFee.currency)} ${(previewFee.paidAmount || 0).toLocaleString()}</div></div>
            <div class="row"><div class="label">Discount:</div><div class="value">${getCurrencySymbol(previewFee.currency)} ${(previewFee.discount || 0).toLocaleString()}</div></div>
            <div class="row"><div class="label">Due Date:</div><div class="value">${new Date(previewFee.dueDate).toLocaleDateString()}</div></div>
            <div class="row"><div class="label">Status:</div><div class="value"><span class="status ${previewFee.status}">${previewFee.status}</span></div></div>
            ${previewFee.paymentDate ? `<div class="row"><div class="label">Payment Date:</div><div class="value">${new Date(previewFee.paymentDate).toLocaleDateString()}</div></div>` : ''}
            ${previewFee.paymentMethod ? `<div class="row"><div class="label">Payment Method:</div><div class="value">${previewFee.paymentMethod}</div></div>` : ''}
            ${previewFee.transactionId ? `<div class="row"><div class="label">Transaction ID:</div><div class="value">${previewFee.transactionId}</div></div>` : ''}
            ${previewFee.description ? `<div class="row"><div class="label">Description:</div><div class="value">${previewFee.description}</div></div>` : ''}
            ${previewFee.remarks ? `<div class="row"><div class="label">Remarks:</div><div class="value">${previewFee.remarks}</div></div>` : ''}
          </div>
          
          <div class="section">
            <h3>Academic Information</h3>
            <div class="row"><div class="label">Academic Year:</div><div class="value">${previewFee.academicYear || 'N/A'}</div></div>
            <div class="row"><div class="label">Month:</div><div class="value">${previewFee.month || 'N/A'}</div></div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleSelectAll = () => {
    if (selectedFees.length === fees.length) {
      setSelectedFees([]);
    } else {
      setSelectedFees(fees.map(fee => fee._id));
    }
  };

  const handleSelectFee = (id: string) => {
    if (selectedFees.includes(id)) {
      setSelectedFees(selectedFees.filter(feeId => feeId !== id));
    } else {
      setSelectedFees([...selectedFees, id]);
    }
  };

  const handleBulkUpdate = async (isActive: boolean) => {
    if (selectedFees.length === 0) {
      toast.error('Please select at least one fee');
      return;
    }
    
    try {
      await api.post('/api/fees/bulk-update', { ids: selectedFees, isActive });
      toast.success(`${selectedFees.length} fees updated successfully`);
      setSelectedFees([]);
      fetchFees();
    } catch (error: any) {
      console.error('Error updating fees:', error);
      toast.error(error.response?.data?.message || 'Failed to update fees');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFees.length === 0) {
      toast.error('Please select at least one fee');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete ${selectedFees.length} fees?`)) return;
    
    try {
      await api.post('/api/fees/bulk-delete', { ids: selectedFees });
      toast.success(`${selectedFees.length} fees deleted successfully`);
      setSelectedFees([]);
      fetchFees();
    } catch (error: any) {
      console.error('Error deleting fees:', error);
      toast.error(error.response?.data?.message || 'Failed to delete fees');
    }
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      const params = new URLSearchParams({ format });
      if (searchTerm) params.append('search', searchTerm);
      if (filterClass) params.append('class', filterClass);
      if (filterFeeType) params.append('feeType', filterFeeType);
      if (filterStatus) params.append('status', filterStatus);
      if (filterCurrency) params.append('currency', filterCurrency);
      if (filterAcademicYear) params.append('academicYear', filterAcademicYear);
      if (filterActive) params.append('isActive', filterActive);

      const response = await api.get(`/api/fees/export?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fees.${format === 'excel' ? 'xlsx' : 'csv'}`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Fees exported as ${format.toUpperCase()}`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.response?.data?.message || 'Failed to export fees');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/api/fees/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(response.data.message);
      if (response.data.errors && response.data.errors.length > 0) {
        console.warn('Import errors:', response.data.errors);
      }
      fetchFees();
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.response?.data?.message || 'Failed to import fees');
    }
    
    // Reset file input
    e.target.value = '';
  };

  const handleRecordPayment = (fee: Fee) => {
    setSelectedFeeForPayment(fee);
    const remainingAmount = fee.amount - (fee.paidAmount || 0) - (fee.discount || 0);
    paymentForm.reset({
      paidAmount: remainingAmount > 0 ? remainingAmount : 0,
      paymentMethod: fee.paymentMethod || '',
      transactionId: fee.transactionId || '',
      remarks: fee.remarks || ''
    });
    setShowPaymentModal(true);
  };

  const onPaymentSubmit = async (data: { paidAmount: number; paymentMethod: string; transactionId?: string; remarks?: string }) => {
    if (!selectedFeeForPayment) return;
    
    try {
      await api.post(`/api/fees/${selectedFeeForPayment._id}/pay`, data);
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setSelectedFeeForPayment(null);
      paymentForm.reset();
      
      // Refresh data based on current view mode
      if (viewMode === 'table') {
        fetchFees();
      } else if (viewMode === 'monthly') {
        fetchGroupedFees();
      }
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const getCurrencySymbol = (currencyCode: string): string => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency?.symbol || currencyCode;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      case 'Partial': return 'bg-blue-100 text-blue-800';
      case 'Waived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get unique academic years
  const getUniqueAcademicYears = (): string[] => {
    const years = new Set<string>();
    fees.forEach(fee => {
      if (fee.academicYear) {
        years.add(fee.academicYear);
      }
    });
    return Array.from(years).sort().reverse();
  };

  // Filter students by class
  const getFilteredStudents = () => {
    if (!filterClassForStudent) return students;
    return students.filter(student => student.class === filterClassForStudent);
  };

  // Handle bulk fee creation
  const onBulkCreateSubmit = async (data: { class: string; feeType: string; amount: number; currency: string; dueDate: string; academicYear: string; description?: string }) => {
    try {
      console.log('Sending bulk create request:', data);
      
      // Ensure amount is a number
      const requestData = {
        ...data,
        amount: parseFloat(data.amount.toString()),
      };
      
      const response = await api.post('/api/fees/auto-create', requestData);
      
      if (response.data.success) {
        toast.success(response.data.message);
        setShowBulkCreateModal(false);
        bulkCreateForm.reset();
        if (viewMode === 'monthly') {
          fetchGroupedFees();
        } else {
          fetchFees();
        }
      } else {
        toast.error(response.data.message || 'Failed to create fees');
      }
    } catch (error: any) {
      console.error('Error creating bulk fees:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create fees';
      toast.error(errorMessage);
      
      // Show detailed error if available
      if (error.response?.data?.errors) {
        console.error('Detailed errors:', error.response.data.errors);
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setSelectedFees([]);
  };

  // Generate fee slip for single fee
  const handleGenerateFeeSlip = (feeId: string) => {
    try {
      const token = localStorage.getItem('token');
      const url = `${getApiBaseUrl()}/api/fees/slip/${feeId}`;
      
      fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(response => {
          if (!response.ok) throw new Error('Failed to generate fee slip');
          return response.blob();
        })
        .then(blob => {
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.setAttribute('download', `fee-slip-${feeId}.pdf`);
          link.click();
          window.URL.revokeObjectURL(blobUrl);
          toast.success('Fee slip downloaded successfully');
        })
        .catch(error => {
          console.error('Error generating fee slip:', error);
          toast.error('Failed to generate fee slip');
        });
    } catch (error: any) {
      console.error('Error generating fee slip:', error);
      toast.error('Failed to generate fee slip');
    }
  };

  // Generate fee slips for class
  const handleGenerateClassSlips = () => {
    if (!filterClass) {
      toast.error('Please select a class first');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterAcademicYear) params.append('academicYear', filterAcademicYear);
      
      const url = `${getApiBaseUrl()}/api/fees/slips/class/${filterClass}${params.toString() ? '?' + params.toString() : ''}`;
      
      fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(response => {
          if (!response.ok) throw new Error('Failed to generate fee slips');
          return response.blob();
        })
        .then(blob => {
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.setAttribute('download', `fee-slips-class-${filterClass}.pdf`);
          link.click();
          window.URL.revokeObjectURL(blobUrl);
          toast.success(`Fee slips for class ${filterClass} downloaded successfully`);
        })
        .catch(error => {
          console.error('Error generating class fee slips:', error);
          toast.error('Failed to generate fee slips');
        });
    } catch (error: any) {
      console.error('Error generating class fee slips:', error);
      toast.error('Failed to generate fee slips');
    }
  };

  // Generate bulk fee slips (all filtered fees)
  const handleGenerateBulkSlips = () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterClass) params.append('class', filterClass);
      if (filterStatus) params.append('status', filterStatus);
      if (filterAcademicYear) params.append('academicYear', filterAcademicYear);
      
      const url = `${getApiBaseUrl()}/api/fees/slips/bulk${params.toString() ? '?' + params.toString() : ''}`;
      
      fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(response => {
          if (!response.ok) throw new Error('Failed to generate fee slips');
          return response.blob();
        })
        .then(blob => {
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.setAttribute('download', 'fee-slips-all.pdf');
          link.click();
          window.URL.revokeObjectURL(blobUrl);
          toast.success('Bulk fee slips downloaded successfully');
        })
        .catch(error => {
          console.error('Error generating bulk fee slips:', error);
          toast.error('Failed to generate fee slips');
        });
    } catch (error: any) {
      console.error('Error generating bulk fee slips:', error);
      toast.error('Failed to generate fee slips');
    }
  };

  // Generate comprehensive fee history for a student
  const handleGenerateFeeHistory = (studentId: string) => {
    try {
      const token = localStorage.getItem('token');
      const url = `${getApiBaseUrl()}/api/fees/slip/student/${studentId}/history`;
      
      fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(response => {
          if (!response.ok) throw new Error('Failed to generate fee history');
          return response.blob();
        })
        .then(blob => {
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.setAttribute('download', `fee-history-${studentId}.pdf`);
          link.click();
          window.URL.revokeObjectURL(blobUrl);
          toast.success('Fee history downloaded successfully');
        })
        .catch(error => {
          console.error('Error generating fee history:', error);
          toast.error('Failed to generate fee history');
        });
    } catch (error: any) {
      console.error('Error generating fee history:', error);
      toast.error('Failed to generate fee history');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fees Management</h1>
          <p className="text-gray-600 mt-1">Manage student fees and payments</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            title="View fee statistics summary"
            onClick={fetchStats}
            className="btn-secondary flex items-center gap-2"
          >
            <TrendingUp className="h-5 w-5" />
            Statistics
          </button>
          <button
            type="button"
            title="Create fees for all students in a class"
            onClick={() => {
              bulkCreateForm.reset({
                class: '',
                feeType: '',
                amount: 0,
                currency: 'PKR',
                dueDate: '',
                academicYear: new Date().getFullYear().toString(),
                description: ''
              });
              setShowBulkCreateModal(true);
            }}
            className="btn-secondary flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
          >
            <Users className="h-5 w-5" />
            Bulk Create
          </button>
          <button
            type="button"
            title="Add a new fee record"
            onClick={() => {
              reset({
                student: '',
                academicYear: new Date().getFullYear().toString(),
                amount: 0,
                currency: 'PKR',
                feeType: '',
                dueDate: '',
                status: 'Pending',
                paidAmount: 0,
                discount: 0,
                isActive: 'true',
              });
              setFilterClassForStudent('');
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Fee
          </button>
        </div>
      </div>

      {/* Statistics Modal */}
      {showStats && stats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Fee Statistics</h2>
              <IconActionButton
                onClick={() => setShowStats(false)}
                tooltip="Close statistics"
                className="text-gray-500 hover:text-gray-700 focus:ring-gray-400"
                sizeClass="p-1 rounded-md"
              >
                <X className="h-6 w-6" />
              </IconActionButton>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600">Total Collected</div>
                <div className="text-2xl font-bold text-green-700">PKR {stats.totalCollected?.toLocaleString() || 0}</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-sm text-yellow-600">Pending Amount</div>
                <div className="text-2xl font-bold text-yellow-700">PKR {stats.pendingAmount?.toLocaleString() || 0}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-red-600">Overdue Amount</div>
                <div className="text-2xl font-bold text-red-700">PKR {stats.overdueAmount?.toLocaleString() || 0}</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600">Partial Payments</div>
                <div className="text-2xl font-bold text-blue-700">PKR {stats.partialAmount?.toLocaleString() || 0}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-purple-600">Total Fees</div>
                <div className="text-2xl font-bold text-purple-700">{stats.totalFees || 0}</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-sm text-orange-600">Overdue Count</div>
                <div className="text-2xl font-bold text-orange-700">{stats.overdueCount || 0}</div>
              </div>
            </div>
            {stats.byCurrency && Object.keys(stats.byCurrency).length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">By Currency</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(stats.byCurrency).map(([currency, data]: [string, any]) => (
                    <div key={currency} className="bg-gray-50 p-4 rounded-lg">
                      <div className="font-semibold mb-2">{currency}</div>
                      <div className="text-sm space-y-1">
                        <div>Total: {getCurrencySymbol(currency)} {data.total?.toLocaleString()}</div>
                        <div>Paid: {getCurrencySymbol(currency)} {data.paid?.toLocaleString()}</div>
                        <div>Pending: {getCurrencySymbol(currency)} {data.pending?.toLocaleString()}</div>
                        <div>Overdue: {getCurrencySymbol(currency)} {data.overdue?.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <button
              type="button"
              title="Show fees as a sortable table"
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Table View
            </button>
            <button
              type="button"
              title="Show fees grouped by month"
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 rounded-lg transition-all ${
                viewMode === 'monthly'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Monthly View
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search fees..."
              className="input-field pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="input-field"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="">All Classes</option>
            {classNames.map((className) => (
              <option key={className} value={className}>{className}</option>
            ))}
          </select>
          <select
            className="input-field"
            value={filterFeeType}
            onChange={(e) => setFilterFeeType(e.target.value)}
          >
            <option value="">All Fee Types</option>
            {feeTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            className="input-field"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
            <option value="Partial">Partial</option>
            <option value="Waived">Waived</option>
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <select
            className="input-field"
            value={filterCurrency}
            onChange={(e) => setFilterCurrency(e.target.value)}
          >
            <option value="">All Currencies</option>
            {currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} - {currency.name}
              </option>
            ))}
          </select>
          <select
            className="input-field"
            value={filterAcademicYear}
            onChange={(e) => setFilterAcademicYear(e.target.value)}
          >
            <option value="">All Academic Years</option>
            {getUniqueAcademicYears().map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            className="input-field"
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        {/* Import/Export Buttons */}
        <div className="flex flex-wrap gap-3 mb-4">
          <button
            type="button"
            title="Download fees as Excel"
            onClick={() => handleExport('excel')}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
          <button
            type="button"
            title="Download fees as CSV"
            onClick={() => handleExport('csv')}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <label title="Upload spreadsheet to import fees" className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 cursor-pointer">
            <Upload className="h-4 w-4" />
            Import
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          </label>
        </div>

        {/* Fee Slip Generation Buttons */}
        <div className="flex flex-wrap gap-3 mb-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
            <FileText className="h-5 w-5" />
            <span>Generate Fee Slips:</span>
          </div>
          <button
            type="button"
            onClick={handleGenerateClassSlips}
            disabled={!filterClass}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            title={!filterClass ? 'Please select a class first' : 'Generate fee slips for selected class'}
          >
            <FileText className="h-4 w-4" />
            Class Slips
          </button>
          <button
            type="button"
            onClick={handleGenerateBulkSlips}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            title="Generate fee slips for all filtered fees"
          >
            <FileText className="h-4 w-4" />
            Bulk Slips (All)
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedFees.length > 0 && (
          <div className="flex gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm text-gray-700 self-center">
              {selectedFees.length} fee(s) selected
            </span>
            <button
              type="button"
              title="Mark selected fees as active"
              onClick={() => handleBulkUpdate(true)}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              Activate
            </button>
            <button
              type="button"
              title="Mark selected fees as inactive"
              onClick={() => handleBulkUpdate(false)}
              className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
            >
              Deactivate
            </button>
            <button
              type="button"
              title="Permanently delete selected fees"
              onClick={handleBulkDelete}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Monthly View */}
      {viewMode === 'monthly' && (
        <div className="space-y-6">
          {loading ? (
            <div className="card text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-gray-600">Loading fees...</p>
            </div>
          ) : groupedFees.length === 0 ? (
            <div className="card text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No fees</h3>
              <p className="mt-1 text-sm text-gray-500">No fees found for the selected filters.</p>
            </div>
          ) : (
            groupedFees.map((group) => (
              <div key={group.month} className="card">
                <div className="flex justify-between items-center mb-4 pb-4 border-b">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {group.monthName} {group.year}
                    </h3>
                    <p className="text-sm text-gray-500">{group.totalFees} fees</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-gray-500">Total</div>
                      <div className="font-semibold text-gray-900">PKR {group.totalAmount.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-600">Paid</div>
                      <div className="font-semibold text-green-700">PKR {group.paidAmount.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-yellow-600">Pending</div>
                      <div className="font-semibold text-yellow-700">PKR {group.pendingAmount.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-600">Overdue</div>
                      <div className="font-semibold text-red-700">PKR {group.overdueAmount.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {group.fees.map((fee: Fee) => (
                        <tr key={fee._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {fee.feeId || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{fee.class}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{fee.student.name}</div>
                            <div className="text-sm text-gray-500">{fee.student.rollNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{fee.feeType}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {getCurrencySymbol(fee.currency)} {fee.amount.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(fee.dueDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(fee.status)}`}>
                              {fee.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2 justify-end">
                              <IconActionButton
                                onClick={() => handlePreview(fee)}
                                tooltip="View fee details"
                                className="text-blue-600 hover:text-blue-900 focus:ring-blue-300"
                              >
                                <Eye className="h-4 w-4" />
                              </IconActionButton>
                              <IconActionButton
                                onClick={() => handleGenerateFeeSlip(fee._id)}
                                tooltip="Generate Fee Slip"
                                className="text-purple-600 hover:text-purple-900 focus:ring-purple-300"
                              >
                                <FileText className="h-4 w-4" />
                              </IconActionButton>
                              <IconActionButton
                                onClick={() => handleGenerateFeeHistory(fee.student._id)}
                                tooltip="Generate complete fee history (print)"
                                className="text-indigo-600 hover:text-indigo-900 focus:ring-indigo-300"
                              >
                                <Printer className="h-4 w-4" />
                              </IconActionButton>
                              {fee.status !== 'Paid' && (
                                <IconActionButton
                                  onClick={() => handleRecordPayment(fee)}
                                  tooltip="Record Payment"
                                  className="text-green-600 hover:text-green-900 focus:ring-green-300"
                                >
                                  <CreditCard className="h-4 w-4" />
                                </IconActionButton>
                              )}
                              <IconActionButton
                                onClick={() => handleEdit(fee)}
                                tooltip="Edit Fee"
                                className="text-primary-600 hover:text-primary-900 focus:ring-primary-300"
                              >
                                <Edit className="h-4 w-4" />
                              </IconActionButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-gray-600">Loading fees...</p>
          </div>
        ) : fees.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No fees</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new fee.</p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <button
                      type="button"
                      title={selectedFees.length === fees.length ? 'Deselect all fees' : 'Select all fees on this page'}
                      onClick={handleSelectAll}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {selectedFees.length === fees.length ? (
                        <CheckSquare className="h-5 w-5" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('feeId')}>
                    <div className="flex items-center gap-1">
                      Fee ID
                      {getSortIcon('feeId')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('class')}>
                    <div className="flex items-center gap-1">
                      Class
                      {getSortIcon('class')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('student')}>
                    <div className="flex items-center gap-1">
                      Student
                      {getSortIcon('student')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('feeType')}>
                    <div className="flex items-center gap-1">
                      Fee Type
                      {getSortIcon('feeType')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('amount')}>
                    <div className="flex items-center gap-1">
                      Amount
                      {getSortIcon('amount')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('dueDate')}>
                    <div className="flex items-center gap-1">
                      Due Date
                      {getSortIcon('dueDate')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('paymentDate')}>
                    <div className="flex items-center gap-1">
                      Payment Date
                      {getSortIcon('paymentDate')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-1">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fees.map((fee) => (
                  <tr key={fee._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedFees.includes(fee._id)}
                        onChange={() => handleSelectFee(fee._id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{fee.feeId || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{fee.class}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{fee.student.name}</div>
                      <div className="text-sm text-gray-500">{fee.student.rollNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{fee.feeType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {getCurrencySymbol(fee.currency)} {fee.amount.toLocaleString()}
                      </div>
                      {fee.paidAmount && fee.paidAmount > 0 && (
                        <div className="text-xs text-gray-500">
                          Paid: {getCurrencySymbol(fee.currency)} {fee.paidAmount.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(fee.dueDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {fee.paymentDate ? new Date(fee.paymentDate).toLocaleDateString() : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(fee.status)}`}>
                        {fee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2 justify-end">
                        <IconActionButton
                          onClick={() => handlePreview(fee)}
                          tooltip="View fee details"
                          className="text-blue-600 hover:text-blue-900 focus:ring-blue-300"
                        >
                          <Eye className="h-4 w-4" />
                        </IconActionButton>
                        {fee.status !== 'Paid' && (
                          <IconActionButton
                            onClick={() => handleRecordPayment(fee)}
                            tooltip="Record Payment"
                            className="text-green-600 hover:text-green-900 focus:ring-green-300"
                          >
                            <CreditCard className="h-4 w-4" />
                          </IconActionButton>
                        )}
                        <IconActionButton
                          onClick={() => handleEdit(fee)}
                          tooltip="Edit Fee"
                          className="text-primary-600 hover:text-primary-900 focus:ring-primary-300"
                        >
                          <Edit className="h-4 w-4" />
                        </IconActionButton>
                        <IconActionButton
                          onClick={() => handleDelete(fee._id)}
                          tooltip="Delete Fee"
                          className="text-red-600 hover:text-red-900 focus:ring-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconActionButton>
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
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
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
                    title="Rows per page"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
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
                          type="button"
                          title={`Go to page ${pageNum}`}
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
                    type="button"
                    title="First page"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronsLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    title="Previous page"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    title="Next page"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    title="Last page"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronsRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{editingFee ? 'Edit Fee' : 'Add Fee'}</h2>
              <IconActionButton
                onClick={handleCloseModal}
                tooltip="Close dialog"
                className="text-gray-500 hover:text-gray-700 focus:ring-gray-400"
                sizeClass="p-1 rounded-md"
              >
                <X className="h-6 w-6" />
              </IconActionButton>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Filter by Class</label>
                  <select
                    value={filterClassForStudent}
                    onChange={(e) => setFilterClassForStudent(e.target.value)}
                    className="input-field"
                  >
                    <option value="">All Classes</option>
                    {classNames.map((className) => (
                      <option key={className} value={className}>{className}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Filter students by class to make selection easier</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Student *</label>
                  <select {...register('student', { required: 'Student is required' })} className="input-field">
                    <option value="">Select student</option>
                    {getFilteredStudents().map((student) => (
                      <option key={student._id} value={student._id}>
                        {student.name} - {student.rollNumber} ({student.class})
                      </option>
                    ))}
                  </select>
                  {errors.student && <p className="text-red-500 text-sm mt-1">{errors.student.message}</p>}
                  {filterClassForStudent && (
                    <p className="text-xs text-gray-500 mt-1">
                      Showing {getFilteredStudents().length} student(s) from {filterClassForStudent}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Academic Year *</label>
                  <input
                    {...register('academicYear', { required: 'Academic year is required' })}
                    type="text"
                    className="input-field"
                    placeholder="e.g., 2025"
                  />
                  {errors.academicYear && <p className="text-red-500 text-sm mt-1">{errors.academicYear.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fee Type *</label>
                  <select {...register('feeType', { required: 'Fee type is required' })} className="input-field">
                    <option value="">Select fee type</option>
                    {feeTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.feeType && <p className="text-red-500 text-sm mt-1">{errors.feeType.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Currency *</label>
                  <select {...register('currency', { required: 'Currency is required' })} className="input-field">
                    {currencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name} ({currency.symbol})
                      </option>
                    ))}
                  </select>
                  {errors.currency && <p className="text-red-500 text-sm mt-1">{errors.currency.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount *</label>
                  <input
                    {...register('amount', { required: 'Amount is required', min: { value: 0, message: 'Amount cannot be negative' } })}
                    type="number"
                    step="0.01"
                    className="input-field"
                    placeholder="0.00"
                  />
                  {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Due Date *</label>
                  <input
                    {...register('dueDate', { required: 'Due date is required' })}
                    type="date"
                    className="input-field"
                  />
                  {errors.dueDate && <p className="text-red-500 text-sm mt-1">{errors.dueDate.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status *</label>
                  <select {...register('status', { required: 'Status is required' })} className="input-field">
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Partial">Partial</option>
                    <option value="Waived">Waived</option>
                  </select>
                  {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Paid Amount</label>
                  <input
                    {...register('paidAmount', { min: { value: 0, message: 'Paid amount cannot be negative' } })}
                    type="number"
                    step="0.01"
                    className="input-field"
                    placeholder="0.00"
                  />
                  {errors.paidAmount && <p className="text-red-500 text-sm mt-1">{errors.paidAmount.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Discount</label>
                  <input
                    {...register('discount', { min: { value: 0, message: 'Discount cannot be negative' } })}
                    type="number"
                    step="0.01"
                    className="input-field"
                    placeholder="0.00"
                  />
                  {errors.discount && <p className="text-red-500 text-sm mt-1">{errors.discount.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <select {...register('paymentMethod')} className="input-field">
                    <option value="">Select payment method</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Online Payment">Online Payment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                  <input {...register('transactionId')} type="text" className="input-field" placeholder="Optional" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea {...register('description')} className="input-field" rows={3} placeholder="Optional description" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Remarks</label>
                  <textarea {...register('remarks')} className="input-field" rows={3} placeholder="Optional remarks" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select {...register('isActive')} className="input-field">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={handleCloseModal} className="btn-secondary" title="Discard changes and close">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" title={editingFee ? 'Save fee changes' : 'Create fee'}>
                  {editingFee ? 'Update' : 'Create'} Fee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedFeeForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Record Payment</h2>
              <IconActionButton
                onClick={() => { setShowPaymentModal(false); setSelectedFeeForPayment(null); }}
                tooltip="Close dialog"
                className="text-gray-500 hover:text-gray-700 focus:ring-gray-400"
                sizeClass="p-1 rounded-md"
              >
                <X className="h-6 w-6" />
              </IconActionButton>
            </div>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Student: {selectedFeeForPayment.student.name}</div>
              <div className="text-sm text-gray-600">Fee Type: {selectedFeeForPayment.feeType}</div>
              <div className="text-sm text-gray-600">Total Amount: {getCurrencySymbol(selectedFeeForPayment.currency)} {selectedFeeForPayment.amount.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Paid Amount: {getCurrencySymbol(selectedFeeForPayment.currency)} {(selectedFeeForPayment.paidAmount || 0).toLocaleString()}</div>
              <div className="text-sm text-gray-600">Discount: {getCurrencySymbol(selectedFeeForPayment.currency)} {(selectedFeeForPayment.discount || 0).toLocaleString()}</div>
              <div className="text-sm font-semibold text-gray-900">Remaining: {getCurrencySymbol(selectedFeeForPayment.currency)} {(selectedFeeForPayment.amount - (selectedFeeForPayment.paidAmount || 0) - (selectedFeeForPayment.discount || 0)).toLocaleString()}</div>
            </div>
            <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Amount *</label>
                <input
                  {...paymentForm.register('paidAmount', { required: 'Payment amount is required', min: { value: 0.01, message: 'Amount must be greater than 0' } })}
                  type="number"
                  step="0.01"
                  className="input-field"
                  placeholder="0.00"
                />
                {paymentForm.formState.errors.paidAmount && <p className="text-red-500 text-sm mt-1">{paymentForm.formState.errors.paidAmount.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method *</label>
                <select {...paymentForm.register('paymentMethod', { required: 'Payment method is required' })} className="input-field">
                  <option value="">Select payment method</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Online Payment">Online Payment</option>
                  <option value="Other">Other</option>
                </select>
                {paymentForm.formState.errors.paymentMethod && <p className="text-red-500 text-sm mt-1">{paymentForm.formState.errors.paymentMethod.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                <input {...paymentForm.register('transactionId')} type="text" className="input-field" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Remarks</label>
                <textarea {...paymentForm.register('remarks')} className="input-field" rows={3} placeholder="Optional remarks" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setShowPaymentModal(false); setSelectedFeeForPayment(null); }} className="btn-secondary" title="Cancel recording payment">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" title="Submit payment for this fee">
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Create Modal */}
      {showBulkCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Bulk Create Fees</h2>
              <IconActionButton
                onClick={() => { setShowBulkCreateModal(false); bulkCreateForm.reset(); }}
                tooltip="Close dialog"
                className="text-gray-500 hover:text-gray-700 focus:ring-gray-400"
                sizeClass="p-1 rounded-md"
              >
                <X className="h-6 w-6" />
              </IconActionButton>
            </div>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This will create fees for all active students in the selected class. 
                If a fee already exists for a student for the selected month, it will be skipped.
              </p>
            </div>
            <form onSubmit={bulkCreateForm.handleSubmit(onBulkCreateSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Class *</label>
                  <select {...bulkCreateForm.register('class', { required: 'Class is required' })} className="input-field">
                    <option value="">Select class</option>
                    {classNames.map((className) => (
                      <option key={className} value={className}>{className}</option>
                    ))}
                  </select>
                  {bulkCreateForm.formState.errors.class && (
                    <p className="text-red-500 text-sm mt-1">{bulkCreateForm.formState.errors.class.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fee Type *</label>
                  <select {...bulkCreateForm.register('feeType', { required: 'Fee type is required' })} className="input-field">
                    <option value="">Select fee type</option>
                    {feeTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {bulkCreateForm.formState.errors.feeType && (
                    <p className="text-red-500 text-sm mt-1">{bulkCreateForm.formState.errors.feeType.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount *</label>
                  <input
                    {...bulkCreateForm.register('amount', { required: 'Amount is required', min: { value: 0.01, message: 'Amount must be greater than 0' } })}
                    type="number"
                    step="0.01"
                    className="input-field"
                    placeholder="0.00"
                  />
                  {bulkCreateForm.formState.errors.amount && (
                    <p className="text-red-500 text-sm mt-1">{bulkCreateForm.formState.errors.amount.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Currency *</label>
                  <select {...bulkCreateForm.register('currency', { required: 'Currency is required' })} className="input-field">
                    {currencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name} ({currency.symbol})
                      </option>
                    ))}
                  </select>
                  {bulkCreateForm.formState.errors.currency && (
                    <p className="text-red-500 text-sm mt-1">{bulkCreateForm.formState.errors.currency.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Due Date *</label>
                  <input
                    {...bulkCreateForm.register('dueDate', { required: 'Due date is required' })}
                    type="date"
                    className="input-field"
                  />
                  {bulkCreateForm.formState.errors.dueDate && (
                    <p className="text-red-500 text-sm mt-1">{bulkCreateForm.formState.errors.dueDate.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Fees will be created for the month of this due date</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Academic Year *</label>
                  <input
                    {...bulkCreateForm.register('academicYear', { required: 'Academic year is required' })}
                    type="text"
                    className="input-field"
                    placeholder="e.g., 2025"
                  />
                  {bulkCreateForm.formState.errors.academicYear && (
                    <p className="text-red-500 text-sm mt-1">{bulkCreateForm.formState.errors.academicYear.message}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea {...bulkCreateForm.register('description')} className="input-field" rows={3} placeholder="Optional description" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setShowBulkCreateModal(false); bulkCreateForm.reset(); }} className="btn-secondary" title="Cancel bulk create">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" title="Create fees for all active students in the selected class">
                  Create Fees for All Students
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Fee Details</h2>
              <div className="flex gap-2 items-center">
                <button type="button" title="Print fee details" onClick={handlePrintProfile} className="btn-secondary flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  Print
                </button>
                <IconActionButton
                  onClick={() => { setShowPreviewModal(false); setPreviewFee(null); }}
                  tooltip="Close preview"
                  className="text-gray-500 hover:text-gray-700 focus:ring-gray-400"
                  sizeClass="p-1 rounded-md"
                >
                  <X className="h-6 w-6" />
                </IconActionButton>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-primary-600">Student Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="font-medium">Name:</span> {previewFee.student.name}</div>
                  <div><span className="font-medium">Student ID:</span> {previewFee.student.studentId || 'N/A'}</div>
                  <div><span className="font-medium">Roll Number:</span> {previewFee.student.rollNumber}</div>
                  <div><span className="font-medium">Class:</span> {previewFee.student.class || previewFee.class || 'N/A'}</div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3 text-primary-600">Fee Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="font-medium">Fee ID:</span> {previewFee.feeId || 'N/A'}</div>
                  <div><span className="font-medium">Fee Type:</span> {previewFee.feeType}</div>
                  <div><span className="font-medium">Amount:</span> {getCurrencySymbol(previewFee.currency)} {previewFee.amount.toLocaleString()}</div>
                  <div><span className="font-medium">Currency:</span> {previewFee.currency}</div>
                  <div><span className="font-medium">Paid Amount:</span> {getCurrencySymbol(previewFee.currency)} {(previewFee.paidAmount || 0).toLocaleString()}</div>
                  <div><span className="font-medium">Discount:</span> {getCurrencySymbol(previewFee.currency)} {(previewFee.discount || 0).toLocaleString()}</div>
                  <div><span className="font-medium">Due Date:</span> {new Date(previewFee.dueDate).toLocaleDateString()}</div>
                  <div><span className="font-medium">Status:</span> <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(previewFee.status)}`}>{previewFee.status}</span></div>
                  {previewFee.paymentDate && <div><span className="font-medium">Payment Date:</span> {new Date(previewFee.paymentDate).toLocaleDateString()}</div>}
                  {previewFee.paymentMethod && <div><span className="font-medium">Payment Method:</span> {previewFee.paymentMethod}</div>}
                  {previewFee.transactionId && <div><span className="font-medium">Transaction ID:</span> {previewFee.transactionId}</div>}
                  {previewFee.description && <div className="col-span-2"><span className="font-medium">Description:</span> {previewFee.description}</div>}
                  {previewFee.remarks && <div className="col-span-2"><span className="font-medium">Remarks:</span> {previewFee.remarks}</div>}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3 text-primary-600">Academic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="font-medium">Academic Year:</span> {previewFee.academicYear || 'N/A'}</div>
                  <div><span className="font-medium">Month:</span> {previewFee.month || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fees;

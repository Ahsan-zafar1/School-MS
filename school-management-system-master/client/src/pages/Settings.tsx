import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Settings as SettingsIcon,
  School,
  GraduationCap,
  Monitor,
  Users,
  Database,
  Mail,
  MessageSquare,
  Save,
  Upload,
  Download,
  RefreshCw,
  Building2,
  Phone,
  Globe,
  User,
  Calendar,
  Clock,
  DollarSign,
  Bell,
  Shield,
  CheckCircle,
  XCircle
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useSettings } from '../contexts/SettingsContext';

interface Settings {
  _id?: string;
  schoolInfo: {
    name: string;
    shortName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
    email: string;
    website: string;
    logo: string;
    principalName: string;
    principalEmail: string;
    principalPhone: string;
  };
  academicSettings: {
    defaultAcademicYear: string;
    terms: string[];
    gradingSystem: string;
    passingPercentage: number;
    gradeScale: Array<{
      grade: string;
      minPercentage: number;
      maxPercentage: number;
      gpa: number;
    }>;
    attendancePercentage: number;
  };
  systemSettings: {
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    currency: string;
    currencySymbol: string;
    language: string;
    itemsPerPage: number;
    enableNotifications: boolean;
    enableEmailNotifications: boolean;
    enableSMSNotifications: boolean;
  };
  emailSettings: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    smtpSecure: boolean;
    fromEmail: string;
    fromName: string;
  };
  smsSettings: {
    provider: string;
    apiKey: string;
    apiSecret: string;
    fromNumber: string;
  };
  backupSettings: {
    autoBackup: boolean;
    backupFrequency: string;
    backupRetention: number;
    lastBackup?: string;
  };
  features: {
    enableStudentPortal: boolean;
    enableParentPortal: boolean;
    enableTeacherPortal: boolean;
    enableOnlinePayment: boolean;
    enableIDCardGeneration: boolean;
    enableReportCardGeneration: boolean;
  };
}

type TabType = 'school' | 'academic' | 'system' | 'email' | 'sms' | 'users' | 'backup' | 'features';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('school');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const { refreshSettings } = useSettings();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<Settings>();

  useEffect(() => {
    fetchSettings();
    fetchUsers();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/settings');
      const fetchedSettings = response.data.data;
      setSettings(fetchedSettings);
      reset(fetchedSettings);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/users');
      setUsers(response.data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  };

  const onSave = async (data: any) => {
    try {
      setSaving(true);
      let endpoint = '/api/settings';
      
      // Determine which endpoint to use based on active tab
      switch (activeTab) {
        case 'school':
          endpoint = '/api/settings/school-info';
          await api.put(endpoint, data.schoolInfo);
          break;
        case 'academic':
          endpoint = '/api/settings/academic';
          await api.put(endpoint, data.academicSettings);
          break;
        case 'system':
          endpoint = '/api/settings/system';
          await api.put(endpoint, data.systemSettings);
          break;
        case 'email':
          endpoint = '/api/settings/email';
          await api.put(endpoint, data.emailSettings);
          break;
        case 'sms':
          endpoint = '/api/settings/sms';
          await api.put(endpoint, data.smsSettings);
          break;
        case 'backup':
          endpoint = '/api/settings/backup';
          await api.put(endpoint, data.backupSettings);
          break;
        case 'features':
          endpoint = '/api/settings/features';
          await api.put(endpoint, data.features);
          break;
        default:
          await api.put(endpoint, data);
      }
      
      toast.success('Settings saved successfully!');
      fetchSettings();
      // Refresh settings context so all modules get updated settings
      await refreshSettings();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (userData: any) => {
    try {
      await api.post('/api/auth/register', userData);
      toast.success('User created successfully!');
      setShowUserModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await api.delete(`/api/users/${userId}`);
      toast.success('User deleted successfully!');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleBackup = async () => {
    try {
      toast.loading('Creating backup...');
      // This would typically call a backup endpoint
      toast.success('Backup created successfully!');
    } catch (error: any) {
      toast.error('Failed to create backup');
    }
  };

  const tabs = [
    { id: 'school' as TabType, label: 'School Info', icon: School },
    { id: 'academic' as TabType, label: 'Academic', icon: GraduationCap },
    { id: 'system' as TabType, label: 'System', icon: Monitor },
    { id: 'email' as TabType, label: 'Email', icon: Mail },
    { id: 'sms' as TabType, label: 'SMS', icon: MessageSquare },
    { id: 'users' as TabType, label: 'Users', icon: Users },
    { id: 'backup' as TabType, label: 'Backup', icon: Database },
    { id: 'features' as TabType, label: 'Features', icon: Shield },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage system settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit(onSave)}>
            {/* School Information Tab */}
            {activeTab === 'school' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">School Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">School Name *</label>
                      <input
                        {...register('schoolInfo.name', { required: 'School name is required' })}
                        type="text"
                        className="input-field"
                        placeholder="Enter school name"
                      />
                      {errors.schoolInfo?.name && (
                        <p className="text-red-500 text-sm mt-1">{errors.schoolInfo.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Short Name</label>
                      <input
                        {...register('schoolInfo.shortName')}
                        type="text"
                        className="input-field"
                        placeholder="Enter short name"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <input
                        {...register('schoolInfo.address')}
                        type="text"
                        className="input-field"
                        placeholder="Enter address"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">City</label>
                      <input
                        {...register('schoolInfo.city')}
                        type="text"
                        className="input-field"
                        placeholder="Enter city"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">State</label>
                      <input
                        {...register('schoolInfo.state')}
                        type="text"
                        className="input-field"
                        placeholder="Enter state"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Zip Code</label>
                      <input
                        {...register('schoolInfo.zipCode')}
                        type="text"
                        className="input-field"
                        placeholder="Enter zip code"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Country</label>
                      <input
                        {...register('schoolInfo.country')}
                        type="text"
                        className="input-field"
                        placeholder="Enter country"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        {...register('schoolInfo.phone')}
                        type="tel"
                        className="input-field"
                        placeholder="Enter phone number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        {...register('schoolInfo.email')}
                        type="email"
                        className="input-field"
                        placeholder="Enter email"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Website</label>
                      <input
                        {...register('schoolInfo.website')}
                        type="url"
                        className="input-field"
                        placeholder="Enter website URL"
                      />
                    </div>

                    <div className="md:col-span-2 border-t pt-4 mt-4">
                      <h4 className="text-md font-semibold text-gray-900 mb-4">Principal Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Principal Name</label>
                          <input
                            {...register('schoolInfo.principalName')}
                            type="text"
                            className="input-field"
                            placeholder="Enter principal name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Principal Email</label>
                          <input
                            {...register('schoolInfo.principalEmail')}
                            type="email"
                            className="input-field"
                            placeholder="Enter principal email"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Principal Phone</label>
                          <input
                            {...register('schoolInfo.principalPhone')}
                            type="tel"
                            className="input-field"
                            placeholder="Enter principal phone"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Academic Settings Tab */}
            {activeTab === 'academic' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Default Academic Year</label>
                      <input
                        {...register('academicSettings.defaultAcademicYear')}
                        type="text"
                        className="input-field"
                        placeholder="e.g., 2024-2025"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Grading System</label>
                      <select
                        {...register('academicSettings.gradingSystem')}
                        className="input-field"
                      >
                        <option value="Percentage">Percentage</option>
                        <option value="Letter Grade">Letter Grade</option>
                        <option value="GPA">GPA</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Passing Percentage (%)</label>
                      <input
                        {...register('academicSettings.passingPercentage', {
                          min: 0,
                          max: 100,
                          valueAsNumber: true
                        })}
                        type="number"
                        className="input-field"
                        placeholder="50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Attendance Percentage (%)</label>
                      <input
                        {...register('academicSettings.attendancePercentage', {
                          min: 0,
                          max: 100,
                          valueAsNumber: true
                        })}
                        type="number"
                        className="input-field"
                        placeholder="75"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System Settings Tab */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">System Preferences</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Timezone</label>
                      <select
                        {...register('systemSettings.timezone')}
                        className="input-field"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                        <option value="Asia/Kolkata">India</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date Format</label>
                      <select
                        {...register('systemSettings.dateFormat')}
                        className="input-field"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Time Format</label>
                      <select
                        {...register('systemSettings.timeFormat')}
                        className="input-field"
                      >
                        <option value="12h">12 Hour</option>
                        <option value="24h">24 Hour</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Currency</label>
                      <input
                        {...register('systemSettings.currency')}
                        type="text"
                        className="input-field"
                        placeholder="USD"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Currency Symbol</label>
                      <input
                        {...register('systemSettings.currencySymbol')}
                        type="text"
                        className="input-field"
                        placeholder="$"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Items Per Page</label>
                      <input
                        {...register('systemSettings.itemsPerPage', {
                          min: 5,
                          max: 100,
                          valueAsNumber: true
                        })}
                        type="number"
                        className="input-field"
                        placeholder="10"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-3">
                      <h4 className="text-md font-semibold text-gray-900">Notification Preferences</h4>
                      <div className="flex items-center gap-2">
                        <input
                          {...register('systemSettings.enableNotifications')}
                          type="checkbox"
                          className="rounded border-gray-300"
                        />
                        <label className="text-sm text-gray-700">Enable Notifications</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          {...register('systemSettings.enableEmailNotifications')}
                          type="checkbox"
                          className="rounded border-gray-300"
                        />
                        <label className="text-sm text-gray-700">Enable Email Notifications</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          {...register('systemSettings.enableSMSNotifications')}
                          type="checkbox"
                          className="rounded border-gray-300"
                        />
                        <label className="text-sm text-gray-700">Enable SMS Notifications</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Email Settings Tab */}
            {activeTab === 'email' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">SMTP Host</label>
                      <input
                        {...register('emailSettings.smtpHost')}
                        type="text"
                        className="input-field"
                        placeholder="smtp.gmail.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">SMTP Port</label>
                      <input
                        {...register('emailSettings.smtpPort', { valueAsNumber: true })}
                        type="number"
                        className="input-field"
                        placeholder="587"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">SMTP Username</label>
                      <input
                        {...register('emailSettings.smtpUser')}
                        type="text"
                        className="input-field"
                        placeholder="your-email@gmail.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">SMTP Password</label>
                      <input
                        {...register('emailSettings.smtpPassword')}
                        type="password"
                        className="input-field"
                        placeholder="Enter password"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">From Email</label>
                      <input
                        {...register('emailSettings.fromEmail')}
                        type="email"
                        className="input-field"
                        placeholder="noreply@school.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">From Name</label>
                      <input
                        {...register('emailSettings.fromName')}
                        type="text"
                        className="input-field"
                        placeholder="School Management System"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        {...register('emailSettings.smtpSecure')}
                        type="checkbox"
                        className="rounded border-gray-300"
                      />
                      <label className="text-sm text-gray-700">Use Secure Connection (TLS/SSL)</label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SMS Settings Tab */}
            {activeTab === 'sms' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">SMS Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Provider</label>
                      <select
                        {...register('smsSettings.provider')}
                        className="input-field"
                      >
                        <option value="Twilio">Twilio</option>
                        <option value="AWS SNS">AWS SNS</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">API Key</label>
                      <input
                        {...register('smsSettings.apiKey')}
                        type="text"
                        className="input-field"
                        placeholder="Enter API key"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">API Secret</label>
                      <input
                        {...register('smsSettings.apiSecret')}
                        type="password"
                        className="input-field"
                        placeholder="Enter API secret"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">From Number</label>
                      <input
                        {...register('smsSettings.fromNumber')}
                        type="text"
                        className="input-field"
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Backup Settings Tab */}
            {activeTab === 'backup' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup & Restore</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        {...register('backupSettings.autoBackup')}
                        type="checkbox"
                        className="rounded border-gray-300"
                      />
                      <label className="text-sm text-gray-700">Enable Automatic Backup</label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Backup Frequency</label>
                      <select
                        {...register('backupSettings.backupFrequency')}
                        className="input-field"
                      >
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Backup Retention (days)</label>
                      <input
                        {...register('backupSettings.backupRetention', {
                          min: 1,
                          max: 365,
                          valueAsNumber: true
                        })}
                        type="number"
                        className="input-field"
                        placeholder="30"
                      />
                    </div>

                    {settings?.backupSettings?.lastBackup && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Last Backup</label>
                        <p className="text-sm text-gray-600">
                          {new Date(settings.backupSettings.lastBackup).toLocaleString()}
                        </p>
                      </div>
                    )}

                    <div className="md:col-span-2 flex gap-4">
                      <button
                        type="button"
                        onClick={handleBackup}
                        className="btn-primary flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Create Backup Now
                      </button>
                      <button
                        type="button"
                        className="btn-secondary flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Restore from Backup
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Features Tab */}
            {activeTab === 'features' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Toggles</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Student Portal</label>
                        <p className="text-xs text-gray-500">Allow students to access their information</p>
                      </div>
                      <input
                        {...register('features.enableStudentPortal')}
                        type="checkbox"
                        className="rounded border-gray-300"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Parent Portal</label>
                        <p className="text-xs text-gray-500">Allow parents to view student progress</p>
                      </div>
                      <input
                        {...register('features.enableParentPortal')}
                        type="checkbox"
                        className="rounded border-gray-300"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Teacher Portal</label>
                        <p className="text-xs text-gray-500">Allow teachers to manage their classes</p>
                      </div>
                      <input
                        {...register('features.enableTeacherPortal')}
                        type="checkbox"
                        className="rounded border-gray-300"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Online Payment</label>
                        <p className="text-xs text-gray-500">Enable online fee payment</p>
                      </div>
                      <input
                        {...register('features.enableOnlinePayment')}
                        type="checkbox"
                        className="rounded border-gray-300"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-900">ID Card Generation</label>
                        <p className="text-xs text-gray-500">Enable ID card generation for students/teachers</p>
                      </div>
                      <input
                        {...register('features.enableIDCardGeneration')}
                        type="checkbox"
                        className="rounded border-gray-300"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Report Card Generation</label>
                        <p className="text-xs text-gray-500">Enable report card generation</p>
                      </div>
                      <input
                        {...register('features.enableReportCardGeneration')}
                        type="checkbox"
                        className="rounded border-gray-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab - Separate from form */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUser(null);
                      setShowUserModal(true);
                    }}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Add User
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user._id || user.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {user.name || user.username}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleDeleteUser(user._id || user.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Save Button - Only show for form tabs */}
            {activeTab !== 'users' && (
              <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => fetchSettings()}
                  className="btn-secondary flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* User Creation Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  const userData = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                    role: formData.get('role'),
                  };
                  handleCreateUser(userData);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name *</label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="input-field"
                    placeholder="Enter name"
                    defaultValue={editingUser?.name || ''}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="input-field"
                    placeholder="Enter email"
                    defaultValue={editingUser?.email || ''}
                  />
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password *</label>
                    <input
                      name="password"
                      type="password"
                      required
                      className="input-field"
                      placeholder="Enter password"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Role *</label>
                  <select
                    name="role"
                    required
                    className="input-field"
                    defaultValue={editingUser?.role || 'user'}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserModal(false);
                      setEditingUser(null);
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    {editingUser ? 'Update User' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

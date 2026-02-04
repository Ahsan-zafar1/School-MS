import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../utils/api';

interface SchoolInfo {
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
}

interface AcademicSettings {
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
}

interface SystemSettings {
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
}

export interface StudentPortalPermissions {
  showProfile?: boolean;
  showFees?: boolean;
  showExams?: boolean;
  showResults?: boolean;
  showAttendance?: boolean;
  showNotifications?: boolean;
}

export interface TeacherPortalPermissions {
  showProfile?: boolean;
  showClasses?: boolean;
  showAttendance?: boolean;
  showExams?: boolean;
  showNotifications?: boolean;
}

interface Settings {
  _id?: string;
  schoolInfo: SchoolInfo;
  academicSettings: AcademicSettings;
  systemSettings: SystemSettings;
  emailSettings?: any;
  smsSettings?: any;
  backupSettings?: any;
  features?: any;
  portalPermissions?: {
    studentPortal?: StudentPortalPermissions;
    teacherPortal?: TeacherPortalPermissions;
  };
}

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  formatDate: (date: Date | string) => string;
  formatCurrency: (amount: number) => string;
  getSchoolName: () => string;
  getDefaultAcademicYear: () => string;
  getPassingPercentage: () => number;
  getAttendancePercentage: () => number;
  getItemsPerPage: () => number;
  getStudentPortalPermissions: () => StudentPortalPermissions;
  getTeacherPortalPermissions: () => TeacherPortalPermissions;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/settings');
      const fetchedSettings = response.data.data;
      setSettings(fetchedSettings);
      // Cache in localStorage for faster access
      localStorage.setItem('settings', JSON.stringify(fetchedSettings));
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Try to load from cache if API fails
      const cached = localStorage.getItem('settings');
      if (cached) {
        try {
          setSettings(JSON.parse(cached));
        } catch (e) {
          // Use default settings if cache is invalid
          setSettings(getDefaultSettings());
        }
      } else {
        setSettings(getDefaultSettings());
      }
    } finally {
      setLoading(false);
    }
  };

  const getDefaultSettings = (): Settings => {
    return {
      schoolInfo: {
        name: 'School Management System',
        shortName: 'SMS',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        phone: '',
        email: '',
        website: '',
        logo: '',
        principalName: '',
        principalEmail: '',
        principalPhone: '',
      },
      academicSettings: {
        defaultAcademicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
        terms: ['1st Term', '2nd Term', '3rd Term', 'Final Term'],
        gradingSystem: 'Percentage',
        passingPercentage: 50,
        gradeScale: [
          { grade: 'A+', minPercentage: 90, maxPercentage: 100, gpa: 4.0 },
          { grade: 'A', minPercentage: 80, maxPercentage: 89, gpa: 3.5 },
          { grade: 'B', minPercentage: 70, maxPercentage: 79, gpa: 3.0 },
          { grade: 'C', minPercentage: 60, maxPercentage: 69, gpa: 2.5 },
          { grade: 'D', minPercentage: 50, maxPercentage: 59, gpa: 2.0 },
          { grade: 'F', minPercentage: 0, maxPercentage: 49, gpa: 0.0 },
        ],
        attendancePercentage: 75,
      },
      systemSettings: {
        timezone: 'UTC',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        currency: 'USD',
        currencySymbol: '$',
        language: 'en',
        itemsPerPage: 10,
        enableNotifications: true,
        enableEmailNotifications: true,
        enableSMSNotifications: false,
      },
    };
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const formatDate = (date: Date | string): string => {
    if (!settings) return new Date(date).toLocaleDateString();
    
    const d = typeof date === 'string' ? new Date(date) : date;
    const format = settings.systemSettings.dateFormat;
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    switch (format) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      default:
        return `${day}/${month}/${year}`;
    }
  };

  const formatCurrency = (amount: number): string => {
    if (!settings) return `$${amount.toFixed(2)}`;
    const symbol = settings.systemSettings.currencySymbol || '$';
    return `${symbol}${amount.toFixed(2)}`;
  };

  const getSchoolName = (): string => {
    return settings?.schoolInfo?.name || 'School Management System';
  };

  const getDefaultAcademicYear = (): string => {
    return settings?.academicSettings?.defaultAcademicYear || 
           `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  };

  const getPassingPercentage = (): number => {
    return settings?.academicSettings?.passingPercentage || 50;
  };

  const getAttendancePercentage = (): number => {
    return settings?.academicSettings?.attendancePercentage || 75;
  };

  const getItemsPerPage = (): number => {
    return settings?.systemSettings?.itemsPerPage || 10;
  };

  const getStudentPortalPermissions = (): StudentPortalPermissions => {
    return settings?.portalPermissions?.studentPortal ?? {
      showProfile: true,
      showFees: true,
      showExams: true,
      showResults: true,
      showAttendance: true,
      showNotifications: true,
    };
  };

  const getTeacherPortalPermissions = (): TeacherPortalPermissions => {
    return settings?.portalPermissions?.teacherPortal ?? {
      showProfile: true,
      showClasses: true,
      showAttendance: true,
      showExams: true,
      showNotifications: true,
    };
  };

  const refreshSettings = async () => {
    await fetchSettings();
  };

  const value = {
    settings,
    loading,
    refreshSettings,
    formatDate,
    formatCurrency,
    getSchoolName,
    getDefaultAcademicYear,
    getPassingPercentage,
    getAttendancePercentage,
    getItemsPerPage,
    getStudentPortalPermissions,
    getTeacherPortalPermissions,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

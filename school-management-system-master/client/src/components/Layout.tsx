import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Home, 
  Users, 
  GraduationCap, 
  BookOpen,
  BookMarked,
  FileText, 
  DollarSign, 
  Calendar, 
  BarChart3, 
  Settings, 
  Menu, 
  X,
  LogOut,
  User,
  Search,
  Bell,
  MessageCircle,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { getSchoolName, getStudentPortalPermissions, getTeacherPortalPermissions } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const studentPerms = getStudentPortalPermissions();
  const teacherPerms = getTeacherPortalPermissions();

  const adminNavigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Students', href: '/students', icon: Users },
    { name: 'Teachers', href: '/teachers', icon: GraduationCap },
    { name: 'Classes', href: '/classes', icon: BookOpen },
    { name: 'Subjects', href: '/subjects', icon: BookMarked },
    { name: 'Exams', href: '/exams', icon: FileText },
    { name: 'Results', href: '/results', icon: BarChart3 },
    { name: 'Fees', href: '/fees', icon: DollarSign },
    { name: 'Attendance', href: '/attendance', icon: Calendar },
    { name: 'Announcements', href: '/announcements', icon: MessageCircle },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const studentNavigation = [
    ...(true ? [{ name: 'Dashboard', href: '/', icon: Home }] : []),
    ...(studentPerms.showProfile !== false ? [{ name: 'My Profile', href: '/my/profile', icon: User }] : []),
    ...(studentPerms.showFees !== false ? [{ name: 'My Fees', href: '/my/fees', icon: DollarSign }] : []),
    ...(studentPerms.showExams !== false ? [{ name: 'My Exams', href: '/my/exams', icon: FileText }] : []),
    ...(studentPerms.showResults !== false ? [{ name: 'My Results', href: '/my/results', icon: BarChart3 }] : []),
    ...(studentPerms.showAttendance !== false ? [{ name: 'My Attendance', href: '/my/attendance', icon: Calendar }] : []),
    ...(studentPerms.showNotifications !== false ? [{ name: 'Notifications & Announcements', href: '/my/notifications', icon: Bell }] : []),
  ];

  const teacherNavigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    ...(teacherPerms.showProfile !== false ? [{ name: 'My Profile', href: '/my/profile', icon: User }] : []),
    ...(teacherPerms.showClasses !== false ? [{ name: 'My Classes', href: '/my/classes', icon: BookOpen }] : []),
    ...(teacherPerms.showAttendance !== false ? [
      { name: 'Mark Attendance', href: '/my/mark-attendance', icon: Calendar },
      { name: 'View Attendance', href: '/my/view-attendance', icon: Calendar },
    ] : []),
    ...(teacherPerms.showExams !== false ? [
      { name: 'Exams', href: '/my/exams', icon: FileText },
      { name: 'Exam Marks', href: '/my/exam-marks', icon: FileText },
    ] : []),
    { name: 'Schedule', href: '/my/schedule', icon: BookOpen },
    { name: 'Announcements', href: '/my/announcements', icon: MessageCircle },
    { name: 'Analytics', href: '/my/analytics', icon: BarChart3 },
    ...(teacherPerms.showNotifications !== false ? [{ name: 'Notifications', href: '/my/notifications', icon: Bell }] : []),
  ];

  const navigation = user?.role === 'admin'
    ? adminNavigation
    : user?.role === 'student'
      ? studentNavigation
      : user?.role === 'teacher'
        ? teacherNavigation
        : adminNavigation;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-purple-800">
          <div className="flex h-20 items-center justify-between px-4 border-b border-purple-700 dark:border-purple-800">
            <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                <BookOpen className="h-6 w-6 text-purple-800 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{getSchoolName()}</h1>
                <p className="text-xs text-purple-200 dark:text-purple-300">Management System</p>
              </div>
            </div>
            <button
              type="button"
              title="Close menu"
              aria-label="Close menu"
              onClick={() => setSidebarOpen(false)}
              className="text-white hover:text-purple-200 dark:hover:text-purple-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 text-white rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-purple-700 dark:bg-purple-600 shadow-lg' 
                      : 'hover:bg-purple-700/50 dark:hover:bg-purple-700/50'
                  }`}
                  style={isActive ? {
                    borderLeft: '4px solid #ec4899'
                  } : {}}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-purple-800 dark:bg-purple-900 border-r border-purple-900 dark:border-purple-800">
          {/* Logo Section */}
          <div className="flex h-20 items-center px-4 border-b border-purple-700 dark:border-purple-800">
            <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                <BookOpen className="h-6 w-6 text-purple-800 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{getSchoolName()}</h1>
                <p className="text-xs text-purple-200 dark:text-purple-300">Management System</p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 text-white rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-purple-700 dark:bg-purple-600 shadow-lg relative' 
                      : 'hover:bg-purple-700/50 dark:hover:bg-purple-700/50'
                  }`}
                  style={isActive ? {
                    borderLeft: '4px solid #ec4899'
                  } : {}}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        {/* Top header */}
        <div className="sticky top-0 z-40 flex h-20 shrink-0 items-center gap-x-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 transition-colors duration-200">
          <button
            type="button"
            title="Open navigation menu"
            aria-label="Open navigation menu"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden dark:text-gray-200"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Welcome Message */}
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Welcome to {getSchoolName()}</h2>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-x-4">
            <button
              type="button"
              title="Messages"
              aria-label="Messages"
              className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-purple-600 rounded-full"></span>
            </button>
            <button
              type="button"
              title="Notifications"
              aria-label="Notifications"
              className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-purple-600 rounded-full"></span>
            </button>
            {/* Theme Toggle Button - Fancy Design */}
            <button
              type="button"
              onClick={toggleTheme}
              className="relative p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 dark:from-yellow-400 dark:to-yellow-500 hover:from-purple-600 hover:to-purple-700 dark:hover:from-yellow-500 dark:hover:to-yellow-600 text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 group"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              <div className="relative w-5 h-5">
                <Sun className={`h-5 w-5 absolute transition-all duration-300 ${theme === 'light' ? 'rotate-0 opacity-100 scale-100' : 'rotate-90 opacity-0 scale-0'}`} />
                <Moon className={`h-5 w-5 absolute transition-all duration-300 ${theme === 'dark' ? 'rotate-0 opacity-100 scale-100' : '-rotate-90 opacity-0 scale-0'}`} />
              </div>
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </button>
            <div className="flex items-center gap-x-2 pl-4 border-l border-gray-200 dark:border-gray-700">
              <div className="h-8 w-8 rounded-full bg-purple-600 dark:bg-purple-700 flex items-center justify-center text-white font-semibold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Log out of your account"
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6 min-h-screen">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout; 
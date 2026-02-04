import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudentDashboard from './pages/StudentDashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Classes from './pages/Classes';
import Exams from './pages/Exams';
import Results from './pages/Results';
import Fees from './pages/Fees';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import MyProfile from './pages/MyProfile';
import MyFees from './pages/MyFees';
import MyResults from './pages/MyResults';
import MyAttendance from './pages/MyAttendance';
import MyExams from './pages/MyExams';
import MyNotifications from './pages/MyNotifications';
import Layout from './components/Layout';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const AdminOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
};

const DashboardOrStudentDashboard: React.FC = () => {
  const { user } = useAuth();
  return user?.role === 'student' ? <StudentDashboard /> : <Dashboard />;
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <Router>
            <div className="App">
              <Toaster position="top-right" />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <Layout />
                    </PrivateRoute>
                  }
                >
                  <Route index element={<DashboardOrStudentDashboard />} />
                  <Route path="my/profile" element={<MyProfile />} />
                  <Route path="my/fees" element={<MyFees />} />
                  <Route path="my/results" element={<MyResults />} />
                  <Route path="my/attendance" element={<MyAttendance />} />
                  <Route path="my/exams" element={<MyExams />} />
                  <Route path="my/notifications" element={<MyNotifications />} />
                  <Route path="students" element={<AdminOnlyRoute><Students /></AdminOnlyRoute>} />
                  <Route path="teachers" element={<AdminOnlyRoute><Teachers /></AdminOnlyRoute>} />
                  <Route path="classes" element={<AdminOnlyRoute><Classes /></AdminOnlyRoute>} />
                  <Route path="exams" element={<AdminOnlyRoute><Exams /></AdminOnlyRoute>} />
                  <Route path="results" element={<AdminOnlyRoute><Results /></AdminOnlyRoute>} />
                  <Route path="fees" element={<AdminOnlyRoute><Fees /></AdminOnlyRoute>} />
                  <Route path="attendance" element={<AdminOnlyRoute><Attendance /></AdminOnlyRoute>} />
                  <Route path="reports" element={<AdminOnlyRoute><Reports /></AdminOnlyRoute>} />
                  <Route path="settings" element={<AdminOnlyRoute><Settings /></AdminOnlyRoute>} />
                </Route>
              </Routes>
            </div>
          </Router>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App; 
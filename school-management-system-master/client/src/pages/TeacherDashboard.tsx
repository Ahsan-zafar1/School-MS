import React, { useState, useEffect } from 'react';
import { UserCheck, BookOpen, Users, User } from 'lucide-react';
import api from '../utils/api';
import { useSettings } from '../contexts/SettingsContext';
import { Link } from 'react-router-dom';

interface TeacherDashboardData {
  profile: { name: string; teacherId?: string; email?: string };
  classesCount: number;
  studentsCount: number;
  todayPresent: number;
  todayAbsent: number;
}

const TeacherDashboard: React.FC = () => {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { getSchoolName } = useSettings();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/me/dashboard');
        setData(res.data.data);
      } catch (err: unknown) {
        console.error(err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-600 dark:text-gray-400">
        Unable to load your dashboard. Make sure your account is linked to a teacher record.
      </div>
    );
  }

  const { profile, classesCount, studentsCount, todayPresent, todayAbsent } = data;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Welcome, {profile.name}
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        {getSchoolName()}
        {profile.teacherId ? ` · ${profile.teacherId}` : ''}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">My Classes</p>
              <p className="text-3xl font-bold">{classesCount}</p>
            </div>
            <BookOpen className="h-12 w-12 text-purple-200 opacity-80" />
          </div>
          <Link
            to="/my/classes"
            className="mt-3 inline-block text-sm text-purple-100 hover:text-white underline"
          >
            View classes →
          </Link>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">My Students</p>
              <p className="text-3xl font-bold">{studentsCount}</p>
            </div>
            <Users className="h-12 w-12 text-blue-200 opacity-80" />
          </div>
          <Link
            to="/my/classes"
            className="mt-3 inline-block text-sm text-blue-100 hover:text-white underline"
          >
            View in classes →
          </Link>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Today – Present</p>
              <p className="text-3xl font-bold">{todayPresent}</p>
            </div>
            <UserCheck className="h-12 w-12 text-green-200 opacity-80" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm">Today – Absent</p>
              <p className="text-3xl font-bold">{todayAbsent}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <User className="h-5 w-5" /> Quick links
        </h3>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/my/profile"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            My Profile
          </Link>
          <Link
            to="/my/classes"
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition"
          >
            My Classes
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;

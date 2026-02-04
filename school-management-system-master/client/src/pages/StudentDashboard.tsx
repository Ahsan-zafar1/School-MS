import React, { useState, useEffect } from 'react';
import { UserCheck, DollarSign, Calendar, BarChart3, FileText, Bell } from 'lucide-react';
import api from '../utils/api';
import { useSettings } from '../contexts/SettingsContext';

interface StudentDashboardData {
  profile: { name: string; class: string; studentId?: string };
  fees: { recent: any[]; pendingCount: number; paidCount: number };
  attendance: { recent: any[]; last30Present: number; last30Absent: number; todayPresent: number; todayAbsent: number };
  results: any[];
}

const StudentDashboard: React.FC = () => {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { formatCurrency, getSchoolName } = useSettings();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/me/dashboard');
        setData(res.data.data);
      } catch (err: any) {
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
        Unable to load your dashboard. Make sure your account is linked to a student record.
      </div>
    );
  }

  const { profile, fees, attendance, results } = data;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Welcome, {profile.name}
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        {getSchoolName()} · Class {profile.class} {profile.studentId ? `· ${profile.studentId}` : ''}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Today - Present</p>
              <p className="text-3xl font-bold">{attendance.todayPresent}</p>
            </div>
            <UserCheck className="h-12 w-12 text-green-200 opacity-80" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Today - Absent</p>
              <p className="text-3xl font-bold">{attendance.todayAbsent}</p>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Pending Fees</p>
              <p className="text-3xl font-bold">{fees.pendingCount}</p>
            </div>
            <DollarSign className="h-12 w-12 text-blue-200 opacity-80" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Paid Fees</p>
              <p className="text-3xl font-bold">{fees.paidCount}</p>
            </div>
            <BarChart3 className="h-12 w-12 text-purple-200 opacity-80" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Recent Fees
          </h3>
          {fees.recent?.length > 0 ? (
            <ul className="space-y-2">
              {fees.recent.slice(0, 5).map((fee: any) => (
                <li key={fee._id} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <span className="text-gray-700 dark:text-gray-300">{fee.feeType} · {fee.month}</span>
                  <span className={fee.status === 'Paid' ? 'text-green-600' : 'text-amber-600'}>
                    {fee.status} · {formatCurrency(fee.amount || 0)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No fee records yet.</p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" /> Recent Results
          </h3>
          {results?.length > 0 ? (
            <ul className="space-y-2">
              {results.slice(0, 5).map((r: any, i: number) => (
                <li key={r._id || i} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <span className="text-gray-700 dark:text-gray-300">{r.subject} {r.exam?.name ? `· ${r.exam.name}` : ''}</span>
                  <span className="font-medium">{r.marksObtained}/{r.totalMarks} ({r.percentage?.toFixed(0) ?? 0}%)</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No results yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

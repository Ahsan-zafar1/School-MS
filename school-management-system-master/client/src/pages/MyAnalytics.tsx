import React, { useState, useEffect } from 'react';
import { BarChart3, BookOpen, UserCheck, Award } from 'lucide-react';
import api from '../utils/api';

interface ClassAnalytic {
  classId: string;
  className: string;
  totalStudents: number;
  attendancePercent: number;
  averageMarksPercent: number | null;
  marksCount: number;
}

const MyAnalytics: React.FC = () => {
  const [data, setData] = useState<ClassAnalytic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/me/analytics')
      .then((res) => setData(res.data.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <BarChart3 className="h-8 w-8" /> Class Analytics
      </h2>
      <p className="text-gray-600 dark:text-gray-400">Attendance and marks overview for your classes. Same data is available on the admin dashboard.</p>

      {data.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center text-gray-500">No class data.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((c) => (
            <div key={c.classId} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5" /> {c.className}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1"><UserCheck className="h-4 w-4" /> Students</span>
                  <span className="font-medium">{c.totalStudents}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Attendance %</span>
                  <span className={`font-medium ${c.attendancePercent >= 75 ? 'text-green-600' : c.attendancePercent >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {c.attendancePercent.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1"><Award className="h-4 w-4" /> Avg marks</span>
                  <span className="font-medium">{c.averageMarksPercent != null ? `${c.averageMarksPercent.toFixed(1)}%` : '—'} ({c.marksCount} records)</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyAnalytics;

import React, { useState, useEffect } from 'react';
import { BookOpen, Clock } from 'lucide-react';
import api from '../utils/api';

interface Period {
  subject: string;
  teacher?: string;
  startTime: string;
  endTime: string;
}

interface DaySchedule {
  day: string;
  periods: Period[];
}

interface ClassSchedule {
  classId: string;
  className: string;
  section?: string;
  schedule: DaySchedule[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const MySchedule: React.FC = () => {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/me/schedule')
      .then((res) => setSchedules(res.data.data || []))
      .catch(() => setSchedules([]))
      .finally(() => setLoading(false));
  }, []);

  const getPeriod = (cls: ClassSchedule, day: string, periodIndex: number) => {
    const daySchedule = (cls.schedule || []).find((d: DaySchedule) => d.day === day);
    const periods = daySchedule?.periods || [];
    return periods[periodIndex];
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Clock className="h-8 w-8" /> My Schedule
      </h2>
      <p className="text-gray-600 dark:text-gray-400">Weekly timetable for classes you teach.</p>

      {schedules.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center text-gray-500">No schedule data.</div>
      ) : (
        schedules.map((cls) => (
          <div key={cls.classId} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <h3 className="px-4 py-3 bg-purple-100 dark:bg-purple-900/30 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BookOpen className="h-5 w-5" /> {cls.className}{cls.section ? ` - Section ${cls.section}` : ''}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="text-left px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 w-24">Day</th>
                    <th className="text-left px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200">Periods</th>
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => {
                    const daySchedule = (cls.schedule || []).find((d: DaySchedule) => d.day === day);
                    const periods = daySchedule?.periods || [];
                    return (
                      <tr key={day} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">{day}</td>
                        <td className="px-3 py-2">
                          {periods.length === 0 ? (
                            <span className="text-gray-400 text-sm">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {periods.map((p: Period, i: number) => (
                                <span key={i} className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded text-sm">
                                  {p.subject} {p.startTime && `(${p.startTime}${p.endTime ? `-${p.endTime}` : ''})`}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MySchedule;

import React, { useState, useEffect } from 'react';
import { Calendar, BookOpen, Save, UserCheck } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface ClassOption {
  _id: string;
  name: string;
  section?: string;
}

interface StudentRow {
  studentId: string;
  name: string;
  rollNumber?: string;
  studentIdCode?: string;
  status: string;
}

const MyMarkAttendance: React.FC = () => {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/api/me/classes');
        setClasses(res.data.data || []);
        if (res.data.data?.length && !selectedClassId) setSelectedClassId(res.data.data[0]._id);
      } catch {
        setClasses([]);
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (!selectedClassId || !date) return;
    setLoading(true);
    api.get('/api/me/attendance/class', { params: { classId: selectedClassId, date } })
      .then((res) => {
        setStudents(res.data.data?.students || []);
      })
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, [selectedClassId, date]);

  const updateStatus = (studentId: string, status: string) => {
    setStudents((prev) => prev.map((s) => (s.studentId === studentId ? { ...s, status } : s)));
  };

  const handleSave = async () => {
    if (!selectedClassId || !date || !students.length) {
      toast.error('Select class and date and ensure students are loaded.');
      return;
    }
    const cls = classes.find((c) => c._id === selectedClassId);
    setSaving(true);
    try {
      await api.post('/api/me/attendance/mark', {
        date,
        class: cls?.name,
        classId: selectedClassId,
        attendanceData: students.map((s) => ({ studentId: s.studentId, status: s.status })).filter((s) => s.status && s.status !== 'unmarked')
      });
      toast.success('Attendance saved.');
      setStudents((prev) => prev.map((s) => ({ ...s, status: s.status })));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <UserCheck className="h-8 w-8" /> Mark Attendance
      </h2>

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 min-w-[180px]"
          >
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Attendance'}
        </button>
      </div>

      {loading && <div className="text-gray-500">Loading students...</div>}
      {!loading && students.length === 0 && selectedClassId && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center text-gray-500">No students in this class for the selected date.</div>
      )}
      {!loading && students.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200">Student</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200">Roll / ID</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.studentId} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{s.name}</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{s.rollNumber || s.studentIdCode || '—'}</td>
                  <td className="px-4 py-2">
                    <select
                      value={s.status}
                      onChange={(e) => updateStatus(s.studentId, e.target.value)}
                      className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                    >
                      <option value="unmarked">Unmarked</option>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                      <option value="excused">Excused</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyMarkAttendance;

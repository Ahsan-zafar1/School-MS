import React, { useState, useEffect } from 'react';
import { Calendar, Download, Filter } from 'lucide-react';
import api from '../utils/api';

interface AttendanceRecord {
  _id: string;
  date: string;
  class: string;
  status: string;
  student?: { name: string; rollNumber?: string; studentId?: string };
}

const MyViewAttendance: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<{ name: string }[]>([]);
  const [className, setClassName] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchRecords = () => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: 20 };
    if (className) params.className = className;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    api.get('/api/me/attendance/records', { params })
      .then((res) => {
        setRecords((res.data.data || []) as AttendanceRecord[]);
        setTotal(res.data.total ?? 0);
      })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/api/me/classes').then((res) => {
      const list = (res.data.data || []).map((c: { name: string }) => ({ name: c.name }));
      setClasses(list);
    }).catch(() => setClasses([]));
  }, []);

  useEffect(() => { fetchRecords(); }, [page, className, dateFrom, dateTo]);

  const exportCsv = () => {
    const params: Record<string, string> = {};
    if (className) params.className = className;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    api.get('/api/me/attendance/export', { params, responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', 'my-attendance.csv');
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => {});
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Calendar className="h-8 w-8" /> View Attendance
      </h2>

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class</label>
          <select
            value={className}
            onChange={(e) => { setClassName(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 min-w-[140px]"
          >
            <option value="">All</option>
            {classes.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2" />
        </div>
        <button type="button" onClick={fetchRecords} className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
          <Filter className="h-4 w-4" /> Apply
        </button>
        <button type="button" onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {loading && <div className="text-gray-500">Loading...</div>}
      {!loading && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Student</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Class</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r._id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-4 py-2">{r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-2">{r.student?.name ?? '—'}</td>
                    <td className="px-4 py-2">{r.class ?? '—'}</td>
                    <td className="px-4 py-2 capitalize">{r.status ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > 20 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Total: {total}</span>
              <div className="flex gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-600 disabled:opacity-50">Prev</button>
                <button type="button" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-600 disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyViewAttendance;

import React, { useState, useEffect } from 'react';
import { FileText, Plus, Save } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface Exam {
  _id: string;
  examName: string;
  examType: string;
  subject: string;
  class: string;
  date: string;
  totalMarks: number;
}

interface Mark {
  _id: string;
  student: { _id: string; name: string; rollNumber?: string; studentId?: string };
  subject: string;
  class: string;
  marksObtained: number;
  totalMarks: number;
  percentage?: number;
  status: string;
  exam?: { examName: string };
}

const MyExamMarks: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/api/me/exams')
      .then((res) => setExams(res.data.data || []))
      .catch(() => setExams([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedExamId) { setMarks([]); return; }
    setLoading(true);
    api.get('/api/me/exam-marks', { params: { examId: selectedExamId } })
      .then((res) => setMarks(res.data.data || []))
      .catch(() => setMarks([]))
      .finally(() => setLoading(false));
  }, [selectedExamId]);

  const selectedExam = exams.find((e) => e._id === selectedExamId);

  const updateMark = (markId: string, marksObtained: number) => {
    setMarks((prev) => prev.map((m) => (m._id === markId ? { ...m, marksObtained } : m)));
  };

  const saveMark = async (m: Mark) => {
    setSaving(true);
    try {
      await api.put(`/api/me/exam-marks/${m._id}`, { marksObtained: m.marksObtained, totalMarks: m.totalMarks });
      toast.success('Mark updated.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <FileText className="h-8 w-8" /> Exam Marks
      </h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Exam</label>
        <select
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 min-w-[280px]"
        >
          <option value="">— Select exam —</option>
          {exams.map((e) => (
            <option key={e._id} value={e._id}>
              {e.examName} – {e.subject} ({e.class}) {e.date ? new Date(e.date).toLocaleDateString() : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedExam && (
        <p className="text-gray-600 dark:text-gray-400">
          {selectedExam.examName} · {selectedExam.subject} · Total: {selectedExam.totalMarks}
        </p>
      )}

      {loading && <div className="text-gray-500">Loading...</div>}
      {!loading && marks.length === 0 && selectedExamId && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center text-gray-500">No marks recorded for this exam yet. Add marks from the Results section in admin or create via API.</div>
      )}
      {!loading && marks.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">Student</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Subject</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Obtained</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Total</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {marks.map((m) => (
                <tr key={m._id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2">{m.student?.name ?? '—'}</td>
                  <td className="px-4 py-2">{m.subject}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={0}
                      max={m.totalMarks}
                      value={m.marksObtained}
                      onChange={(e) => updateMark(m._id, Number(e.target.value))}
                      className="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1"
                    />
                  </td>
                  <td className="px-4 py-2">{m.totalMarks}</td>
                  <td className="px-4 py-2">{m.status}</td>
                  <td className="px-4 py-2">
                    <button type="button" onClick={() => saveMark(m)} disabled={saving} className="text-sm text-purple-600 hover:underline disabled:opacity-50">Save</button>
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

export default MyExamMarks;

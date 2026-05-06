import React, { useState, useEffect } from 'react';
import { BookOpen, Users, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../utils/api';

interface ClassTeacher {
  _id: string;
  name?: string;
  teacherId?: string;
}

interface StudentRef {
  _id: string;
  name?: string;
  email?: string;
  class?: string;
  studentId?: string;
}

interface ClassItem {
  _id: string;
  name: string;
  grade?: string;
  section?: string;
  classTeacher?: ClassTeacher;
  students?: StudentRef[];
  academicYear?: string;
}

const MyClasses: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/me/classes');
        setClasses(res.data.data || []);
        if ((res.data.data?.length ?? 0) > 0 && !expandedId) {
          setExpandedId(res.data.data[0]._id);
        }
      } catch (err: unknown) {
        console.error(err);
        setClasses([]);
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <BookOpen className="h-8 w-8" /> My Classes
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        Classes you teach or are assigned to. Click a class to see students.
      </p>

      {classes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
          No classes assigned yet.
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => {
            const isExpanded = expandedId === cls._id;
            const studentList = cls.students || [];
            return (
              <div
                key={cls._id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : cls._id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {cls.name}
                        {cls.grade ? ` · ${cls.grade}` : ''}
                        {cls.section ? ` · Section ${cls.section}` : ''}
                      </span>
                      {cls.academicYear && (
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                          {cls.academicYear}
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Users className="h-4 w-4" />
                      {studentList.length} student{studentList.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 px-4 py-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Students
                    </h4>
                    {studentList.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No students in this class.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {studentList.map((s) => (
                          <li
                            key={s._id}
                            className="text-sm text-gray-700 dark:text-gray-300 flex flex-wrap gap-x-4 gap-y-0"
                          >
                            <span className="font-medium">{s.name ?? '—'}</span>
                            {s.studentId && <span className="text-gray-500">{s.studentId}</span>}
                            {s.email && <span className="text-gray-500 truncate">{s.email}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyClasses;

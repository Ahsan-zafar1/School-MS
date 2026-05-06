import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export interface SubjectItem {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

interface UseSubjectsOptions {
  /** When true (default), only active subjects. */
  activeOnly?: boolean;
  /** Refetch when `subjectsUpdated` is dispatched (default true). */
  listenForUpdates?: boolean;
}

export const useSubjects = (options: UseSubjectsOptions = {}) => {
  const { activeOnly = true, listenForUpdates = true } = options;
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        limit: '2000',
        sortBy: 'sortOrder',
        sortOrder: 'asc',
      });
      if (activeOnly) {
        params.set('isActive', 'true');
      } else {
        params.set('all', 'true');
      }
      const response = await api.get(`/api/subjects?${params.toString()}`);
      const data = response.data.data || [];
      setSubjects(data);
    } catch (err: any) {
      console.error('Error fetching subjects:', err);
      setError(err.response?.data?.message || 'Failed to load subjects');
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    if (!listenForUpdates) return;
    const onUpdate = () => {
      fetchSubjects();
    };
    window.addEventListener('subjectsUpdated', onUpdate);
    return () => window.removeEventListener('subjectsUpdated', onUpdate);
  }, [listenForUpdates, fetchSubjects]);

  const subjectNames = subjects.map((s) => s.name).filter(Boolean);

  return {
    subjects,
    subjectNames,
    loading,
    error,
    refetch: fetchSubjects,
  };
};

export function notifySubjectsUpdated() {
  window.dispatchEvent(new CustomEvent('subjectsUpdated'));
}

import { useState, useEffect } from 'react';
import api from '../utils/api';

interface Class {
  _id: string;
  name: string;
  grade?: string;
  section: string;
  isActive: boolean;
  academicYear: string;
}

interface UseClassesOptions {
  activeOnly?: boolean;
  currentYearOnly?: boolean;
}

export const useClasses = (options: UseClassesOptions = {}) => {
  const { activeOnly = true, currentYearOnly = false } = options;
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams({
        limit: '1000', // Get all classes
        sortBy: 'name',
        sortOrder: 'asc',
      });

      if (activeOnly) {
        params.append('status', 'true');
      }

      if (currentYearOnly) {
        // Get current academic year (you can adjust this logic)
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;
        params.append('academicYear', `${currentYear}-${nextYear}`);
      }

      const response = await api.get(`/api/classes?${params.toString()}`);
      setClasses(response.data.data || []);
    } catch (err: any) {
      console.error('Error fetching classes:', err);
      setError(err.response?.data?.message || 'Failed to fetch classes');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  // Get unique class names for dropdowns
  const getClassNames = (): string[] => {
    const uniqueNames = new Set<string>();
    classes.forEach(cls => {
      if (cls.name) {
        uniqueNames.add(cls.name);
      }
    });
    return Array.from(uniqueNames).sort();
  };

  // Get class names grouped by grade
  const getClassesByGrade = (): Record<string, string[]> => {
    const grouped: Record<string, string[]> = {};
    classes.forEach(cls => {
      const grade = cls.grade || 'Other';
      if (!grouped[grade]) {
        grouped[grade] = [];
      }
      if (cls.name && !grouped[grade].includes(cls.name)) {
        grouped[grade].push(cls.name);
      }
    });
    return grouped;
  };

  return {
    classes,
    classNames: getClassNames(),
    classesByGrade: getClassesByGrade(),
    loading,
    error,
    refetch: fetchClasses,
  };
};


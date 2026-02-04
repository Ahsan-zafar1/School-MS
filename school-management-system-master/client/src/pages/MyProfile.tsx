import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useSettings } from '../contexts/SettingsContext';

const MyProfile: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { formatDate } = useSettings();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/me/profile');
        setProfile(res.data.data);
      } catch (err: any) {
        if (err.response?.status === 404) setProfile(null);
        else console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 text-gray-600 dark:text-gray-400">
        No profile linked to your account. Contact admin.
      </div>
    );
  }

  const fields = [
    { label: 'Name', value: profile.name },
    { label: 'Email', value: profile.email },
    { label: 'Phone', value: profile.phone },
    { label: 'Class', value: profile.class },
    { label: 'Student ID', value: profile.studentId },
    { label: 'Roll Number', value: profile.rollNumber },
    { label: 'Date of Birth', value: profile.dateOfBirth ? formatDate(profile.dateOfBirth) : '-' },
    { label: 'Gender', value: profile.gender },
    { label: 'Address', value: profile.address },
    { label: 'Father\'s Name', value: profile.fatherName },
    { label: 'Mother\'s Name', value: profile.motherName },
    { label: 'Guardian', value: profile.guardianName },
  ].filter(f => f.value);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Profile</h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Personal Information</h3>
        </div>
        <dl className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
              <dd className="mt-1 text-gray-900 dark:text-gray-100">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

export default MyProfile;

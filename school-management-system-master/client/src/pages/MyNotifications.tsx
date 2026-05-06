import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare } from 'lucide-react';
import api from '../utils/api';

interface Announcement {
  _id: string;
  title: string;
  message: string;
  targetType: string;
  targetClasses: string[];
  createdBy?: { name: string };
  createdAt: string;
}

const MyNotifications: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/me/announcements')
      .then((res) => setAnnouncements(res.data.data || []))
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Bell className="h-8 w-8" /> Notifications & Announcements
      </h2>
      {loading && <div className="text-gray-500">Loading...</div>}
      {!loading && announcements.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
          No announcements yet. Your teacher or admin will post here.
        </div>
      )}
      {!loading && announcements.length > 0 && (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a._id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex gap-3">
              <MessageSquare className="h-6 w-6 text-purple-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{a.title}</h4>
                <p className="text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap text-sm">{a.message}</p>
                <p className="text-xs text-gray-500 mt-2">{a.createdBy?.name ?? 'School'} · {a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyNotifications;

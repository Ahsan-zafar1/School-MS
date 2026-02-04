import React from 'react';

const MyNotifications: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notifications</h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
        Notifications set by admin will appear here. No notifications yet.
      </div>
    </div>
  );
};

export default MyNotifications;

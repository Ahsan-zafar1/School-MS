import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Send, Pencil, Trash2 } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface Announcement {
  _id: string;
  title: string;
  message: string;
  targetType: string;
  targetClasses: string[];
  createdBy?: { _id?: string; name: string };
  createdAt: string;
}

const MyAnnouncements: React.FC = () => {
  const { user } = useAuth();
  const [list, setList] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<{ name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchList = () => {
    api.get('/api/me/announcements')
      .then((res) => setList(res.data.data || []))
      .catch(() => setList([]));
  };

  useEffect(() => {
    fetchList();
    api.get('/api/me/classes').then((res) => {
      setClasses((res.data.data || []).map((c: { name: string }) => ({ name: c.name })));
    }).catch(() => setClasses([]));
  }, []);

  const userId = user && ((user as { _id?: string })._id ?? (user as { id?: string }).id);
  const isOwn = (a: Announcement) => userId && a.createdBy && String((a.createdBy as { _id?: string })._id) === String(userId);

  const openEdit = (a: Announcement) => {
    if (!isOwn(a)) return;
    setEditingId(a._id);
    setTitle(a.title);
    setMessage(a.message);
    setTargetClasses(Array.isArray(a.targetClasses) ? [...a.targetClasses] : []);
    setShowForm(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setMessage('');
    setTargetClasses([]);
  };

  const toggleClass = (name: string) => {
    setTargetClasses((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  };

  const submit = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message required.');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/api/me/announcements/${editingId}`, { title: title.trim(), message: message.trim(), targetClasses });
        toast.success('Announcement updated.');
        cancelEdit();
      } else {
        await api.post('/api/me/announcements', { title: title.trim(), message: message.trim(), targetClasses });
        toast.success('Announcement posted.');
        setTitle('');
        setMessage('');
        setTargetClasses([]);
        setShowForm(false);
      }
      fetchList();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this announcement? It will no longer be visible to students.')) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/me/announcements/${id}`);
      toast.success('Announcement deleted.');
      fetchList();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete';
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <MessageSquare className="h-8 w-8" /> Announcements
      </h2>

      <div className="flex justify-between items-center">
        <p className="text-gray-600 dark:text-gray-400">Post and view announcements for your classes. Students and admin will see these.</p>
        <button
          type="button"
          onClick={() => { cancelEdit(); setShowForm(!showForm); }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" /> New
        </button>
      </div>

      {(showForm || editingId) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{editingId ? 'Edit announcement' : 'Post announcement'}</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2" placeholder="Title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2" placeholder="Message" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target classes (leave empty for all your classes)</label>
            <div className="flex flex-wrap gap-2">
              {classes.map((c) => (
                <label key={c.name} className="inline-flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={targetClasses.includes(c.name)} onChange={() => toggleClass(c.name)} className="rounded" />
                  <span className="text-sm">{c.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={submit} disabled={submitting} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              <Send className="h-4 w-4" /> {editingId ? 'Update' : 'Post'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); cancelEdit(); }} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300">Cancel</button>
          </div>
        </div>
      )}

      {loading && <div className="text-gray-500">Loading...</div>}
      <div className="space-y-3">
        {list.map((a) => (
          <div key={a._id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex justify-between items-start gap-4">
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">{a.title}</h4>
              <p className="text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">{a.message}</p>
              <p className="text-xs text-gray-500 mt-2">
                {a.targetType === 'all' ? 'All classes' : (a.targetClasses || []).join(', ')} · {a.createdBy?.name ?? 'Unknown'} · {a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}
              </p>
            </div>
            {isOwn(a) && (
              <div className="flex gap-2 flex-shrink-0">
                <button type="button" onClick={() => openEdit(a)} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Edit">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => handleDelete(a._id)} disabled={deletingId === a._id} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {!loading && list.length === 0 && !showForm && <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center text-gray-500">No announcements yet.</div>}
    </div>
  );
};

export default MyAnnouncements;

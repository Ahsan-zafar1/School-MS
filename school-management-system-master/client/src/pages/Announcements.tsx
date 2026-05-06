import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Send, Pencil, Trash2 } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import IconActionButton from '../components/IconActionButton';

interface Announcement {
  _id: string;
  title: string;
  message: string;
  targetType: string;
  targetClasses: string[];
  createdBy?: { name: string; email?: string };
  createdAt: string;
}

const Announcements: React.FC = () => {
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'class'>('class');
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  const [classes, setClasses] = useState<{ name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchList = () => {
    api.get('/api/announcements')
      .then((res) => setList(res.data.data || []))
      .catch(() => setList([]));
  };

  useEffect(() => {
    fetchList();
    api.get('/api/classes').then((res) => {
      const data = res.data?.data ?? res.data ?? [];
      setClasses(Array.isArray(data) ? data.map((c: { name: string }) => ({ name: c.name })) : []);
    }).catch(() => setClasses([]));
  }, []);

  const toggleClass = (name: string) => {
    setTargetClasses((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  };

  const openEdit = (a: Announcement) => {
    setEditingId(a._id);
    setTitle(a.title);
    setMessage(a.message);
    setTargetType(a.targetType === 'all' ? 'all' : 'class');
    setTargetClasses(Array.isArray(a.targetClasses) ? [...a.targetClasses] : []);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setMessage('');
    setTargetType('class');
    setTargetClasses([]);
  };

  const submit = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message required.');
      return;
    }
    if (editingId && editingId.length !== 24) {
      toast.error('Invalid announcement. Please cancel and try again.');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/api/announcements/${editingId}`, {
          title: title.trim(),
          message: message.trim(),
          targetType: targetType === 'all' ? 'all' : 'class',
          targetClasses: targetType === 'all' ? [] : targetClasses
        });
        toast.success('Announcement updated.');
        cancelEdit();
      } else {
        await api.post('/api/announcements', {
          title: title.trim(),
          message: message.trim(),
          targetType: targetType === 'all' ? 'all' : 'class',
          targetClasses: targetType === 'all' ? [] : targetClasses
        });
        toast.success('Announcement created.');
        setTitle('');
        setMessage('');
        setTargetType('class');
        setTargetClasses([]);
        setShowForm(false);
      }
      fetchList();
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      const msg = res?.data?.message || (res?.status === 404 ? 'Announcement not found. It may have been deleted—please refresh the list.' : 'Failed to save');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id || id.length !== 24) {
      toast.error('Invalid announcement ID.');
      return;
    }
    if (!window.confirm('Delete this announcement? It will no longer be visible to students and teachers.')) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/announcements/${id}`);
      toast.success('Announcement deleted.');
      fetchList();
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      const msg = res?.data?.message || (res?.status === 404 ? 'Announcement not found. It may have been deleted—please refresh the list.' : 'Failed to delete');
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
      <p className="text-gray-600 dark:text-gray-400">Create and view all announcements. Teachers can also post from their portal; students see announcements in Notifications.</p>

      <button
        type="button"
        title={showForm ? 'Hide create form' : 'Create a new announcement'}
        onClick={() => { cancelEdit(); setShowForm(!showForm); }}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
      >
        <Plus className="h-4 w-4" /> New announcement
      </button>

      {(showForm || editingId) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{editingId ? 'Edit announcement' : 'Create announcement'}</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2" placeholder="Title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2" placeholder="Message" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target</label>
            <div className="flex gap-4 mb-2">
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input type="radio" name="targetType" checked={targetType === 'all'} onChange={() => setTargetType('all')} />
                <span>All classes</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input type="radio" name="targetType" checked={targetType === 'class'} onChange={() => setTargetType('class')} />
                <span>Specific classes</span>
              </label>
            </div>
            {targetType === 'class' && (
              <div className="flex flex-wrap gap-2">
                {classes.map((c) => (
                  <label key={c.name} className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={targetClasses.includes(c.name)} onChange={() => toggleClass(c.name)} className="rounded" />
                    <span className="text-sm">{c.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" title={editingId ? 'Save announcement changes' : 'Publish announcement'} onClick={submit} disabled={submitting} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              <Send className="h-4 w-4" /> {editingId ? 'Update' : 'Create'}
            </button>
            <button type="button" title="Discard and close form" onClick={() => { setShowForm(false); cancelEdit(); }} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300">Cancel</button>
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
            <div className="flex gap-2 flex-shrink-0 items-center">
              <IconActionButton
                onClick={() => openEdit(a)}
                tooltip="Edit announcement"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 focus:ring-gray-400"
              >
                <Pencil className="h-4 w-4" />
              </IconActionButton>
              <IconActionButton
                onClick={() => handleDelete(a._id)}
                tooltip="Delete announcement"
                disabled={deletingId === a._id}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 focus:ring-red-300 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </IconActionButton>
            </div>
          </div>
        ))}
      </div>
      {!loading && list.length === 0 && !showForm && <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center text-gray-500">No announcements yet.</div>}
    </div>
  );
};

export default Announcements;

import React, { useState, useEffect, useCallback } from 'react';
import { BookMarked, Plus, Pencil, Trash2, Search } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { notifySubjectsUpdated, SubjectItem } from '../hooks/useSubjects';
import IconActionButton from '../components/IconActionButton';

const Subjects: React.FC = () => {
  const [list, setList] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SubjectItem | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    sortOrder: 0,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '2000', all: 'true', sortBy: 'sortOrder', sortOrder: 'asc' });
      if (searchDebounced.trim()) params.set('search', searchDebounced.trim());
      const res = await api.get(`/api/subjects?${params.toString()}`);
      setList(res.data.data || []);
    } catch {
      setList([]);
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, [searchDebounced]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '', description: '', sortOrder: list.length, isActive: true });
    setShowModal(true);
  };

  const openEdit = (s: SubjectItem) => {
    setEditing(s);
    setForm({
      name: s.name,
      code: s.code || '',
      description: s.description || '',
      sortOrder: s.sortOrder ?? 0,
      isActive: s.isActive !== false,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/api/subjects/${editing._id}`, {
          name: form.name.trim(),
          code: form.code.trim(),
          description: form.description.trim(),
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        });
        toast.success('Subject updated');
      } else {
        await api.post('/api/subjects', {
          name: form.name.trim(),
          code: form.code.trim(),
          description: form.description.trim(),
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        });
        toast.success('Subject created');
      }
      setShowModal(false);
      await fetchList();
      notifySubjectsUpdated();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: SubjectItem) => {
    if (!window.confirm(`Delete subject "${s.name}"? Existing exams and records still store the name as text; only the catalog entry is removed.`)) return;
    try {
      await api.delete(`/api/subjects/${s._id}`);
      toast.success('Subject deleted');
      await fetchList();
      notifySubjectsUpdated();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  if (loading && list.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BookMarked className="h-7 w-7 text-purple-600" />
            Subjects
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Manage the subject catalog. Dropdowns across Exams, Classes, Teachers, and Results use this list.</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add subject
        </button>
      </div>

      <div className="card">
        <div className="relative max-w-md mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search by name, code, description…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {list.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{s.sortOrder}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{s.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{s.code || '—'}</td>
                  <td className="px-4 py-3 text-sm">{s.isActive ? <span className="text-green-600">Yes</span> : <span className="text-gray-400">No</span>}</td>
                  <td className="px-4 py-3 text-right">
                    <IconActionButton
                      onClick={() => openEdit(s)}
                      tooltip="Edit subject"
                      className="text-primary-600 hover:bg-primary-50 focus:ring-primary-300"
                      sizeClass="p-1.5 rounded"
                    >
                      <Pencil className="h-4 w-4" />
                    </IconActionButton>
                    <span className="inline-block ml-1 align-middle">
                      <IconActionButton
                        onClick={() => remove(s)}
                        tooltip="Delete subject"
                        className="text-red-600 hover:bg-red-50 focus:ring-red-300"
                        sizeClass="p-1.5 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconActionButton>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && !loading && (
            <p className="text-center text-gray-500 py-8">No subjects match your search.</p>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{editing ? 'Edit subject' : 'Add subject'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input
                  className="input-field w-full"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Mathematics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                <input
                  className="input-field w-full"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. MATH"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  className="input-field w-full"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort order</label>
                  <input
                    type="number"
                    className="input-field w-full"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    className="input-field w-full"
                    value={form.isActive ? 'true' : 'false'}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'true' }))}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" title="Close without saving" onClick={() => setShowModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="button" title="Save subject" onClick={save} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subjects;

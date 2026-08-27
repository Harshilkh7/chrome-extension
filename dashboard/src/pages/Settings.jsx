import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings2, User2, Mail, Trash2, Edit2, Save, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Navbar from '../components/Navbar';

export default function Settings() {
  const nav = useNavigate();

  const [form, setForm] = useState({ username: '', email: '' });
  const [originalForm, setOriginalForm] = useState({ username: '', email: '' });
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/user/profile');
        setForm({ username: data.username, email: data.email });
        setOriginalForm({ username: data.username, email: data.email });
      } catch {
        setError('Failed to load profile');
      }
    })();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.put('/user/profile', { username: form.username });
      toast.success('Profile updated');
      setOriginalForm(form);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm(originalForm);
    setError('');
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    try {
      await api.delete('/user/delete');
      localStorage.removeItem('token');
      toast.success('Account deleted');
      nav('/');
    } catch {
      setError('Failed to delete account');
      setConfirmingDelete(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-12 px-6">
        <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-2xl p-6 md:p-10 space-y-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 flex items-center">
            <Settings2 className="mr-2 text-indigo-600" /> Account Settings
          </h1>

          {error && (
            <div className="flex items-center bg-red-50 border border-red-400 text-red-800 px-4 py-3 rounded-lg space-x-2">
              <XCircle className="w-5 h-5" /> <span>{error}</span>
            </div>
          )}

          {!editing ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-indigo-50 p-4 md:p-6 rounded-xl">
                <div>
                  <p className="text-gray-600 uppercase text-xs font-semibold flex items-center gap-1">
                    <User2 className="w-3 h-3" /> Username
                  </p>
                  <p className="text-gray-800 text-lg font-medium">{form.username}</p>
                </div>
                <button
                  onClick={() => setEditing(true)}
                  className="text-indigo-600 hover:text-indigo-700 flex items-center"
                >
                  <Edit2 className="mr-1 w-4 h-4" /> Change
                </button>
              </div>

              <div className="bg-indigo-50 p-4 md:p-6 rounded-xl">
                <p className="text-gray-600 uppercase text-xs font-semibold flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </p>
                <p className="text-gray-800 text-lg font-medium">{form.email}</p>
                <p className="text-xs text-gray-500 italic mt-1">Cannot be changed</p>
              </div>

              <button
                onClick={handleDelete}
                className="w-full flex items-center justify-center px-4 py-3 rounded-lg text-red-600 border border-red-300 hover:bg-red-50 transition"
              >
                <Trash2 className="mr-2 w-4 h-4" />
                {confirmingDelete ? 'Click again to confirm deletion' : 'Delete Account'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-gray-700 font-semibold mb-2">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  required
                  minLength={3}
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">
                  Email <span className="text-xs text-gray-500">(cannot be changed)</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  disabled
                  className="w-full rounded-lg border border-gray-200 p-3 bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg p-3 transition disabled:opacity-60"
                >
                  <Save className="w-4 h-4" /> {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-lg p-3 transition disabled:opacity-60"
                >
                  <XCircle className="w-4 h-4" /> Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

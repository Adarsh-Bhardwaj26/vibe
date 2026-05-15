import { useEffect, useState } from 'react';
import { Users, FileText, Flag, Activity, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [reportedPosts, setReportedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats');

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, usersRes, postsRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/users'),
          api.get('/admin/reported-posts'),
        ]);
        setStats(statsRes.data.stats);
        setUsers(usersRes.data.users);
        setReportedPosts(postsRes.data.posts);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const toggleUserStatus = async (userId, currentStatus) => {
    await api.patch(`/admin/users/${userId}/status`);
    setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isActive: !u.isActive } : u));
  };

  const removePost = async (postId) => {
    await api.delete(`/admin/posts/${postId}`);
    setReportedPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen"><Loader2 size={32} className="animate-spin text-primary-400" /></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-display font-bold text-white mb-8">Admin Dashboard</h1>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-primary-400', bg: 'bg-primary-600/10' },
            { label: 'Total Posts', value: stats.totalPosts, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-600/10' },
            { label: 'Reported', value: stats.reportedPosts, icon: Flag, color: 'text-red-400', bg: 'bg-red-600/10' },
            { label: 'Active Users', value: stats.activeUsers, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-600/10' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="card p-5"
            >
              <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                <stat.icon size={20} className={stat.color} />
              </div>
              <p className="text-3xl font-display font-bold text-white">{stat.value?.toLocaleString()}</p>
              <p className="text-zinc-500 text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-dark-400 p-1 rounded-xl w-fit">
        {['stats', 'users', 'reports'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-primary-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/5">
                <tr>
                  <th className="text-left text-xs text-zinc-500 font-semibold uppercase px-5 py-4">User</th>
                  <th className="text-left text-xs text-zinc-500 font-semibold uppercase px-5 py-4">Email</th>
                  <th className="text-left text-xs text-zinc-500 font-semibold uppercase px-5 py-4">Role</th>
                  <th className="text-left text-xs text-zinc-500 font-semibold uppercase px-5 py-4">Status</th>
                  <th className="text-left text-xs text-zinc-500 font-semibold uppercase px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="avatar w-8 h-8">
                          {u.avatar?.url ? <img src={u.avatar.url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-primary-600/20 flex items-center justify-center text-primary-300 text-xs font-bold">{u.username?.[0]?.toUpperCase()}</div>}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{u.fullName}</p>
                          <p className="text-zinc-500 text-xs">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-zinc-400 text-sm">{u.email}</td>
                    <td className="px-5 py-4"><span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'bg-white/5 text-zinc-400'}`}>{u.role}</span></td>
                    <td className="px-5 py-4"><span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>{u.isActive ? 'Active' : 'Deactivated'}</span></td>
                    <td className="px-5 py-4">
                      {u.role !== 'admin' && (
                        <button onClick={() => toggleUserStatus(u._id, u.isActive)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${u.isActive ? 'btn-danger' : 'btn-secondary'}`}>
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          {reportedPosts.length === 0 ? (
            <p className="text-center text-zinc-500 py-12">No reported posts 🎉</p>
          ) : reportedPosts.map((post) => (
            <div key={post._id} className="card p-4 flex items-center gap-4">
              {post.media?.[0]?.url && <img src={post.media[0].url} className="w-16 h-16 object-cover rounded-xl flex-shrink-0" alt="" />}
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{post.author?.username}</p>
                <p className="text-zinc-500 text-xs">{post.caption?.slice(0, 60)}</p>
                <p className="text-red-400 text-xs mt-1">⚑ Reported by {post.reportedBy?.length} user(s)</p>
              </div>
              <button onClick={() => removePost(post._id)} className="btn-danger text-sm">Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

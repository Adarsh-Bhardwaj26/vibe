import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateUser } from '../redux/slices/authSlice';
import { userService, aiService } from '../services';
import toast from 'react-hot-toast';
import { User, Lock, Bell, Shield, Loader2, Save, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

export default function SettingsPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    bio: user?.bio || '',
    website: user?.website || '',
    location: user?.location || '',
    socialLinks: user?.socialLinks || { twitter: '', linkedin: '', github: '', instagram: '' },
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const handleGenerateBio = async () => {
    setGeneratingBio(true);
    try {
      const keywords = prompt("Enter 2-3 words about your vibe (e.g., 'coder, gym, coffee'):");
      if (keywords === null) return;
      const res = await aiService.generateBio(keywords);
      if (res.data?.bio) {
        setProfileForm((p) => ({ ...p, bio: res.data.bio }));
        toast.success("AI Bio Generated!");
      }
    } catch (err) {
      toast.error("Failed to generate bio.");
    } finally {
      setGeneratingBio(false);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await userService.updateProfile(profileForm);
      dispatch(updateUser(res.data.user));
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await userService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-display font-bold text-white mb-6">Settings</h1>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                id={`settings-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={activeTab === tab.id ? 'nav-item-active w-full' : 'nav-item w-full'}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <motion.form onSubmit={handleProfileSave} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6 space-y-5">
              <h2 className="font-display font-bold text-white text-lg">Edit Profile</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name</label>
                  <input className="input" value={profileForm.fullName} onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Location</label>
                  <input className="input" value={profileForm.location} onChange={(e) => setProfileForm((p) => ({ ...p, location: e.target.value }))} placeholder="City, Country" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Bio</label>
                  <button type="button" onClick={handleGenerateBio} disabled={generatingBio} className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 font-semibold transition-colors disabled:opacity-50">
                    {generatingBio ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    AI Generate
                  </button>
                </div>
                <textarea className="input resize-none h-24" value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} placeholder="Tell the world about yourself..." maxLength={200} />
                <p className="text-right text-xs text-zinc-600 mt-1">{profileForm.bio.length}/200</p>
              </div>
              <div>
                <label className="label">Website</label>
                <input className="input" value={profileForm.website} onChange={(e) => setProfileForm((p) => ({ ...p, website: e.target.value }))} placeholder="https://yourwebsite.com" type="url" />
              </div>
              <div className="space-y-3">
                <label className="label">Social Links</label>
                {Object.entries(profileForm.socialLinks).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-zinc-500 text-sm capitalize w-20">{key}</span>
                    <input
                      className="input flex-1 text-sm"
                      value={val}
                      onChange={(e) => setProfileForm((p) => ({ ...p, socialLinks: { ...p.socialLinks, [key]: e.target.value } }))}
                      placeholder={`Your ${key} URL`}
                    />
                  </div>
                ))}
              </div>
              <button id="save-profile-btn" type="submit" disabled={loading} className="btn-primary">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Save Changes</>}
              </button>
            </motion.form>
          )}

          {activeTab === 'security' && (
            <motion.form onSubmit={handlePasswordChange} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6 space-y-5">
              <h2 className="font-display font-bold text-white text-lg">Change Password</h2>
              <div>
                <label className="label">Current Password</label>
                <input type="password" className="input" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))} required />
              </div>
              <div>
                <label className="label">New Password</label>
                <input type="password" className="input" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))} required minLength={6} />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input type="password" className="input" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))} required />
              </div>
              <button id="change-password-btn" type="submit" disabled={loading} className="btn-primary">
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Change Password'}
              </button>
              <p className="text-xs text-zinc-500 mt-2">
                Tip: Use a strong password with letters, numbers, and symbols.
              </p>
            </motion.form>
          )}

          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6">
              <h2 className="font-display font-bold text-white text-lg mb-6">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { key: 'likes', label: 'Likes', desc: 'When someone likes your post' },
                  { key: 'comments', label: 'Comments', desc: 'When someone comments on your post' },
                  { key: 'follows', label: 'New Followers', desc: 'When someone follows you' },
                  { key: 'messages', label: 'Messages', desc: 'When you receive a new message' },
                ].map((pref) => (
                  <div key={pref.key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-white font-medium">{pref.label}</p>
                      <p className="text-zinc-500 text-sm">{pref.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
                    </label>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

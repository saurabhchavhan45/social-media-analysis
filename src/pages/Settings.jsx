import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Shield, Key, AlertTriangle } from 'lucide-react';
import './Settings.css';

const Settings = () => {
  const { user } = useAuth();
  
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg({ text: '', type: '' });
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });
      
      // Also update public.profiles if needed (handled by trigger on insert, but update needs manual or separate trigger)
      await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
      
      if (error) throw error;
      setProfileMsg({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      setProfileMsg({ text: err.message, type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) throw error;
      alert("Password reset email sent!");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="settings-page" style={{ animation: 'fadeIn 0.5s ease' }}>
      <div className="page-header" style={{ marginBottom: 32 }}>
        <h2 className="section-title">Account Settings</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your profile, security, and API configurations.</p>
      </div>

      <div className="settings-grid">
        
        {/* Profile Settings */}
        <div className="premium-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ background: 'rgba(67, 24, 255, 0.1)', color: 'var(--accent-primary)', padding: 12, borderRadius: 12 }}>
              <User size={24} />
            </div>
            <h3>Profile Information</h3>
          </div>

          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {profileMsg.text && (
              <div style={{ padding: 12, borderRadius: 8, fontSize: 14, backgroundColor: profileMsg.type === 'success' ? 'rgba(5, 205, 153, 0.1)' : 'rgba(238, 93, 80, 0.1)', color: profileMsg.type === 'success' ? '#05CD99' : '#EE5D50' }}>
                {profileMsg.text}
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 14, fontWeight: 500 }}>Email Address</label>
              <input 
                type="email" 
                value={user?.email || ''} 
                disabled 
                style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 14, fontWeight: 500 }}>Full Name</label>
              <input 
                type="text" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)}
                style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={savingProfile} style={{ marginTop: 8 }}>
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Security */}
        <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ background: 'rgba(5, 205, 153, 0.1)', color: '#05CD99', padding: 12, borderRadius: 12 }}>
                <Shield size={24} />
              </div>
              <h3>Security</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
              Keep your account secure by using a strong password. We'll email you a secure link to reset it.
            </p>
            <button className="btn-outline" onClick={handlePasswordReset}>
              Send Password Reset Email
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ background: 'rgba(238, 93, 80, 0.1)', color: '#EE5D50', padding: 12, borderRadius: 12 }}>
                <AlertTriangle size={24} />
              </div>
              <h3 style={{ color: '#EE5D50' }}>Danger Zone</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button className="btn-outline danger" onClick={() => alert("Account deletion requires contacting support in this version.")}>
              Delete Account
            </button>
          </div>
        </div>

        {/* API Configs */}
        <div className="premium-card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'rgba(255, 165, 0, 0.1)', color: '#FFA500', padding: 12, borderRadius: 12 }}>
              <Key size={24} />
            </div>
            <h3>API Configurations</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
            API Keys are managed securely via environment variables (<code>.env</code> file) on your deployment server, rather than stored in the database.
          </p>
          
          <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 500 }}>YouTube Data API v3 Key</span>
              <span style={{ color: import.meta.env.VITE_YOUTUBE_API_KEY ? '#05CD99' : '#EE5D50', fontWeight: 600 }}>
                {import.meta.env.VITE_YOUTUBE_API_KEY ? 'Configured' : 'Missing'}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              To update this key, edit <code>VITE_YOUTUBE_API_KEY</code> in your frontend <code>.env</code> file and restart the development server.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;

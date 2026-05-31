import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Integrations.css';

const InstagramIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="17.5" cy="6.5" r="1.5" fill={color} stroke="none" />
  </svg>
);

const YoutubeIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

const Integrations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [ytConnected, setYtConnected] = useState(false);
  const [ytName, setYtName] = useState('');
  
  const [igConnected, setIgConnected] = useState(false);
  const [igName, setIgName] = useState('');
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkIntegrations();
    }
  }, [user]);

  const checkIntegrations = async () => {
    setLoading(true);
    
    // Check YT
    const { data: yt } = await supabase.from('youtube_channels').select('channel_name').eq('user_id', user.id).single();
    if (yt) {
      setYtConnected(true);
      setYtName(yt.channel_name);
    }
    
    // Check IG
    const { data: ig } = await supabase.from('instagram_stats').select('username').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(1);
    if (ig && ig.length > 0) {
      setIgConnected(true);
      setIgName(ig[0].username);
    }
    
    
    setLoading(false);
  };

  const handleDisconnectYt = async () => {
    if(window.confirm('Are you sure you want to disconnect your YouTube channel and delete its data?')) {
      await supabase.from('youtube_channels').delete().eq('user_id', user.id);
      setYtConnected(false);
      setYtName('');
    }
  };
  
  const handleDisconnectIg = async () => {
    if(window.confirm('Are you sure you want to delete your Instagram stats history?')) {
      await supabase.from('instagram_stats').delete().eq('user_id', user.id);
      setIgConnected(false);
      setIgName('');
    }
  };
  


  if (loading) return <div className="loading">Loading integrations...</div>;

  return (
    <div className="integrations-page">
      <div className="integrations-header">
        <h2 className="section-title">Data Integrations</h2>
        <p className="section-subtitle">Manage your connected social media accounts.</p>
      </div>

      <div className="integrations-grid">
        
        {/* YouTube Card */}
        <div className="premium-card integration-card">
          <div className="integration-icon-box" style={{ background: `rgba(255,0,0,0.1)` }}>
            <YoutubeIcon size={36} color="#FF0000" />
          </div>
          
          <h3 className="integration-name">YouTube</h3>
          <p className="integration-desc">Link your YouTube channel to analyze video views, subscribers, and audience retention via the API.</p>
          
          <div className="integration-status">
            {ytConnected ? (
              <div className="status-badge connected">
                <CheckCircle size={16} />
                <span>Connected: {ytName}</span>
              </div>
            ) : (
              <div className="status-badge disconnected">
                <span>Not Connected</span>
              </div>
            )}
          </div>

          <div className="integration-actions">
            {ytConnected ? (
              <button className="btn-outline danger" onClick={handleDisconnectYt}>
                Disconnect
              </button>
            ) : (
              <button className="btn-primary connect-btn" style={{ backgroundColor: '#FF0000' }} onClick={() => navigate('/youtube')}>
                Connect YouTube
              </button>
            )}
          </div>
        </div>

        {/* Instagram Card */}
        <div className="premium-card integration-card">
          <div className="integration-icon-box" style={{ background: `rgba(225,48,108,0.1)` }}>
            <InstagramIcon size={36} color="#E1306C" />
          </div>
          
          <h3 className="integration-name">Instagram</h3>
          <p className="integration-desc">Connect your Instagram profile by username to auto-fetch followers, engagement rate, audience demographics, and recent post performance.</p>
          
          <div className="integration-status">
            {igConnected ? (
              <div className="status-badge connected">
                <CheckCircle size={16} />
                <span>Active: {igName}</span>
              </div>
            ) : (
              <div className="status-badge disconnected">
                <span>Not Started</span>
              </div>
            )}
          </div>

          <div className="integration-actions">
            {igConnected ? (
               <div style={{display: 'flex', gap: '8px', width: '100%'}}>
                 <button className="btn-primary" style={{ backgroundColor: '#E1306C', flex: 1, padding: '12px' }} onClick={() => navigate('/instagram')}>
                   Update
                 </button>
                 <button className="btn-outline danger" style={{flex: 1, padding: '12px'}} onClick={handleDisconnectIg}>
                   Clear
                 </button>
               </div>
            ) : (
              <button className="btn-primary connect-btn" style={{ backgroundColor: '#E1306C' }} onClick={() => navigate('/instagram')}>
                Start Tracking
              </button>
            )}
          </div>
        </div>

      </div>
      
      {!import.meta.env.VITE_YOUTUBE_API_KEY && (
        <div className="premium-card api-info-card" style={{ background: 'rgba(238, 93, 80, 0.05)', border: '1px solid rgba(238, 93, 80, 0.2)'}}>
          <h3 style={{display: 'flex', alignItems: 'center', gap: 8, color: '#EE5D50'}}><AlertCircle/> Missing YouTube API Key</h3>
          <p>YouTube integration requires an API key. Please add your VITE_YOUTUBE_API_KEY to your .env file or configure it in Settings.</p>
          <button className="btn-outline" onClick={() => navigate('/settings')}>Go to Settings</button>
        </div>
      )}
    </div>
  );
};

export default Integrations;

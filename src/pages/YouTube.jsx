import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchChannelStats, fetchRecentVideos } from '../lib/youtube';
import { useAuth } from '../context/AuthContext';
import { Users, Eye, Video, RefreshCw, AlertCircle, TrendingUp, MessageCircle, Activity } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './YouTube.css';

const YoutubeIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

const YouTube = () => {
  const { user } = useAuth();
  const [channelData, setChannelData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  
  // Connect state
  const [channelInput, setChannelInput] = useState('');
  
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

  useEffect(() => {
    if (user) {
      loadSavedData();
    }
  }, [user]);

  const loadSavedData = async () => {
    setLoading(true);
    try {
      // Fetch channel from Supabase
      const { data: channel, error: channelErr } = await supabase
        .from('youtube_channels')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (channelErr && channelErr.code !== 'PGRST116') { // PGRST116 is "No rows found"
        throw channelErr;
      }

      if (channel) {
        setChannelData(channel);
        
        // Fetch videos from Supabase
        const { data: vids } = await supabase
          .from('youtube_videos')
          .select('*')
          .eq('channel_id', channel.id)
          .order('published_at', { ascending: false })
          .limit(10);
          
        if (vids) setVideos(vids);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load saved data');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!channelInput.trim()) return;
    
    setSyncing(true);
    setError('');
    
    try {
      // 1. Fetch from YT API
      const stats = await fetchChannelStats(channelInput.trim(), apiKey);
      
      // 2. Save to Supabase (upsert)
      const { data: channel, error: dbErr } = await supabase
        .from('youtube_channels')
        .upsert({
          user_id: user.id,
          channel_id: stats.channelId,
          channel_name: stats.channelName,
          subscribers: stats.subscribers,
          total_views: stats.totalViews,
          video_count: stats.videoCount,
          last_synced: new Date().toISOString()
        }, { onConflict: 'user_id,channel_id' })
        .select()
        .single();
        
      if (dbErr) throw dbErr;
      
      setChannelData(channel);
      setChannelInput('');
      
      // Also fetch initial videos
      await handleSyncVideos(channel.id, stats.channelId);
      
    } catch (err) {
      setError(err.message || 'Failed to connect channel');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncVideos = async (dbChannelId, ytChannelId) => {
    setSyncing(true);
    try {
      const recentVids = await fetchRecentVideos(ytChannelId, apiKey);
      
      if (recentVids.length > 0) {
        const vidsToInsert = recentVids.map(v => ({
          channel_id: dbChannelId,
          video_id: v.videoId,
          title: v.title,
          views: v.views,
          likes: v.likes,
          comments: v.comments,
          published_at: v.publishedAt,
          thumbnail_url: v.thumbnailUrl
        }));

        // Upsert videos to Supabase
        await supabase.from('youtube_videos').upsert(vidsToInsert, { onConflict: 'channel_id,video_id' });
        
        // Reload videos from DB
        const { data: vids } = await supabase
          .from('youtube_videos')
          .select('*')
          .eq('channel_id', dbChannelId)
          .order('published_at', { ascending: false })
          .limit(10);
          
        setVideos(vids || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to sync videos');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="loading">Loading YouTube data...</div>;

  return (
    <div className="youtube-page">
      <div className="page-header">
        <h2 className="section-title">YouTube Analytics</h2>
        {channelData && (
          <button 
            className="btn-primary" 
            onClick={() => handleSyncVideos(channelData.id, channelData.channel_id)}
            disabled={syncing}
          >
            <RefreshCw size={18} className={syncing ? 'spinner' : ''} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {!channelData ? (
        <div className="premium-card connect-card">
          <div className="connect-icon" style={{ background: 'rgba(255, 0, 0, 0.1)', color: '#FF0000' }}>
            <YoutubeIcon size={48} />
          </div>
          <h3>Connect your YouTube Channel</h3>
          <p>Enter your Channel ID to start tracking your growth and analyzing video performance.</p>
          
          <form onSubmit={handleConnect} className="connect-form">
            <input 
              type="text" 
              placeholder="e.g. https://youtube.com/@MrBeast or @MrBeast"
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary" disabled={syncing}>
              {syncing ? 'Connecting...' : 'Connect'}
            </button>
          </form>
          <div className="helper-text">
            Just paste your full YouTube channel link, handle, or Channel ID.
          </div>
        </div>
      ) : (
        <>
          <div className="metrics-grid">
            <div className="premium-card metric-card">
              <div className="metric-icon-box" style={{ background: 'rgba(255, 0, 0, 0.1)', color: '#FF0000' }}>
                <Users size={24} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Subscribers</span>
                <h3 className="metric-value">{channelData.subscribers?.toLocaleString() || 0}</h3>
              </div>
            </div>

            <div className="premium-card metric-card">
              <div className="metric-icon-box" style={{ background: 'rgba(67, 24, 255, 0.1)', color: 'var(--accent-primary)' }}>
                <Eye size={24} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Total Views</span>
                <h3 className="metric-value">{channelData.total_views?.toLocaleString() || 0}</h3>
              </div>
            </div>

            <div className="premium-card metric-card">
              <div className="metric-icon-box" style={{ background: 'rgba(5, 205, 153, 0.1)', color: '#05CD99' }}>
                <Video size={24} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Videos</span>
                <h3 className="metric-value">{channelData.video_count?.toLocaleString() || 0}</h3>
              </div>
            </div>
          </div>

          {videos.length > 0 && (
            <div className="premium-card videos-card" style={{ marginBottom: 24 }}>
              <h3>Video Performance (Views vs Likes)</h3>
              <div style={{ height: 350, marginTop: 20 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={[...videos].reverse().map(v => {
                    const views = v.views || 0;
                    const likes = v.likes || 0;
                    const comments = v.comments || 0;
                    return { 
                      ...v, 
                      shortTitle: v.title.length > 20 ? v.title.substring(0, 20) + '...' : v.title,
                      engRate: views > 0 ? ((likes + comments) / views * 100).toFixed(2) : 0
                    };
                  })} margin={{ top: 20, right: 0, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="shortTitle" stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis 
                      yAxisId="left" 
                      stroke="var(--text-secondary)" 
                      tickLine={false} 
                      axisLine={false} 
                      fontSize={12} 
                      width={75}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                        if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
                        return value;
                      }}
                    />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={12} width={40} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '13px' }} />
                    <Bar yAxisId="left" dataKey="views" name="Views" fill="rgba(255, 0, 0, 0.2)" stroke="#FF0000" strokeWidth={2} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="likes" name="Likes" stroke="#05CD99" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="premium-card videos-card">
            <h3>Recent Videos</h3>
            {videos.length === 0 ? (
              <p className="no-data">No videos found. Try syncing.</p>
            ) : (
              <div className="videos-list">
                {videos.map(video => (
                  <div key={video.id} className="video-item">
                    {video.thumbnail_url && (
                      <img src={video.thumbnail_url} alt={video.title} className="video-thumb" />
                    )}
                    <div className="video-details">
                      <h4>{video.title}</h4>
                      <div className="video-stats">
                        <span><Eye size={14} /> {video.views?.toLocaleString()}</span>
                        <span>👍 {video.likes?.toLocaleString()}</span>
                        <span>💬 {video.comments?.toLocaleString()}</span>
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                          <Activity size={14} /> 
                          {video.views > 0 ? (((video.likes || 0) + (video.comments || 0)) / video.views * 100).toFixed(1) : 0}%
                        </span>
                        <span className="video-date">
                          {new Date(video.published_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default YouTube;

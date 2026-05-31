import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Download, Users, Heart, MessageCircle, Activity } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch YouTube Channel
      const { data: ytChannel } = await supabase
        .from('youtube_channels')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      // 2. Fetch Latest Instagram Stats
      const { data: igStatsList } = await supabase
        .from('instagram_stats')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(1);
        
      const igStats = igStatsList && igStatsList.length > 0 ? igStatsList[0] : null;

      // 3. Aggregate Data
      const totalFollowers = (ytChannel?.subscribers || 0) + (igStats?.followers || 0);
      const totalLikes = (igStats?.avg_likes || 0); // Simplified for IG
      const totalComments = (igStats?.avg_comments || 0);
      
      // Rough avg engagement rate calculation
      let combinedEngagement = 0;
      if (igStats) {
        combinedEngagement = igStats.engagement_rate;
      }

      // Build Platforms array
      const platforms = [];
      if (igStats) {
        platforms.push({ name: 'Instagram', followers: igStats.followers, color: '#E1306C' });
      } else {
        platforms.push({ name: 'Instagram', followers: 0, color: '#E1306C', empty: true });
      }
      
      if (ytChannel) {
        platforms.push({ name: 'YouTube', followers: ytChannel.subscribers, color: '#FF0000' });
      } else {
        platforms.push({ name: 'YouTube', followers: 0, color: '#FF0000', empty: true });
      }

      // Fetch YouTube recent videos for the posts feed
      let recentPosts = [];
      if (ytChannel) {
        const { data: vids } = await supabase
          .from('youtube_videos')
          .select('*')
          .eq('channel_id', ytChannel.id)
          .order('published_at', { ascending: false })
          .limit(5);
          
        if (vids) {
          recentPosts = vids.map(v => ({
            id: v.id,
            platform: 'YouTube',
            content: v.title,
            views: v.views,
            likes: v.likes
          }));
        }
      }

      // 4. Build Growth Chart Data from IG History
      const { data: igHistory } = await supabase
        .from('instagram_stats')
        .select('followers, recorded_at')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: true })
        .limit(6);
        
      let growthData = [];
      if (igHistory && igHistory.length > 0) {
        growthData = igHistory.map(h => ({
          name: new Date(h.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          instagram: h.followers,
          youtube: ytChannel?.subscribers || 0 
        }));
      }

      setData({
        totalFollowers,
        totalLikes,
        totalComments,
        engagementRate: combinedEngagement.toFixed(1),
        platforms,
        recentPosts,
        growthData
      });

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    const element = document.getElementById('dashboard-content');
    
    // Temporarily fix width to ensure CSS grids don't collapse during export
    const originalWidth = element.style.width;
    element.style.width = '1200px';
    
    const opt = {
      margin:       0.3,
      filename:     'UniSocial-Analytics-Report.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#F4F7FE',
        windowWidth: 1200
      },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
    };
    
    await html2pdf().set(opt).from(element).save();
    
    // Restore original width
    element.style.width = originalWidth;
  };

  if (error) return <div className="loading">Failed to load data</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2 className="section-title">Overview</h2>
        <button className="btn-primary" onClick={handleDownloadReport} disabled={loading || !data}>
          <Download size={18} />
          Export Report
        </button>
      </div>

      {loading || !data ? (
        <div className="loading-state" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading your analytics...
        </div>
      ) : (
        <div id="dashboard-content">
          {data.totalFollowers > 0 && data.totalLikes === 0 && data.totalComments === 0 && (
            <div className="premium-card" style={{ marginBottom: 24, padding: '16px 24px', background: 'rgba(225, 48, 108, 0.05)', border: '1px solid rgba(225, 48, 108, 0.2)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>💡</span>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)' }}>
                <strong>Tip:</strong> Your Instagram likes and comments are showing as 0 because we just upgraded the tracking system. Go to the <a href="/instagram" style={{ color: '#E1306C', fontWeight: 600, textDecoration: 'none' }}>Instagram page</a> and click <strong>"Sync Now"</strong> to fetch your latest rich data!
              </p>
            </div>
          )}

          <div className="metrics-grid">
          <div className="premium-card metric-card" style={{"--delay": "0s"}}>
            <div className="metric-icon-box" style={{ background: 'rgba(67, 24, 255, 0.1)', color: 'var(--accent-primary)' }}>
              <Users size={24} />
            </div>
            <div className="metric-info">
              <span className="metric-label">Total Audience</span>
              <h3 className="metric-value">{data.totalFollowers.toLocaleString()}</h3>
            </div>
          </div>

          <div className="premium-card metric-card" style={{"--delay": "0.1s"}}>
            <div className="metric-icon-box" style={{ background: 'rgba(225, 48, 108, 0.1)', color: '#E1306C' }}>
              <Heart size={24} />
            </div>
            <div className="metric-info">
              <span className="metric-label">Avg Likes (IG)</span>
              <h3 className="metric-value">{data.totalLikes.toLocaleString()}</h3>
            </div>
          </div>

          <div className="premium-card metric-card" style={{"--delay": "0.2s"}}>
            <div className="metric-icon-box" style={{ background: 'rgba(24, 119, 242, 0.1)', color: '#1877F2' }}>
              <MessageCircle size={24} />
            </div>
            <div className="metric-info">
              <span className="metric-label">Avg Comments (IG)</span>
              <h3 className="metric-value">{data.totalComments.toLocaleString()}</h3>
            </div>
          </div>

          <div className="premium-card metric-card" style={{"--delay": "0.3s"}}>
            <div className="metric-icon-box" style={{ background: 'rgba(255, 0, 0, 0.1)', color: '#FF0000' }}>
              <Activity size={24} />
            </div>
            <div className="metric-info">
              <span className="metric-label">Engagement (IG)</span>
              <h3 className="metric-value">{data.engagementRate}%</h3>
            </div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="premium-card chart-card">
            <h3 className="card-title">Audience Growth</h3>
            <div className="chart-container">
              {data.growthData && data.growthData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.growthData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInsta" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E1306C" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#E1306C" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorYt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF0000" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#FF0000" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                    <YAxis 
                      stroke="var(--text-secondary)" 
                      tickLine={false} 
                      axisLine={false}
                      width={55}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                        if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
                        return value;
                      }}
                    />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '12px' }} />
                    <Legend />
                    <Area type="monotone" dataKey="instagram" name="Instagram" stroke="#E1306C" fillOpacity={1} fill="url(#colorInsta)" strokeWidth={3} />
                    <Area type="monotone" dataKey="youtube" name="YouTube" stroke="#FF0000" fillOpacity={1} fill="url(#colorYt)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', padding: 40, textAlign: 'center' }}>
                  Not enough historical data to plot growth. Please update your stats over multiple days to see your chart!
                </div>
              )}
            </div>
          </div>

          <div className="premium-card platform-card">
            <h3 className="card-title">Platform Comparison</h3>
            <div className="platform-stats">
              {data.platforms.map((platform, idx) => (
                <div key={idx} className="platform-row" style={{ opacity: platform.empty ? 0.5 : 1 }}>
                  <div className="platform-info">
                    <div className="platform-dot" style={{ backgroundColor: platform.color }}></div>
                    <span className="platform-name">{platform.name}</span>
                  </div>
                  <span className="platform-followers">
                    {platform.empty ? 'Not Connected' : platform.followers.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            
            <h3 className="card-title" style={{marginTop: '32px'}}>Recent YouTube Videos</h3>
            <div className="posts-list">
              {data.recentPosts.length > 0 ? data.recentPosts.map(post => (
                 <div key={post.id} className="post-item">
                   <p className="post-content" style={{ fontWeight: 500 }}>{post.content}</p>
                   <div className="post-meta">
                     <span className="platform-tag" style={{ color: '#FF0000', borderColor: '#FF0000' }}>{post.platform}</span>
                     <span>👁️ {post.views?.toLocaleString()} • 👍 {post.likes?.toLocaleString()}</span>
                   </div>
                 </div>
               )) : (
                 <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No recent videos found. Make sure your channel is synced.</p>
               )}
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

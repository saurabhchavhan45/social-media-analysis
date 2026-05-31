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
    if (!data) return;

    const reportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    // Build a dedicated report HTML — not a screenshot
    const reportHTML = `
      <div style="font-family: 'Segoe UI', Arial, Helvetica, sans-serif; width: 100%; padding: 40px; background: #FFFFFF; color: #1B2559;">
        
        <!-- Report Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #4318FF; padding-bottom: 20px; margin-bottom: 32px;">
          <div>
            <h1 style="font-size: 28px; font-weight: 700; color: #4318FF; margin: 0 0 4px 0;">UniSocial Analytics Report</h1>
            <p style="font-size: 14px; color: #A3AED0; margin: 0;">Generated on ${reportDate}</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 13px; color: #A3AED0; margin: 0;">Prepared for</p>
            <p style="font-size: 16px; font-weight: 600; color: #1B2559; margin: 4px 0 0 0;">${user?.user_metadata?.full_name || user?.email || 'Creator'}</p>
          </div>
        </div>

        <!-- Key Metrics -->
        <h2 style="font-size: 18px; font-weight: 700; color: #1B2559; margin: 0 0 16px 0;">Key Metrics</h2>
        <div style="display: flex; gap: 16px; margin-bottom: 32px;">
          <div style="flex: 1; background: #F4F7FE; border-radius: 12px; padding: 20px; border-left: 4px solid #4318FF;">
            <p style="font-size: 12px; color: #A3AED0; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">Total Audience</p>
            <p style="font-size: 28px; font-weight: 700; color: #1B2559; margin: 0;">${data.totalFollowers.toLocaleString()}</p>
          </div>
          <div style="flex: 1; background: #FFF5F7; border-radius: 12px; padding: 20px; border-left: 4px solid #E1306C;">
            <p style="font-size: 12px; color: #A3AED0; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">Avg Likes (IG)</p>
            <p style="font-size: 28px; font-weight: 700; color: #1B2559; margin: 0;">${data.totalLikes.toLocaleString()}</p>
          </div>
          <div style="flex: 1; background: #F0F4FF; border-radius: 12px; padding: 20px; border-left: 4px solid #1877F2;">
            <p style="font-size: 12px; color: #A3AED0; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">Avg Comments (IG)</p>
            <p style="font-size: 28px; font-weight: 700; color: #1B2559; margin: 0;">${data.totalComments.toLocaleString()}</p>
          </div>
          <div style="flex: 1; background: #FFF0F0; border-radius: 12px; padding: 20px; border-left: 4px solid #FF0000;">
            <p style="font-size: 12px; color: #A3AED0; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">Engagement (IG)</p>
            <p style="font-size: 28px; font-weight: 700; color: #1B2559; margin: 0;">${data.engagementRate}%</p>
          </div>
        </div>

        <!-- Platform Comparison -->
        <h2 style="font-size: 18px; font-weight: 700; color: #1B2559; margin: 0 0 16px 0;">Platform Comparison</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px; background: #FFFFFF;">
          <thead>
            <tr style="background: #F4F7FE;">
              <th style="text-align: left; padding: 12px 16px; font-size: 13px; color: #A3AED0; font-weight: 600; border-bottom: 2px solid #E2E8F0;">Platform</th>
              <th style="text-align: right; padding: 12px 16px; font-size: 13px; color: #A3AED0; font-weight: 600; border-bottom: 2px solid #E2E8F0;">Followers</th>
              <th style="text-align: right; padding: 12px 16px; font-size: 13px; color: #A3AED0; font-weight: 600; border-bottom: 2px solid #E2E8F0;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.platforms.map(p => `
              <tr>
                <td style="padding: 14px 16px; font-size: 15px; font-weight: 600; color: #1B2559; border-bottom: 1px solid #E2E8F0;">
                  <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${p.color}; margin-right: 10px; vertical-align: middle;"></span>
                  ${p.name}
                </td>
                <td style="padding: 14px 16px; font-size: 15px; font-weight: 700; color: #1B2559; text-align: right; border-bottom: 1px solid #E2E8F0;">${p.empty ? '—' : p.followers.toLocaleString()}</td>
                <td style="padding: 14px 16px; font-size: 13px; text-align: right; border-bottom: 1px solid #E2E8F0; color: ${p.empty ? '#EE5D50' : '#05CD99'}; font-weight: 600;">${p.empty ? 'Not Connected' : 'Connected'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${data.recentPosts.length > 0 ? `
        <!-- Recent Videos -->
        <h2 style="font-size: 18px; font-weight: 700; color: #1B2559; margin: 0 0 16px 0;">Recent YouTube Videos</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px; background: #FFFFFF;">
          <thead>
            <tr style="background: #F4F7FE;">
              <th style="text-align: left; padding: 12px 16px; font-size: 13px; color: #A3AED0; font-weight: 600; border-bottom: 2px solid #E2E8F0;">Video Title</th>
              <th style="text-align: right; padding: 12px 16px; font-size: 13px; color: #A3AED0; font-weight: 600; border-bottom: 2px solid #E2E8F0;">Views</th>
              <th style="text-align: right; padding: 12px 16px; font-size: 13px; color: #A3AED0; font-weight: 600; border-bottom: 2px solid #E2E8F0;">Likes</th>
            </tr>
          </thead>
          <tbody>
            ${data.recentPosts.map(post => `
              <tr>
                <td style="padding: 14px 16px; font-size: 14px; font-weight: 500; color: #1B2559; border-bottom: 1px solid #E2E8F0; max-width: 400px;">${post.content}</td>
                <td style="padding: 14px 16px; font-size: 14px; font-weight: 600; color: #1B2559; text-align: right; border-bottom: 1px solid #E2E8F0;">${(post.views || 0).toLocaleString()}</td>
                <td style="padding: 14px 16px; font-size: 14px; font-weight: 600; color: #1B2559; text-align: right; border-bottom: 1px solid #E2E8F0;">${(post.likes || 0).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}

        ${data.growthData && data.growthData.length > 1 ? `
        <!-- Growth Data Table -->
        <h2 style="font-size: 18px; font-weight: 700; color: #1B2559; margin: 0 0 16px 0;">Audience Growth History</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px; background: #FFFFFF;">
          <thead>
            <tr style="background: #F4F7FE;">
              <th style="text-align: left; padding: 12px 16px; font-size: 13px; color: #A3AED0; font-weight: 600; border-bottom: 2px solid #E2E8F0;">Date</th>
              <th style="text-align: right; padding: 12px 16px; font-size: 13px; color: #A3AED0; font-weight: 600; border-bottom: 2px solid #E2E8F0;">Instagram</th>
              <th style="text-align: right; padding: 12px 16px; font-size: 13px; color: #A3AED0; font-weight: 600; border-bottom: 2px solid #E2E8F0;">YouTube</th>
            </tr>
          </thead>
          <tbody>
            ${data.growthData.map(row => `
              <tr>
                <td style="padding: 14px 16px; font-size: 14px; font-weight: 500; color: #1B2559; border-bottom: 1px solid #E2E8F0;">${row.name}</td>
                <td style="padding: 14px 16px; font-size: 14px; font-weight: 600; color: #E1306C; text-align: right; border-bottom: 1px solid #E2E8F0;">${(row.instagram || 0).toLocaleString()}</td>
                <td style="padding: 14px 16px; font-size: 14px; font-weight: 600; color: #FF0000; text-align: right; border-bottom: 1px solid #E2E8F0;">${(row.youtube || 0).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}

        <!-- Footer -->
        <div style="border-top: 1px solid #E2E8F0; padding-top: 16px; display: flex; justify-content: space-between; align-items: center;">
          <p style="font-size: 12px; color: #A3AED0; margin: 0;">© ${new Date().getFullYear()} UniSocial — Social Media Analytics</p>
          <p style="font-size: 12px; color: #A3AED0; margin: 0;">Page 1 of 1</p>
        </div>
      </div>
    `;

    const opt = {
      margin:       0.4,
      filename:     'UniSocial-Analytics-Report.pdf',
      image:        { type: 'png', quality: 1.0 },
      html2canvas:  { 
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        windowWidth: 1100,
        logging: false
      },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      await html2pdf().set(opt).from(reportHTML, 'string').save();
    } catch (err) {
      console.error('PDF export failed:', err);
    }
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
                      width={75}
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

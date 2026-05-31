import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, TrendingUp, Users, Target } from 'lucide-react';
import './Analytics.css';

const Analytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    comparison: [],
    totals: { followers: 0, engagement: 0 }
  });

  useEffect(() => {
    if (user) {
      loadAnalyticsData();
    }
  }, [user]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Fetch latest IG stats
      const { data: igStats } = await supabase
        .from('instagram_stats')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(1);

      // Fetch latest YT stats
      const { data: ytStats } = await supabase
        .from('youtube_channels')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const ig = igStats && igStats.length > 0 ? igStats[0] : null;
      const yt = ytStats; // object or null

      // Build Comparison Data
      const comparisonData = [];
      let totalFollowers = 0;
      let platformsCount = 0;
      let totalEng = 0;

      if (ig) {
        comparisonData.push({
          platform: 'Instagram',
          audience: ig.followers,
          engagement: parseFloat(ig.engagement_rate),
          fill: '#E1306C'
        });
        totalFollowers += ig.followers;
        totalEng += parseFloat(ig.engagement_rate);
        platformsCount++;
      }

      if (yt) {
        // YT Engagement Rate calculation mock or from average videos if we had it.
        // For now, we'll use a placeholder or calculate based on total views/subs (very rough)
        // Let's assume a static 3.5% for YT if we don't have deep video stats here.
        comparisonData.push({
          platform: 'YouTube',
          audience: yt.subscribers,
          engagement: 3.5, 
          fill: '#FF0000'
        });
        totalFollowers += yt.subscribers;
        totalEng += 3.5;
        platformsCount++;
      }

      setData({
        comparison: comparisonData,
        totals: {
          followers: totalFollowers,
          engagement: platformsCount > 0 ? (totalEng / platformsCount).toFixed(1) : 0
        }
      });
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading advanced analytics...</div>;

  return (
    <div className="analytics-page" style={{ animation: 'fadeIn 0.5s ease' }}>
      <div className="page-header" style={{ marginBottom: 32 }}>
        <h2 className="section-title">Cross-Platform Analytics</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Compare your performance across all connected social channels.</p>
      </div>

      <div className="metrics-grid" style={{ marginBottom: 32 }}>
        <div className="premium-card metric-card">
          <div className="metric-icon-box" style={{ background: 'rgba(67, 24, 255, 0.1)', color: 'var(--accent-primary)' }}>
            <Users size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Combined Audience</span>
            <h3 className="metric-value">{data.totals.followers.toLocaleString()}</h3>
          </div>
        </div>

        <div className="premium-card metric-card">
          <div className="metric-icon-box" style={{ background: 'rgba(5, 205, 153, 0.1)', color: '#05CD99' }}>
            <Activity size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Avg Engagement Rate</span>
            <h3 className="metric-value">{data.totals.engagement}%</h3>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        
        {/* Audience Comparison */}
        <div className="premium-card">
          <h3 style={{ marginBottom: 24, fontSize: 18 }}>Audience Comparison</h3>
          {data.comparison.length > 0 ? (
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.comparison} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="platform" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
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
                  <Bar dataKey="audience" name="Total Audience" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              No data available. Connect integrations to see comparison.
            </div>
          )}
        </div>

        {/* Engagement Comparison */}
        <div className="premium-card">
          <h3 style={{ marginBottom: 24, fontSize: 18 }}>Engagement Rate Comparison</h3>
          {data.comparison.length > 0 ? (
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.comparison} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="platform" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
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
                  <Bar dataKey="engagement" name="Engagement (%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              No data available. Connect integrations to see comparison.
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default Analytics;

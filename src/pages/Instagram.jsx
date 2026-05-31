import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Users, Heart, MessageCircle, Activity, RefreshCw, AlertCircle, TrendingUp, Globe, Shield, BarChart2, ExternalLink } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { fetchInstagramStats } from '../lib/instagram';
import './Instagram.css';

const InstagramIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="17.5" cy="6.5" r="1.5" fill={color} stroke="none" />
  </svg>
);

const COLORS = ['#E1306C', '#833AB4', '#405DE6', '#05CD99', '#FF6B35', '#F77737'];

const formatNumber = (num) => {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
};

const Instagram = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [accountInput, setAccountInput] = useState('');
  
  const apiKey = import.meta.env.VITE_RAPIDAPI_KEY;

  useEffect(() => {
    if (user) loadSavedData();
  }, [user]);

  const loadSavedData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('instagram_stats')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setHistory(data);
        // Try to re-fetch live data for the latest username
        try {
          const liveData = await fetchInstagramStats(data[0].username, apiKey);
          setProfileData(liveData);
        } catch {
          // If live fetch fails, still show saved stats
          setProfileData(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (e) => {
    if (e) e.preventDefault();
    
    const targetAccount = accountInput || (history.length > 0 ? history[0].username : '');
    if (!targetAccount) return;
    
    setSyncing(true);
    setError('');
    
    try {
      const igData = await fetchInstagramStats(targetAccount, apiKey);
      
      // Save snapshot to Supabase
      const { data, error: dbErr } = await supabase
        .from('instagram_stats')
        .insert([{
          user_id: user.id,
          username: igData.username,
          followers: igData.followers,
          following: 0,
          posts_count: 0,
          avg_likes: igData.avg_likes,
          avg_comments: igData.avg_comments,
          engagement_rate: igData.engagement_rate
        }])
        .select()
        .single();
        
      if (dbErr) throw dbErr;
      
      setProfileData(igData);
      setHistory(prev => [data, ...prev]);
      setAccountInput('');
      
    } catch (err) {
      setError(err.message || 'Failed to connect Instagram account');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="loading">Loading Instagram data...</div>;

  return (
    <div className="instagram-page">
      <div className="page-header">
        <h2 className="section-title">Instagram Analytics</h2>
        {profileData && (
          <button 
            className="btn-primary" 
            onClick={() => handleConnect()}
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

      {!profileData && history.length === 0 ? (
        <div className="premium-card connect-card" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <div className="connect-icon" style={{ background: 'rgba(225, 48, 108, 0.1)', color: '#E1306C', margin: '0 auto 20px', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <InstagramIcon size={48} />
          </div>
          <h3>Connect your Instagram Profile</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Enter your Instagram username or profile link to automatically fetch and track your growth.</p>
          
          <form onSubmit={handleConnect} className="connect-form" style={{ display: 'flex', gap: 12 }}>
            <input 
              type="text" 
              placeholder="e.g. @therock or instagram.com/therock"
              value={accountInput}
              onChange={(e) => setAccountInput(e.target.value)}
              required
              style={{ flex: 1, padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14 }}
            />
            <button type="submit" className="btn-primary" disabled={syncing}>
              {syncing ? 'Connecting...' : 'Connect'}
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* === Profile Header === */}
          {profileData && (
            <div className="premium-card ig-profile-header">
              <div className="ig-profile-info">
                {profileData.avatar ? (
                  <img 
                    src={profileData.avatar} 
                    alt={profileData.name} 
                    className="ig-avatar" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.target.onerror = null; 
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.name)}&background=E1306C&color=fff&size=128`;
                    }}
                  />
                ) : (
                  <div className="ig-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
                    <Users size={32} color="#9ca3af" />
                  </div>
                )}
                <div className="ig-profile-text">
                  <div className="ig-name-row">
                    <h3>{profileData.name}</h3>
                    {profileData.verified && <span className="ig-verified" title="Verified">✓</span>}
                    <span className="ig-handle">@{profileData.username}</span>
                  </div>
                  {profileData.description && <p className="ig-bio">{profileData.description}</p>}
                  <div className="ig-tags">
                    {profileData.country && (
                      <span className="ig-tag"><Globe size={12} /> {profileData.country.replace(/-/g, ' ')}</span>
                    )}
                    {profileData.type && (
                      <span className="ig-tag">{profileData.type}</span>
                    )}
                    {profileData.categories?.map((cat, i) => (
                      <span key={i} className="ig-tag">{cat.replace(/-/g, ' ')}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === Key Metrics === */}
          {profileData && (
            <div className="metrics-grid ig-metrics">
              <div className="premium-card metric-card">
                <div className="metric-icon-box" style={{ background: 'rgba(225, 48, 108, 0.1)', color: '#E1306C' }}>
                  <Users size={24} />
                </div>
                <div className="metric-info">
                  <span className="metric-label">Followers</span>
                  <h3 className="metric-value">{formatNumber(profileData.followers)}</h3>
                  {profileData.growth_180d_pct !== 0 && (
                    <span className={`metric-change ${profileData.growth_180d_pct >= 0 ? 'positive' : 'negative'}`}>
                      {profileData.growth_180d_pct >= 0 ? '↑' : '↓'} {Math.abs(profileData.growth_180d_pct)}% (6mo)
                    </span>
                  )}
                </div>
              </div>

              <div className="premium-card metric-card">
                <div className="metric-icon-box" style={{ background: 'rgba(131, 58, 180, 0.1)', color: '#833AB4' }}>
                  <Heart size={24} />
                </div>
                <div className="metric-info">
                  <span className="metric-label">Avg Likes</span>
                  <h3 className="metric-value">{formatNumber(profileData.avg_likes)}</h3>
                </div>
              </div>

              <div className="premium-card metric-card">
                <div className="metric-icon-box" style={{ background: 'rgba(64, 93, 230, 0.1)', color: '#405DE6' }}>
                  <MessageCircle size={24} />
                </div>
                <div className="metric-info">
                  <span className="metric-label">Avg Comments</span>
                  <h3 className="metric-value">{formatNumber(profileData.avg_comments)}</h3>
                </div>
              </div>

              <div className="premium-card metric-card">
                <div className="metric-icon-box" style={{ background: 'rgba(5, 205, 153, 0.1)', color: '#05CD99' }}>
                  <Activity size={24} />
                </div>
                <div className="metric-info">
                  <span className="metric-label">Engagement Rate</span>
                  <h3 className="metric-value">{profileData.engagement_rate}%</h3>
                </div>
              </div>

              <div className="premium-card metric-card">
                <div className="metric-icon-box" style={{ background: 'rgba(247, 119, 55, 0.1)', color: '#F77737' }}>
                  <Shield size={24} />
                </div>
                <div className="metric-info">
                  <span className="metric-label">Quality Score</span>
                  <h3 className="metric-value">{profileData.quality_score}%</h3>
                </div>
              </div>

              <div className="premium-card metric-card">
                <div className="metric-icon-box" style={{ background: 'rgba(255, 107, 53, 0.1)', color: '#FF6B35' }}>
                  <AlertCircle size={24} />
                </div>
                <div className="metric-info">
                  <span className="metric-label">Fake Followers</span>
                  <h3 className="metric-value">{profileData.fake_followers_pct}%</h3>
                </div>
              </div>
            </div>
          )}

          {/* === Analytics Charts Row === */}
          {profileData && (
            <div className="ig-charts-grid">
              {/* Audience Gender */}
              <div className="premium-card ig-chart-card">
                <h3>Audience Gender</h3>
                {profileData.gender_summary ? (
                  <div className="ig-gender-chart">
                    <div className="ig-gender-bars">
                      <div className="ig-gender-item">
                        <div className="ig-gender-label">
                          <span className="ig-gender-dot" style={{ background: '#405DE6' }}></span>
                          <span>Male</span>
                        </div>
                        <div className="ig-bar-track">
                          <div className="ig-bar-fill" style={{ width: `${profileData.gender_summary.male}%`, background: '#405DE6' }}></div>
                        </div>
                        <span className="ig-bar-value">{profileData.gender_summary.male}%</span>
                      </div>
                      <div className="ig-gender-item">
                        <div className="ig-gender-label">
                          <span className="ig-gender-dot" style={{ background: '#E1306C' }}></span>
                          <span>Female</span>
                        </div>
                        <div className="ig-bar-track">
                          <div className="ig-bar-fill" style={{ width: `${profileData.gender_summary.female}%`, background: '#E1306C' }}></div>
                        </div>
                        <span className="ig-bar-value">{profileData.gender_summary.female}%</span>
                      </div>
                    </div>
                    {profileData.gender_summary.avgAge && (
                      <div className="ig-avg-age">Average Age Group: <strong>{profileData.gender_summary.avgAge.replace('_', '-')}</strong></div>
                    )}
                  </div>
                ) : (
                  <div className="ig-no-data">Demographic data is not available for this account.</div>
                )}
              </div>

              {/* Audience Age */}
              <div className="premium-card ig-chart-card">
                <h3>Audience Age</h3>
                {profileData.age_distribution && profileData.age_distribution.length > 0 ? (
                  <div style={{ height: 220, marginTop: 12 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={profileData.age_distribution.map(a => ({
                        name: a.name.replace('_', '-'),
                        percent: parseFloat((a.percent * 100).toFixed(1))
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="name" stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={11} />
                        <YAxis stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={11} width={30} />
                        <Tooltip formatter={(v) => `${v}%`} contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '12px' }} />
                        <Bar dataKey="percent" name="%" fill="#833AB4" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="ig-no-data">Age data is not available for this account.</div>
                )}
              </div>

              {/* Audience Quality */}
              <div className="premium-card ig-chart-card">
                <h3>Audience Quality</h3>
                {profileData.audience_quality ? (
                  <div className="ig-quality-list">
                    {Object.entries(profileData.audience_quality).map(([name, value], i) => (
                      <div key={name} className="ig-quality-item">
                        <div className="ig-quality-label">
                          <span className="ig-gender-dot" style={{ background: COLORS[i % COLORS.length] }}></span>
                          <span>{name === 'massfollowers' ? 'Mass Followers' : name.charAt(0).toUpperCase() + name.slice(1)}</span>
                        </div>
                        <div className="ig-bar-track">
                          <div className="ig-bar-fill" style={{ width: `${value}%`, background: COLORS[i % COLORS.length] }}></div>
                        </div>
                        <span className="ig-bar-value">{value}%</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ig-no-data">Audience quality data is not available.</div>
                )}
              </div>

              {/* Top Countries */}
              <div className="premium-card ig-chart-card">
                <h3>Top Countries</h3>
                {profileData.top_countries && profileData.top_countries.length > 0 ? (
                  <div className="ig-countries-list">
                    {profileData.top_countries.map((c, i) => (
                      <div key={i} className="ig-country-row">
                        <span className="ig-country-name">{c.name.replace(/-/g, ' ')}</span>
                        <div className="ig-country-bar-wrap">
                          <div className="ig-country-bar" style={{ width: `${c.percent * 100}%` }}></div>
                        </div>
                        <span className="ig-country-pct">{(c.percent * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ig-no-data">Country data is not available for this account.</div>
                )}
              </div>
            </div>
          )}

          {/* === Recent Posts === */}
          {profileData && profileData.recent_posts && profileData.recent_posts.length > 0 && (
            <div className="premium-card ig-posts-card">
              <h3>Recent Posts</h3>
              <div className="ig-posts-list">
                {profileData.recent_posts.map((post, i) => (
                  <div key={i} className="ig-post-item">
                    <div className="ig-post-meta">
                      <span className="ig-post-type">{post.type}</span>
                      <span className="ig-post-date">{new Date(post.date).toLocaleDateString()}</span>
                    </div>
                    <p className="ig-post-text">{post.text?.length > 150 ? post.text.substring(0, 150) + '...' : post.text}</p>
                    <div className="ig-post-stats">
                      <span><Heart size={14} /> {formatNumber(post.likes)}</span>
                      <span><MessageCircle size={14} /> {formatNumber(post.comments)}</span>
                      <a href={post.url} target="_blank" rel="noopener noreferrer" className="ig-post-link">
                        <ExternalLink size={14} /> View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === Growth History Chart === */}
          {history.length > 1 && (
            <div className="premium-card ig-history-card">
              <h3>Growth Trends</h3>
              <div style={{ height: 300, marginTop: 20, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...history].reverse().map(h => ({ 
                      name: new Date(h.recorded_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}), 
                      followers: h.followers, 
                      engagement: h.engagement_rate 
                    }))}
                    margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis yAxisId="left" stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={12} width={60} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" tickLine={false} axisLine={false} fontSize={12} width={35} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '13px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="followers" name="Followers" stroke="#E1306C" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                    <Line yAxisId="right" type="monotone" dataKey="engagement" name="Engagement (%)" stroke="#05CD99" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Instagram;

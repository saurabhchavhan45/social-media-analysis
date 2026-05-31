import React, { useEffect, useState } from 'react';
import { Search, Bell, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const Header = ({ title = "Dashboard" }) => {
  const [theme, setTheme] = useState('light');
  const { user } = useAuth();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <header className="header glass-panel">
      <div className="header-left">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">Welcome back, let's check your stats!</p>
      </div>

      <div className="header-right">
        <div className="search-bar">
          <Search size={20} className="search-icon" />
          <input type="text" placeholder="Search analytics..." />
        </div>
        
        <button className="icon-btn" onClick={toggleTheme}>
          {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
        </button>
        
        <button className="icon-btn notification-btn">
          <Bell size={22} />
        </button>
        
        <div className="profile-container">
          <div className="profile-img" style={{
            background: 'var(--accent-primary)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            {fullName.charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <span className="profile-name">{fullName}</span>
            <span className="profile-role">Creator</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

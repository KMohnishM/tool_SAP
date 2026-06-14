import React, { useState, useEffect } from 'react';
import PatternFinder from './components/PatternFinder/PatternFinder';
import RepoViewer from './components/RepoViewer/RepoViewer';
import CopilotChat from './components/CopilotChat/CopilotChat';
import './styles/variables.css';
import './styles/global.css';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('finder'); // 'finder' or 'repo'
  const [theme, setTheme] = useState('dark');
  const [finderSearch, setFinderSearch] = useState({ query: '', timestamp: 0 });
  const [repoSearch, setRepoSearch] = useState({ query: '', timestamp: 0 });

  const handleSearchFinder = (query) => {
    setFinderSearch({ query, timestamp: Date.now() });
    setActiveTab('finder');
  };

  const handleSearchRepo = (query) => {
    setRepoSearch({ query, timestamp: Date.now() });
    setActiveTab('repo');
  };

  // Apply theme class to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="app-frame">
      {/* App Header */}
      <header className="app-header glass">
        <div className="container flex justify-between align-center header-inner">
          <div className="logo-section flex align-center">
            <div className="logo-icon pulse-gold">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div className="logo-text">
              <h2>SAP Clean Core Explorer</h2>
              <span className="logo-sub">Extensibility & API Governance Tools</span>
            </div>
          </div>

          <div className="header-actions flex align-center">
            {/* Nav Tabs */}
            <nav className="nav-tabs flex">
              <button 
                className={`nav-tab ${activeTab === 'finder' ? 'active' : ''}`}
                onClick={() => setActiveTab('finder')}
              >
                Pattern Finder
              </button>
              <button 
                className={`nav-tab ${activeTab === 'repo' ? 'active' : ''}`}
                onClick={() => setActiveTab('repo')}
              >
                API Repository
              </button>
            </nav>

            {/* Theme Toggle */}
            <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle Theme">
              {theme === 'dark' ? (
                // Sun Icon for Light Mode
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                // Moon Icon for Dark Mode
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-main-content">
        <div className="container">
          {activeTab === 'finder' ? (
            <PatternFinder initialSearchQuery={finderSearch} />
          ) : (
            <RepoViewer initialSearchQuery={repoSearch} />
          )}
        </div>
      </main>

      {/* Floating Copilot Chatbot */}
      <CopilotChat 
        onNavigate={setActiveTab}
        onSearchFinder={handleSearchFinder}
        onSearchRepo={handleSearchRepo}
      />

      {/* App Footer */}
      <footer className="app-footer">
        <div className="container flex justify-between align-center footer-inner">
          <div className="footer-meta">
            Clean Core Explorer • Pattern Finder Note 3578329 v20 • Repository Viewer v1.0
          </div>
          <div className="footer-copyright">
            © 2026 SAP Clean Core Helper Tools
          </div>
        </div>
      </footer>
    </div>
  );
}

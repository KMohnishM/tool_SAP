import React, { useState, useMemo } from 'react';
import PatternAnalytics from './PatternAnalytics';
import './PatternFinder.css';
import cleanCoreData from '../../assets/data/cleanCorePatterns.json';

export default function PatternFinder({ initialSearchQuery }) {
  const [scope, setScope] = useState('extensibility'); // 'extensibility' or 'integration'
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    if (initialSearchQuery && initialSearchQuery.query) {
      setSearchQuery(initialSearchQuery.query);
    }
  }, [initialSearchQuery]);
  
  // Levels selected filter. True = active, False = inactive.
  const [levelFilter, setLevelFilter] = useState({
    A: false,
    B: false,
    C: false,
    D: false
  });

  const [complexityFilter, setComplexityFilter] = useState({
    Low: false,
    Medium: false,
    High: false
  });
  
  const [activeCategoryFilter, setActiveCategoryFilter] = useState(null);
  const [expandedCardId, setExpandedCardId] = useState(null);

  // Toggle level selection
  const toggleLevelFilter = (lvl) => {
    setLevelFilter(prev => ({
      ...prev,
      [lvl]: !prev[lvl]
    }));
  };

  // Toggle complexity selection
  const toggleComplexityFilter = (comp) => {
    setComplexityFilter(prev => ({
      ...prev,
      [comp]: !prev[comp]
    }));
  };

  // Reset all level filters
  const resetFilters = () => {
    setLevelFilter({ A: false, B: false, C: false, D: false });
    setComplexityFilter({ Low: false, Medium: false, High: false });
    setActiveCategoryFilter(null);
    setSearchQuery('');
  };

  // 1. Get current scope data
  const rawItems = useMemo(() => {
    return cleanCoreData[scope] || [];
  }, [scope]);

  // 2. Apply search and filtering
  const filteredItems = useMemo(() => {
    // Determine active levels (if any)
    const activeLevels = Object.entries(levelFilter)
      .filter(([_, active]) => active)
      .map(([lvl]) => lvl);
      
    // Determine active complexities (if any)
    const activeComplexities = Object.entries(complexityFilter)
      .filter(([_, active]) => active)
      .map(([comp]) => comp);
      
    return rawItems.filter(item => {
      // Level filter match
      if (activeLevels.length > 0) {
        const itemLvl = item.level || '';
        // If item has a compound level like B/C, check if any active level matches
        const matchesLevel = activeLevels.some(lvl => itemLvl.includes(lvl));
        if (!matchesLevel) return false;
      }
      
      // Complexity filter match
      if (activeComplexities.length > 0) {
        if (!activeComplexities.includes(item.complexity)) return false;
      }
      
      // Category filter match
      if (activeCategoryFilter && item.category !== activeCategoryFilter) {
        return false;
      }
      
      // Search query match
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = (item.name || '').toLowerCase().includes(query);
        const matchesCat = (item.category || '').toLowerCase().includes(query);
        const matchesComp = (item.component || '').toLowerCase().includes(query);
        const matchesAlt = (item.alt || '').toLowerCase().includes(query);
        const matchesDetails = (item.details || '').toLowerCase().includes(query);
        
        if (!matchesName && !matchesCat && !matchesComp && !matchesAlt && !matchesDetails) {
          return false;
        }
      }
      
      return true;
    });
  }, [rawItems, levelFilter, complexityFilter, activeCategoryFilter, searchQuery]);

  // Expand card toggle
  const toggleExpandCard = (id) => {
    setExpandedCardId(expandedCardId === id ? null : id);
  };

  // Get level descriptive classes
  const getLevelBadgeClass = (lvl) => {
    if (lvl.includes('A')) return 'badge-a';
    if (lvl.includes('B')) return 'badge-b';
    if (lvl.includes('C')) return 'badge-c';
    if (lvl.includes('D')) return 'badge-d';
    return 'badge-m';
  };

  // Helper to highlight search matches
  const highlightText = (text, search) => {
    if (!search.trim()) return text;
    const parts = text.split(new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === search.toLowerCase() 
            ? <mark key={i}>{part}</mark> 
            : part
        )}
      </span>
    );
  };

  const activeLevelFilterCount = Object.values(levelFilter).filter(Boolean).length;
  const activeComplexityFilterCount = Object.values(complexityFilter).filter(Boolean).length;
  const isAnyFilterActive = activeLevelFilterCount > 0 || activeComplexityFilterCount > 0 || activeCategoryFilter !== null || searchQuery !== '';

  return (
    <div className="pattern-finder-layout">
      {/* Scope Toggles */}
      <div className="scope-tabs flex">
        <button 
          className={`scope-tab ${scope === 'extensibility' ? 'active' : ''}`}
          onClick={() => { setScope('extensibility'); resetFilters(); }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          Extensibility Patterns (Note 3578329)
        </button>
        <button 
          className={`scope-tab ${scope === 'integration' ? 'active' : ''}`}
          onClick={() => { setScope('integration'); resetFilters(); }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
            <path d="m8 3 4 8 5-5 5 15H2L8 3z"/>
          </svg>
          Integration Protocols (Note 3690029)
        </button>
      </div>

      {/* Analytics Dashboard */}
      <PatternAnalytics 
        items={rawItems} 
        activeLevelFilter={levelFilter}
        toggleLevelFilter={toggleLevelFilter}
        activeCategoryFilter={activeCategoryFilter}
        setActiveCategoryFilter={setActiveCategoryFilter}
        activeComplexityFilter={complexityFilter}
        toggleComplexityFilter={toggleComplexityFilter}
      />

      {/* Filters & Controls */}
      <div className="controls-card glass">
        <div className="search-row">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input 
            type="text" 
            placeholder="Search pattern name, component, alternative successor or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>&times;</button>
          )}
        </div>

        <div className="filter-row flex align-center justify-between">
          <div className="filter-groups flex align-center" style={{ flexWrap: 'wrap', gap: '16px' }}>
            <div className="level-buttons flex align-center">
              <span className="filter-label">Clean Core Levels:</span>
              {['A', 'B', 'C', 'D'].map(lvl => (
                <button
                  key={lvl}
                  className={`level-btn btn-${lvl.toLowerCase()} ${levelFilter[lvl] ? 'active' : ''}`}
                  onClick={() => toggleLevelFilter(lvl)}
                >
                  <span className={`dot bg-${lvl.toLowerCase()}`}></span>
                  Level {lvl}
                </button>
              ))}
            </div>

            <div className="complexity-buttons flex align-center">
              <span className="filter-label">Remediation Complexity:</span>
              {['Low', 'Medium', 'High'].map(comp => (
                <button
                  key={comp}
                  className={`level-btn btn-complexity comp-${comp.toLowerCase()} ${complexityFilter[comp] ? 'active' : ''}`}
                  onClick={() => toggleComplexityFilter(comp)}
                >
                  <span className={`dot bg-comp-${comp.toLowerCase()}`}></span>
                  {comp}
                </button>
              ))}
            </div>
          </div>
          
          {isAnyFilterActive && (
            <button className="reset-all-btn flex align-center" onClick={resetFilters}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Pattern List Header */}
      <div className="list-meta flex justify-between align-center">
        <div className="results-count">
          Showing <b>{filteredItems.length}</b> of <b>{rawItems.length}</b> patterns
          {activeCategoryFilter && <span> in <b>{activeCategoryFilter}</b></span>}
        </div>
        <div className="legend-pills flex">
          <span className="pill badge-a">Level A: Cloud Ready</span>
          <span className="pill badge-b">Level B: Classic API</span>
          <span className="pill badge-c">Level C: Internal API</span>
          <span className="pill badge-d">Level D: Blocked</span>
        </div>
      </div>

      {/* Pattern Cards list */}
      <div className="patterns-list">
        {filteredItems.length > 0 ? (
          filteredItems.map((item, idx) => {
            const itemId = `${scope}-${idx}`;
            const isExpanded = expandedCardId === itemId;
            
            return (
              <div 
                key={itemId} 
                className={`pattern-card glass ${isExpanded ? 'expanded' : ''} border-${(item.level || 'A').charAt(0).toLowerCase()}`}
                onClick={() => toggleExpandCard(itemId)}
              >
                <div className="card-summary flex align-center justify-between">
                  <div className="card-main flex align-center">
                    <div className={`level-badge ${getLevelBadgeClass(item.level)}`}>
                      {item.level}
                    </div>
                    <div className="card-info">
                      <h4>{highlightText(item.name || '', searchQuery)}</h4>
                      <div className="card-tags flex">
                        {item.category && <span className="card-tag cat">{highlightText(item.category, searchQuery)}</span>}
                        {item.component && <span className="card-tag comp">{highlightText(item.component, searchQuery)}</span>}
                        {item.complexity && <span className={`card-tag complexity comp-${item.complexity.toLowerCase()}`}>Remediation: {item.complexity}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="card-actions flex align-center">
                    <div className="status-badges flex">
                      <div className={`status-pill ${item.upgrade === 'yes' ? 'yes' : item.upgrade === 'no' ? 'no' : 'cond'}`}>
                        Upgrade Stable: {item.upgrade}
                      </div>
                      <div className={`status-pill ${item.cloud === 'yes' || item.cloud === 'Yes' ? 'yes' : item.cloud === 'no' || item.cloud === 'No' ? 'no' : 'cond'}`}>
                        Cloud Ready: {item.cloud}
                      </div>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chev-icon">
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </div>
                </div>

                {isExpanded && (
                  <div className="card-details" onClick={(e) => e.stopPropagation()}>
                    <div className="details-content">
                      {item.alt && (
                        <div className="detail-section alt-section">
                          <span className="section-title">Successor / Cloud-Ready Alternative</span>
                          <p className="alternative-path">{highlightText(item.alt, searchQuery)}</p>
                        </div>
                      )}
                      
                      {item.details && (
                        <div className="detail-section">
                          <span className="section-title">Technical Guidance & Conditions</span>
                          <p className="details-text">{highlightText(item.details, searchQuery)}</p>
                        </div>
                      )}

                      <div className="detail-meta-grid">
                        <div className="meta-box">
                          <span className="box-title">Application Component</span>
                          <span className="box-value">{item.component || 'N/A'}</span>
                        </div>
                        <div className="meta-box">
                          <span className="box-title">Source Reference</span>
                          <span className="box-value">
                            {scope === 'extensibility' ? 'SAP Note 3578329' : 'SAP Note 3690029'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="empty-results glass flex align-center justify-between">
            <div>
              <h3>No Patterns Found</h3>
              <p>Try clearing your active filters, search query or category selections.</p>
            </div>
            <button className="reset-all-btn" onClick={resetFilters}>Reset All</button>
          </div>
        )}
      </div>
    </div>
  );
}

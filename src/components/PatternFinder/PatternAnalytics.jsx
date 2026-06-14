import React from 'react';
import './PatternAnalytics.css';

export default function PatternAnalytics({ 
  items, 
  activeLevelFilter, 
  toggleLevelFilter, 
  activeCategoryFilter, 
  setActiveCategoryFilter,
  activeComplexityFilter,
  toggleComplexityFilter
}) {
  // Calculate statistics dynamically based on the current items list
  const total = items.length;
  
  // Clean Core Level counts
  const levelCounts = { A: 0, B: 0, C: 0, D: 0 };
  items.forEach(item => {
    const lvl = item.level || '';
    if (lvl.includes('A')) levelCounts.A++;
    if (lvl.includes('B')) levelCounts.B++;
    if (lvl.includes('C')) levelCounts.C++;
    if (lvl.includes('D')) levelCounts.D++;
  });

  const levelLabels = {
    A: 'A - Cloud Ready (Released)',
    B: 'B - Classic API (Upgrade Stable)',
    C: 'C - SAP Internal (Tier 2 Wrapper Required)',
    D: 'D - Obsolete / Modification (Avoid)'
  };

  const levelColors = {
    A: 'var(--a)',
    B: 'var(--b)',
    C: 'var(--c)',
    D: 'var(--d)'
  };

  // Category counts
  const categoryCounts = {};
  items.forEach(item => {
    const cat = item.category || 'Other';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  
  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8); // Top 8 categories for display

  // Complexity counts
  const complexityCounts = { Low: 0, Medium: 0, High: 0 };
  items.forEach(item => {
    const comp = item.complexity || 'Low';
    complexityCounts[comp] = (complexityCounts[comp] || 0) + 1;
  });

  // Cloud Ready and Upgrade Stable percentages
  const cloudReadyCount = items.filter(item => (item.cloud || '').toLowerCase() === 'yes').length;
  const upgradeStableCount = items.filter(item => (item.upgrade || '').toLowerCase() === 'yes').length;
  const successorCount = items.filter(item => item.alt && item.alt.trim() !== 'not applicable' && item.alt.trim() !== '').length;

  const cloudReadyPct = total ? Math.round((cloudReadyCount / total) * 100) : 0;
  const upgradeStablePct = total ? Math.round((upgradeStableCount / total) * 100) : 0;
  const successorPct = total ? Math.round((successorCount / total) * 100) : 0;

  // Compliance Score: Level A or B are considered Clean Core Compliant
  const compliantCount = items.filter(item => {
    const lvl = item.level || '';
    return lvl.includes('A') || lvl.includes('B');
  }).length;
  const complianceScore = total ? Math.round((compliantCount / total) * 100) : 0;

  // SVG Donut Calculations
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;
  
  const donutSegments = Object.entries(levelCounts).map(([level, count]) => {
    const pct = total ? count / total : 0;
    const strokeDash = pct * circumference;
    const strokeOffset = circumference - strokeDash;
    const rotation = (accumulatedAngle / circumference) * 360;
    accumulatedAngle += strokeDash;
    
    return {
      level,
      count,
      pct: Math.round(pct * 100),
      strokeDash,
      strokeOffset,
      rotation,
      color: levelColors[level]
    };
  });

  return (
    <div className="analytics-container">
      {/* Top Cards row */}
      <div className="stats-grid">
        <div className="stat-card glass flex align-center">
          <div className="circular-progress" style={{ '--pct': complianceScore, '--color': 'var(--b)' }}>
            <div className="inner-val">{complianceScore}%</div>
          </div>
          <div className="stat-meta">
            <h3>Clean Core Index</h3>
            <p>Percentage of Level A & B Patterns</p>
            <span className="badge-info">{compliantCount} / {total} Patterns</span>
          </div>
        </div>

        <div className="stat-card glass flex align-center">
          <div className="circular-progress" style={{ '--pct': cloudReadyPct, '--color': 'var(--a)' }}>
            <div className="inner-val">{cloudReadyPct}%</div>
          </div>
          <div className="stat-meta">
            <h3>Cloud Ready</h3>
            <p>Direct Public Cloud Viability</p>
            <span className="badge-info">{cloudReadyCount} Patterns</span>
          </div>
        </div>

        <div className="stat-card glass flex align-center">
          <div className="circular-progress" style={{ '--pct': upgradeStablePct, '--color': 'var(--gold)' }}>
            <div className="inner-val">{upgradeStablePct}%</div>
          </div>
          <div className="stat-meta">
            <h3>Upgrade Stable</h3>
            <p>No Modification Risk</p>
            <span className="badge-info">{upgradeStableCount} Patterns</span>
          </div>
        </div>

        <div className="stat-card glass flex align-center">
          <div className="circular-progress" style={{ '--pct': successorPct, '--color': 'var(--c)' }}>
            <div className="inner-val">{successorPct}%</div>
          </div>
          <div className="stat-meta">
            <h3>Successor Rate</h3>
            <p>Patterns with modern paths</p>
            <span className="badge-info">{successorCount} Patterns</span>
          </div>
        </div>
      </div>

      {/* Main Charts grid */}
      <div className="charts-grid">
        {/* Donut Chart */}
        <div className="chart-card glass">
          <div className="chart-header">
            <h4>Level Distribution</h4>
            <p className="subtitle">Click segments to filter list by Clean Core Level</p>
          </div>
          
          <div className="donut-section flex align-center justify-between">
            <div className="svg-wrapper">
              <svg width="180" height="180" viewBox="0 0 140 140" className="donut-svg">
                <circle cx="70" cy="70" r={radius} fill="transparent" stroke="var(--border)" strokeWidth="18" />
                {donutSegments.map(seg => (
                  seg.count > 0 && (
                    <circle
                      key={seg.level}
                      cx="70"
                      cy="70"
                      r={radius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="20"
                      strokeDasharray={`${seg.strokeDash} ${circumference}`}
                      strokeDashoffset={seg.strokeOffset}
                      transform={`rotate(${seg.rotation - 90} 70 70)`}
                      className={`donut-ring ring-${seg.level} ${activeLevelFilter[seg.level] ? 'active-ring' : ''}`}
                      onClick={() => toggleLevelFilter(seg.level)}
                      style={{ cursor: 'pointer' }}
                    />
                  )
                ))}
                <circle cx="70" cy="70" r={radius - 12} fill="var(--panel)" />
                <text x="70" y="66" textAnchor="middle" className="donut-text-top" fill="var(--ink)">
                  {total}
                </text>
                <text x="70" y="86" textAnchor="middle" className="donut-text-sub" fill="var(--muted)">
                  Patterns
                </text>
              </svg>
            </div>
            
            <div className="donut-legend">
              {donutSegments.map(seg => (
                <div 
                  key={seg.level} 
                  className={`legend-item flex align-center justify-between ${activeLevelFilter[seg.level] ? 'selected' : ''}`}
                  onClick={() => toggleLevelFilter(seg.level)}
                >
                  <div className="legend-label flex align-center">
                    <span className="dot" style={{ backgroundColor: seg.color }}></span>
                    <span className="lvl-name">{levelLabels[seg.level].split(' - ')[0]}</span>
                  </div>
                  <div className="legend-value">
                    <span className="count">{seg.count}</span>
                    <span className="pct">({seg.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category Breakdown Bar Chart */}
        <div className="chart-card glass">
          <div className="chart-header flex justify-between align-center">
            <div>
              <h4>Top Categories</h4>
              <p className="subtitle">Click bars to filter list by Category</p>
            </div>
            {activeCategoryFilter && (
              <button className="clear-btn" onClick={() => setActiveCategoryFilter(null)}>Reset Filter</button>
            )}
          </div>
          
          <div className="bar-chart-list">
            {sortedCategories.map(([cat, count]) => {
              const maxCount = sortedCategories[0][1];
              const barPct = maxCount ? (count / maxCount) * 100 : 0;
              const isSelected = activeCategoryFilter === cat;
              
              return (
                <div 
                  key={cat} 
                  className={`bar-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => setActiveCategoryFilter(isSelected ? null : cat)}
                >
                  <div className="bar-labels flex justify-between">
                    <span className="bar-label">{cat}</span>
                    <span className="bar-val">{count} patterns</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${barPct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Complexity Breakdown Bar Chart */}
        <div className="chart-card glass">
          <div className="chart-header">
            <h4>Remediation Complexity</h4>
            <p className="subtitle">Click bars to filter list by Complexity</p>
          </div>
          
          <div className="bar-chart-list">
            {Object.entries(complexityCounts).map(([comp, count]) => {
              const maxCount = Math.max(...Object.values(complexityCounts));
              const barPct = maxCount ? (count / maxCount) * 100 : 0;
              const isSelected = activeComplexityFilter ? activeComplexityFilter[comp] : false;
              const compColors = {
                Low: 'var(--a)',
                Medium: 'var(--c)',
                High: 'var(--d)'
              };
              
              return (
                <div 
                  key={comp} 
                  className={`bar-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleComplexityFilter && toggleComplexityFilter(comp)}
                >
                  <div className="bar-labels flex justify-between">
                    <span className="bar-label" style={{ color: isSelected ? compColors[comp] : 'var(--muted)', fontWeight: isSelected ? '700' : '600' }}>
                      {comp} Complexity
                    </span>
                    <span className="bar-val">{count} patterns</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ 
                      width: `${barPct}%`,
                      backgroundColor: compColors[comp],
                      boxShadow: isSelected ? `0 0 8px ${compColors[comp]}` : 'none'
                    }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

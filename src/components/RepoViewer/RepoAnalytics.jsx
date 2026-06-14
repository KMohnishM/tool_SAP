import React, { useMemo } from 'react';
import './RepoAnalytics.css';

export default function RepoAnalytics({
  items,
  activeStateFilter,
  setActiveStateFilter,
  activeTypeFilter,
  setActiveTypeFilter,
  activeSoftCompFilter,
  setActiveSoftCompFilter
}) {
  const total = items.length;

  // Calculate statistics
  const stats = useMemo(() => {
    if (total === 0) {
      return {
        stateCounts: { released: 0, deprecated: 0, notToBeReleased: 0 },
        uniqueTypes: 0,
        uniqueSoftComps: 0,
        successorRate: 0,
        typeCounts: {},
        softCompCounts: {}
      };
    }

    const stateCounts = { released: 0, deprecated: 0, notToBeReleased: 0 };
    const typesSet = new Set();
    const softCompsSet = new Set();
    const typeCounts = {};
    const softCompCounts = {};
    
    let nonReleasedCount = 0;
    let nonReleasedWithSuccessor = 0;

    items.forEach(item => {
      // Release State count
      if (item.state) {
        stateCounts[item.state] = (stateCounts[item.state] || 0) + 1;
      }

      // Unique types count
      if (item.objectType) {
        typesSet.add(item.objectType);
        typeCounts[item.objectType] = (typeCounts[item.objectType] || 0) + 1;
      }

      // Unique software components
      if (item.softwareComponent) {
        softCompsSet.add(item.softwareComponent);
        softCompCounts[item.softwareComponent] = (softCompCounts[item.softwareComponent] || 0) + 1;
      }

      // Successor rating
      if (item.state !== 'released') {
        nonReleasedCount++;
        if (item.successors && item.successors.length > 0) {
          nonReleasedWithSuccessor++;
        }
      }
    });

    const successorRate = nonReleasedCount
      ? Math.round((nonReleasedWithSuccessor / nonReleasedCount) * 100)
      : 0;

    return {
      stateCounts,
      uniqueTypes: typesSet.size,
      uniqueSoftComps: softCompsSet.size,
      successorRate,
      typeCounts,
      softCompCounts
    };
  }, [items, total]);

  // Clean Core State Display Configuration
  const stateLabels = {
    released: 'Released (Level A)',
    deprecated: 'Deprecated (Level B/C)',
    notToBeReleased: 'Not to be Released (Level D)'
  };

  const stateColors = {
    released: 'var(--a)',
    deprecated: 'var(--c)',
    notToBeReleased: 'var(--d)'
  };

  // Top 6 Object Types for display
  const sortedTypes = useMemo(() => {
    return Object.entries(stats.typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [stats.typeCounts]);

  // Top 6 Software Components for display
  const sortedSoftComps = useMemo(() => {
    return Object.entries(stats.softCompCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [stats.softCompCounts]);

  // SVG Donut Calculations
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  const donutSegments = useMemo(() => {
    return Object.entries(stats.stateCounts).map(([state, count]) => {
      const pct = total ? count / total : 0;
      const strokeDash = pct * circumference;
      const strokeOffset = circumference - strokeDash;
      const rotation = (accumulatedAngle / circumference) * 360;
      accumulatedAngle += strokeDash;

      return {
        state,
        count,
        pct: Math.round(pct * 100),
        strokeDash,
        strokeOffset,
        rotation,
        color: stateColors[state]
      };
    });
  }, [stats.stateCounts, total, circumference]);

  const complianceScore = total
    ? Math.round((stats.stateCounts.released / total) * 100)
    : 0;

  const handleStateClick = (state) => {
    setActiveStateFilter(activeStateFilter === state ? 'all' : state);
  };

  return (
    <div className="repo-analytics-container">
      {/* Metrics Row */}
      <div className="stats-grid">
        <div className="stat-card glass flex align-center">
          <div className="circular-progress" style={{ '--pct': complianceScore, '--color': 'var(--a)' }}>
            <div className="inner-val">{complianceScore}%</div>
          </div>
          <div className="stat-meta">
            <h3>Compliance Index</h3>
            <p>Percentage of Released Level A APIs</p>
            <span className="badge-info">{stats.stateCounts.released} / {total} objects</span>
          </div>
        </div>

        <div className="stat-card glass flex align-center">
          <div className="circular-progress" style={{ '--pct': stats.successorRate, '--color': 'var(--b)' }}>
            <div className="inner-val">{stats.successorRate}%</div>
          </div>
          <div className="stat-meta">
            <h3>Successor Coverage</h3>
            <p>Violated objects with replacements</p>
            <span className="badge-info">{stats.successorRate}% modern path rate</span>
          </div>
        </div>

        <div className="stat-card glass flex align-center">
          <div className="circular-progress" style={{ '--pct': 100, '--color': 'var(--gold)' }}>
            <div className="inner-val">{stats.uniqueSoftComps}</div>
          </div>
          <div className="stat-meta">
            <h3>Software Components</h3>
            <p>Unique SAP packages scanned</p>
            <span className="badge-info">{stats.uniqueSoftComps} packages cached</span>
          </div>
        </div>

        <div className="stat-card glass flex align-center">
          <div className="circular-progress" style={{ '--pct': 100, '--color': 'var(--c)' }}>
            <div className="inner-val">{stats.uniqueTypes}</div>
          </div>
          <div className="stat-meta">
            <h3>Object Types</h3>
            <p>Classes, Tables, Views, Structures</p>
            <span className="badge-info">{stats.uniqueTypes} distinct metadata types</span>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="charts-grid">
        {/* State Distribution Donut */}
        <div className="chart-card glass">
          <div className="chart-header">
            <h4>API Release States</h4>
            <p className="subtitle">Click segments to filter entries by Clean Core Level</p>
          </div>

          <div className="donut-section flex align-center justify-between">
            <div className="svg-wrapper">
              <svg width="170" height="170" viewBox="0 0 140 140" className="donut-svg">
                <circle cx="70" cy="70" r={radius} fill="transparent" stroke="var(--border)" strokeWidth="18" />
                {donutSegments.map(seg => (
                  seg.count > 0 && (
                    <circle
                      key={seg.state}
                      cx="70"
                      cy="70"
                      r={radius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="20"
                      strokeDasharray={`${seg.strokeDash} ${circumference}`}
                      strokeDashoffset={seg.strokeOffset}
                      transform={`rotate(${seg.rotation - 90} 70 70)`}
                      className={`donut-ring ring-${seg.state} ${activeStateFilter === seg.state ? 'active-ring' : ''}`}
                      onClick={() => handleStateClick(seg.state)}
                      style={{ cursor: 'pointer' }}
                    />
                  )
                ))}
                <circle cx="70" cy="70" r={radius - 12} fill="var(--panel)" />
                <text x="70" y="66" textAnchor="middle" className="donut-text-top" fill="var(--ink)">
                  {total.toLocaleString()}
                </text>
                <text x="70" y="86" textAnchor="middle" className="donut-text-sub" fill="var(--muted)">
                  Total Entries
                </text>
              </svg>
            </div>

            <div className="donut-legend">
              {donutSegments.map(seg => (
                <div
                  key={seg.state}
                  className={`legend-item flex align-center justify-between ${activeStateFilter === seg.state ? 'selected' : ''}`}
                  onClick={() => handleStateClick(seg.state)}
                >
                  <div className="legend-label flex align-center">
                    <span className="dot" style={{ backgroundColor: seg.color }}></span>
                    <span className="lvl-name">{stateLabels[seg.state].split(' (')[0]}</span>
                  </div>
                  <div className="legend-value">
                    <span className="count">{seg.count.toLocaleString()}</span>
                    <span className="pct">({seg.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Object Types Bar Chart */}
        <div className="chart-card glass">
          <div className="chart-header flex justify-between align-center">
            <div>
              <h4>Object Type Breakdown</h4>
              <p className="subtitle">Click bars to filter by Object Type</p>
            </div>
            {activeTypeFilter !== 'all' && (
              <button className="clear-btn" onClick={() => setActiveTypeFilter('all')}>Reset Filter</button>
            )}
          </div>

          <div className="bar-chart-list">
            {sortedTypes.map(([type, count]) => {
              const maxCount = sortedTypes[0]?.[1] || 1;
              const barPct = (count / maxCount) * 100;
              const isSelected = activeTypeFilter === type;

              return (
                <div
                  key={type}
                  className={`bar-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => setActiveTypeFilter(isSelected ? 'all' : type)}
                >
                  <div className="bar-labels flex justify-between">
                    <span className="bar-label">{type}</span>
                    <span className="bar-val">{count.toLocaleString()} entries</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${barPct}%`, backgroundColor: 'var(--b)' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Software Components Bar Chart */}
        <div className="chart-card glass">
          <div className="chart-header flex justify-between align-center">
            <div>
              <h4>Top Software Components</h4>
              <p className="subtitle">Click bars to filter by Software Component</p>
            </div>
            {activeSoftCompFilter !== 'all' && (
              <button className="clear-btn" onClick={() => setActiveSoftCompFilter('all')}>Reset Filter</button>
            )}
          </div>

          <div className="bar-chart-list">
            {sortedSoftComps.map(([softComp, count]) => {
              const maxCount = sortedSoftComps[0]?.[1] || 1;
              const barPct = (count / maxCount) * 100;
              const isSelected = activeSoftCompFilter === softComp;

              return (
                <div
                  key={softComp}
                  className={`bar-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => setActiveSoftCompFilter(isSelected ? 'all' : softComp)}
                >
                  <div className="bar-labels flex justify-between">
                    <span className="bar-label">{softComp}</span>
                    <span className="bar-val">{count.toLocaleString()} entries</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${barPct}%`, backgroundColor: 'var(--gold)' }}></div>
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

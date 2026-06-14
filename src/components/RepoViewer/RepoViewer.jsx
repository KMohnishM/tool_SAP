import React, { useState, useEffect, useMemo } from 'react';
import RepoAnalytics from './RepoAnalytics';
import './RepoViewer.css';

export default function RepoViewer({ initialSearchQuery }) {
  const [dbData, setDbData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [subTab, setSubTab] = useState('explorer'); // 'explorer' or 'analyzer'
  
  // Explorer state
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [softCompFilter, setSoftCompFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (initialSearchQuery && initialSearchQuery.query) {
      setSearchQuery(initialSearchQuery.query);
      setSubTab('explorer');
    }
  }, [initialSearchQuery]);

  // Analyzer state
  const [inputCode, setInputCode] = useState('');
  const [isRawLogMode, setIsRawLogMode] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [simFixPercent, setSimFixPercent] = useState(0);

  // Search redirection when successor clicked
  const handleSuccessorClick = (name) => {
    setSearchQuery(name);
    setStateFilter('all');
    setTypeFilter('all');
    setSoftCompFilter('all');
    setSubTab('explorer');
  };

  // Load the 9.8MB JSON database dynamically via code-splitting dynamic import
  useEffect(() => {
    import('../../assets/data/objectReleaseInfoLatest.json')
      .then((module) => {
        setDbData(module.default.objectReleaseInfo || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load Cloudification Repository data:', err);
        setLoadError('Could not load the Cloudification Repository database. Please check if the file exists.');
        setLoading(false);
      });
  }, []);

  // Memoized lists of unique object types and states for explorer filters
  const uniqueTypes = useMemo(() => {
    if (!dbData) return [];
    const types = new Set();
    dbData.forEach(item => {
      if (item.objectType) types.add(item.objectType);
    });
    return Array.from(types).sort();
  }, [dbData]);

  const uniqueSoftComps = useMemo(() => {
    if (!dbData) return [];
    const comps = new Set();
    dbData.forEach(item => {
      if (item.softwareComponent) comps.add(item.softwareComponent);
    });
    return Array.from(comps).sort();
  }, [dbData]);

  // Clean Core States mappings
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

  // 1. Explorer Filtering Logic
  const filteredExplorerItems = useMemo(() => {
    if (!dbData) return [];
    setCurrentPage(1); // Reset page on filter changes
    
    return dbData.filter(item => {
      // State filter
      if (stateFilter !== 'all' && item.state !== stateFilter) return false;
      
      // Type filter
      if (typeFilter !== 'all' && item.objectType !== typeFilter) return false;

      // Software Component filter
      if (softCompFilter !== 'all' && item.softwareComponent !== softCompFilter) return false;
      
      // Keyword search (compares object name, successors, object type, component, software component, and release state)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = (item.tadirObjName || '').toLowerCase().includes(query);
        const matchesComp = (item.applicationComponent || '').toLowerCase().includes(query);
        const matchesSoftComp = (item.softwareComponent || '').toLowerCase().includes(query);
        const matchesType = (item.objectType || '').toLowerCase().includes(query);
        
        // Release State matching
        const stateLower = (item.state || '').toLowerCase();
        let matchesState = stateLower.includes(query);
        if (stateLower === 'released') {
          if ('level a'.includes(query) || 'released'.includes(query)) matchesState = true;
        } else if (stateLower === 'deprecated') {
          if ('level b'.includes(query) || 'level c'.includes(query) || 'deprecated'.includes(query) || 'classic api'.includes(query)) matchesState = true;
        } else if (stateLower === 'nottobereleased') {
          if ('level d'.includes(query) || 'not to be released'.includes(query) || 'blocked'.includes(query) || 'internal'.includes(query)) matchesState = true;
        }
        
        let matchesSuccessor = false;
        if (item.successors && item.successors.length > 0) {
          matchesSuccessor = item.successors.some(succ => 
            (succ.tadirObjName || '').toLowerCase().includes(query)
          );
        }
        
        if (!matchesName && !matchesComp && !matchesSoftComp && !matchesType && !matchesState && !matchesSuccessor) return false;
      }
      
      return true;
    });
  }, [dbData, searchQuery, stateFilter, typeFilter, softCompFilter]);

  // Pagination slice
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredExplorerItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredExplorerItems, currentPage]);

  const totalPages = Math.ceil(filteredExplorerItems.length / itemsPerPage) || 1;

  // 2. Custom Code Compliance Analyzer Logic with ATC Raw Log Parser
  const runCodeAnalysis = (overrideCode, overrideIsRaw) => {
    if (!dbData) return;
    const targetCode = typeof overrideCode === 'string' ? overrideCode : inputCode;
    const targetIsRaw = typeof overrideIsRaw === 'boolean' ? overrideIsRaw : isRawLogMode;
    
    if (!targetCode.trim()) {
      alert('Please paste some object names or raw ATC logs to analyze.');
      return;
    }
    
    setSimFixPercent(0); // Reset simulation slider on new scan
    
    let objectsToScan = [];
    if (targetIsRaw) {
      // Blacklist for common uppercase words in ATC logs to avoid false positives
      const blacklist = new Set([
        'CLAS', 'TABL', 'BDEF', 'INTF', 'PROG', 'VIEW', 'TTYP', 'DTEL', 'DOMA', 'FUNC', 
        'FUGR', 'MSAG', 'AUTH', 'SUSO', 'STRU', 'TYPE', 'DATA', 'TRUE', 'FALSE', 'NULL', 
        'OBJECT', 'NAME', 'COMP', 'WARN', 'ERROR', 'INFO', 'CHECK', 'TEST', 'USAGE', 'API', 
        'RESTRICTED', 'CLASSICAPI', 'RELEASED', 'DEPRECATED', 'NOTTOBERELEASED', 'STATUS',
        'SYSTEM', 'DEVELOPMENT', 'SAP', 'CODE', 'CUSTOM', 'LINE', 'MESSAGE', 'FINDING'
      ]);
      // Regex captures uppercase symbols, supporting namespaces like /AIF/
      const regex = /\b\/?([A-Z0-9]{2,10}\/)?[A-Z][A-Z0-9_]{3,39}\b/g;
      const parsedSet = new Set();
      let match;
      while ((match = regex.exec(targetCode)) !== null) {
        const word = match[0].toUpperCase();
        // Strip leading slash if it's not a standard namespace (e.g. /AIF/)
        const cleanWord = word.startsWith('/') && word.indexOf('/', 1) === -1 ? word.substring(1) : word;
        if (!blacklist.has(cleanWord) && isNaN(cleanWord)) {
          parsedSet.add(cleanWord);
        }
      }
      objectsToScan = Array.from(parsedSet);
    } else {
      const lines = targetCode.split(/[\n,\s]+/);
      objectsToScan = Array.from(
        new Set(
          lines
            .map(line => line.trim().toUpperCase())
            .filter(line => line !== '')
        )
      );
    }
    
    if (objectsToScan.length === 0) {
      alert('No valid SAP objects could be extracted. Check your log format or toggle Raw ATC Log mode.');
      return;
    }
    
    // Create database lookup map for instant searching
    const dbMap = {};
    dbData.forEach(item => {
      dbMap[item.tadirObjName.toUpperCase()] = item;
    });
    
    let compliantCount = 0;
    let warningCount = 0;
    let blockedCount = 0;
    let unknownCount = 0;
    const detailsList = [];
    
    objectsToScan.forEach(objName => {
      const dbMatch = dbMap[objName];
      
      if (dbMatch) {
        if (dbMatch.state === 'released') {
          compliantCount++;
        } else if (dbMatch.state === 'deprecated') {
          warningCount++;
        } else if (dbMatch.state === 'notToBeReleased') {
          blockedCount++;
        }
        detailsList.push({
          name: objName,
          found: true,
          type: dbMatch.objectType,
          component: dbMatch.applicationComponent,
          softwareComponent: dbMatch.softwareComponent,
          state: dbMatch.state,
          successors: dbMatch.successors || []
        });
      } else {
        // Unknown or custom object
        unknownCount++;
        detailsList.push({
          name: objName,
          found: false,
          state: 'unknown',
          type: 'CUSTOM',
          component: '-',
          softwareComponent: '-',
          successors: []
        });
      }
    });
    
    const scannedTotal = objectsToScan.length;
    const matchedTotal = scannedTotal - unknownCount;
    const score = matchedTotal ? Math.round((compliantCount / matchedTotal) * 100) : 100;
    
    setAnalysisResult({
      scannedTotal,
      matchedTotal,
      compliantCount,
      warningCount,
      blockedCount,
      unknownCount,
      score,
      details: detailsList
    });
  };

  // 3. Score Simulator & Project Effort Estimator Memo Block
  const simulationMetrics = useMemo(() => {
    if (!analysisResult) return null;
    
    const { details, compliantCount, warningCount, blockedCount, matchedTotal, score } = analysisResult;
    
    // Remediation effort definitions (developer-hours per violation)
    const EFFORT_HOURS = {
      released: 0,
      deprecated: 6,       // Medium: Classic API mapping
      notToBeReleased: 16, // High: Obsolete/modification redesign
      unknown: 0           // Namespace custom code
    };
    
    const baseEffort = details.reduce((sum, item) => sum + (EFFORT_HOURS[item.state] || 0), 0);
    
    if (simFixPercent === 0 || matchedTotal === 0) {
      return {
        score,
        simScore: score,
        totalEffort: baseEffort,
        simEffort: baseEffort,
        detailsList: details.map(item => ({ ...item, simState: item.state })),
        fixedCount: 0,
        totalViolationsCount: matchedTotal - compliantCount
      };
    }
    
    // Gather all violations and sort by effort (easiest/lowest effort first)
    const violations = details
      .filter(item => item.found && item.state !== 'released')
      .map(item => ({ ...item, effort: EFFORT_HOURS[item.state] }))
      .sort((a, b) => a.effort - b.effort);
      
    const totalViolationsCount = violations.length;
    const itemsToFixCount = Math.round((simFixPercent / 100) * totalViolationsCount);
    
    // Create a set of fixed names
    const fixedNames = new Set(
      violations.slice(0, itemsToFixCount).map(v => v.name)
    );
    
    let simCompliant = compliantCount;
    let simWarning = warningCount;
    let simBlocked = blockedCount;
    
    const simDetails = details.map(item => {
      let simState = item.state;
      if (fixedNames.has(item.name)) {
        simState = 'released'; // Simulated as compliant
        simCompliant++;
        if (item.state === 'deprecated') simWarning--;
        if (item.state === 'notToBeReleased') simBlocked--;
      }
      return {
        ...item,
        simState
      };
    });
    
    const simScore = Math.round((simCompliant / matchedTotal) * 100);
    const simEffort = simDetails.reduce((sum, item) => sum + (EFFORT_HOURS[item.simState] || 0), 0);
    
    return {
      score,
      simScore,
      totalEffort: baseEffort,
      simEffort,
      detailsList: simDetails,
      fixedCount: itemsToFixCount,
      totalViolationsCount
    };
  }, [analysisResult, simFixPercent]);

  // Export report to Excel-compliant CSV file
  const exportToCSV = () => {
    if (!simulationMetrics) return;
    const headers = ['Type', 'Object Name', 'Release Status', 'Software Component', 'Application Component', 'Complexity', 'Estimated Effort (Hours)', 'Successors'];
    const rows = simulationMetrics.detailsList.map(item => [
      item.found ? item.type : 'CUSTOM',
      item.name,
      getAnalyzerStateLabel(item.simState),
      item.softwareComponent || '-',
      item.component || '-',
      item.simState === 'released' ? 'None' : item.simState === 'deprecated' ? 'Medium' : item.simState === 'notToBeReleased' ? 'High' : 'None',
      item.simState === 'released' ? 0 : item.simState === 'deprecated' ? 6 : item.simState === 'notToBeReleased' ? 16 : 0,
      item.successors.map(s => `${s.objectType}:${s.tadirObjName}`).join('; ')
    ]);
    
    const csvRows = [headers.join(',')];
    rows.forEach(r => {
      csvRows.push(r.map(val => `"${val.replace(/"/g, '""')}"`).join(','));
    });
    
    // Add BOM for Microsoft Excel UTF-8 display compatibility
    const csvContent = "\uFEFF" + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `clean_core_remediation_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAnalyzerStateClass = (state) => {
    if (state === 'released') return 'badge-a';
    if (state === 'deprecated') return 'badge-c';
    if (state === 'notToBeReleased') return 'badge-d';
    return 'badge-m'; // unknown
  };

  const getAnalyzerStateLabel = (state) => {
    if (state === 'released') return 'Released API';
    if (state === 'deprecated') return 'Deprecated / Classic API';
    if (state === 'notToBeReleased') return 'Internal / Blocked';
    return 'Custom / Non-Standard';
  };

  const isAnyExplorerFilterActive = searchQuery !== '' || stateFilter !== 'all' || typeFilter !== 'all' || softCompFilter !== 'all';

  const resetExplorerFilters = () => {
    setSearchQuery('');
    setStateFilter('all');
    setTypeFilter('all');
    setSoftCompFilter('all');
  };

  return (
    <div className="repo-viewer-layout">
      {/* Sub Tabs */}
      <div className="repo-subtabs flex">
        <button 
          className={`repo-subtab ${subTab === 'explorer' ? 'active' : ''}`}
          onClick={() => setSubTab('explorer')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          Cloudification Repository Search
        </button>
        <button 
          className={`repo-subtab ${subTab === 'analyzer' ? 'active' : ''}`}
          onClick={() => setSubTab('analyzer')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          Custom Code Compliance Scanner
        </button>
      </div>

      {loading ? (
        <div className="loading-state glass flex align-center">
          <div className="spinner"></div>
          <div>
            <h3>Loading Cloudification Database...</h3>
            <p>Scanning 34,000+ released APIs, structures, and classes. This only takes a moment.</p>
          </div>
        </div>
      ) : loadError ? (
        <div className="error-state glass">
          <h3>Database Load Error</h3>
          <p>{loadError}</p>
        </div>
      ) : (
        <>
          {/* 1. EXPLORER TAB */}
          {subTab === 'explorer' && (
            <div className="explorer-tab-content">
              {/* Analytics Dashboard */}
              <RepoAnalytics
                items={dbData}
                activeStateFilter={stateFilter}
                setActiveStateFilter={setStateFilter}
                activeTypeFilter={typeFilter}
                setActiveTypeFilter={setTypeFilter}
                activeSoftCompFilter={softCompFilter}
                setActiveSoftCompFilter={setSoftCompFilter}
              />

              {/* Explorer Controls */}
              <div className="controls-card glass">
                <div className="search-row">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                  </svg>
                  <input 
                    type="text" 
                    placeholder="Search object name, type (e.g. CLAS, TABL), component, software component, or release state..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  {searchQuery && (
                    <button className="clear-search-btn" onClick={() => setSearchQuery('')}>&times;</button>
                  )}
                </div>

                <div className="filters-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
                  <div className="filter-select-group">
                    <label>Release State:</label>
                    <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                      <option value="all">All States</option>
                      <option value="released">Released (Level A)</option>
                      <option value="deprecated">Deprecated / Classic API (Level B/C)</option>
                      <option value="notToBeReleased">Not to be Released (Level D)</option>
                    </select>
                  </div>
                  
                  <div className="filter-select-group">
                    <label>Object Type:</label>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                      <option value="all">All Types</option>
                      {uniqueTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-select-group">
                    <label>Software Component:</label>
                    <select value={softCompFilter} onChange={(e) => setSoftCompFilter(e.target.value)}>
                      <option value="all">All Software Components</option>
                      {uniqueSoftComps.map(sc => (
                        <option key={sc} value={sc}>{sc}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex align-center justify-between" style={{ gridColumn: '1 / -1', marginTop: '4px', gap: '12px' }}>
                    <div className="database-sync-info flex align-center">
                      <span className="sync-chip">Database Cache Active</span>
                      <span className="sync-count">
                        Showing {filteredExplorerItems.length.toLocaleString()} of {dbData.length.toLocaleString()} entries
                      </span>
                    </div>

                    {isAnyExplorerFilterActive && (
                      <button className="reset-all-btn flex align-center" onClick={resetExplorerFilters}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                        </svg>
                        Clear Explorer Filters
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="table-card glass">
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Object Name</th>
                        <th>Release State</th>
                        <th>Software Component</th>
                        <th>Application Component</th>
                        <th>Recommended Successor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItems.length > 0 ? (
                        paginatedItems.map((item, idx) => (
                          <tr key={`${item.tadirObjName}-${idx}`}>
                            <td><span className="type-badge">{item.objectType}</span></td>
                            <td className="object-name font-mono">{item.tadirObjName}</td>
                            <td>
                              <span className="state-badge" style={{ 
                                backgroundColor: `rgba(${item.state === 'released' ? '16,185,129' : item.state === 'deprecated' ? '245,158,11' : '239,68,68'}, 0.12)`,
                                color: stateColors[item.state]
                              }}>
                                {stateLabels[item.state] || item.state}
                              </span>
                            </td>
                            <td>
                              <span className="softcomp-badge" style={{ 
                                padding: '2px 8px', 
                                background: 'rgba(59, 130, 246, 0.08)', 
                                border: '1px solid rgba(59, 130, 246, 0.2)', 
                                borderRadius: '4px',
                                color: 'var(--b)',
                                fontSize: '11px',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: '600'
                              }}>
                                {item.softwareComponent || '-'}
                              </span>
                            </td>
                            <td><span className="comp-badge">{item.applicationComponent || '-'}</span></td>
                             <td className="successor-column">
                              {item.successors && item.successors.length > 0 ? (
                                item.successors.map((succ, sIdx) => (
                                  <div key={sIdx} className="successor-item">
                                    <span className="succ-type">{succ.objectType}</span>
                                    <span className="succ-name font-mono clickable" onClick={() => handleSuccessorClick(succ.tadirObjName)}>
                                      {succ.tadirObjName}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <span className="no-successor">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="table-empty">
                            No objects match your search criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                <div className="table-footer flex justify-between align-center">
                  <div className="table-meta">
                    Showing <b>{Math.min(filteredExplorerItems.length, (currentPage - 1) * itemsPerPage + 1)}</b> to <b>{Math.min(filteredExplorerItems.length, currentPage * itemsPerPage)}</b> of <b>{filteredExplorerItems.length}</b> matches
                  </div>
                  <div className="pagination-controls flex">
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="page-btn"
                    >
                      Previous
                    </button>
                    <span className="page-indicator">Page {currentPage} of {totalPages}</span>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="page-btn"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* 2. ANALYZER TAB */}
          {subTab === 'analyzer' && (
            <div className="analyzer-tab-content">
              {/* Paste Textbox */}
              <div className="scanner-input-card glass">
                <div className="chart-header flex justify-between align-center">
                  <div>
                    <h4>Custom Code Object Analyzer</h4>
                    <p className="subtitle">Paste standard objects list or paste the raw ABAP Test Cockpit (ATC) console check output.</p>
                  </div>
                  <div className="log-toggle-group flex align-center">
                    <span className="toggle-label font-mono">Log Parser:</span>
                    <button 
                      className={`toggle-btn ${isRawLogMode ? 'on' : 'off'}`}
                      onClick={() => setIsRawLogMode(!isRawLogMode)}
                    >
                      {isRawLogMode ? 'Raw ATC Log Mode' : 'Direct Object List'}
                    </button>
                  </div>
                </div>

                <div className="test-examples flex align-center" style={{ gap: '10px', padding: '0 0 16px 0', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
                  <span className="example-label font-mono" style={{ fontSize: '11px', color: 'var(--muted)' }}>Sample Inputs:</span>
                  <button 
                    className="reset-all-btn" 
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                    onClick={() => {
                      const code = `ATC Check: Usage of Released APIs (Cloudification Repository)\n--------------------------------------------------------------------------------\nObject: CLAS ZCL_SALES_REMEDIATION (Source: ZCL_SALES_REMEDIATION======CP)\nFinding: Usage of non-released class CL_ABAP_CHAR_UTILITIES (Level: Deprecated)\nFinding: Usage of released interface IF_XCO_NEWS (Level: Released)\nFinding: Usage of non-released function FM BAPI_USER_GET_DETAIL (Level: Deprecated)\nFinding: SELECT from non-released table KNA1 (Level: Deprecated)\nFinding: Usage of released CDS view I_Product (Level: Released)`;
                      setIsRawLogMode(true);
                      setInputCode(code);
                      runCodeAnalysis(code, true);
                    }}
                  >
                    ATC Log (Mixed Compliance)
                  </button>
                  <button 
                    className="reset-all-btn" 
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                    onClick={() => {
                      const code = `ABAP Test Cockpit - Results Report - 14.06.2026\n--------------------------------------------------------------------------------\nCheck Variant: ABAP_CLEAN_CORE_DEVELOPMENT\nSystem: DEV - Client: 100\n\n1. ZPG_LEGACY_REPORTS (PROG) - Line 140\n   Critical: Usage of restricted database access on standard table MARA (Level: Deprecated)\n2. ZCL_CUSTOMER_SYNC (CLAS) - Line 45\n   Critical: Call of non-released function module SUBST_GET_FILE_LIST (Level: notToBeReleased)\n3. ZCL_CUSTOMER_SYNC (CLAS) - Line 72\n   Warning: Usage of classic API BAPI_CUSTOMER_GETDETAIL2 (Level: Deprecated)\n4. ZIF_VENDOR_DATA (INTF) - Line 12\n   Info: Released API CL_ABAP_HMAC_SHA256 is fully cloud ready (Level: Released)`;
                      setIsRawLogMode(true);
                      setInputCode(code);
                      runCodeAnalysis(code, true);
                    }}
                  >
                    ATC Log (Legacy Migration)
                  </button>
                  <button 
                    className="reset-all-btn" 
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                    onClick={() => {
                      const code = `ATC Check: ABAP Clean Core Integration & Extensibility Check\n--------------------------------------------------------------------------------\nObject: CLAS ZCL_SD_BILLING_EXT (Source: ZCL_SD_BILLING_EXT=========CP)\nFinding: Usage of deprecated classic table VBAP (Level: Deprecated) -> Use released CDS view I_SalesDocumentItem\nFinding: Usage of non-released FM SD_SALES_DOCUMENT_READ (Level: Deprecated) -> Use SD_SALESDOCUMENT_READ (Released)\nFinding: Usage of released API CL_ABAP_CONTAINER_UTILITIES (Level: Released)\nFinding: Modification check fails on standard structure VBRK (Level: notToBeReleased)\nFinding: Call of released class CL_SD_DOC_FLOW (Level: Released)`;
                      setIsRawLogMode(true);
                      setInputCode(code);
                      runCodeAnalysis(code, true);
                    }}
                  >
                    ATC Log (Sales & Billing)
                  </button>
                  <button 
                    className="reset-all-btn" 
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                    onClick={() => {
                      const code = `ABAP Test Cockpit Findings Report - Finance Custom Objects Scan\n--------------------------------------------------------------------------------\n1. ZCL_FIN_GL_POSTING (CLAS) - Line 89\n   Critical: Direct database update on standard table BSEG (Level: notToBeReleased) -> Use Journal Entry API (Released)\n2. ZCL_FIN_GL_POSTING (CLAS) - Line 142\n   Warning: Usage of obsolete BAPI_ACC_DOCUMENT_POST (Level: Deprecated) -> Use Released Successor API\n3. ZIF_FIN_TAX_CALC (INTF) - Line 24\n   Info: Released interface IF_BADI_TAX_CALCULATION is fully compliant (Level: Released)\n4. ZCDS_FIN_TAX_VIEW (DDLS) - Line 5\n   Critical: SELECT from non-released database view BSTAT (Level: Deprecated)`;
                      setIsRawLogMode(true);
                      setInputCode(code);
                      runCodeAnalysis(code, true);
                    }}
                  >
                    ATC Log (Financials Clean Core)
                  </button>
                  <button 
                    className="reset-all-btn" 
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                    onClick={() => {
                      const code = `CL_ABAP_CHAR_UTILITIES\nBAPI_USER_GET_DETAIL\nI_PRODUCT\nMARA\nKNA1\nSUBST_GET_FILE_LIST\nCL_ABAP_HMAC_SHA256`;
                      setIsRawLogMode(false);
                      setInputCode(code);
                      runCodeAnalysis(code, false);
                    }}
                  >
                    Object List
                  </button>
                </div>
                
                <textarea
                  className="code-textarea"
                  placeholder={isRawLogMode ? 
                    "Paste raw ATC logs here (e.g. Object: CLAS CL_ABAP_CHAR_UTILITIES - Usage of API is restricted...) and we will extract the standard objects automatically." :
                    "Paste standard object names here, one per line. For example:\nCL_ABAP_CHAR_UTILITIES\nBAPI_USER_GET_DETAIL\nI_PROCUREMENTPROJECTTP\nSUBST_GET_FILE_LIST"
                  }
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  rows="6"
                />
                
                <div className="analyzer-actions flex justify-between align-center">
                  <span className="pasted-info">
                    {inputCode.trim() ? `${inputCode.split(/[\n,\s]+/).filter(Boolean).length} words detected` : 'No text pasted'}
                  </span>
                  <button className="scan-btn" onClick={runCodeAnalysis}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    Extract & Scan Objects
                  </button>
                </div>
              </div>

              {/* Analyzer Results */}
              {analysisResult && simulationMetrics && (
                <div className="analyzer-results-section">
                  {/* Results Dashboard */}
                  <div className="stats-grid">
                    {/* Simulated Score Card */}
                    <div className="stat-card glass flex align-center">
                      <div className="circular-progress" style={{ 
                        '--pct': simulationMetrics.simScore, 
                        '--color': simulationMetrics.simScore > 80 ? 'var(--a)' : simulationMetrics.simScore > 50 ? 'var(--c)' : 'var(--d)'
                      }}>
                        <div className="inner-val">{simulationMetrics.simScore}%</div>
                      </div>
                      <div className="stat-meta">
                        <h3>Clean Core Compliance</h3>
                        <p>Standard objects release compliance</p>
                        <span className="badge-info">
                          {analysisResult.score !== simulationMetrics.simScore && `Base: ${analysisResult.score}% | `}
                          {simulationMetrics.simScore}% Released
                        </span>
                      </div>
                    </div>

                    {/* Estimated Effort Card */}
                    <div className="stat-card glass flex align-center">
                      <div className="circular-progress" style={{ 
                        '--pct': simulationMetrics.totalEffort ? Math.round((simulationMetrics.simEffort / simulationMetrics.totalEffort) * 100) : 0, 
                        '--color': 'var(--gold)' 
                      }}>
                        <div className="inner-val">{simulationMetrics.simEffort}h</div>
                      </div>
                      <div className="stat-meta">
                        <h3>Remediation Effort</h3>
                        <p>Estimated developer hours</p>
                        <span className="badge-info">
                          {simulationMetrics.simEffort} hrs (~{Math.round((simulationMetrics.simEffort / 8) * 10) / 10} dev-days)
                        </span>
                      </div>
                    </div>

                    <div className="stat-card glass flex align-center">
                      <div className="circular-progress" style={{ '--pct': Math.round((simulationMetrics.detailsList.filter(i => i.simState === 'deprecated').length / (analysisResult.matchedTotal || 1)) * 100), '--color': 'var(--c)' }}>
                        <div className="inner-val">{simulationMetrics.detailsList.filter(i => i.simState === 'deprecated').length}</div>
                      </div>
                      <div className="stat-meta">
                        <h3>Classic & Deprecated</h3>
                        <p>Needs Tier 2 Wrapper</p>
                        <span className="badge-info">Medium complexity fixes</span>
                      </div>
                    </div>

                    <div className="stat-card glass flex align-center">
                      <div className="circular-progress" style={{ '--pct': Math.round((simulationMetrics.detailsList.filter(i => i.simState === 'notToBeReleased').length / (analysisResult.matchedTotal || 1)) * 100), '--color': 'var(--d)' }}>
                        <div className="inner-val">{simulationMetrics.detailsList.filter(i => i.simState === 'notToBeReleased').length}</div>
                      </div>
                      <div className="stat-meta">
                        <h3>Blocked / Internal</h3>
                        <p>Fails Clean Core Checks</p>
                        <span className="badge-info">High complexity fixes</span>
                      </div>
                    </div>
                  </div>

                  {/* Simulator & Exporter Card */}
                  <div className="simulator-card glass flex justify-between align-center">
                    <div className="simulator-slider-group">
                      <div className="slider-header flex justify-between align-center">
                        <span className="slider-label flex align-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', color: 'var(--b)' }}>
                            <polygon points="12 2 2 7 12 12 22 7 12 2 17 22 17"/>
                          </svg>
                          Remediation Simulator:
                        </span>
                        <span className="slider-value font-mono">
                          Resolve <b>{simFixPercent}%</b> of violations ({simulationMetrics.fixedCount} / {simulationMetrics.totalViolationsCount})
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={simFixPercent} 
                        onChange={(e) => setSimFixPercent(parseInt(e.target.value))}
                        className="sim-slider"
                      />
                      <p className="slider-desc">
                        Simulate fixing the easiest violations first (low effort direct replacements) to see how it impacts your score and workload.
                      </p>
                    </div>

                    <div className="exporter-actions">
                      <button className="export-btn flex align-center" onClick={exportToCSV}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                        Export CSV Report
                      </button>
                    </div>
                  </div>

                  {/* Scanned Items list */}
                  <div className="table-card glass" style={{ marginTop: '0px' }}>
                    <div className="chart-header flex justify-between align-center" style={{ padding: '20px 20px 0' }}>
                      <div>
                        <h4>Scanned Objects Report</h4>
                        <p className="subtitle">Breakdown of scanned objects, compliance status, and successor recommendations.</p>
                      </div>
                      {simulationMetrics.fixedCount > 0 && (
                        <span className="sim-chip pulse-gold">Simulation Active</span>
                      )}
                    </div>

                    <div className="table-responsive">
                      <table>
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Object Name</th>
                            <th>Release State</th>
                            <th>Software Component</th>
                            <th>Application Component</th>
                            <th>Recommended Successor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {simulationMetrics.detailsList.map((item, idx) => (
                            <tr key={`${item.name}-${idx}`} className={item.state !== item.simState ? 'simulated-row' : ''}>
                              <td>
                                {item.found ? (
                                  <span className="type-badge">{item.type}</span>
                                ) : (
                                  <span className="type-badge custom">CUSTOM</span>
                                )}
                              </td>
                              <td className="object-name font-mono">{item.name}</td>
                              <td>
                                <span className={`state-badge ${getAnalyzerStateClass(item.simState)}`}>
                                  {getAnalyzerStateLabel(item.simState)}
                                  {item.state !== item.simState && ' (Simulated)'}
                                </span>
                              </td>
                              <td>
                                <span className="softcomp-badge" style={{ 
                                  padding: '2px 8px', 
                                  background: 'rgba(59, 130, 246, 0.08)', 
                                  border: '1px solid rgba(59, 130, 246, 0.2)', 
                                  borderRadius: '4px',
                                  color: 'var(--b)',
                                  fontSize: '11px',
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: '600'
                                }}>
                                  {item.softwareComponent || '-'}
                                </span>
                              </td>
                              <td><span className="comp-badge">{item.component || '-'}</span></td>
                              <td className="successor-column">
                                {item.successors && item.successors.length > 0 ? (
                                  item.successors.map((succ, sIdx) => (
                                    <div key={sIdx} className="successor-item">
                                      <span className="succ-type">{succ.objectType}</span>
                                      <span className="succ-name font-mono clickable" onClick={() => handleSuccessorClick(succ.tadirObjName)}>
                                        {succ.tadirObjName}
                                      </span>
                                    </div>
                                  ))
                                ) : item.simState === 'released' ? (
                                  <span className="released-path">Clean Core Compliant ✓</span>
                                ) : item.state === 'unknown' ? (
                                  <span className="no-successor">Customer Custom Namespace (No Scan Required)</span>
                                ) : (
                                  <span className="no-successor">No released successor. Wrap in Tier 2.</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

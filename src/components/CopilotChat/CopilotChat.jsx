import React, { useState, useEffect, useRef } from 'react';
import './CopilotChat.css';
import cleanCoreData from '../../assets/data/cleanCorePatterns.json';

// Local vocabulary/dictionary of Clean Core terms
const TERMINOLOGY_DICT = {
  'clean core': {
    title: 'Clean Core Concept',
    description: 'Clean Core is an SAP architectural strategy to keep the core system untouched by custom developments and modifications. By isolating custom code using released APIs and key user tools, upgrades become effortless, faster, and cloud-compliant.',
    moreInfo: 'This tool helps you analyze standard SAP note guidelines and standard objects to achieve a Clean Core.'
  },
  'level a': {
    title: 'Clean Core Level A - Cloud Ready',
    description: 'Level A represents standard SAP APIs (classes, structures, CDS views, etc.) that are officially released for custom code development and are fully cloud-ready. They are the only APIs allowed in strict S/4HANA Cloud Public (Developer Extensibility).',
    moreInfo: 'Remediation effort: 0 hours.'
  },
  'level b': {
    title: 'Clean Core Level B - Classic API',
    description: 'Level B represents classic SAP standard objects that are upgrade-stable but not officially released for cloud extensibility. They are permitted in Private Cloud or On-Premise S/4HANA systems, but must be avoided in Public Cloud.',
    moreInfo: 'Remediation effort: 6 developer hours.'
  },
  'level c': {
    title: 'Clean Core Level C - Internal API',
    description: 'Level C represents SAP internal APIs that are stable but not released. S/4HANA guidelines state you must wrap these standard APIs inside a custom released wrapper (Tier 2 Extensibility) to insulate your extensions from changes during upgrades.',
    moreInfo: 'Remediation effort: 6 developer hours.'
  },
  'level d': {
    title: 'Clean Core Level D - Obsolete / Blocked',
    description: 'Level D represents obsolete, deprecated, or strictly internal SAP objects. Calling them fails Clean Core checks. They must be avoided and completely redesigned using released successor APIs.',
    moreInfo: 'Remediation effort: 16 developer hours (2 dev-days).'
  },
  'atc': {
    title: 'ABAP Test Cockpit (ATC)',
    description: 'ATC is SAP\'s central tool for static code analysis. In a Clean Core project, custom check variants (such as ABAP_CLEAN_CORE_DEVELOPMENT) are executed to identify custom code calls to non-released APIs, direct database writes to standard tables, and other architecture violations.',
    moreInfo: 'You can paste raw ATC logs directly into our Custom Code Scanner in the Repository tab to calculate compliance scores.'
  },
  'tier 2': {
    title: 'Tier 2 Extensibility (Custom Wrappers)',
    description: 'Tier 2 is a mitigation layer in S/4HANA extensibility. When a required standard SAP API is not released (Level C), developers wrap it in a custom API (Z/Y class) in the Classic/Tier 3 environment. This wrapper is then released for use by Tier 1 Developer Extensibility, shielding custom apps from standard API changes.',
    moreInfo: 'This keeps the custom developments in Tier 1 clean core compliant.'
  },
  'remediation complexity': {
    title: 'Remediation Complexity & Effort',
    description: 'The difficulty of making a custom code violation compliant: \n- Low: Simple replacement with a released successor (0-2 hours).\n- Medium: Wrapping a classic stable API (Level B/C) inside a Tier 2 Custom Wrapper (6 hours).\n- High: Replacing direct database writes or blocked standard APIs, requiring architectural redesign (16 hours).',
    moreInfo: 'Our scanner utilizes these standard hours to estimate project remediation timelines.'
  }
};

export default function CopilotChat({ onNavigate, onSearchFinder, onSearchRepo }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hello! I am your **Clean Core Copilot**. I run 100% locally on your machine with zero cloud APIs.\n\nAsk me anything about Clean Core terminology (e.g. *'What is Level C?'*), search for an extensibility pattern (e.g. *'Application Jobs'*), or verify standard SAP objects (e.g. *'Is MARA cloud ready?'*).",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRich: true
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [repoDb, setRepoDb] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Load Cloudification database on-demand
  const loadDatabase = async () => {
    if (repoDb) return repoDb;
    setDbLoading(true);
    try {
      const module = await import('../../assets/data/objectReleaseInfoLatest.json');
      const data = module.default.objectReleaseInfo || [];
      // Create lookup map
      const lookupMap = {};
      data.forEach(item => {
        lookupMap[item.tadirObjName.toUpperCase()] = item;
      });
      setRepoDb(lookupMap);
      setDbLoading(false);
      return lookupMap;
    } catch (err) {
      console.error("Failed to load Cloudification DB inside Copilot:", err);
      setDbLoading(false);
      return null;
    }
  };

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    if (!textToSend) {
      setInputValue('');
    }

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text, time }]);
    
    // Show typing status
    setIsTyping(true);

    // Simulate thinking delay (feels more natural)
    setTimeout(async () => {
      const response = await processQuery(text);
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: response.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRich: true,
        actions: response.actions || []
      }]);
      setIsTyping(false);
    }, 450);
  };

  const processQuery = async (query) => {
    const clean = query.toLowerCase().trim();
    
    // 1. Terminology Search
    for (const [key, term] of Object.entries(TERMINOLOGY_DICT)) {
      if (clean.includes(key) || key.includes(clean)) {
        return {
          text: `### ${term.title}\n\n${term.description}\n\n*${term.moreInfo}*`
        };
      }
    }

    // 2. Extract standard SAP object tokens (words in caps, length >= 3, e.g. MARA, VBAK, CL_ABAP_*)
    const sapObjectRegex = /\b\/?([A-Z0-9]{2,10}\/)?[A-Z][A-Z0-9_]{3,30}\b/g;
    const uppercaseTokens = query.match(sapObjectRegex) || [];
    const standardObjects = uppercaseTokens.map(t => t.toUpperCase()).filter(t => {
      // Ignore some common false positive words
      const blacklist = ['CLAS', 'TABL', 'BDEF', 'INTF', 'PROG', 'VIEW', 'TTYP', 'DTEL', 'DOMA', 'FUNC', 'FUGR', 'SAP', 'ATC', 'API', 'MARA', 'KNA1', 'VBAK'];
      // Keep MARA, KNA1, VBAK explicitly even if they are in standard queries
      if (['MARA', 'KNA1', 'VBAK', 'VBAP', 'BSEG', 'BKPF', 'VBRK'].includes(t)) return true;
      return !blacklist.includes(t);
    });

    if (standardObjects.length > 0) {
      const objName = standardObjects[0]; // Take first detected standard object
      
      // Load database dynamically
      const db = await loadDatabase();
      if (db) {
        const item = db[objName];
        if (item) {
          const stateLabels = {
            released: 'Released (Level A - Compliant ✓)',
            deprecated: 'Deprecated / Classic API (Level B/C)',
            notToBeReleased: 'Not to be Released (Level D - Non-Compliant ✗)'
          };
          const stateColors = {
            released: '#10B981',
            deprecated: '#F59E0B',
            notToBeReleased: '#EF4444'
          };
          
          let responseText = `I found **${objName}** in the SAP Cloudification Repository database:\n\n` +
            `- **Object Type**: \`${item.objectType}\`\n` +
            `- **Software Component**: \`${item.applicationComponent || 'N/A'}\`\n` +
            `- **Release State**: <span style="color: ${stateColors[item.state]} font-weight: bold;">${stateLabels[item.state] || item.state}</span>\n\n`;
          
          if (item.state === 'released') {
            responseText += `✓ **Clean Core Compliance**: Fully compliant for developer extensibility. No remediation needed.`;
          } else if (item.state === 'deprecated') {
            responseText += `⚠ **Clean Core Compliance**: This is a classic API. Safe for S/4HANA Private Cloud, but forbidden in Public Cloud. Wrap inside a **Tier 2 Custom Wrapper** if needed.`;
          } else {
            responseText += `✗ **Clean Core Compliance**: Strictly forbidden in Clean Core projects. Must be replaced immediately.`;
          }

          if (item.successors && item.successors.length > 0) {
            responseText += `\n\n**Recommended Successor(s)**:\n` + 
              item.successors.map(s => `- \`${s.objectType}\` **${s.tadirObjName}**`).join('\n');
          } else if (item.state !== 'released') {
            responseText += `\n\nNo released successor exists in standard. Create a Tier 2 Custom Wrapper if this functionality is critical.`;
          }

          return {
            text: responseText,
            actions: [
              {
                label: `Search ${objName} in Repository Explorer`,
                onClick: () => {
                  onNavigate('repo');
                  onSearchRepo(objName);
                }
              }
            ]
          };
        }
      }
    }

    // 3. Search Note guidelines (patterns database)
    const patterns = [];
    const searchPatternList = (list, scopeName) => {
      list.forEach(p => {
        const nameMatches = p.name && p.name.toLowerCase().includes(clean);
        const catMatches = p.category && p.category.toLowerCase().includes(clean);
        const detailsMatches = p.details && p.details.toLowerCase().includes(clean);
        const compMatches = p.component && p.component.toLowerCase().includes(clean);
        const altMatches = p.alt && p.alt.toLowerCase().includes(clean);
        
        if (nameMatches || catMatches || detailsMatches || compMatches || altMatches) {
          patterns.push({ ...p, scope: scopeName });
        }
      });
    };

    searchPatternList(cleanCoreData.extensibility || [], 'Extensibility Patterns (Note 3578329)');
    searchPatternList(cleanCoreData.integration || [], 'Integration Protocols (Note 3690029)');

    if (patterns.length > 0) {
      // Return top 3 pattern matches
      const matches = patterns.slice(0, 3);
      let responseText = `I found **${patterns.length}** extensibility note patterns matching your query. Here are the top matches:\n\n`;
      
      matches.forEach((p, idx) => {
        responseText += `### ${idx + 1}. ${p.name}\n` +
          `- **Clean Core Level**: Level **${p.level}**\n` +
          `- **Component**: \`${p.component || 'N/A'}\`\n` +
          `- **Complexity**: \`${p.complexity || 'Low'}\` Remediation\n` +
          `- **Upgrade Stable / Cloud Ready**: ${p.upgrade} / ${p.cloud}\n`;
        
        if (p.alt && p.alt.trim() !== 'not applicable' && p.alt.trim() !== '') {
          responseText += `- **Successor**: *${p.alt}*\n`;
        }
        
        if (p.details) {
          responseText += `- **Technical Guidance**: ${p.details}\n`;
        }
        responseText += `\n`;
      });

      return {
        text: responseText,
        actions: [
          {
            label: `Search "${query}" in Pattern Finder`,
            onClick: () => {
              onNavigate('finder');
              onSearchFinder(query);
            }
          }
        ]
      };
    }

    // 4. Specific standalone table overrides (fallback if DB fails/not loaded)
    const knownTables = {
      'mara': 'Material Master standard table. Direct read is classic/deprecated; direct writes are blocked. Use successor CDS view \`I_Product\`.',
      'vbak': 'Sales Document Header standard table. Direct read is classic/deprecated. Use successor CDS view \`I_SalesDocument\`.',
      'vbap': 'Sales Document Item standard table. Direct read is classic/deprecated. Use successor CDS view \`I_SalesDocumentItem\`.',
      'kna1': 'Customer Master standard table. Direct read is classic/deprecated. Use successor CDS view \`I_Customer\`.',
      'bseg': 'Accounting Document Segment standard table. Direct writes are blocked (Level D). Use Journal Entry released APIs.',
      'bkpf': 'Accounting Document Header standard table. Direct reads are deprecated. Use successor CDS view \`I_JournalEntry\`.'
    };

    for (const [tName, desc] of Object.entries(knownTables)) {
      if (clean.includes(tName)) {
        return {
          text: `### Standard SAP Table: **${tName.toUpperCase()}**\n\n- ${desc}\n\nTo view complete release records, click the button below to switch to the Repository search.`,
          actions: [
            {
              label: `Search ${tName.toUpperCase()} in Repository`,
              onClick: () => {
                onNavigate('repo');
                onSearchRepo(tName.toUpperCase());
              }
            }
          ]
        };
      }
    }

    // 5. Default Fallback
    return {
      text: "I couldn't find a direct match for your question in the Clean Core Notes or standard release records.\n\nTry asking queries like:\n- **'What is Tier 2?'** (Explains architecture terminology)\n- **'Is MARA cloud ready?'** (Queries standard database)\n- **'BAPI_USER_GET_DETAIL'** (Extracts standard API successors)\n- **'Application Jobs'** (Filters extensibility patterns)"
    };
  };

  const suggestionChips = [
    "What is Clean Core?",
    "Explain Level C",
    "What is a Tier 2 Wrapper?",
    "Is MARA cloud ready?",
    "BAPI_USER_GET_DETAIL successor",
    "Tell me about Application Jobs"
  ];

  return (
    <div className="copilot-widget-container">
      {/* Floating Action Button */}
      <button 
        className={`copilot-bubble ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Copilot Chat"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="chat-bubble-icon">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="close-bubble-icon">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        {!isOpen && <span className="online-badge"></span>}
      </button>

      {/* Chat Panel */}
      <div className={`copilot-panel glass ${isOpen ? 'open' : ''}`}>
        {/* Panel Header */}
        <div className="panel-header flex justify-between align-center">
          <div className="header-meta flex align-center">
            <div className="bot-avatar flex align-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="10" rx="2"/>
                <circle cx="12" cy="5" r="2"/>
                <path d="M12 7v4M8 15h.01M16 15h.01"/>
              </svg>
            </div>
            <div>
              <h4>Clean Core Copilot</h4>
              <span className="status-label"><span className="dot"></span> Offline Engine Active</span>
            </div>
          </div>
          <button className="panel-close-btn" onClick={() => setIsOpen(false)}>&times;</button>
        </div>

        {/* Panel Messages Area */}
        <div className="panel-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-bubble-wrapper ${msg.sender}`}>
              <div className="message-bubble">
                {msg.isRich ? (
                  <div className="rich-text-content">
                    {/* Render markdown header markers, lists, colors manually */}
                    {msg.text.split('\n\n').map((paragraph, pIdx) => {
                      if (paragraph.startsWith('### ')) {
                        return <h5 key={pIdx}>{paragraph.replace('### ', '')}</h5>;
                      }
                      if (paragraph.startsWith('- ')) {
                        return (
                          <ul key={pIdx}>
                            {paragraph.split('\n').map((li, liIdx) => (
                              <li key={liIdx} dangerouslySetInnerHTML={{ 
                                __html: li.replace('- ', '')
                                  .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                                  .replace(/\`(.*?)\`/g, '<code class="chat-code">$1</code>')
                              }} />
                            ))}
                          </ul>
                        );
                      }
                      return (
                        <p key={pIdx} dangerouslySetInnerHTML={{ 
                          __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                            .replace(/\`(.*?)\`/g, '<code class="chat-code">$1</code>')
                            .replace(/\*(.*?)\*/g, '<i>$1</i>')
                            .replace(/\n/g, '<br/>')
                        }} />
                      );
                    })}
                  </div>
                ) : (
                  <p>{msg.text}</p>
                )}
                
                {/* Embedded Actions */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="message-actions flex">
                    {msg.actions.map((act, aIdx) => (
                      <button 
                        key={aIdx} 
                        className="chat-action-btn"
                        onClick={() => {
                          act.onClick();
                          setIsOpen(false); // Close chat panel to show result page
                        }}
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                )}
                
                <span className="message-time">{msg.time}</span>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="message-bubble-wrapper bot">
              <div className="message-bubble typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Panel Suggestions Area */}
        <div className="panel-suggestions flex">
          {suggestionChips.map((s, idx) => (
            <button 
              key={idx} 
              className="suggestion-chip"
              onClick={() => handleSend(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Panel Input Area */}
        <form 
          className="panel-input-form flex align-center" 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <input 
            type="text" 
            placeholder={dbLoading ? "Loading API database..." : "Ask about clean core guidelines, levels, tables..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={dbLoading}
            className="chat-input"
          />
          <button 
            type="submit" 
            className="chat-send-btn"
            disabled={!inputValue.trim() || dbLoading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

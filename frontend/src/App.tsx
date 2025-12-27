import { useState, useEffect } from 'react';
import './App.css';
import { Scene } from './components/viewer/Scene';
import { BuilderForm } from './components/editor/BuilderForm';
import { type HouseProject, DEFAULT_PROJECT } from './types/schema';

function App() {
  const [jsonInput, setJsonInput] = useState<string>(JSON.stringify(DEFAULT_PROJECT, null, 2));
  const [project, setProject] = useState<HouseProject>(DEFAULT_PROJECT);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'form' | 'json'>('form');

  // Validate and update project on input change (JSON Mode)
  useEffect(() => {
    try {
      const parsed = JSON.parse(jsonInput);
      // Basic validation for Modular Schema
      if (!parsed.modules || !Array.isArray(parsed.modules)) throw new Error("Missing 'modules' array");
      if (!parsed.global_dimensions) throw new Error("Missing 'global_dimensions' configuration");
      
      setProject(parsed);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [jsonInput]);

  // Handler for Form Updates (Syncs back to JSON string)
  const handleProjectUpdate = (newProject: HouseProject) => {
      setProject(newProject);
      setJsonInput(JSON.stringify(newProject, null, 2));
  };

  return (
    <div className="app-container">
      <div className="viewport">
        <Scene project={project} />
        <div className="info-overlay">
          <h1>XBJ Viewer V3.0 (Modular)</h1>
          <p>Full-Stack Ready</p>
          <button 
            onClick={() => setShowEditor(!showEditor)}
            style={{ marginTop: '10px', padding: '5px 10px', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            {showEditor ? 'Hide Editor →' : '← Show Editor'}
          </button>
        </div>
      </div>
      
      {showEditor && (
        <div className="editor-pane">
          <div className="editor-tabs">
              <button className={activeTab === 'form' ? 'active' : ''} onClick={() => setActiveTab('form')}>Builder Form</button>
              <button className={activeTab === 'json' ? 'active' : ''} onClick={() => setActiveTab('json')}>JSON Definition</button>
          </div>
          
          {activeTab === 'json' ? (
            <>
                <textarea 
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    spellCheck={false}
                    className={error ? 'error' : ''}
                />
                <div className="console">
                    {error ? (
                    <span style={{ color: '#ff5555' }}>❌ {error}</span>
                    ) : (
                    <span style={{ color: '#55ff55' }}>✅ System Ready</span>
                    )}
                </div>
            </>
          ) : (
            <div style={{ overflowY: 'auto', height: '100%' }}>
                <BuilderForm project={project} onUpdate={handleProjectUpdate} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
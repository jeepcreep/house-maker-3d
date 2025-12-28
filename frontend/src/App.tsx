import { useState, useEffect } from 'react';
import './App.css';
import { Scene } from './components/viewer/Scene';
import { BuilderForm } from './components/editor/BuilderForm';
import { SavedHouses } from './components/editor/SavedHouses';
import { HouseStorage, type SavedHouse } from './utils/storage';
import { type HouseProject, DEFAULT_PROJECT } from './types/schema';

function App() {
  const [jsonInput, setJsonInput] = useState<string>(JSON.stringify(DEFAULT_PROJECT, null, 2));
  const [project, setProject] = useState<HouseProject>(DEFAULT_PROJECT);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'form' | 'json' | 'saves'>('form');
  
  // State for Save System
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saves, setSaves] = useState<SavedHouse[]>([]);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [newSaveName, setNewSaveName] = useState<string>("");

  useEffect(() => {
      setSaves(HouseStorage.getAll());
  }, []);

  // Validate and update project on input change (JSON Mode)
  useEffect(() => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!parsed.modules || !Array.isArray(parsed.modules)) throw new Error("Missing 'modules' array");
      if (!parsed.global_dimensions) throw new Error("Missing 'global_dimensions' configuration");
      
      // Only update project if content actually changed (avoid loops)
      // Simple dirty check: Compare strings
      if (JSON.stringify(project) !== JSON.stringify(parsed)) {
          setProject(parsed);
          setIsDirty(true); 
      }
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [jsonInput]);

  // Handler for Form Updates
  const handleProjectUpdate = (newProject: HouseProject) => {
      setProject(newProject);
      setJsonInput(JSON.stringify(newProject, null, 2));
      setIsDirty(true);
  };

  // --- SAVE SYSTEM ---
  const handleSaveClick = () => {
      if (currentFileId) {
          // Overwrite existing
          const updatedSaves = HouseStorage.save(currentFileName || "Untitled", project, currentFileId);
          setSaves(updatedSaves);
          setIsDirty(false);
      } else {
          // New File -> Open Modal
          setNewSaveName("");
          setShowSaveModal(true);
      }
  };

  const confirmNewSave = () => {
      if (!newSaveName.trim()) return;
      const updatedSaves = HouseStorage.save(newSaveName, project);
      setSaves(updatedSaves);
      
      // Set as current
      const newFile = updatedSaves[updatedSaves.length - 1]; // Last added
      setCurrentFileId(newFile.id);
      setCurrentFileName(newFile.name);
      
      setIsDirty(false);
      setShowSaveModal(false);
  };

  const handleLoad = (save: SavedHouse) => {
      if (isDirty && !confirm("You have unsaved changes. Discard them?")) return;
      
      setProject(save.data);
      setJsonInput(JSON.stringify(save.data, null, 2));
      setCurrentFileId(save.id);
      setCurrentFileName(save.name);
      setIsDirty(false);
      setActiveTab('form'); // Switch back to builder
  };

  const handleDelete = (id: string) => {
      if (confirm("Delete this house?")) {
          const updated = HouseStorage.delete(id);
          setSaves(updated);
          if (currentFileId === id) {
              setCurrentFileId(null);
              setCurrentFileName(null);
              setIsDirty(true); // Treat as "New" now
          }
      }
  };

  return (
    <div className="app-container">
      <div className="viewport">
        <Scene project={project} />
        <div className="info-overlay">
          <h1>XBJ Viewer {currentFileName ? `- ${currentFileName}` : ''} {isDirty ? '*' : ''}</h1>
          <p>Full-Stack Ready</p>
          <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
            <button 
                onClick={() => setShowEditor(!showEditor)}
                style={{ padding: '5px 10px', fontSize: '0.8rem' }}
            >
                {showEditor ? 'Hide Editor' : 'Show Editor'}
            </button>
            <button 
                onClick={handleSaveClick}
                disabled={!isDirty}
                style={{ 
                    padding: '5px 10px', fontSize: '0.8rem', 
                    background: isDirty ? '#2e7d32' : '#444', 
                    color: isDirty ? 'white' : '#888',
                    cursor: isDirty ? 'pointer' : 'default'
                }}
            >
                Save
            </button>
          </div>
        </div>
      </div>
      
      {showSaveModal && (
          <div className="modal-overlay">
              <div className="modal">
                  <h3>Save New House</h3>
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Enter name..." 
                    value={newSaveName}
                    onChange={(e) => setNewSaveName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmNewSave()}
                  />
                  <div className="modal-buttons">
                      <button onClick={() => setShowSaveModal(false)}>Cancel</button>
                      <button className="primary" onClick={confirmNewSave}>Save</button>
                  </div>
              </div>
          </div>
      )}
      
      {showEditor && (
        <div className="editor-pane">
          <div className="editor-tabs">
              <button className={activeTab === 'form' ? 'active' : ''} onClick={() => setActiveTab('form')}>Builder</button>
              <button className={activeTab === 'saves' ? 'active' : ''} onClick={() => setActiveTab('saves')}>My Houses</button>
              <button className={activeTab === 'json' ? 'active' : ''} onClick={() => setActiveTab('json')}>JSON</button>
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
          ) : activeTab === 'saves' ? (
             <div style={{ overflowY: 'auto', height: '100%' }}>
                <SavedHouses saves={saves} onLoad={handleLoad} onDelete={handleDelete} />
             </div>
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
import { useState, useEffect } from 'react';
import './App.css';
import { Scene } from './components/viewer/Scene';
import { BuilderForm } from './components/editor/BuilderForm';
import { SavedHouses } from './components/editor/SavedHouses';
import { FacadeEditor } from './components/editor/FacadeEditor';
import { AIPanel } from './components/ai/AIPanel';
import { ProceduralPanel } from './components/procedural/ProceduralPanel';
import { HouseStorage, type SavedHouse } from './utils/storage';
import { type HouseProject, DEFAULT_PROJECT } from './types/schema';
import { sanitizeProject } from './utils/sanitize';

function App() {
  const [jsonInput, setJsonInput] = useState<string>(JSON.stringify(DEFAULT_PROJECT, null, 2));
  const [project, setProject] = useState<HouseProject>(DEFAULT_PROJECT);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'form' | 'facade' | 'json' | 'saves' | 'ai' | 'procedural'>('form');
  
  // Persistent AI State
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiDebug, setAiDebug] = useState<string | null>(null);

  // Persistent Procedural State
  const [procStyle, setProcStyle] = useState<any>('suburban');
  const [procComplexity, setProcComplexity] = useState<number>(0.5);
  const [procHeight, setProcHeight] = useState<number>(0.5);
  const [procSymmetry, setProcSymmetry] = useState<number>(0.8);
  const [procDetail, setProcDetail] = useState<number>(0.5);
  const [procSeed, setProcSeed] = useState<string>("");
  const [procLastSeed, setProcLastSeed] = useState<string>("");

  // Selection State (Shared between Editor and Scene)
  const [selectedModuleId, setSelectedModuleId] = useState<string>("main");
  const [selectedFace, setSelectedFace] = useState<string>("front");
  const [selectedCell, setSelectedCell] = useState<{ u: number, f: number } | null>(null);
  const [selectedDormerId, setSelectedDormerId] = useState<string | null>(null);

  // Scene Selection Handler
  const handleSceneSelect = (type: 'module'|'face'|'element'|'dormer', id: string, data?: any) => {
      // 1. Select Module
      if (type === 'module' || type === 'face' || type === 'element' || type === 'dormer') {
          setSelectedModuleId(id);
          if (data?.face) setSelectedFace(data.face);
      }

      // 2. Select Face/Element -> Open Facade Editor
      if (type === 'face') {
          setActiveTab('facade');
          setSelectedCell(null);
          if(!showEditor) setShowEditor(true);
      } else if (type === 'element') {
          setActiveTab('facade');
          setSelectedCell({ u: data.u, f: data.f });
          if(!showEditor) setShowEditor(true);
      } 
      // 3. Select Dormer -> Open Builder Form
      else if (type === 'dormer') {
          setActiveTab('form');
          setSelectedDormerId(data.dormerId);
          if(!showEditor) setShowEditor(true);
      }
      // 4. Select Roof/Module -> Open Builder Form
      else if (type === 'module') {
          setActiveTab('form');
          setSelectedDormerId(null);
          if(!showEditor) setShowEditor(true);
      }
  };

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

  // Handler for AI Load
  const handleAILoad = (rawData: HouseProject) => {
      const newProject = sanitizeProject(rawData);
      setProject(newProject);
      setJsonInput(JSON.stringify(newProject, null, 2));
      setIsDirty(true);
      setCurrentFileId(null); // New AI project is unsaved
      setCurrentFileName(null);
      // Removed automatic tab switch to keep debug info visible
      // setActiveTab('form'); 
  };

  // Helper: Determine best face to look at
  const getSmartFace = (modId: string, proj: HouseProject) => {
      const mod = proj.modules.find(m => m.id === modId);
      if (!mod || !mod.attachment) return 'front'; // Default for root
      
      const att = mod.attachment.face;
      // If attached to parent's FRONT, my BACK is blocked. Look at FRONT.
      if (att === 'front') return 'front';
      // If attached to parent's BACK, my FRONT is blocked. Look at BACK.
      if (att === 'back') return 'back';
      // If attached to parent's LEFT, my RIGHT is blocked. Look at LEFT.
      if (att === 'left') return 'left';
      // If attached to parent's RIGHT, my LEFT is blocked. Look at RIGHT.
      if (att === 'right') return 'right';
      
      return 'front';
  };

  const handleModuleSelect = (id: string) => {
      setSelectedModuleId(id);
      setSelectedFace(getSmartFace(id, project));
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
        <Scene 
            project={project} 
            focusTarget={{ moduleId: selectedModuleId, face: selectedFace }}
            onSelect={handleSceneSelect}
        />
        <div className="info-overlay" style={{ pointerEvents: 'none', zIndex: 1000 }}>
          <div style={{ pointerEvents: 'auto' }}>
            <h1>XBJ Viewer {currentFileName ? `- ${currentFileName}` : ''} {isDirty ? '*' : ''}</h1>
            <p>Full-Stack Ready</p>
            <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
                <button 
                    onClick={() => setShowEditor(!showEditor)}
                    style={{ padding: '5px 10px', fontSize: '0.8rem', cursor: 'pointer' }}
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
              <button className={activeTab === 'facade' ? 'active' : ''} onClick={() => setActiveTab('facade')}>Facades</button>
              <button className={activeTab === 'procedural' ? 'active' : ''} onClick={() => setActiveTab('procedural')}>Procedural</button>
              <button className={activeTab === 'ai' ? 'active' : ''} onClick={() => setActiveTab('ai')}>AI Architect</button>
              <button className={activeTab === 'saves' ? 'active' : ''} onClick={() => setActiveTab('saves')}>My Houses</button>
              <button className={activeTab === 'json' ? 'active' : ''} onClick={() => setActiveTab('json')}>JSON</button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeTab === 'json' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <textarea 
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        spellCheck={false}
                        className={error ? 'error' : ''}
                        style={{ flex: 1 }}
                    />
                    <div className="console">
                        {error ? (
                        <span style={{ color: '#ff5555' }}>❌ {error}</span>
                        ) : (
                        <span style={{ color: '#55ff55' }}>✅ System Ready</span>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'saves' && (
                <SavedHouses saves={saves} onLoad={handleLoad} onDelete={handleDelete} />
            )}

            {activeTab === 'procedural' && (
                <ProceduralPanel 
                    onGenerate={handleAILoad} 
                    style={procStyle} setStyle={setProcStyle}
                    complexity={procComplexity} setComplexity={setProcComplexity}
                    heightBias={procHeight} setHeightBias={setProcHeight}
                    symmetry={procSymmetry} setSymmetry={setProcSymmetry}
                    detailing={procDetail} setDetailing={setProcDetail}
                    seed={procSeed} setSeed={setProcSeed}
                    lastSeed={procLastSeed} setLastSeed={setProcLastSeed}
                />
            )}

            {activeTab === 'ai' && (
                <AIPanel 
                    onLoad={handleAILoad} 
                    file={aiFile} setFile={setAiFile}
                    prompt={aiPrompt} setPrompt={setAiPrompt}
                    debugOutput={aiDebug} setDebugOutput={setAiDebug}
                />
            )}

            {activeTab === 'facade' && (
                <FacadeEditor 
                    project={project} 
                    onUpdate={handleProjectUpdate} 
                    selection={{ moduleId: selectedModuleId, face: selectedFace }}
                    onSelect={(m, f) => { setSelectedModuleId(m); setSelectedFace(f); }}
                    selectedCell={selectedCell}
                    onSelectCell={setSelectedCell}
                />
            )}

            {activeTab === 'form' && (
                <BuilderForm 
                    project={project} 
                    onUpdate={handleProjectUpdate} 
                    selectedModuleId={selectedModuleId}
                    onSelectModule={handleModuleSelect}
                    selectedDormerId={selectedDormerId}
                />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
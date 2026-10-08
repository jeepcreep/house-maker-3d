import React, { useState } from 'react';
import type { HouseProject } from '../../types/schema';

interface Props {
    onLoad: (project: HouseProject) => void;
    project: HouseProject;
    // Shared state from App
    file: File | null;
    setFile: (f: File | null) => void;
    prompt: string;
    setPrompt: (p: string) => void;
    debugOutput: string | null;
    setDebugOutput: (d: string | null) => void;
}

export const AIPanel: React.FC<Props> = ({ onLoad, project, file, setFile, prompt, setPrompt, debugOutput, setDebugOutput }) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'generate' | 'update' | 'create'>('generate');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleGenerate = async () => {
        if (!file) {
            setError("Please upload an image first.");
            return;
        }

        setLoading(true);
        setError(null);
        setDebugOutput(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            if (prompt) formData.append("prompt", prompt);

            const res = await fetch("http://localhost:8000/generate", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || res.statusText);
            }

            const data = await res.json();
            
            if (data._debug_raw_text) {
                setDebugOutput(data._debug_raw_text);
                delete data._debug_raw_text;
            }
            
            onLoad(data);
        } catch (err: any) {
            setError(err.message || "Failed to generate house");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!prompt) {
            setError("Please provide a description.");
            return;
        }

        setLoading(true);
        setError(null);
        setDebugOutput(null);

        try {
            const res = await fetch("http://localhost:8000/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || res.statusText);
            }

            const data = await res.json();
            
            if (data._debug_raw_text) {
                setDebugOutput(data._debug_raw_text);
                delete data._debug_raw_text;
            }
            
            onLoad(data);
        } catch (err: any) {
            setError(err.message || "Failed to create house");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!prompt) {
            setError("Please provide an instruction.");
            return;
        }

        setLoading(true);
        setError(null);
        setDebugOutput(null);

        try {
            const res = await fetch("http://localhost:8000/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentProject: project,
                    instruction: prompt
                }),
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || res.statusText);
            }

            const data = await res.json();
            
            if (data._debug_raw_text) {
                setDebugOutput(data._debug_raw_text);
                delete data._debug_raw_text;
            }
            
            onLoad(data);
        } catch (err: any) {
            setError(err.message || "Failed to update house");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="builder-form">
            <div className="form-section highlight">
                <h3>🤖 AI Architect</h3>
                <p style={{fontSize: '0.8rem', color: '#aaa'}}>Use AI to generate, create from scratch, or modify with text.</p>
                
                <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                    <button 
                        onClick={() => setMode('generate')}
                        className={mode === 'generate' ? 'active' : ''}
                        style={{ flex: 1, padding: '5px', fontSize: '0.7rem', background: mode === 'generate' ? '#2196F3' : '#333' }}
                    >
                        Image → 3D
                    </button>
                    <button 
                        onClick={() => setMode('create')}
                        className={mode === 'create' ? 'active' : ''}
                        style={{ flex: 1, padding: '5px', fontSize: '0.7rem', background: mode === 'create' ? '#2196F3' : '#333' }}
                    >
                        Text → Create
                    </button>
                    <button 
                        onClick={() => setMode('update')}
                        className={mode === 'update' ? 'active' : ''}
                        style={{ flex: 1, padding: '5px', fontSize: '0.7rem', background: mode === 'update' ? '#2196F3' : '#333' }}
                    >
                        Text → Edit
                    </button>
                </div>

                {mode === 'generate' && (
                    <div style={{marginTop: '15px'}}>
                        <label style={{display: 'block', marginBottom: '5px'}}>1. Upload Image</label>
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileChange}
                            style={{width: '100%'}}
                        />
                    </div>
                )}

                <div style={{marginTop: '15px'}}>
                    <label style={{display: 'block', marginBottom: '5px'}}>
                        {mode === 'generate' ? '2. Instructions (Optional)' : 'Instructions'}
                    </label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={
                            mode === 'generate' ? "e.g. 'Make the roof blue', 'Add a porch'" : 
                            mode === 'create' ? "e.g. 'A small cottage with a steep gabled roof and red windows'" :
                            "e.g. 'Add a third floor', 'Change all windows to arched'"
                        }
                        style={{width: '100%', height: '80px', background: '#222', border: '1px solid #444', color: 'white', padding: '10px', fontSize: '0.9rem'}}
                    />
                </div>

                <div style={{marginTop: '20px'}}>
                    <button 
                        onClick={mode === 'generate' ? handleGenerate : mode === 'create' ? handleCreate : handleUpdate} 
                        disabled={loading || (mode === 'generate' && !file)}
                        style={{
                            width: '100%', 
                            padding: '12px', 
                            background: loading ? '#555' : 'linear-gradient(45deg, #2196F3, #21CBF3)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            fontSize: '1rem'
                        }}
                    >
                        {loading ? "Processing..." : mode === 'generate' ? "✨ Generate 3D Model" : mode === 'create' ? "✨ Create Model" : "✨ Update Model"}
                    </button>
                </div>

                {error && (
                    <div style={{marginTop: '15px', color: '#ff5555', fontSize: '0.9rem', background: '#330000', padding: '10px', borderRadius: '4px'}}>
                        Error: {error}
                    </div>
                )}

                {debugOutput && (
                    <div style={{marginTop: '15px', borderTop: '1px solid #444', paddingTop: '10px'}}>
                        <details open>
                            <summary style={{cursor: 'pointer', color: '#aaa', fontSize: '0.8rem'}}>View AI Reasoning (Debug)</summary>
                            <pre style={{
                                marginTop: '5px', 
                                background: '#111', 
                                padding: '10px', 
                                borderRadius: '4px', 
                                fontSize: '0.7rem', 
                                whiteSpace: 'pre-wrap', 
                                overflowX: 'hidden',
                                maxHeight: '300px',
                                overflowY: 'auto'
                            }}>
                                {debugOutput}
                            </pre>
                        </details>
                    </div>
                )}
            </div>
        </div>
    );
};
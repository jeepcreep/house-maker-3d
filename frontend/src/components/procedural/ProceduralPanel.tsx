import React from 'react';
import type { HouseProject } from '../../types/schema';
import { generateProceduralHouse } from '../../utils/procedural/generator';
import type { HouseStyle } from '../../utils/procedural/generator';

interface Props {
    onGenerate: (project: HouseProject) => void;
    // Shared state from App
    style: HouseStyle; setStyle: (s: HouseStyle) => void;
    complexity: number; setComplexity: (v: number) => void;
    heightBias: number; setHeightBias: (v: number) => void;
    symmetry: number; setSymmetry: (v: number) => void;
    detailing: number; setDetailing: (v: number) => void;
    seed: string; setSeed: (s: string) => void;
    lastSeed: string; setLastSeed: (s: string) => void;
}

const STYLES: HouseStyle[] = [
    'suburban', 'victorian', 'modern', 'alpine', 'mediterranean', 'ranch', 'industrial', 
    'german', 'scandinavian', 'japanese', 'chinese', 'gruenderzeit', 'neue_sachlichkeit', 
    'random'
];

export const ProceduralPanel: React.FC<Props> = ({ 
    onGenerate, style, setStyle, complexity, setComplexity, 
    heightBias, setHeightBias, symmetry, setSymmetry, 
    detailing, setDetailing, seed, setSeed, lastSeed, setLastSeed 
}) => {

    const handleGenerate = () => {
        const activeSeed = seed.trim() || Date.now().toString();
        setLastSeed(activeSeed);
        
        const project = generateProceduralHouse({
            style,
            seed: activeSeed,
            complexity,
            heightBias,
            symmetry,
            detailing
        });
        onGenerate(project);
    };

    return (
        <div className="builder-form">
            <div className="form-section highlight">
                <h3>🎲 Procedural Architect 3.0</h3>
                <p style={{fontSize: '0.8rem', color: '#aaa'}}>Generate houses with style and texture.</p>
                
                <div className="control-row">
                    <label>Style</label>
                    <select value={style} onChange={(e) => setStyle(e.target.value as HouseStyle)}>
                        {STYLES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <h4>Parameters</h4>
                    <ControlSlider label="Complexity" val={complexity} onChange={setComplexity} />
                    <ControlSlider label="Height Bias" val={heightBias} onChange={setHeightBias} />
                    <ControlSlider label="Symmetry" val={symmetry} onChange={setSymmetry} />
                    <ControlSlider label="Detailing" val={detailing} onChange={setDetailing} />
                </div>

                <div className="control-row">
                    <label>Seed</label>
                    <input 
                        type="text" 
                        placeholder="Random (Leave empty)" 
                        value={seed} 
                        onChange={(e) => setSeed(e.target.value)} 
                    />
                    <button onClick={() => setSeed("")} style={{padding: '3px 6px', fontSize: '0.7rem'}}>CLR</button>
                </div>
                {lastSeed && <div style={{fontSize: '0.7rem', color:'#888', marginTop:'2px', textAlign:'right'}}>Last: {lastSeed}</div>}

                <div style={{marginTop: '20px'}}>
                    <button 
                        onClick={handleGenerate} 
                        style={{
                            width: '100%', 
                            padding: '10px', 
                            background: 'linear-gradient(45deg, #FF9800, #F57C00)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Generate Unique House
                    </button>
                </div>
            </div>
        </div>
    );
};

const ControlSlider = ({ label, val, onChange }: { label: string, val: number, onChange: (v: number) => void }) => (
    <div className="control-group">
        <label>{label}</label>
        <input type="range" min="0" max="1" step="0.1" value={val} onChange={(e) => onChange(parseFloat(e.target.value))} />
        <span>{val}</span>
    </div>
);

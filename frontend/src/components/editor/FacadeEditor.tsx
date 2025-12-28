import React, { useState } from 'react';
import type { HouseProject, FacadeElement } from '../../types/schema';

interface Props {
    project: HouseProject;
    onUpdate: (project: HouseProject) => void;
    selection: { moduleId: string, face: string };
    onSelect: (moduleId: string, face: string) => void;
}

const FACES = ['front', 'back', 'left', 'right'];

export const FacadeEditor: React.FC<Props> = ({ project, onUpdate, selection, onSelect }) => {
    const { moduleId, face } = selection;
    const [selectedCell, setSelectedCell] = useState<{ u: number, f: number } | null>(null);
    const [clipboard, setClipboard] = useState<FacadeElement | null>(null);

    const activeModule = project.modules.find(m => m.id === moduleId);
    
    // Grid Dimensions
    const isSide = face === 'left' || face === 'right';
    const cols = activeModule ? (isSide ? activeModule.grid.depth : activeModule.grid.units) : 1;
    const floors = activeModule ? activeModule.grid.floors : 1;

    if (!activeModule) return <div style={{padding: 20}}>Select a module...</div>;

    // --- VISUALIZATION HELPER ---
    const renderCellPreview = (el: FacadeElement) => {
        if (el.type === 'window' && el.window) {
            const cols = el.window.mullions_cols || 1;
            const rows = el.window.mullions_rows || 1;
            return (
                <svg width="100%" height="100%" viewBox="0 0 100 100" style={{background: el.window.glass_color || '#aaccff', border: `2px solid ${el.window.frame_color || '#333'}`}}>
                    {Array.from({length: cols - 1}).map((_, i) => (
                        <line key={`c${i}`} x1={(i+1)*(100/cols)} y1="0" x2={(i+1)*(100/cols)} y2="100" stroke={el.window?.frame_color || '#333'} strokeWidth="2" />
                    ))}
                    {Array.from({length: rows - 1}).map((_, i) => (
                        <line key={`r${i}`} x1="0" y1={(i+1)*(100/rows)} x2="100" y2={(i+1)*(100/rows)} stroke={el.window?.frame_color || '#333'} strokeWidth="2" />
                    ))}
                </svg>
            );
        }
        if (el.type === 'door' && el.door) {
            return (
                <svg width="100%" height="100%" viewBox="0 0 100 100" style={{background: el.door.color || '#442211'}}>
                    <rect x="0" y="0" width="100" height="100" fill="none" stroke="#333" strokeWidth="4" />
                    {el.door.leafs === 2 && <line x1="50" y1="0" x2="50" y2="100" stroke="#333" strokeWidth="2" />}
                    {el.door.has_window && <rect x="20" y="10" width="60" height="40" fill="#aaccff" />}
                </svg>
            );
        }
        return null;
    };

    // --- PARENT OBSTRUCTION LOGIC ---
    let disabledFace: string | null = null;
    if (activeModule.attachment) {
        const attFace = activeModule.attachment.face;
        if (attFace === 'front') disabledFace = 'back';
        else if (attFace === 'back') disabledFace = 'front';
        else if (attFace === 'right') disabledFace = 'left';
        else if (attFace === 'left') disabledFace = 'right';
        else if (attFace === 'top') disabledFace = 'bottom'; 
    }

    // --- OBSTRUCTION LOGIC ---
    const getObstruction = (u: number, f: number): string | null => {
        for (const other of project.modules) {
            if (other.attachment?.parent_id === moduleId && other.attachment.face === face) {
                const att = other.attachment;
                
                // FLIP LOGIC for Back and Left Faces
                let gridX = u;
                if (face === 'back' || face === 'left') {
                    gridX = (Math.ceil(cols) - 1) - u;
                }
                
                const startX = att.origin_x;
                const startY = att.origin_y;
                
                const cU = other.grid.units; 
                const cD = other.grid.depth; 
                
                const widthCover = (face === 'front' || face === 'back') ? cU : cD;
                const heightCover = other.grid.floors;
                
                if (gridX >= startX && gridX < startX + widthCover &&
                    f >= startY && f < startY + heightCover) {
                    return other.id;
                }
            }
        }
        return null;
    };

    const updateOverride = (u: number, f: number, faceStr: string, element: FacadeElement | null) => {
        const key = `${u}_${f}_${faceStr}`;
        const newOverrides = { ...activeModule.facade.overrides };
        if (element === null) delete newOverrides[key];
        else newOverrides[key] = element;

        const newModules = project.modules.map(m => 
            m.id === moduleId ? { ...m, facade: { ...m.facade, overrides: newOverrides } } : m
        );
        onUpdate({ ...project, modules: newModules });
    };

    const getCellElement = (u: number, f: number): FacadeElement => {
        const key = `${u}_${f}_${face}`;
        return activeModule.facade.overrides[key] || activeModule.facade.base_window;
    };

    const isOverridden = (u: number, f: number) => {
        return !!activeModule.facade.overrides[`${u}_${f}_${face}`];
    };

    const activeEl = selectedCell ? getCellElement(selectedCell.u, selectedCell.f) : null;

    const updateActiveEl = (updates: Partial<FacadeElement>) => {
        if (!selectedCell) return;
        const current = getCellElement(selectedCell.u, selectedCell.f);
        updateOverride(selectedCell.u, selectedCell.f, face, { ...current, ...updates });
    };

    const updateActiveDetail = (type: 'window'|'door', key: string, value: any) => {
        if (!activeEl) return;
        const sub = activeEl[type] || {};
        updateActiveEl({ [type]: { ...sub, [key]: value } });
    };

    const switchType = (newType: 'window' | 'door' | 'empty') => {
        const updates: Partial<FacadeElement> = { type: newType };
        if (newType === 'door' && !activeEl?.door) {
            updates.door = { leafs: 1, has_window: false, color: '#442211' };
            updates.height_ratio = 0.85; 
            updates.width_ratio = 0.7;
        }
        if (newType === 'window' && !activeEl?.window) {
            updates.window = { mullions_cols: 2, mullions_rows: 2, frame_color: '#333' };
        }
        updateActiveEl(updates);
    };

    return (
        <div className="builder-form">
            <div className="form-section highlight">
                <h3>Editing: <span style={{color: '#fff'}}>{moduleId.toUpperCase()}</span> - <span style={{color: '#aaddff'}}>{face.toUpperCase()}</span></h3>
                
                <label style={{fontSize: '0.8rem', color: '#888'}}>Select Module</label>
                <select value={moduleId} onChange={(e) => onSelect(e.target.value, face)} style={{ width: '100%', marginBottom: '10px' }}>
                    {project.modules.map(m => <option key={m.id} value={m.id}>{m.id.toUpperCase()}</option>)}
                </select>
                
                <div style={{ display: 'flex', gap: '2px' }}>
                    {FACES.map(f => {
                        const isDisabled = f === disabledFace;
                        return (
                            <button 
                                key={f} 
                                onClick={() => !isDisabled && onSelect(moduleId, f)}
                                disabled={isDisabled}
                                title={isDisabled ? "Attached to Parent Module" : ""}
                                className={face === f ? 'active' : ''}
                                style={{ 
                                    flex: 1, fontSize: '0.7rem', padding: '8px',
                                    borderBottom: face === f ? '2px solid #aaddff' : '2px solid transparent',
                                    background: face === f ? '#333' : (isDisabled ? '#222' : 'transparent'),
                                    color: face === f ? 'white' : (isDisabled ? '#444' : '#888'),
                                    cursor: isDisabled ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {f.toUpperCase()}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* --- MINIMAP GRID --- */}
            <div className="form-section">
                <div style={{ 
                    maxWidth: '280px',
                    margin: '0 auto',
                    display: 'grid', 
                    gridTemplateColumns: `repeat(${Math.ceil(cols)}, 1fr)`,
                    gap: '4px',
                    background: '#1a1a1a',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #333'
                }}>
                    {Array.from({ length: Math.ceil(floors) }).map((_, fIdx) => {
                        const f = Math.ceil(floors) - 1 - fIdx; 
                        return Array.from({ length: Math.ceil(cols) }).map((_, u) => {
                            const obstructedBy = getObstruction(u, f);
                            const overridden = isOverridden(u, f);
                            const selected = selectedCell?.u === u && selectedCell?.f === f;
                            const el = getCellElement(u, f);
                            
                            let bg = '#222';
                            let border = '1px solid #333';
                            
                            if (obstructedBy) {
                                bg = 'repeating-linear-gradient(45deg, #300, #300 5px, #400 5px, #400 10px)';
                                border = '1px solid #d32f2f';
                            } else if (selected) {
                                bg = '#1976d2';
                                border = '1px solid #64b5f6';
                            } else if (overridden) {
                                bg = '#37474f';
                                border = '1px solid #546e7a';
                            }

                            return (
                                <button 
                                    key={`${u}-${f}`}
                                    onClick={() => !obstructedBy && setSelectedCell({ u, f })}
                                    disabled={!!obstructedBy}
                                    title={obstructedBy ? `Blocked by module: ${obstructedBy}` : `Cell ${u},${f}`}
                                    style={{
                                        aspectRatio: '1',
                                        background: bg,
                                        border: border,
                                        cursor: obstructedBy ? 'not-allowed' : 'pointer',
                                        position: 'relative',
                                        padding: 0,
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Preview */}
                                    {!obstructedBy && el.type !== 'empty' && (
                                        <div style={{
                                            width: '70%', height: '70%',
                                            margin: '15%',
                                            position: 'relative'
                                        }}>
                                            {renderCellPreview(el)}
                                        </div>
                                    )}
                                </button>
                            );
                        });
                    })}
                </div>
                {selectedCell && getObstruction(selectedCell.u, selectedCell.f) && (
                    <div style={{color: '#ff5555', fontSize: '0.8rem', marginTop: '5px'}}>⚠️ Blocked by {getObstruction(selectedCell.u, selectedCell.f)}</div>
                )}
            </div>

            {/* --- CELL EDITOR --- */}
            {selectedCell && activeEl && (
                <div className="module-editor">
                    <h4>Cell {selectedCell.u},{selectedCell.f} Properties</h4>
                    <div className="control-row">
                        <label>Type</label>
                        <select value={activeEl.type} onChange={(e) => switchType(e.target.value as any)}>
                            <option value="window">Window</option>
                            <option value="door">Door</option>
                            <option value="empty">Empty/Wall</option>
                        </select>
                    </div>

                    {activeEl.type !== 'empty' && (
                        <>
                            <ControlSlider label="W-Ratio" val={activeEl.width_ratio} min={0.1} max={1} step={0.05} onChange={(v) => updateActiveEl({ width_ratio: v })} />
                            <ControlSlider label="H-Ratio" val={activeEl.height_ratio} min={0.1} max={1} step={0.05} onChange={(v) => updateActiveEl({ height_ratio: v })} />
                            <ControlSlider label="Offset X" val={activeEl.offset_x} min={-0.45} max={0.45} step={0.05} onChange={(v) => updateActiveEl({ offset_x: v })} />
                            <ControlSlider label="Offset Y" val={activeEl.offset_y} min={-0.45} max={0.45} step={0.05} onChange={(v) => updateActiveEl({ offset_y: v })} />
                        </>
                    )}

                    {activeEl.type === 'window' && activeEl.window && (
                        <div className="form-group">
                            <h5>Mullions</h5>
                            <ControlSlider label="Cols" val={activeEl.window.mullions_cols} min={1} max={5} step={1} onChange={(v) => updateActiveDetail('window', 'mullions_cols', v)} />
                            <ControlSlider label="Rows" val={activeEl.window.mullions_rows} min={1} max={5} step={1} onChange={(v) => updateActiveDetail('window', 'mullions_rows', v)} />
                        </div>
                    )}

                    {activeEl.type === 'door' && activeEl.door && (
                        <div className="form-group">
                            <h5>Door Style</h5>
                            <div className="control-row">
                                <label>Leafs</label>
                                <select value={activeEl.door.leafs} onChange={(e) => updateActiveDetail('door', 'leafs', parseInt(e.target.value))}>
                                    <option value="1">Single</option>
                                    <option value="2">Double</option>
                                </select>
                            </div>
                            <div className="control-row">
                                <label>Win</label>
                                <input type="checkbox" checked={activeEl.door.has_window} onChange={(e) => updateActiveDetail('door', 'has_window', e.target.checked)} />
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                        <button onClick={() => setClipboard(activeEl)} style={{ flex: 1, padding: '5px', fontSize: '0.8rem' }}>Copy</button>
                        <button onClick={() => clipboard && updateActiveEl(clipboard)} disabled={!clipboard} style={{ flex: 1, padding: '5px', fontSize: '0.8rem' }}>Paste</button>
                        <button onClick={() => updateOverride(selectedCell.u, selectedCell.f, face, null)} style={{ flex: 1, padding: '5px', fontSize: '0.8rem', background: '#c62828' }}>Reset</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const ControlSlider = ({ label, val, min, max, step, onChange }: { label: string, val: number, min: number, max: number, step: number, onChange: (v: number) => void }) => (
    <div className="control-group">
        <label style={{ width: '70px', fontSize: '0.7rem' }}>{label}</label>
        <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => onChange(parseFloat(e.target.value))} />
        <span style={{ width: '30px' }}>{val}</span>
    </div>
);
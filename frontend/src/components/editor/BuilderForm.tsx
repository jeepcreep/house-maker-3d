import React, { useState } from 'react';
import type { HouseProject, HouseModule, RoofType, ModuleAttachment } from '../../types/schema';

interface Props {
    project: HouseProject;
    onUpdate: (project: HouseProject) => void;
}

const ROOF_TYPES: RoofType[] = [
    'flat', 'gabled', 'hipped', 'half_hipped', 'pyramid', 
    'gambrel', 'mansard', 'shed', 'saltbox', 'round', 'dome'
];

const FACES = ['front', 'back', 'left', 'right', 'top'];

export const BuilderForm: React.FC<Props> = ({ project, onUpdate }) => {
    const [selectedModuleId, setSelectedModuleId] = useState<string>(project.modules[0]?.id || "");

    const updateGlobal = (key: string, value: any) => {
        onUpdate({
            ...project,
            global_dimensions: { ...project.global_dimensions, [key]: value }
        });
    };

    const updateModule = (id: string, updates: Partial<HouseModule>) => {
        const newModules = project.modules.map(m => 
            m.id === id ? { ...m, ...updates } : m
        );
        onUpdate({ ...project, modules: newModules });
    };

    const updateModuleGrid = (id: string, key: string, value: number) => {
        const m = project.modules.find(mod => mod.id === id);
        if (!m) return;
        updateModule(id, { grid: { ...m.grid, [key]: value } });
    };

    const updateModuleRoof = (id: string, key: string, value: any) => {
        const m = project.modules.find(mod => mod.id === id);
        if (!m) return;
        updateModule(id, { roof: { ...m.roof, [key]: value } });
    };

    const updateAttachment = (id: string, key: string, value: any) => {
        const m = project.modules.find(mod => mod.id === id);
        if (!m) return;
        // If attachment doesn't exist, create default
        const currentAtt = m.attachment || { parent_id: project.modules[0].id, face: 'front', origin_x: 0, origin_y: 0 };
        updateModule(id, { attachment: { ...currentAtt, [key]: value } as ModuleAttachment });
    };

    const activeModule = project.modules.find(m => m.id === selectedModuleId);

    const handleAddModule = () => {
        const count = project.modules.length;
        const newId = `module_${count + 1}`;
        const newModule: HouseModule = {
            id: newId,
            grid: { floors: 1, units: 1, depth: 1 },
            roof: { type: 'flat', orientation: 'across', height: 0.2, overhang: 0.1, color_hex: "#444444" },
            attachment: {
                parent_id: "main",
                face: "right",
                origin_x: 0,
                origin_y: 0
            }
        };
        onUpdate({ ...project, modules: [...project.modules, newModule] });
        setSelectedModuleId(newId);
    };

    const handleDeleteModule = () => {
        if (selectedModuleId === 'main') return;
        const newModules = project.modules.filter(m => m.id !== selectedModuleId);
        onUpdate({ ...project, modules: newModules });
        setSelectedModuleId(newModules[0]?.id || "");
    };

    return (
        <div className="builder-form">
            {/* --- GLOBAL SETTINGS --- */}
            <div className="form-section">
                <h3>🌍 Global Scale (Meters)</h3>
                <div className="control-group">
                    <label>Base Unit Size</label>
                    <input 
                        type="range" min="0.5" max="5.0" step="0.1" 
                        value={project.global_dimensions.reference_sizing}
                        onChange={(e) => updateGlobal('reference_sizing', parseFloat(e.target.value))}
                    />
                    <span>{project.global_dimensions.reference_sizing}m</span>
                </div>
                <div className="control-group">
                    <label>Floor Height</label>
                    <input 
                        type="range" min="2.0" max="6.0" step="0.1" 
                        value={project.global_dimensions.floor_height}
                        onChange={(e) => updateGlobal('floor_height', parseFloat(e.target.value))}
                    />
                    <span>{project.global_dimensions.floor_height}x</span>
                </div>
            </div>

            {/* --- MODULE SELECTOR --- */}
            <div className="form-section highlight">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3>🏗️ Edit Module</h3>
                    <div>
                        <button onClick={handleAddModule} style={{ marginRight: '5px', padding: '4px 8px', fontSize: '0.8rem', background: '#2e7d32' }}>+ Add</button>
                        {selectedModuleId !== 'main' && (
                            <button onClick={handleDeleteModule} style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#c62828' }}>Delete</button>
                        )}
                    </div>
                </div>
                <select 
                    value={selectedModuleId} 
                    onChange={(e) => setSelectedModuleId(e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                >
                    {project.modules.map(m => (
                        <option key={m.id} value={m.id}>{m.id.toUpperCase()}</option>
                    ))}
                </select>
            </div>

            {activeModule && (
                <div className="module-editor">
                    {/* GRID */}
                    <div className="form-group">
                        <h4>📏 Dimensions (Grid)</h4>
                        {/* Floors usually integer, but Width/Depth can be fractional for smaller extensions */}
                        <ControlSlider label="Floors" val={activeModule.grid.floors} min={0.5} max={10} step={0.5} onChange={(v) => updateModuleGrid(activeModule.id, 'floors', v)} />
                        <ControlSlider label="Width (Units)" val={activeModule.grid.units} min={0.2} max={10} step={0.1} onChange={(v) => updateModuleGrid(activeModule.id, 'units', v)} />
                        <ControlSlider label="Depth (Cells)" val={activeModule.grid.depth} min={0.2} max={10} step={0.1} onChange={(v) => updateModuleGrid(activeModule.id, 'depth', v)} />
                    </div>

                    {/* ROOF */}
                    <div className="form-group">
                        <h4>🏠 Roof Design</h4>
                        <div className="control-row">
                            <label>Type</label>
                            <select 
                                value={activeModule.roof.type} 
                                onChange={(e) => updateModuleRoof(activeModule.id, 'type', e.target.value)}
                            >
                                {ROOF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        
                        {/* Hide Orientation for Symmetrical types */}
                        {!['flat', 'pyramid', 'mansard', 'dome'].includes(activeModule.roof.type) && (
                            <div className="control-row">
                                <label>Orient</label>
                                <select 
                                    value={activeModule.roof.orientation} 
                                    onChange={(e) => updateModuleRoof(activeModule.id, 'orientation', e.target.value)}
                                >
                                    <option value="across">Across (Side-to-Side)</option>
                                    <option value="along">Along (Front-to-Back)</option>
                                </select>
                            </div>
                        )}

                        <ControlSlider label="Height (m)" val={activeModule.roof.height} min={0.1} max={5} step={0.1} onChange={(v) => updateModuleRoof(activeModule.id, 'height', v)} />
                        <ControlSlider label="Overhang" val={activeModule.roof.overhang} min={0} max={2} step={0.1} onChange={(v) => updateModuleRoof(activeModule.id, 'overhang', v)} />
                        
                        {/* Conditional Roof Params */}
                        {['hipped', 'mansard', 'half_hipped'].includes(activeModule.roof.type) && (
                             <ControlSlider label="Ridge Ratio" val={activeModule.roof.ridge_ratio ?? 0.5} min={0} max={1} step={0.1} onChange={(v) => updateModuleRoof(activeModule.id, 'ridge_ratio', v)} />
                        )}
                        {['mansard', 'gambrel'].includes(activeModule.roof.type) && (
                             <ControlSlider label="Slope Break" val={activeModule.roof.slope_break_ratio ?? 0.5} min={0.1} max={0.9} step={0.1} onChange={(v) => updateModuleRoof(activeModule.id, 'slope_break_ratio', v)} />
                        )}
                        {activeModule.roof.type === 'saltbox' && (
                             <ControlSlider label="Peak Offset" val={activeModule.roof.peak_offset ?? 0.0} min={-0.45} max={0.45} step={0.05} onChange={(v) => updateModuleRoof(activeModule.id, 'peak_offset', v)} />
                        )}
                        
                        {/* Shed 4-Corner Heights */}
                        {activeModule.roof.type === 'shed' && (
                            <div className="form-group">
                                <h5>Corner Heights Offset (FL, FR, BR, BL)</h5>
                                {/* Need a way to update array. Simple sliders for each index. */}
                                {[0,1,2,3].map(i => (
                                    <ControlSlider 
                                        key={i} 
                                        label={`Corner ${i+1}`} 
                                        val={activeModule.roof.corner_heights?.[i] ?? 0} 
                                        min={-2} max={2} step={0.1} 
                                        onChange={(v) => {
                                            const arr = [...(activeModule.roof.corner_heights || [0,0,0,0])];
                                            arr[i] = v;
                                            updateModuleRoof(activeModule.id, 'corner_heights', arr);
                                        }} 
                                    />
                                ))}
                            </div>
                        )}
                        
                        <div className="control-row">
                            <label>Color</label>
                            <input type="color" value={activeModule.roof.color_hex} onChange={(e) => updateModuleRoof(activeModule.id, 'color_hex', e.target.value)} />
                        </div>
                    </div>

                    {/* ATTACHMENT (If not root) */}
                    {activeModule.attachment && (
                        <div className="form-group">
                            <h4>🔗 Attachment</h4>
                            <div className="control-row">
                                <label>Parent</label>
                                <select 
                                    value={activeModule.attachment.parent_id} 
                                    onChange={(e) => updateAttachment(activeModule.id, 'parent_id', e.target.value)}
                                >
                                    {project.modules.filter(m => m.id !== activeModule.id).map(m => (
                                        <option key={m.id} value={m.id}>{m.id}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="control-row">
                                <label>Face</label>
                                <select 
                                    value={activeModule.attachment.face} 
                                    onChange={(e) => updateAttachment(activeModule.id, 'face', e.target.value)}
                                >
                                    {FACES.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                                </select>
                            </div>
                            <ControlSlider label="Offset X (Unit)" val={activeModule.attachment.origin_x} min={0} max={5} step={1} onChange={(v) => updateAttachment(activeModule.id, 'origin_x', v)} />
                            <ControlSlider label="Offset Y (Floor)" val={activeModule.attachment.origin_y} min={0} max={5} step={1} onChange={(v) => updateAttachment(activeModule.id, 'origin_y', v)} />
                        </div>
                    )}

                    {/* VISUALS */}
                    <div className="form-group">
                        <h4>🎨 Style</h4>
                        <div className="control-row">
                            <label>Wall Color</label>
                            <input type="color" value={activeModule.wall_color_hex || "#F0F0F0"} onChange={(e) => updateModule(activeModule.id, { wall_color_hex: e.target.value })} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ControlSlider = ({ label, val, min, max, step, onChange }: { label: string, val: number, min: number, max: number, step: number, onChange: (v: number) => void }) => (
    <div className="control-group">
        <label>{label}</label>
        <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => onChange(parseFloat(e.target.value))} />
        <span>{val}</span>
    </div>
);

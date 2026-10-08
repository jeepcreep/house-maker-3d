import React, { useMemo, useEffect, useState, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Environment, TransformControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { HouseProject, HouseModule, DimensionConfig, FacadeElement } from '../../types/schema';
import { createRoofGeometry, createTimberGeometry } from '../../utils/geometry';
import { createWindowGeometry, createDoorGeometry, createBalconyGeometry, createPorchGeometry, createStairGeometry, createDormerGeometry, createSkylightGeometry } from '../../utils/elements';
import { getProceduralTexture } from '../../utils/textures';

// Helper: Get dimensions of a specific module
function getModuleDims(module: HouseModule, dims: DimensionConfig) {
    let uW, fH, cD;
    if (dims.mode === 'absolute') {
        uW = dims.total_width || 3; fH = dims.total_height || 3; cD = dims.total_depth || 3;
    } else {
        const ref = dims.reference_sizing || 1.0;
        uW = (dims.unit_width || 1.0) * ref;
        fH = (dims.floor_height || 1.0) * ref;
        cD = (dims.cell_depth || 1.0) * ref;
    }
    return {
        width: uW * module.grid.units,
        height: fH * module.grid.floors,
        depth: cD * module.grid.depth,
        uW, fH, cD
    };
}

const ElementRenderer: React.FC<{ el: FacadeElement, width: number, height: number, wallColor?: string }> = ({ el, width, height, wallColor }) => {
    const realW = width * el.width_ratio;
    const realH = height * el.height_ratio;
    const meshGroup = useMemo(() => {
        let g = new THREE.Group();
        if (el.type === 'window') g = createWindowGeometry(el, realW, realH, wallColor);
        else if (el.type === 'door') g = createDoorGeometry(el, realW, realH);
        if (el.balcony) g.add(createBalconyGeometry(el, realW, realH));
        if (el.porch) g.add(createPorchGeometry(el, realW, realH));
        if (el.stairs) g.add(createStairGeometry(el, realW, realH, -realH/2, el.porch ? (el.porch.depth || 1.5) : 0));
        return g;
    }, [el, realW, realH]);
    return <primitive object={meshGroup} />;
};

interface Props {
    project: HouseProject;
    focusTarget?: { moduleId: string, face: string };
    selectedDormerId?: string | null;
    onSelect?: (type: 'module'|'face'|'element'|'dormer', id: string, data?: any) => void;
    onUpdate?: (newProject: HouseProject) => void;
}

const CameraController: React.FC<{ target: { moduleId: string, face: string } | undefined, project: HouseProject }> = ({ target }) => {
    const { camera, controls } = useThree() as any; 
    useEffect(() => {
        if (target && controls) {
            // Only snap if explicitly triggered? For now, we disabled the aggressive snap in App.tsx props
            // but we keep the logic here for when it is triggered.
        }
    }, [target?.moduleId, target?.face]);
    return null;
};

const HouseModuleRenderer: React.FC<{ 
    module: HouseModule, 
    project: HouseProject, 
    parentPos?: [number, number, number],
    parentDims?: { width: number, height: number, depth: number },
    onSelect?: (type: 'module'|'face'|'element'|'dormer', id: string, data?: any) => void,
    onUpdate?: (newProject: HouseProject) => void,
    isSelected: boolean,
    selectedDormerId?: string | null,
    focusTarget?: { moduleId: string, face: string }
}> = ({ module, project, parentPos = [0,0,0], parentDims, onSelect, onUpdate, isSelected, selectedDormerId, focusTarget }) => {
    const { global_dimensions } = project;
    const { width, height, depth, uW, fH, cD } = getModuleDims(module, global_dimensions);

    // --- INTERACTION LOGIC ---
    const [hoveredFace, setHoveredFace] = useState<string | null>(null);
    const [dragging, setDragging] = useState<'width' | 'height' | 'depth' | null>(null);
    const [dragSide, setDragSide] = useState<1 | -1>(1);
    const isInteracting = useRef(false);
    const transformRef = useRef<any>(null);
    const proxyObject = useMemo(() => new THREE.Object3D(), []);

    // Sync proxy position ONLY when dragging starts to avoid feedback loops
    useEffect(() => {
        if (dragging && !isInteracting.current) {
            proxyObject.position.set(0, 0, 0);
            if (dragging === 'width') proxyObject.position.x = (width/2 + 0.3) * dragSide;
            else if (dragging === 'height') proxyObject.position.y = (height/2 + 0.3) * dragSide;
            else if (dragging === 'depth') proxyObject.position.z = (depth/2 + 0.3) * dragSide;
        }
    }, [dragging, dragSide]); // Removed width/height/depth from deps to stop the jump loop

    const handleDrag = (axis: 'width' | 'height' | 'depth', val: number) => {
        const newProject = { ...project, modules: [...project.modules] };
        const idx = newProject.modules.findIndex(m => m.id === module.id);
        if (idx === -1) return;
        const m = { ...newProject.modules[idx], grid: { ...newProject.modules[idx].grid } };
        const distFromCenter = Math.abs(val) - 0.3;
        const totalDim = distFromCenter * 2;

        if (axis === 'width') {
            const newUnits = Math.max(1, Math.round(totalDim / uW));
            if (newUnits === m.grid.units) return;
            m.grid.units = newUnits;
        } else if (axis === 'height') {
            const newFloors = Math.max(1, Math.round(totalDim / fH));
            if (newFloors === m.grid.floors) return;
            m.grid.floors = newFloors;
        } else if (axis === 'depth') {
            const newDepth = Math.max(0.5, Math.round((totalDim / cD) * 2) / 2);
            if (newDepth === m.grid.depth) return;
            m.grid.depth = newDepth;
        }
        newProject.modules[idx] = m;
        onUpdate?.(newProject);
    };

    // Attachment Logic
    let localX = 0, localY = 0, localZ = 0;
    if (module.attachment && parentDims) {
        const att = module.attachment;
        const pW = parentDims.width, pH = parentDims.height, pD = parentDims.depth;
        if (att.face === 'front') { localX = (-pW / 2) + (att.origin_x * uW) + (width / 2); localY = (-pH / 2) + (att.origin_y * fH) + (height / 2); localZ = (pD / 2) + (depth / 2); }
        else if (att.face === 'back') { localX = (-pW / 2) + (att.origin_x * uW) + (width / 2); localY = (-pH / 2) + (att.origin_y * fH) + (height / 2); localZ = (-pD / 2) - (depth / 2); }
        else if (att.face === 'right') { localX = (pW / 2) + (width / 2); localZ = (pD / 2) - (att.origin_x * cD) - (depth / 2); localY = (-pH / 2) + (att.origin_y * fH) + (height / 2); }
        else if (att.face === 'left') { localX = (-pW / 2) - (width / 2); localZ = (pD / 2) - (att.origin_x * cD) - (depth / 2); localY = (-pH / 2) + (att.origin_y * fH) + (height / 2); }
        else if (att.face === 'top') { localY = (pH / 2) + (height / 2); localX = (-pW / 2) + (att.origin_x * uW) + (width / 2); localZ = (pD / 2) - (att.origin_y * cD) - (depth / 2); }
    } else { localY = height / 2; }

    const absPos: [number, number, number] = [ parentPos[0] + localX, parentPos[1] + localY, parentPos[2] + localZ ];
    const roofGeo = useMemo(() => createRoofGeometry(width, depth, module.roof), [width, depth, module.roof]);
    const timberGeo = useMemo(() => {
        if (!module.facade?.timbering?.enabled) return new THREE.Group();
        return createTimberGeometry(width, height, depth, module.grid, module.facade.timbering, module.facade.overrides);
    }, [width, height, depth, module.grid, module.facade?.timbering, module.facade?.overrides]);

    const dormerGroups = useMemo(() => {
        if (!module.roof.dormers || module.roof.dormers.length === 0) return [];
        return module.roof.dormers.map(d => {
            const isSkylight = d.type === 'skylight';
            const g = isSkylight ? createSkylightGeometry(d) : createDormerGeometry(d);
            const rH = module.roof.height, yBase = height;
            let x = 0, y = 0, z = 0, rotY = 0, rotX = 0;
            const posRatio = d.position, elevRatio = d.elevation;
            y = yBase + (elevRatio * rH) + (d.y_offset || 0);
            rotY = d.rotation_y !== undefined ? (d.rotation_y * Math.PI / 180) : 0;
            rotX = d.rotation_x !== undefined ? (d.rotation_x * Math.PI / 180) : 0;
            const pitchFB = Math.atan2(rH, depth/2), pitchLR = Math.atan2(rH, width/2);
            if (d.face === 'front') { x = (-width/2) + (posRatio * width); z = (depth/2) * (1 - elevRatio); if (d.rotation_y === undefined) rotY = 0; if (isSkylight && d.rotation_x === undefined) rotX = pitchFB; }
            else if (d.face === 'back') { x = (-width/2) + (posRatio * width); z = -(depth/2) * (1 - elevRatio); if (d.rotation_y === undefined) rotY = Math.PI; if (isSkylight && d.rotation_x === undefined) rotX = pitchFB; }
            else if (d.face === 'right') { z = (depth/2) - (posRatio * depth); x = (width/2) * (1 - elevRatio); if (d.rotation_y === undefined) rotY = Math.PI / 2; if (isSkylight && d.rotation_x === undefined) rotX = pitchLR; }
            else if (d.face === 'left') { z = (-depth/2) + (posRatio * depth); x = -(width/2) * (1 - elevRatio); if (d.rotation_y === undefined) rotY = -Math.PI / 2; if (isSkylight && d.rotation_x === undefined) rotX = pitchLR; }
            return { mesh: g, pos: [x,y,z] as [number,number,number], rot: [rotX, rotY, 0] as [number,number,number], id: d.id };
        });
    }, [module.roof.dormers, width, height, depth, module.roof.height]);

    const renderFace = (face: 'front' | 'back' | 'left' | 'right') => {
        const elements = [];
        const isSide = face === 'left' || face === 'right';
        const totalUnits = isSide ? module.grid.depth : module.grid.units;
        const totalFloors = module.grid.floors;
        const faceW = isSide ? depth : width;
        const refCellW = isSide ? cD : uW, refCellH = fH;
        const cols = Math.ceil(totalUnits), floors = Math.ceil(totalFloors);
        let rot: [number, number, number] = [0, 0, 0], pos: [number, number, number] = [0, 0, 0];
        if (face === 'front') pos = [0, 0, depth/2];
        else if (face === 'back') { pos = [0, 0, -depth/2]; rot = [0, Math.PI, 0]; }
        else if (face === 'right') { pos = [width/2, 0, 0]; rot = [0, Math.PI/2, 0]; }
        else if (face === 'left') { pos = [-width/2, 0, 0]; rot = [0, -Math.PI/2, 0]; }
        for (let f = 0; f < floors; f++) {
            for (let c = 0; c < cols; c++) {
                const remainderX = totalUnits - c, cellScaleX = (remainderX >= 1) ? 1 : remainderX, cellRealW = refCellW * cellScaleX;
                const remainderY = totalFloors - f, cellScaleY = (remainderY >= 1) ? 1 : remainderY, cellRealH = refCellH * cellScaleY;
                if (cellScaleX < 0.2 || cellScaleY < 0.2) continue;
                const key = `${c}_${f}_${face}`;
                let elDef = module.facade?.overrides?.[key];
                if (!elDef && module.facade) {
                    if (module.facade.pattern === 'fill_window') elDef = module.facade.base_window;
                    else if (module.facade.pattern === 'ground_commercial' && f === 0) elDef = module.facade.base_door; 
                    else if (module.facade.pattern === 'ground_commercial' && f > 0) elDef = module.facade.base_window;
                }
                if (elDef && elDef.type !== 'empty') {
                    const cellStartX = c * refCellW, cellStartY = f * refCellH;
                    const cx = (-faceW/2) + cellStartX + (cellRealW/2), cy = (-height/2) + cellStartY + (cellRealH/2);
                    const x = cx + (elDef.offset_x * cellRealW), y = cy + (elDef.offset_y * cellRealH);
                    elements.push(<group key={key} position={[x, y, 0.1]} onClick={(e) => { e.stopPropagation(); onSelect?.('element', module.id, { face, u: c, f: f }); }} > <ElementRenderer el={elDef} width={cellRealW} height={cellRealH} wallColor={module.wall_color_hex || project.default_wall_color_hex} /></group>);
                }
            }
        }
        return <group position={pos} rotation={rot}>{elements}</group>;
    };

    const wallTexture = useMemo(() => {
        if (!module.wall_texture_id) return null;
        const tex = getProceduralTexture(module.wall_texture_id, module.wall_color_hex || project.default_wall_color_hex);
        if (tex) tex.repeat.set(width / 4, height / 4);
        return tex;
    }, [module.wall_texture_id, module.wall_color_hex, width, height]);

    const roofTexture = useMemo(() => {
        if (!module.roof.texture_id) return null;
        const tex = getProceduralTexture(module.roof.texture_id, module.roof.color_hex);
        if (tex) tex.repeat.set(width / 4, depth / 4);
        return tex;
    }, [module.roof.texture_id, module.roof.color_hex, width, depth]);

    const children = project.modules.filter(m => m.attachment?.parent_id === module.id);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, data: any } | null>(null);

    const handleRoofClick = (e: any) => {
        e.stopPropagation();
        const hit = e.point, localHit = new THREE.Vector3().copy(hit).sub(new THREE.Vector3(...absPos)), n = e.face.normal;
        let face: 'front' | 'back' | 'left' | 'right' = 'front';
        if (n.z > 0.5) face = 'front'; else if (n.z < -0.5) face = 'back'; else if (n.x > 0.5) face = 'right'; else if (n.x < -0.5) face = 'left';
        let pos = 0.5, elev = 0.5;
        if (face === 'front' || face === 'back') { pos = (localHit.x + width/2) / width; elev = (localHit.y - height/2) / module.roof.height; }
        else { pos = (localHit.z + depth/2) / depth; elev = (localHit.y - height/2) / module.roof.height; }
        setContextMenu({ x: e.clientX, y: e.clientY, data: { face, position: Math.max(0, Math.min(1, pos)), elevation: Math.max(0, Math.min(1, elev)) } });
        onSelect?.('module', module.id);
    };

    const addDormer = (type: 'gabled' | 'skylight') => {
        if (!contextMenu) return;
        const { face, position, elevation } = contextMenu.data;
        const newProject = { ...project, modules: [...project.modules] };
        const idx = newProject.modules.findIndex(m => m.id === module.id);
        if (idx === -1) return;
        const m = { ...newProject.modules[idx], roof: { ...newProject.modules[idx].roof, dormers: [...(newProject.modules[idx].roof.dormers || [])] } };
        const newDormer = { id: `d_${Date.now()}`, face, position, elevation, width: type === 'skylight' ? 1.0 : 1.2, height: type === 'skylight' ? 1.2 : 1.5, type: type === 'skylight' ? 'skylight' : 'gabled', window: { mullions_cols: 2, mullions_rows: 2 } };
        m.roof.dormers.push(newDormer as any);
        newProject.modules[idx] = m;
        onUpdate?.(newProject);
        setContextMenu(null);
    };

    const deleteItem = (type: 'module' | 'dormer', id: string) => {
        const newProject = { ...project, modules: [...project.modules] };
        if (type === 'module') { if (id === 'main') { alert("Cannot delete main module."); return; } newProject.modules = newProject.modules.filter(m => m.id !== id); }
        else {
            const mIdx = newProject.modules.findIndex(m => m.id === module.id);
            if (mIdx !== -1) {
                const m = { ...newProject.modules[mIdx], roof: { ...newProject.modules[mIdx].roof, dormers: [...(newProject.modules[mIdx].roof.dormers || [])] } };
                m.roof.dormers = m.roof.dormers.filter(d => d.id !== id);
                newProject.modules[mIdx] = m;
            }
        }
        onUpdate?.(newProject);
        setContextMenu(null);
    };

    const moveDormer = (dormerId: string, val: THREE.Vector3) => {
        const newProject = { ...project, modules: [...project.modules] };
        const mIdx = newProject.modules.findIndex(m => m.id === module.id);
        if (mIdx === -1) return;
        const m = { ...newProject.modules[mIdx], roof: { ...newProject.modules[mIdx].roof, dormers: [...(newProject.modules[mIdx].roof.dormers || [])] } };
        const dIdx = m.roof.dormers.findIndex(d => d.id === dormerId);
        if (dIdx === -1) return;
        const d = { ...m.roof.dormers[dIdx] };
        if (d.face === 'front' || d.face === 'back') { d.position = (val.x + width/2) / width; d.elevation = (val.y - height/2) / module.roof.height; }
        else { d.position = (val.z + depth/2) / depth; d.elevation = (val.y - height/2) / module.roof.height; }
        d.position = Math.max(0, Math.min(1, d.position)); d.elevation = Math.max(0, Math.min(1, d.elevation));
        m.roof.dormers[dIdx] = d as any;
        newProject.modules[mIdx] = m;
        onUpdate?.(newProject);
    };

    return (
        <group>
            {contextMenu && (
                <Html fullscreen>
                    <div style={{ position: 'absolute', left: contextMenu.x, top: contextMenu.y, background: '#222', border: '1px solid #444', borderRadius: '4px', padding: '5px', zIndex: 10000, pointerEvents: 'auto' }} onMouseLeave={() => setContextMenu(null)} >
                        <div style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #333', color: '#fff' }} onClick={() => addDormer('gabled')}>🏠 Add Dormer</div>
                        <div style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #333', color: '#fff' }} onClick={() => addDormer('skylight')}>🪟 Add Skylight</div>
                        <div style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: '#ff5555' }} onClick={() => deleteItem('module', module.id)}>🗑️ Delete Module</div>
                    </div>
                </Html>
            )}
            <group position={absPos}>
                <mesh castShadow receiveShadow
                    onPointerEnter={(e: any) => { e.stopPropagation(); setHoveredFace(e.face.normal.x !== 0 ? (e.face.normal.x > 0 ? 'right' : 'left') : (e.face.normal.z !== 0 ? (e.face.normal.z > 0 ? 'front' : 'back') : 'top')); }}
                    onPointerLeave={() => setHoveredFace(null)}
                    onClick={(e) => {
                        e.stopPropagation();
                        let face = 'front';
                        if (e.face) { const n = e.face.normal; if (n.z > 0.5) face = 'front'; else if (n.z < -0.5) face = 'back'; else if (n.x > 0.5) face = 'right'; else if (n.x < -0.5) face = 'left'; else if (n.y > 0.5) face = 'top'; }
                        onSelect?.('face', module.id, { face });
                    }}
                >
                    <boxGeometry args={[width, height, depth]} />
                    <meshStandardMaterial color={module.wall_color_hex || project.default_wall_color_hex} map={wallTexture} emissive={isSelected ? "#333" : "#000"} />
                </mesh>
                {(isSelected || hoveredFace) && (
                    <group>
                        {((hoveredFace === 'right' || hoveredFace === 'left') || isSelected) && (
                            <>
                                <mesh position={[width/2 + 0.3, 0, 0]} onPointerDown={(e) => { e.stopPropagation(); setDragging('width'); setDragSide(1); }}><sphereGeometry args={[0.2, 16, 16]} /><meshStandardMaterial color="#2196F3" /></mesh>
                                <mesh position={[-width/2 - 0.3, 0, 0]} onPointerDown={(e) => { e.stopPropagation(); setDragging('width'); setDragSide(-1); }}><sphereGeometry args={[0.2, 16, 16]} /><meshStandardMaterial color="#2196F3" /></mesh>
                            </>
                        )}
                        {((hoveredFace === 'top') || isSelected) && (
                            <>
                                <mesh position={[0, height/2 + 0.3, 0]} onPointerDown={(e) => { e.stopPropagation(); setDragging('height'); setDragSide(1); }}><sphereGeometry args={[0.2, 16, 16]} /><meshStandardMaterial color="#4CAF50" /></mesh>
                                <mesh position={[0, -height/2 - 0.3, 0]} onPointerDown={(e) => { e.stopPropagation(); setDragging('height'); setDragSide(-1); }}><sphereGeometry args={[0.2, 16, 16]} /><meshStandardMaterial color="#4CAF50" /></mesh>
                            </>
                        )}
                        {((hoveredFace === 'front' || hoveredFace === 'back') || isSelected) && (
                            <>
                                <mesh position={[0, 0, depth/2 + 0.3]} onPointerDown={(e) => { e.stopPropagation(); setDragging('depth'); setDragSide(1); }}><sphereGeometry args={[0.2, 16, 16]} /><meshStandardMaterial color="#FF9800" /></mesh>
                                <mesh position={[0, 0, -depth/2 - 0.3]} onPointerDown={(e) => { e.stopPropagation(); setDragging('depth'); setDragSide(-1); }}><sphereGeometry args={[0.2, 16, 16]} /><meshStandardMaterial color="#FF9800" /></mesh>
                            </>
                        )}
                        {dragging && (
                            <>
                                <primitive object={proxyObject} />
                                <TransformControls 
                                    ref={transformRef} object={proxyObject} mode="translate" 
                                    showX={dragging === 'width'} showY={dragging === 'height'} showZ={dragging === 'depth'}
                                    onMouseDown={() => { isInteracting.current = true; }}
                                    onMouseUp={() => { isInteracting.current = false; setDragging(null); }} 
                                    onChange={() => { 
                                        if (isInteracting.current && dragging) { 
                                            const p = proxyObject.position; 
                                            if (dragging === 'width') handleDrag('width', (p.x/dragSide - 0.3) * 2); 
                                            else if (dragging === 'height') handleDrag('height', (p.y/dragSide - 0.3) * 2); 
                                            else handleDrag('depth', (p.z/dragSide - 0.3) * 2); 
                                        } 
                                    }} 
                                />
                            </>
                        )}
                    </group>
                )}
                <mesh geometry={roofGeo} position={[0, height/2, 0]} onClick={handleRoofClick} material={new THREE.MeshStandardMaterial({ color: module.roof.color_hex, side: THREE.DoubleSide, map: roofTexture })} />
                <primitive object={timberGeo} />
                {dormerGroups.map(d => (
                    <group key={d.id}>
                        <primitive object={d.mesh} position={d.pos} rotation={d.rot} onClick={(e: any) => { e.stopPropagation(); onSelect?.('dormer', module.id, { dormerId: d.id }); }} />
                        {selectedDormerId === d.id && (
                            <TransformControls object={d.mesh} mode="translate" onMouseUp={() => moveDormer(d.id, d.mesh.position)} />
                        )}
                        {selectedDormerId === d.id && (
                            <Html position={d.pos}><div style={{ background: '#222', border: '1px solid #444', borderRadius: '4px', padding: '5px' }}><button style={{ color: '#ff5555', background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px' }} onClick={() => deleteItem('dormer', d.id)}>Delete</button></div></Html>
                        )}
                    </group>
                ))}
                {renderFace('front')} {renderFace('back')} {renderFace('left')} {renderFace('right')}
            </group>
            {children.map(child => (
                <HouseModuleRenderer key={child.id} module={child} project={project} parentPos={absPos} parentDims={{ width, height, depth }} onSelect={onSelect} onUpdate={onUpdate} isSelected={child.id === (focusTarget?.moduleId)} selectedDormerId={selectedDormerId} focusTarget={focusTarget} />
            ))}
        </group>
    );
};

export const Scene: React.FC<Props> = ({ project, focusTarget, selectedDormerId, onSelect, onUpdate }) => {
    const roots = project.modules.filter(m => !m.attachment);
    return (
        <Canvas shadows camera={{ position: [25, 25, 25], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
            <Sky sunPosition={[10, 20, 10]} />
            <Environment preset="city" />
            <CameraController target={focusTarget} project={project} />
            {roots.map(root => (
                <HouseModuleRenderer key={root.id} module={root} project={project} onSelect={onSelect} onUpdate={onUpdate} isSelected={root.id === focusTarget?.moduleId} selectedDormerId={selectedDormerId} focusTarget={focusTarget} />
            ))}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow><planeGeometry args={[100, 100]} /><meshStandardMaterial color="#556655" /></mesh>
            <OrbitControls makeDefault />
        </Canvas>
    );
};

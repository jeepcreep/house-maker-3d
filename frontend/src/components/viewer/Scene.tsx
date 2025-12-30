import React, { useMemo, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { HouseProject, HouseModule, DimensionConfig, FacadeElement } from '../../types/schema';
import { createRoofGeometry, createTimberGeometry } from '../../utils/geometry';
import { createWindowGeometry, createDoorGeometry, createBalconyGeometry, createPorchGeometry, createStairGeometry, createDormerGeometry, createSkylightGeometry } from '../../utils/elements';

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

// Sub-component to render a specific Facade Element
const ElementRenderer: React.FC<{ el: FacadeElement, width: number, height: number, wallColor?: string }> = ({ el, width, height, wallColor }) => {
    const realW = width * el.width_ratio;
    const realH = height * el.height_ratio;
    
    // Geometry Generation
    const meshGroup = useMemo(() => {
        let g = new THREE.Group();
        
        if (el.type === 'window') g = createWindowGeometry(el, realW, realH, wallColor);
        else if (el.type === 'door') g = createDoorGeometry(el, realW, realH);
        
        // Add Balcony if present
        if (el.balcony) {
            const balconyG = createBalconyGeometry(el, realW, realH);
            g.add(balconyG);
        }

        // Add Porch if present
        if (el.porch) {
            const porchG = createPorchGeometry(el, realW, realH);
            g.add(porchG);
        }
        
        // Add Stairs if present
        if (el.stairs) {
            let startZ = 0;
            let startY = -realH/2;
            
            if (el.porch) {
                startZ = el.porch.depth || 1.5;
                // Porch deck top is at -realH/2
                startY = -realH/2; 
            }
            
            const stairG = createStairGeometry(el, realW, realH, startY, startZ);
            g.add(stairG);
        }
        
        return g;
    }, [el, realW, realH]);

    return <primitive object={meshGroup} />;
};

interface Props {
    project: HouseProject;
    focusTarget?: { moduleId: string, face: string };
}

// Camera Controller Component
const CameraController: React.FC<{ target: { moduleId: string, face: string } | undefined, project: HouseProject }> = ({ target }) => {
    const { camera, controls } = useThree() as any; 

    useEffect(() => {
        if (target && controls) {
            // Simple Focus Logic:
            // 1. Move camera to a good viewing angle based on face.
            // 2. Look at center (0, H/2, 0).
            
            const dist = 35;
            const height = 15;
            let pos = [dist, height, dist];
            
            if (target.face === 'front') pos = [0, height, dist];
            else if (target.face === 'back') pos = [0, height, -dist];
            else if (target.face === 'right') pos = [dist, height, 0];
            else if (target.face === 'left') pos = [-dist, height, 0];
            else if (target.face === 'top') pos = [0, dist*1.5, 0]; // Bird's eye

            // Smooth transition could be added here with GSAP/Spring, but set is fine for MVP
            camera.position.set(...pos);
            controls.target.set(0, 5, 0); 
            controls.update();
        }
    }, [target?.moduleId, target?.face]); // Only re-run if ID or Face changes

    return null;
};

const HouseModuleRenderer: React.FC<{ 
    module: HouseModule, 
    project: HouseProject, 
    parentPos?: [number, number, number],
    parentDims?: { width: number, height: number, depth: number }
}> = ({ module, project, parentPos = [0,0,0], parentDims }) => {
    
    const { global_dimensions } = project;
    const { width, height, depth, uW, fH, cD } = getModuleDims(module, global_dimensions);
    
    // Attachment Logic
    let localX = 0, localY = 0, localZ = 0;
    if (module.attachment && parentDims) {
        const att = module.attachment;
        const pW = parentDims.width;
        const pH = parentDims.height;
        const pD = parentDims.depth;
        
        if (att.face === 'front') {
            localX = (-pW / 2) + (att.origin_x * uW) + (width / 2);
            localY = (-pH / 2) + (att.origin_y * fH) + (height / 2);
            localZ = (pD / 2) + (depth / 2);
        } else if (att.face === 'back') {
            localX = (-pW / 2) + (att.origin_x * uW) + (width / 2);
            localY = (-pH / 2) + (att.origin_y * fH) + (height / 2);
            localZ = (-pD / 2) - (depth / 2);
        } else if (att.face === 'right') {
            localX = (pW / 2) + (width / 2); 
            localZ = (pD / 2) - (att.origin_x * cD) - (depth / 2);
            localY = (-pH / 2) + (att.origin_y * fH) + (height / 2);
        } else if (att.face === 'left') {
            localX = (-pW / 2) - (width / 2);
            localZ = (pD / 2) - (att.origin_x * cD) - (depth / 2);
            localY = (-pH / 2) + (att.origin_y * fH) + (height / 2);
        } else if (att.face === 'top') {
            localY = (pH / 2) + (height / 2);
            localX = (-pW / 2) + (att.origin_x * uW) + (width / 2);
            localZ = (pD / 2) - (att.origin_y * cD) - (depth / 2);
        }
    } else {
        localY = height / 2;
    }

    const absPos: [number, number, number] = [ parentPos[0] + localX, parentPos[1] + localY, parentPos[2] + localZ ];

    const roofGeo = useMemo(() => 
        createRoofGeometry(width, depth, module.roof), 
        [width, depth, module.roof]
    );

    const timberGeo = useMemo(() => {
        if (!module.facade?.timbering?.enabled) return new THREE.Group();
        return createTimberGeometry(width, height, depth, module.grid, module.facade.timbering, module.facade.overrides);
    }, [width, height, depth, module.grid, module.facade?.timbering, module.facade?.overrides]);

    const dormerGroups = useMemo(() => {
        if (!module.roof.dormers || module.roof.dormers.length === 0) return [];
        
        return module.roof.dormers.map(d => {
            const isSkylight = d.type === 'skylight';
            const g = isSkylight ? createSkylightGeometry(d) : createDormerGeometry(d);
            
            // Positioning Logic
            const rH = module.roof.height;
            const yBase = height; // Wall top
            
            let x = 0, y = 0, z = 0;
            let rotY = 0;
            let rotX = 0;
            
            // 0..1 along the face width
            const posRatio = d.position;
            // 0..1 up the slope
            const elevRatio = d.elevation;
            
            // Calculate Y (elevation)
            // Fix: User finds it too high ("at ridge").
            // Usually elevation 0 = Eaves (yBase).
            // Elevation 1 = Ridge (yBase + rH).
            // But if Dormer is centered, at elev=1 it sits ON the ridge (half above).
            // Let's trust the math but add the manual offset.
            y = yBase + (elevRatio * rH) + (d.y_offset || 0);
            
            // Rotation: Manual or face-based fallback
            // Convert degrees to radians
            rotY = d.rotation_y !== undefined ? (d.rotation_y * Math.PI / 180) : 0;
            rotX = d.rotation_x !== undefined ? (d.rotation_x * Math.PI / 180) : 0;
            
            // Calculate Pitch for Skylights
            // Front/Back
            const pitchFB = Math.atan2(rH, depth/2);
            // Side
            const pitchLR = Math.atan2(rH, width/2);

            if (d.face === 'front') {
                x = (-width/2) + (posRatio * width);
                z = (depth/2) * (1 - elevRatio); // Corrected: Top is 0, Bottom is depth/2
                if (d.rotation_y === undefined) rotY = 0;
                if (isSkylight && d.rotation_x === undefined) rotX = pitchFB;
            } else if (d.face === 'back') {
                x = (-width/2) + (posRatio * width);
                z = -(depth/2) * (1 - elevRatio);
                if (d.rotation_y === undefined) rotY = Math.PI;
                if (isSkylight && d.rotation_x === undefined) rotX = pitchFB;
            } else if (d.face === 'right') {
                z = (depth/2) - (posRatio * depth);
                x = (width/2) * (1 - elevRatio);
                if (d.rotation_y === undefined) rotY = Math.PI / 2;
                if (isSkylight && d.rotation_x === undefined) rotX = pitchLR;
            } else if (d.face === 'left') {
                z = (-depth/2) + (posRatio * depth);
                x = -(width/2) * (1 - elevRatio);
                if (d.rotation_y === undefined) rotY = -Math.PI / 2;
                if (isSkylight && d.rotation_x === undefined) rotX = pitchLR;
            }
            
            return { mesh: g, pos: [x,y,z] as [number,number,number], rot: [rotX, rotY, 0] as [number,number,number], id: d.id };
        });
    }, [module.roof.dormers, width, height, depth, module.roof.height]);

    // --- FACADE RENDERING LOGIC ---
    const renderFace = (face: 'front' | 'back' | 'left' | 'right') => {
        const elements = [];
        const isSide = face === 'left' || face === 'right';
        
        const totalUnits = isSide ? module.grid.depth : module.grid.units;
        const totalFloors = module.grid.floors;
        
        const faceW = isSide ? depth : width;
        
        const refCellW = isSide ? cD : uW; 
        const refCellH = fH;

        const cols = Math.ceil(totalUnits);
        const floors = Math.ceil(totalFloors);

        let rot: [number, number, number] = [0, 0, 0];
        let pos: [number, number, number] = [0, 0, 0];
        
        if (face === 'front') pos = [0, 0, depth/2];
        else if (face === 'back') { pos = [0, 0, -depth/2]; rot = [0, Math.PI, 0]; }
        else if (face === 'right') { pos = [width/2, 0, 0]; rot = [0, Math.PI/2, 0]; }
        else if (face === 'left') { pos = [-width/2, 0, 0]; rot = [0, -Math.PI/2, 0]; }

        for (let f = 0; f < floors; f++) {
            for (let c = 0; c < cols; c++) {
                const remainderX = totalUnits - c;
                const cellScaleX = (remainderX >= 1) ? 1 : remainderX;
                const cellRealW = refCellW * cellScaleX;

                const remainderY = totalFloors - f;
                const cellScaleY = (remainderY >= 1) ? 1 : remainderY;
                const cellRealH = refCellH * cellScaleY;

                if (cellScaleX < 0.2 || cellScaleY < 0.2) continue;

                const key = `${c}_${f}_${face}`;
                let elDef = module.facade?.overrides?.[key];
                
                if (!elDef && module.facade) {
                    if (module.facade.pattern === 'fill_window') elDef = module.facade.base_window;
                    else if (module.facade.pattern === 'ground_commercial' && f === 0) elDef = module.facade.base_door; 
                    else if (module.facade.pattern === 'ground_commercial' && f > 0) elDef = module.facade.base_window;
                }

                if (elDef && elDef.type !== 'empty') {
                    const cellStartX = c * refCellW;
                    const cellStartY = f * refCellH;
                    
                    const cx = (-faceW/2) + cellStartX + (cellRealW/2);
                    const cy = (-height/2) + cellStartY + (cellRealH/2);
                    
                    const x = cx + (elDef.offset_x * cellRealW);
                    const y = cy + (elDef.offset_y * cellRealH);

                    elements.push(
                        <group key={key} position={[x, y, 0.1]}> 
                            <ElementRenderer 
                                el={elDef} 
                                width={cellRealW} 
                                height={cellRealH} 
                                wallColor={module.wall_color_hex || project.default_wall_color_hex}
                            />
                        </group>
                    );
                }
            }
        }
        
        return <group position={pos} rotation={rot}>{elements}</group>;
    };

    const children = project.modules.filter(m => m.attachment?.parent_id === module.id);

    return (
        <group>
            <group position={absPos}>
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[width, height, depth]} />
                    <meshStandardMaterial color={module.wall_color_hex || project.default_wall_color_hex} />
                </mesh>
                
                {/* Roof */}
                <mesh 
                    geometry={roofGeo} 
                    position={[0, height/2, 0]} 
                    material={new THREE.MeshStandardMaterial({ color: module.roof.color_hex, side: THREE.DoubleSide })} 
                />

                {/* Timbering */}
                <primitive object={timberGeo} />

                {/* Dormers */}
                {dormerGroups.map(d => (
                    <primitive key={d.id} object={d.mesh} position={d.pos} rotation={d.rot} />
                ))}

                {/* Render Faces */}
                {renderFace('front')}
                {renderFace('back')}
                {renderFace('left')}
                {renderFace('right')}
            </group>

            {children.map(child => (
                <HouseModuleRenderer 
                    key={child.id} 
                    module={child} 
                    project={project} 
                    parentPos={absPos} 
                    parentDims={{ width, height, depth }}
                />
            ))}
        </group>
    );
};

export const Scene: React.FC<Props> = ({ project, focusTarget }) => {
    const roots = project.modules.filter(m => !m.attachment);

    return (
        <Canvas shadows camera={{ position: [25, 25, 25], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
            <Sky sunPosition={[10, 20, 10]} />
            <Environment preset="city" />
            
            <CameraController target={focusTarget} project={project} />

            {roots.map(root => (
                <HouseModuleRenderer key={root.id} module={root} project={project} />
            ))}
            
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#556655" />
            </mesh>

            <OrbitControls makeDefault />
        </Canvas>
    );
};

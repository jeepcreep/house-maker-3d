import React, { useMemo, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { HouseProject, HouseModule, DimensionConfig, FacadeElement } from '../../types/schema';
import { createRoofGeometry } from '../../utils/geometry';
import { createWindowGeometry, createDoorGeometry } from '../../utils/elements';

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
const ElementRenderer: React.FC<{ el: FacadeElement, width: number, height: number }> = ({ el, width, height }) => {
    const realW = width * el.width_ratio;
    const realH = height * el.height_ratio;
    
    // Geometry Generation
    const meshGroup = useMemo(() => {
        if (el.type === 'window') return createWindowGeometry(el, realW, realH);
        if (el.type === 'door') return createDoorGeometry(el, realW, realH);
        return new THREE.Group();
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
        else if (face === 'right') { pos = [width/2, 0, 0]; rot = [0, -Math.PI/2, 0]; }
        else if (face === 'left') { pos = [-width/2, 0, 0]; rot = [0, Math.PI/2, 0]; }

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
                        <group key={key} position={[x, y, 0.05]}> 
                            <ElementRenderer el={elDef} width={cellRealW} height={cellRealH} />
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

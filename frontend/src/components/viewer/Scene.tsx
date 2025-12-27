import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { HouseProject, HouseModule, DimensionConfig } from '../../types/schema';
import { createRoofGeometry } from '../../utils/geometry';

interface Props {
    project: HouseProject;
}

// Helper: Get dimensions of a specific module
function getModuleDims(module: HouseModule, dims: DimensionConfig) {
    let uW, fH, cD;
    
    if (dims.mode === 'absolute') {
        // Fallback for absolute mode (assume module grid=1 is total size)
        // This is tricky. Let's assume relative mode is standard for modularity.
        // Or assume absolute params ARE the unit size.
        uW = dims.total_width || 3;
        fH = dims.total_height || 3;
        cD = dims.total_depth || 3;
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
        // Unit sizes for grid calculation
        uW, fH, cD
    };
}

// Component to Render a Single Module
const HouseModuleRenderer: React.FC<{ 
    module: HouseModule, 
    project: HouseProject, 
    parentPos?: [number, number, number],
    parentDims?: { width: number, height: number, depth: number }
}> = ({ module, project, parentPos = [0,0,0], parentDims }) => {
    
    const { global_dimensions } = project;
    const { width, height, depth, uW, fH, cD } = getModuleDims(module, global_dimensions);
    
    // Calculate Local Position relative to Parent
    let localX = 0, localY = 0, localZ = 0;

    if (module.attachment && parentDims) {
        const att = module.attachment;
        const pW = parentDims.width;
        const pH = parentDims.height;
        const pD = parentDims.depth;

        // Origin Offset based on grid index
        // origin_x = unit index. origin_y = floor index.
        // We align the START (Bottom/Left/Back) of the module to this grid point.
        
        // Face Logic: Center of Module should act as anchor? 
        // Or Bottom-Center? The box is drawn centered at (0,0,0) usually.
        // Let's assume box origin is CENTER.
        
        if (att.face === 'front') {
            // Attach to Front Face (Z+)
            // X: -pW/2 + (origin_x * uW) + (width/2) --> Align Left edge to Unit Start
            localX = (-pW / 2) + (att.origin_x * uW) + (width / 2);
            // Y: -pH/2 + (att.origin_y * fH) + (height / 2)
            // But wait, our "Ground" is usually 0 if we build up.
            // Let's assume standard BoxGeometry center.
            localY = (-pH / 2) + (att.origin_y * fH) + (height / 2);
            // Z: pD/2 + depth/2 --> Stack on front
            localZ = (pD / 2) + (depth / 2);
        } else if (att.face === 'back') {
            localX = (-pW / 2) + (att.origin_x * uW) + (width / 2);
            localY = (-pH / 2) + (att.origin_y * fH) + (height / 2);
            localZ = (-pD / 2) - (depth / 2);
        } else if (att.face === 'right') {
            localX = (pW / 2) + (width / 2); // Stack on right
            // Z acts as horizontal axis on side face
            // origin_x is Z-index (depth unit)
            localZ = (pD / 2) - (att.origin_x * cD) - (depth / 2); // Start from front? 
            // Usually Grid counts from Left/Front.
            // Let's say Z index 0 is Front.
            localY = (-pH / 2) + (att.origin_y * fH) + (height / 2);
        } else if (att.face === 'left') {
            localX = (-pW / 2) - (width / 2);
            localZ = (pD / 2) - (att.origin_x * cD) - (depth / 2);
            localY = (-pH / 2) + (att.origin_y * fH) + (height / 2);
        } else if (att.face === 'top') {
            localY = (pH / 2) + (height / 2); // Stack on top
            localX = (-pW / 2) + (att.origin_x * uW) + (width / 2);
            // origin_y is Depth index for top face
            localZ = (pD / 2) - (att.origin_y * cD) - (depth / 2);
        }
    } else {
        // Root Module (or detached)
        // Position so bottom is at Y=0
        localY = height / 2;
    }

    // Absolute Position
    const absPos: [number, number, number] = [
        parentPos[0] + localX,
        parentPos[1] + localY,
        parentPos[2] + localZ
    ];

    // Roof
    const roofGeo = useMemo(() => 
        createRoofGeometry(width, depth, module.roof), 
        [width, depth, module.roof]
    );

    // Find Children
    const children = project.modules.filter(m => m.attachment?.parent_id === module.id);

    return (
        <group>
            <group position={absPos}>
                {/* Walls */}
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[width, height, depth]} />
                    <meshStandardMaterial color={module.wall_color_hex || project.default_wall_color_hex} />
                </mesh>
                
                {/* Visual Grid Lines */}
                <mesh>
                    <lineSegments>
                        <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
                        <lineBasicMaterial color="black" />
                    </lineSegments>
                </mesh>

                {/* Roof */}
                <mesh 
                    geometry={roofGeo} 
                    position={[0, height/2, 0]} 
                    material={new THREE.MeshStandardMaterial({ color: module.roof.color_hex, side: THREE.DoubleSide })} 
                />
            </group>

            {/* Render Children */}
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

export const Scene: React.FC<Props> = ({ project }) => {
    // Find Root(s) - modules with no attachment or parent_id 'root' (optional convention)
    // Actually, check undefined attachment
    const roots = project.modules.filter(m => !m.attachment);

    return (
        <Canvas shadows camera={{ position: [25, 25, 25], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
            <Sky sunPosition={[10, 20, 10]} />
            <Environment preset="city" />
            
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
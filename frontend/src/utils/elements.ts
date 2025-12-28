import * as THREE from 'three';
import type { FacadeElement } from '../types/schema';

const DEFAULT_FRAME_COLOR = "#333333";
const DEFAULT_GLASS_COLOR = "#aaccff";

export function createWindowGeometry(el: FacadeElement, realW: number, realH: number) {
    // 1. Frame
    const frameThick = 0.08;
    const frameDepth = 0.15;
    const glassDepth = 0.02;
    
    // Group to hold meshes
    const group = new THREE.Group();
    
    // Materials
    const frameMat = new THREE.MeshStandardMaterial({ color: el.window?.frame_color || DEFAULT_FRAME_COLOR });
    const glassMat = new THREE.MeshPhysicalMaterial({ 
        color: el.window?.glass_color || DEFAULT_GLASS_COLOR,
        transparent: true, opacity: 0.6, roughness: 0, metalness: 0.1
    });

    // Outer Frame Box (simplified as 4 boxes or 1 extruded shape? 4 boxes is faster for now)
    const addBox = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z);
        group.add(m);
    };

    // Frame Top/Bottom
    addBox(realW, frameThick, frameDepth, 0, realH/2 - frameThick/2, 0, frameMat);
    addBox(realW, frameThick, frameDepth, 0, -realH/2 + frameThick/2, 0, frameMat);
    // Frame Left/Right
    addBox(frameThick, realH - frameThick*2, frameDepth, -realW/2 + frameThick/2, 0, 0, frameMat);
    addBox(frameThick, realH - frameThick*2, frameDepth, realW/2 - frameThick/2, 0, 0, frameMat);

    // Glass
    addBox(realW - frameThick, realH - frameThick, glassDepth, 0, 0, -0.02, glassMat);

    // Mullions / Grid
    if (el.window) {
        const cols = el.window.mullions_cols || 1;
        const rows = el.window.mullions_rows || 1;
        const mulThick = 0.03;

        // Vertical Mullions
        const innerW = realW - frameThick*2;
        const colStep = innerW / cols;
        for (let i = 1; i < cols; i++) {
            addBox(mulThick, realH - frameThick, frameDepth * 0.8, -innerW/2 + (colStep * i), 0, 0, frameMat);
        }

        // Horizontal Mullions
        const innerH = realH - frameThick*2;
        const rowStep = innerH / rows;
        for (let i = 1; i < rows; i++) {
            addBox(innerW, mulThick, frameDepth * 0.8, 0, -innerH/2 + (rowStep * i), 0, frameMat);
        }
    }

    return group;
}

export function createDoorGeometry(el: FacadeElement, realW: number, realH: number) {
    const group = new THREE.Group();
    const frameThick = 0.1;
    const frameDepth = 0.2;
    const doorDepth = 0.08;
    
    const color = el.door?.color || "#442211";
    const mat = new THREE.MeshStandardMaterial({ color });
    const frameMat = new THREE.MeshStandardMaterial({ color: "#333" });

    // Frame (Left, Right, Top) - No bottom frame for doors usually
    const addBox = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
        mesh.position.set(x, y, z);
        group.add(mesh);
    };

    addBox(frameThick, realH, frameDepth, -realW/2 + frameThick/2, 0, 0, frameMat); // Left
    addBox(frameThick, realH, frameDepth, realW/2 - frameThick/2, 0, 0, frameMat); // Right
    addBox(realW, frameThick, frameDepth, 0, realH/2 - frameThick/2, 0, frameMat); // Top

    // Leaf(s)
    // Pivot should be near frame.
    // If 2 leafs, split width.
    const leafs = el.door?.leafs || 1;
    const leafW = (realW - frameThick*2) / leafs;
    const leafH = realH - frameThick; // Gap at bottom?
    
    // Position: Bottom of door is at -realH/2. Leaf sits on floor.
    // Center of Leaf Y = -realH/2 + leafH/2.
    
    for (let i = 0; i < leafs; i++) {
        // Center X depends on leaf index
        let x = 0;
        if (leafs === 1) x = 0;
        else x = (i === 0) ? -leafW/2 : leafW/2;
        
        addBox(leafW - 0.01, leafH - 0.01, doorDepth, x, -frameThick/2, -0.02, mat);
        
        // Window in door?
        if (el.door?.has_window) {
            const winW = leafW * 0.6;
            const winH = leafH * 0.4;
            const glassMat = new THREE.MeshPhysicalMaterial({ color: "#aaccff", transparent: true, opacity: 0.7 });
            // Add glass (slightly thicker than door to stick out or cut hole? Cut hole is hard with BoxGeometry)
            // Visual trick: Add black box "hole" + glass on top
            addBox(winW, winH, doorDepth + 0.01, x, 0.2, -0.02, glassMat);
        }
    }

    return group;
}

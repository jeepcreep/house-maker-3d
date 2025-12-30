import * as THREE from 'three';
import type { FacadeElement } from '../types/schema';

const DEFAULT_FRAME_COLOR = "#333333";
const DEFAULT_GLASS_COLOR = "#aaccff";

export function createWindowGeometry(el: FacadeElement, realW: number, realH: number) {
    const group = new THREE.Group();
    
    // Materials
    const frameMat = new THREE.MeshStandardMaterial({ color: el.window?.frame_color || DEFAULT_FRAME_COLOR });
    const glassMat = new THREE.MeshPhysicalMaterial({ 
        color: el.window?.glass_color || DEFAULT_GLASS_COLOR,
        transparent: true, opacity: 0.6, roughness: 0, metalness: 0.1
    });

    const fThick = 0.08;
    const fDepth = 0.15;

    // --- SHAPE LOGIC ---
    const createShape = (inset: number) => {
        const s = new THREE.Shape();
        const w = realW - inset*2;
        const h = realH - inset*2;
        if (w <= 0.001 || h <= 0.001) return s;

        const x = -w/2;
        const y = -h/2;
        
        // Radii (Max is half of smallest dimension)
        const maxR = Math.min(w, h) / 2;
        const rtl = (el.window?.corner_radius_tl || 0) * maxR;
        const rtr = (el.window?.corner_radius_tr || 0) * maxR;
        const rbr = (el.window?.corner_radius_br || 0) * maxR;
        const rbl = (el.window?.corner_radius_bl || 0) * maxR;

        // Draw CCW
        
        // Start after Bottom-Right corner
        s.moveTo(x + w, y + rbr);
        
        // 1. Right Side
        s.lineTo(x + w, y + h - rtr);

        // 2. Top-Right Corner
        if (rtr > 0.001) s.absarc(x + w - rtr, y + h - rtr, rtr, 0, Math.PI/2, false);
        else s.lineTo(x + w, y + h);

        // 3. Top Side
        s.lineTo(x + rtl, y + h);

        // 4. Top-Left Corner
        if (rtl > 0.001) s.absarc(x + rtl, y + h - rtl, rtl, Math.PI/2, Math.PI, false);
        else s.lineTo(x, y + h);

        // 5. Left Side
        s.lineTo(x, y + rbl);

        // 6. Bottom-Left Corner
        if (rbl > 0.001) s.absarc(x + rbl, y + rbl, rbl, Math.PI, Math.PI*1.5, false);
        else s.lineTo(x, y);

        // 7. Bottom Side
        s.lineTo(x + w - rbr, y);

        // 8. Bottom-Right Corner
        if (rbr > 0.001) s.absarc(x + w - rbr, y + rbr, rbr, -Math.PI/2, 0, false);
        
        // Close
        s.closePath(); // Important for Extrude
        
        return s;
    };

    // 1. FRAME
    const outer = createShape(0);
    const inner = createShape(fThick);
    outer.holes.push(inner);
    
    const frameGeo = new THREE.ExtrudeGeometry(outer, { depth: fDepth, bevelEnabled: false, curveSegments: 32 });
    frameGeo.translate(0, 0, -fDepth/2);
    group.add(new THREE.Mesh(frameGeo, frameMat));

    // 2. GLASS
    const glassGeo = new THREE.ExtrudeGeometry(inner, { depth: 0.02, bevelEnabled: false, curveSegments: 32 });
    glassGeo.translate(0, 0, -0.02);
    group.add(new THREE.Mesh(glassGeo, glassMat));

    // 3. MULLIONS (Clipped Grid)
    if (el.window) {
        const cols = el.window.mullions_cols || 1;
        const rows = el.window.mullions_rows || 1;
        const mThick = 0.03;
        const iW = realW - fThick*2;
        const iH = realH - fThick*2;

        const maxR = Math.min(iW, iH) / 2;
        const rtl = (el.window?.corner_radius_tl || 0) * maxR;
        const rtr = (el.window?.corner_radius_tr || 0) * maxR;
        const rbr = (el.window?.corner_radius_br || 0) * maxR;
        const rbl = (el.window?.corner_radius_bl || 0) * maxR;

        // Vertical Mullions
        const colStep = iW / cols;
        for (let i = 1; i < cols; i++) {
            const curX = -iW/2 + colStep*i;
            
            // Calculate available height at this X to avoid sticking out
            let minY = -iH/2;
            let maxY = iH/2;

            // Bottom clipping
            if (curX > iW/2 - rbr) {
                const dx = curX - (iW/2 - rbr);
                minY = -iH/2 + rbr - Math.sqrt(Math.max(0, rbr*rbr - dx*dx));
            } else if (curX < -iW/2 + rbl) {
                const dx = curX - (-iW/2 + rbl);
                minY = -iH/2 + rbl - Math.sqrt(Math.max(0, rbl*rbl - dx*dx));
            }

            // Top clipping
            if (curX > iW/2 - rtr) {
                const dx = curX - (iW/2 - rtr);
                maxY = iH/2 - rtr + Math.sqrt(Math.max(0, rtr*rtr - dx*dx));
            } else if (curX < -iW/2 + rtl) {
                const dx = curX - (-iW/2 + rtl);
                maxY = iH/2 - rtl + Math.sqrt(Math.max(0, rtl*rtl - dx*dx));
            }

            const h = maxY - minY;
            const m = new THREE.Mesh(new THREE.BoxGeometry(mThick, h, 0.05), frameMat);
            m.position.set(curX, minY + h/2, 0);
            group.add(m);
        }
        
        // Horizontal Mullions
        const rowStep = iH / rows;
        for (let i = 1; i < rows; i++) {
            const curY = -iH/2 + rowStep*i;
            
            let minX = -iW/2;
            let maxX = iW/2;

            // Left clipping
            if (curY < -iH/2 + rbl) {
                const dy = curY - (-iH/2 + rbl);
                minX = -iW/2 + rbl - Math.sqrt(Math.max(0, rbl*rbl - dy*dy));
            } else if (curY > iH/2 - rtl) {
                const dy = curY - (iH/2 - rtl);
                minX = -iW/2 + rtl - Math.sqrt(Math.max(0, rtl*rtl - dy*dy));
            }

            // Right clipping
            if (curY < -iH/2 + rbr) {
                const dy = curY - (-iH/2 + rbr);
                maxX = iW/2 - rbr + Math.sqrt(Math.max(0, rbr*rbr - dy*dy));
            } else if (curY > iH/2 - rtr) {
                const dy = curY - (iH/2 - rtr);
                maxX = iW/2 - rtr + Math.sqrt(Math.max(0, rtr*rtr - dy*dy));
            }

            const w = maxX - minX;
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, mThick, 0.05), frameMat);
            m.position.set(minX + w/2, curY, 0);
            group.add(m);
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

    // Frame (Left, Right, Top)
    const addBox = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
        mesh.position.set(x, y, z);
        group.add(mesh);
    };

    addBox(frameThick, realH, frameDepth, -realW/2 + frameThick/2, 0, 0, frameMat); // Left
    addBox(frameThick, realH, frameDepth, realW/2 - frameThick/2, 0, 0, frameMat); // Right
    addBox(realW, frameThick, frameDepth, 0, realH/2 - frameThick/2, 0, frameMat); // Top

    // Leaf(s)
    const leafs = el.door?.leafs || 1;
    const leafW = (realW - frameThick*2) / leafs;
    const leafH = realH - frameThick;
    
    for (let i = 0; i < leafs; i++) {
        let x = 0;
        if (leafs === 1) x = 0;
        else x = (i === 0) ? -leafW/2 : leafW/2;
        
        addBox(leafW - 0.01, leafH - 0.01, doorDepth, x, -frameThick/2, -0.02, mat);
        
        if (el.door?.has_window) {
            const winW = leafW * 0.6;
            const winH = leafH * 0.4;
            const glassMat = new THREE.MeshPhysicalMaterial({ color: "#aaccff", transparent: true, opacity: 0.7 });
            addBox(winW, winH, doorDepth + 0.01, x, 0.2, -0.02, glassMat);
        }
    }

    return group;
}
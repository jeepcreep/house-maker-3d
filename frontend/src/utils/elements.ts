import * as THREE from 'three';
import type { FacadeElement, DormerConfig } from '../types/schema';

const DEFAULT_FRAME_COLOR = "#333333";
const DEFAULT_GLASS_COLOR = "#aaccff";

export function createWindowGeometry(el: FacadeElement | { window: any }, realW: number, realH: number, wallColor?: string) {
    const group = new THREE.Group();
    const winConfig = 'window' in el ? el.window : null;
    
    // Materials
    const frameMat = new THREE.MeshStandardMaterial({ color: winConfig?.frame_color || DEFAULT_FRAME_COLOR });
    const glassMat = new THREE.MeshPhysicalMaterial({ 
        color: winConfig?.glass_color || DEFAULT_GLASS_COLOR,
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
        let rtl = (winConfig?.corner_radius_tl || 0) * maxR;
        let rtr = (winConfig?.corner_radius_tr || 0) * maxR;
        let rbr = (winConfig?.corner_radius_br || 0) * maxR;
        let rbl = (winConfig?.corner_radius_bl || 0) * maxR;

        // Shape Overrides
        if (winConfig?.shape === 'arch') {
            rtl = maxR; rtr = maxR; rbr = 0; rbl = 0;
        } else if (winConfig?.shape === 'round') {
            rtl = maxR; rtr = maxR; rbr = maxR; rbl = maxR;
        }

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

    // 1.5 OCCLUSION PLANE (To hide timbering behind glass)
    if (wallColor) {
        // Simple plane covering the window opening
        // Size: realW, realH (minus a bit to fit inside frame?)
        // Or full size behind frame.
        // Let's make it fit inner opening approx or just full size.
        // Full size might clip with frame if z-fighting.
        // Inner size `realW - fThick*2` is safer.
        const occW = realW - fThick;
        const occH = realH - fThick;
        const occMat = new THREE.MeshBasicMaterial({ color: wallColor }); // Match wall
        const occMesh = new THREE.Mesh(new THREE.PlaneGeometry(occW, occH), occMat);
        // Position: z = -0.04
        occMesh.position.set(0, 0, -0.04);
        group.add(occMesh);
    }

    // 2. GLASS
    const glassGeo = new THREE.ExtrudeGeometry(inner, { depth: 0.02, bevelEnabled: false, curveSegments: 32 });
    glassGeo.translate(0, 0, -0.02);
    group.add(new THREE.Mesh(glassGeo, glassMat));

    // 3. MULLIONS (Clipped Grid)
    if (winConfig) {
        const cols = winConfig.mullions_cols || 1;
        const rows = winConfig.mullions_rows || 1;
        const mThick = 0.03;
        const iW = realW - fThick*2;
        const iH = realH - fThick*2;

        const maxR = Math.min(iW, iH) / 2;
        const rtl = (winConfig?.corner_radius_tl || 0) * maxR;
        const rtr = (winConfig?.corner_radius_tr || 0) * maxR;
        const rbr = (winConfig?.corner_radius_br || 0) * maxR;
        const rbl = (winConfig?.corner_radius_bl || 0) * maxR;

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
        
        // 4. SHUTTERS
        if (winConfig.shutters) {
            const sh = winConfig.shutters;
            const sW = realW / 2;
            const sH = realH;
            const sThick = 0.05;
            const sMat = new THREE.MeshStandardMaterial({ color: sh.color || "#553322" });
            
            const createShutter = (x: number) => {
                const g = new THREE.Group();
                // Base Board
                const board = new THREE.Mesh(new THREE.BoxGeometry(sW, sH, sThick), sMat);
                g.add(board);
                
                // Style details (simplified texture/geo)
                if (sh.style === 'louvred') {
                    // Horizontal slats
                    const cnt = 10;
                    const slatH = sH / cnt;
                    const slatMat = new THREE.MeshStandardMaterial({ color: "#331100" }); // Darker
                    for(let k=0; k<cnt; k++) {
                        const sl = new THREE.Mesh(new THREE.BoxGeometry(sW-0.04, slatH*0.5, sThick+0.02), slatMat);
                        sl.position.set(0, -sH/2 + k*slatH + slatH/2, 0);
                        g.add(sl);
                    }
                } else if (sh.style === 'panel') {
                     // Inset panel
                     const p = new THREE.Mesh(new THREE.BoxGeometry(sW*0.7, sH*0.7, sThick+0.02), sMat); // Same color, sticks out
                     g.add(p);
                }
                
                g.position.set(x, 0, 0); // Z=0 (on wall face)
                return g;
            };

            if (sh.open !== false) { // Default open
                group.add(createShutter(-realW/2 - sW/2)); // Left
                group.add(createShutter(realW/2 + sW/2));  // Right
            } else {
                 // Closed (Covering window)
                 // Shift Z forward slightly
                 const closedL = createShutter(-sW/2);
                 closedL.position.z = 0.1;
                 group.add(closedL);
                 const closedR = createShutter(sW/2);
                 closedR.position.z = 0.1;
                 group.add(closedR);
            }
        }

        // 5. FLOWER BOX
        if (winConfig.flower_box) {
            const boxW = realW * 1.1;
            const boxH = 0.15;
            const boxD = 0.2;
            const boxMat = new THREE.MeshStandardMaterial({ color: '#553322' }); // Wooden box
            const plantMat = new THREE.MeshStandardMaterial({ color: '#228B22' }); // Green plants

            const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(boxW, boxH, boxD), boxMat);
            // Position: below the window sill
            boxMesh.position.set(0, -realH/2 - boxH/2, boxD/2);
            group.add(boxMesh);

            // Simple "Plants" (smaller boxes inside)
            const plant = new THREE.Mesh(new THREE.BoxGeometry(boxW * 0.9, 0.1, boxD * 0.8), plantMat);
            plant.position.set(0, -realH/2, boxD/2);
            group.add(plant);
        }
    }

    return group;
}

export function createSkylightGeometry(d: DormerConfig) {
    const group = new THREE.Group();
    // Reuse window geometry, but laid flat
    // WindowGeo is vertical (XY plane).
    // We want it flat (XZ plane).
    
    // We treat 'width' as width, 'height' as length up the slope.
    const winGeo = createWindowGeometry({ window: d.window }, d.width, d.height);
    
    // Rotate X -90 to lay flat?
    // Window is in XY. Z is depth.
    // If we Rotate X -90 -> Y becomes -Z, Z becomes Y.
    // So it lies on XZ plane, facing Up (Y).
    winGeo.rotateX(-Math.PI / 2);
    
    // It has depth (frame). Center Z is 0 (relative to extrusion).
    // frame is extruded -fDepth/2.
    // So it sits slightly below 0?
    // We want it to sit *on* the roof (Y=0).
    // So we translate Y up by fDepth/2?
    winGeo.position.y += 0.05; // Sit on surface
    
    group.add(winGeo);
    return group;
}

export function createDormerGeometry(d: DormerConfig) {
    const group = new THREE.Group();
    const w = d.width;
    const h = d.height;
    const depth = 2.0; // Deep enough to penetrate roof
    
    const mat = new THREE.MeshStandardMaterial({ color: d.color || "#444" }); // Wall color (usually same as roof or wall?)
    
    // 1. Walls (Box with hole?)
    // Simpler: Left wall, Right wall, Front wall with hole.
    const wallThick = 0.1;
    
    // Front Wall with Window Hole
    // Use subtraction or just 4 parts (Top, Bot, L, R).
    // Or just place window on a solid wall? Window cuts hole?
    // Let's make a Frame.
    const winW = w * 0.8;
    const winH = h * 0.7;
    
    const frontGroup = new THREE.Group();
    // Top part
    const topH = (h - winH)/2;
    const botH = (h - winH)/2;
    const sideW = (w - winW)/2;
    
    const addBox = (bw:number, bh:number, bx:number, by:number) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, wallThick), mat);
        m.position.set(bx, by, 0);
        frontGroup.add(m);
    };
    
    // Front Top
    addBox(w, topH, 0, h/2 - topH/2);
    // Front Bottom
    addBox(w, botH, 0, -h/2 + botH/2);
    // Front Left
    addBox(sideW, winH, -w/2 + sideW/2, 0);
    // Front Right
    addBox(sideW, winH, w/2 - sideW/2, 0);
    
    frontGroup.position.set(0, 0, depth/2);
    group.add(frontGroup);
    
    // Side Walls (Extended downwards to penetrate roof)
    const extraDown = 1.5; 
    const sideH = h + extraDown;
    const sideY = -extraDown / 2; // Center of new taller wall

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, sideH, depth), mat);
    leftWall.position.set(-w/2 + wallThick/2, sideY, 0);
    group.add(leftWall);
    
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, sideH, depth), mat);
    rightWall.position.set(w/2 - wallThick/2, sideY, 0);
    group.add(rightWall);
    
    // 2. Roof
    const roofMat = new THREE.MeshStandardMaterial({ color: d.roof_color || "#333" });
    if (d.type === 'gabled') {
        const rH = 0.5;
        const shape = new THREE.Shape();
        const rw = w/2 + 0.1;
        shape.moveTo(-rw, 0);
        shape.lineTo(rw, 0);
        shape.lineTo(0, rH);
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth: depth + 0.2, bevelEnabled: false });
        geo.translate(0, 0, -(depth+0.2)/2);
        geo.translate(0, 0, depth/2); // Align front?
        // Actually extrude is Z-centered if not translated?
        // Extrude default: starts at 0, goes to depth.
        // We want it to cover the dormer depth.
        // Dormer walls are centered at Z=0, extent -depth/2 to depth/2.
        // Extrude needs to cover -depth/2 to depth/2 + overhang.
        
        // Let's just center the roof geometry manually.
        const roof = new THREE.Mesh(geo, roofMat);
        // Align roof bottom with wall top (h/2)
        roof.position.set(0, h/2, -depth/2); 
        group.add(roof);
    } else {
        // Flat/Shed
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w+0.2, 0.1, depth+0.2), roofMat);
        roof.position.set(0, h/2, 0);
        group.add(roof);
    }
    
    // 3. Window
    const winGeo = createWindowGeometry({ window: d.window }, winW, winH);
    winGeo.position.set(0, 0, depth/2 + 0.05); // Slightly in front of wall
    group.add(winGeo);

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

export function createBalconyGeometry(el: FacadeElement, realW: number, realH: number) {
    const group = new THREE.Group();
    if (!el.balcony) return group;

    const b = el.balcony;
    const depth = b.depth || 1.0;
    const pad = 0.2; // Extra width on sides
    const floorW = realW + pad * 2;
    const floorH = 0.15; // Thickness
    const railingH = b.railing_height || 1.0;
    
    // 1. FLOOR
    const floorMat = new THREE.MeshStandardMaterial({ color: b.floor_color || "#555555" });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(floorW, floorH, depth), floorMat);
    // Align top of floor with bottom of door/window (y = -realH/2)
    // But usually balcony is slightly below threshold. Let's put top at -realH/2 - 0.05
    const floorY = -realH/2 - (floorH/2) - 0.05;
    const floorZ = depth / 2; // Extends from 0 to depth
    floor.position.set(0, floorY, floorZ);
    group.add(floor);

    // 2. RAILING
    const railingGroup = new THREE.Group();
    const railMat = new THREE.MeshStandardMaterial({ color: b.railing_color || "#333333" });
    
    const postSize = 0.05;
    
    // Path for railing (U-shape)
    // Front face at Z=depth
    // Side faces at X= +/- floorW/2
    
    // Helper to add Post
    const addPost = (x: number, z: number) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(postSize, railingH, postSize), railMat);
        m.position.set(x, floorY + floorH/2 + railingH/2, z);
        railingGroup.add(m);
    };

    // Helper to add Panel/Bar
    const addPanel = (w: number, d: number, x: number, z: number) => {
        let geometry;
        let material = railMat;

        if (b.railing_type === 'glass') {
            geometry = new THREE.BoxGeometry(w, railingH - 0.1, d);
            material = new THREE.MeshPhysicalMaterial({ 
                color: "#aaccff", transparent: true, opacity: 0.4, 
                roughness: 0, metalness: 0.1 
            });
        } else if (b.railing_type === 'bars') {
             // Simplify bars as a thin transparent plane with texture? 
             // Or just a few horizontal bars. Let's do horizontal bars for now.
             // Actually, for low poly, let's just do a top rail and middle rail.
             // We'll skip the panel logic for bars and handle separately below.
             return;
        } else {
            // Solid
            geometry = new THREE.BoxGeometry(w, railingH, d);
        }
        
        if (geometry) {
            const m = new THREE.Mesh(geometry, material);
            m.position.set(x, floorY + floorH/2 + railingH/2, z);
            railingGroup.add(m);
        }
    };

    // Corners
    const frontZ = depth - postSize/2;
    const leftX = -floorW/2 + postSize/2;
    const rightX = floorW/2 - postSize/2;

    addPost(leftX, 0); // Wall Left
    addPost(rightX, 0); // Wall Right
    addPost(leftX, frontZ); // Corner Left
    addPost(rightX, frontZ); // Corner Right
    
    // Top Handrail (Continuous U-Shape)
    // Left
    const railH_Mesh = new THREE.Mesh(new THREE.BoxGeometry(postSize, postSize, depth), railMat);
    railH_Mesh.position.set(leftX, floorY + floorH/2 + railingH, depth/2);
    railingGroup.add(railH_Mesh);
    // Right
    const railH_MeshR = new THREE.Mesh(new THREE.BoxGeometry(postSize, postSize, depth), railMat);
    railH_MeshR.position.set(rightX, floorY + floorH/2 + railingH, depth/2);
    railingGroup.add(railH_MeshR);
    // Front
    const railH_MeshF = new THREE.Mesh(new THREE.BoxGeometry(floorW, postSize, postSize), railMat);
    railH_MeshF.position.set(0, floorY + floorH/2 + railingH, frontZ);
    railingGroup.add(railH_MeshF);

    // Infill
    if (b.railing_type === 'bars') {
         // Add 2 middle rails
         [0.3, 0.6].forEach(hFactor => {
             const h = railingH * hFactor;
             // Left
            const rL = new THREE.Mesh(new THREE.BoxGeometry(postSize/2, postSize/2, depth), railMat);
            rL.position.set(leftX, floorY + floorH/2 + h, depth/2);
            railingGroup.add(rL);
            // Right
            const rR = new THREE.Mesh(new THREE.BoxGeometry(postSize/2, postSize/2, depth), railMat);
            rR.position.set(rightX, floorY + floorH/2 + h, depth/2);
            railingGroup.add(rR);
            // Front
            const rF = new THREE.Mesh(new THREE.BoxGeometry(floorW, postSize/2, postSize/2), railMat);
            rF.position.set(0, floorY + floorH/2 + h, frontZ);
            railingGroup.add(rF);
         });
    } else {
        // Panels (Glass or Solid)
        // Front Panel
        addPanel(floorW - postSize*2, postSize/2, 0, frontZ);
        // Left Panel
        addPanel(postSize/2, depth - postSize*2, leftX, depth/2);
        // Right Panel
        addPanel(postSize/2, depth - postSize*2, rightX, depth/2);
    }

    group.add(railingGroup);

    return group;
}

export function createPorchGeometry(el: FacadeElement, realW: number, realH: number) {
    const group = new THREE.Group();
    if (!el.porch) return group;

    const p = el.porch;
    const depth = p.depth || 1.5;
    const w = realW * (p.width_ratio || 1.2);
    const deckH = p.deck_height || 0.2;
    const colH = p.eaves_height || 2.5;
    
    // 1. DECK
    const deckMat = new THREE.MeshStandardMaterial({ color: "#777" }); // Concrete/Wood
    const deck = new THREE.Mesh(new THREE.BoxGeometry(w, deckH, depth), deckMat);
    // Align deck top to door bottom (-realH/2)
    // deck center Y = -realH/2 - deckH/2
    const deckY = -realH/2 - deckH/2; 
    const centerZ = depth / 2;
    deck.position.set(0, deckY, centerZ);
    group.add(deck);

    // 2. COLUMNS
    const colR = 0.08;
    const colMat = new THREE.MeshStandardMaterial({ color: "#eee" });
    const colGeo = new THREE.CylinderGeometry(colR, colR, colH, 16);
    
    // Front Left
    const c1 = new THREE.Mesh(colGeo, colMat);
    c1.position.set(-w/2 + colR + 0.1, deckY + deckH/2 + colH/2, depth - colR - 0.1);
    group.add(c1);
    
    // Front Right
    const c2 = new THREE.Mesh(colGeo, colMat);
    c2.position.set(w/2 - colR - 0.1, deckY + deckH/2 + colH/2, depth - colR - 0.1);
    group.add(c2);

    // 3. ROOF
    const roofMat = new THREE.MeshStandardMaterial({ color: p.roof_color || "#333" });
    const roofBaseY = deckY + deckH/2 + colH;
    
    if (p.roof_shape === 'flat') {
        const rH = 0.2;
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, rH, depth + 0.2), roofMat);
        roof.position.set(0, roofBaseY + rH/2, centerZ);
        group.add(roof);
    } else if (p.roof_shape === 'gabled') {
        const rH = 0.8;
        // Prism shape using Extrude? Or simplified Cone/Cylinder?
        // Let's use a Shape extruded along depth
        // Triangle pointing UP (Y)
        const shape = new THREE.Shape();
        const rw = w/2 + 0.2;
        shape.moveTo(-rw, 0);
        shape.lineTo(rw, 0);
        shape.lineTo(0, rH);
        shape.closePath();
        
        const geo = new THREE.ExtrudeGeometry(shape, { depth: depth + 0.2, bevelEnabled: false });
        // Extrude is along Z.
        // Center it.
        geo.translate(0, 0, -(depth+0.2)/2); // Center Z
        // Shift Z to +centerZ
        geo.translate(0, 0, centerZ);
        
        const roof = new THREE.Mesh(geo, roofMat);
        roof.position.set(0, roofBaseY, 0);
        group.add(roof);
    } else {
        // Shed (Slope down away from house)
        const rH = 0.5;
        // Profile in Z-Y plane
        
        const shapeZ = new THREE.Shape();
        // (0,0) is back-bottom
        shapeZ.moveTo(0, 0);
        shapeZ.lineTo(depth + 0.2, 0); // Front bottom
        shapeZ.lineTo(depth + 0.2, 0.1); // Front tip
        shapeZ.lineTo(0, rH); // Back top
        shapeZ.closePath();
        
        const geo = new THREE.ExtrudeGeometry(shapeZ, { depth: w + 0.2, bevelEnabled: false });
        // Rotate to align extrusion along X
        geo.rotateY(-Math.PI / 2); // Extrusion was Z, now X. Rotate -90 to point +X to +Z
        geo.translate(0, 0, 0); // Origin at back-left (approx)
        
        const roof = new THREE.Mesh(geo, roofMat);
        roof.position.set((w+0.2)/2, roofBaseY, 0); // Corrected X centering
        group.add(roof);
    } 

    return group;
}

export function createStairGeometry(el: FacadeElement, realW: number, _realH: number, startY: number, startZ: number) {
    const group = new THREE.Group();
    if (!el.stairs) return group;

    const s = el.stairs;
    const w = realW * (s.width_ratio || 1.0);
    const h = s.height || 1.0;
    const run = s.depth || 1.0;
    
    const steps = Math.max(1, Math.round(h / 0.15));
    const stepRise = h / steps;
    const stepRun = run / steps;
    
    const mat = new THREE.MeshStandardMaterial({ color: s.color || "#777" });

    // Build steps going DOWN and OUT
    // Start at (0, startY, startZ)
    // First step top is at startY.
    // Or is startY the top landing? Yes.
    
    for (let i = 0; i < steps; i++) {
        // Step i
        // Top Y: startY - (i * stepRise)
        // Z front: startZ + ((i+1) * stepRun)
        // Box height? Usually solid or block steps. Let's do solid blocks.
        
        const currentYTop = startY - (i * stepRise);
        // We want the step surface to be at currentYTop.
        // Mesh Y center = currentYTop - stepRise/2
        
        const currentZFront = startZ + ((i+1) * stepRun);
        // We want the step front face at currentZFront.
        // Mesh Z center = currentZFront - stepRun/2
        
        // Width: w
        // Height: stepRise
        // Depth: stepRun
        
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, stepRise, stepRun), mat);
        mesh.position.set(0, currentYTop - stepRise/2, currentZFront - stepRun/2);
        group.add(mesh);
    }

    return group;
}
import * as THREE from 'three';
import type { RoofConfig, TimberConfig, ElementOverrideMap } from '../types/schema';

function extrudeProfile(shape: THREE.Shape, depth: number, center: boolean = true) {
    const geo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: depth, bevelEnabled: false });
    if (center) geo.translate(0, 0, -depth / 2);
    return geo;
}

export function createTimberGeometry(
    w: number, h: number, d: number,
    grid: { units: number, floors: number, depth: number },
    config: TimberConfig,
    overrides?: ElementOverrideMap
) {
    const group = new THREE.Group();
    if (!config.enabled) return group;

    const bw = config.beam_width || 0.15;
    const bd = 0.05; // Stick out depth
    const mat = new THREE.MeshStandardMaterial({ color: config.color || "#443322" });

    // Helper: Add Beam (Box) from P1 to P2
    const addBeam = (p1: THREE.Vector3, p2: THREE.Vector3) => {
        const vec = new THREE.Vector3().subVectors(p2, p1);
        const len = vec.length();
        const center = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        
        const geo = new THREE.BoxGeometry(bw, bw, len);
        const mesh = new THREE.Mesh(geo, mat);
        
        // Orient
        mesh.position.copy(center);
        mesh.lookAt(p2); 
        group.add(mesh);
    };

    // Helper: Process Face
    const processFace = (origin: THREE.Vector3, uVec: THREE.Vector3, vVec: THREE.Vector3, c: number, r: number, faceName: 'front'|'back'|'left'|'right') => {
        if (!config.faces?.[faceName]) return;

        const cellWVec = uVec.clone().divideScalar(c);
        const cellHVec = vVec.clone().divideScalar(r);

        // Grid Points
        const getP = (i: number, j: number) => {
            return origin.clone()
                .add(cellWVec.clone().multiplyScalar(i))
                .add(cellHVec.clone().multiplyScalar(j));
        };

        const hasFrame = config.patterns.includes('frame');
        const hasCross = config.patterns.includes('cross');
        const hasDiamond = config.patterns.includes('diamond');
        
        // Filter Floors
        // config.floors_indices usually [0, 1, 2...]
        // r is total rows.
        // We iterate j from 0 to r-1.
        // Check if j is in floors_indices.
        
        // Frame Verticals (span floor)
        if (hasFrame) {
            for (let j = 0; j < r; j++) {
                if (!config.floors_indices?.includes(j)) continue;
                for (let i = 0; i <= c; i++) {
                     addBeam(getP(i, j), getP(i, j+1));
                }
            }
            // Frame Horizontals
            for (let j = 0; j <= r; j++) {
                // Horizontal at floor j.
                // Should we show beam at j if j or j-1 is active?
                // Usually horizontal beam separates floors.
                // Let's say we show bottom beam of active floor?
                // Or top beam?
                // Let's show bottom beam (j) and top beam (j+1) for each active floor j.
                // To avoid duplicates, track created?
                // Simpler: iterate active floors, add bottom and top.
                // Overlap is fine (Mesh intersection).
                
                if (config.floors_indices?.includes(j) || (j>0 && config.floors_indices?.includes(j-1))) {
                    for (let i = 0; i < c; i++) {
                        addBeam(getP(i, j), getP(i+1, j)); // Segment per cell to match vertical grid? Or one long beam? Segment is easier.
                    }
                }
            }
        }

        // Patterns inside cells
        if (hasCross || hasDiamond) {
            for (let i = 0; i < c; i++) {
                for (let j = 0; j < r; j++) {
                    if (!config.floors_indices?.includes(j)) continue;

                    // Check intersection
                    // Mapping Visual Grid (i, j) to Data Grid
                    // Visual U (i) is usually Data Grid X.
                    // But in Scene.tsx rendering, we map differently?
                    // Scene.tsx:
                    // Front: c=0..units. Visual Left=0. Data=0.
                    // Back: c=0..units. Rotated Y=180. Visual Left=0. Data=0 (Scene renders 0 to Units).
                    // So Data Index is i.
                    
                    const key = `${i}_${j}_${faceName}`;
                    const hasOpening = overrides && overrides[key] && overrides[key].type !== 'empty';
                    
                    if (hasOpening) continue; // Skip inner pattern if window/door exists

                    const bl = getP(i, j);
                    const br = getP(i+1, j);
                    const tl = getP(i, j+1);
                    const tr = getP(i+1, j+1);
                    
                    if (hasCross) {
                        addBeam(bl, tr);
                        addBeam(br, tl);
                    } 
                    // Can have BOTH? Yes user said not mutually exclusive.
                    if (hasDiamond) {
                        const midB = bl.clone().add(br).multiplyScalar(0.5);
                        const midT = tl.clone().add(tr).multiplyScalar(0.5);
                        const midL = bl.clone().add(tl).multiplyScalar(0.5);
                        const midR = br.clone().add(tr).multiplyScalar(0.5);
                        
                        addBeam(midB, midL);
                        addBeam(midL, midT);
                        addBeam(midT, midR);
                        addBeam(midR, midB);
                    }
                }
            }
        }
    };

    const cols = Math.ceil(grid.units);
    const rows = Math.ceil(grid.floors);
    const dCols = Math.ceil(grid.depth);

    processFace(
        new THREE.Vector3(-w/2, -h/2, d/2 + bd/2), 
        new THREE.Vector3(w, 0, 0), 
        new THREE.Vector3(0, h, 0), 
        cols, rows, 'front'
    );

    processFace(
        new THREE.Vector3(w/2, -h/2, -d/2 - bd/2), 
        new THREE.Vector3(-w, 0, 0), 
        new THREE.Vector3(0, h, 0), 
        cols, rows, 'back'
    );

    processFace(
        new THREE.Vector3(w/2 + bd/2, -h/2, d/2), 
        new THREE.Vector3(0, 0, -d), 
        new THREE.Vector3(0, h, 0), 
        dCols, rows, 'right'
    );

    processFace(
        new THREE.Vector3(-w/2 - bd/2, -h/2, -d/2), 
        new THREE.Vector3(0, 0, d), 
        new THREE.Vector3(0, h, 0), 
        dCols, rows, 'left'
    );

    return group;
}

export function createRoofGeometry(width: number, depth: number, config: RoofConfig) {
    const { type, height, overhang, orientation } = config;
    
    const rW = width + (overhang * 2);
    const rD = depth + (overhang * 2);

    let profileW = rW;
    let extrusionD = rD;
    let rotate = false;

    // Symmetrical types don't need orientation logic, they fill the box
    const symmetrical = ['flat', 'pyramid', 'mansard', 'dome', 'shed'].includes(type); // Shed handled specially

    if (orientation === 'across' && !symmetrical) {
        profileW = rD;
        extrusionD = rW;
        rotate = true;
    } 

    const geo = createProfileGeometry(type, profileW, height, extrusionD, config);

    // If 'across', rotate
    if (rotate) {
        geo.rotateY(Math.PI / 2);
    }

    return geo;
}

function createProfileGeometry(type: string, w: number, h: number, d: number, config: RoofConfig) {
    const s = new THREE.Shape();
    
    const ridgeRatio = config.ridge_ratio ?? 0.5;
    const breakRatio = config.slope_break_ratio ?? 0.5; 
    const peakOffset = config.peak_offset ?? 0.0; 

    // --- 1. Extruded Shapes ---
    
    if (type === 'gabled') {
        s.moveTo(-w/2, 0); s.lineTo(0, h); s.lineTo(w/2, 0); s.lineTo(-w/2, 0);
        return extrudeProfile(s, d);
    }
    
    if (type === 'saltbox') {
        const peakX = peakOffset * w; // e.g. 0.25 * width (relative to center)
        s.moveTo(-w/2, 0); s.lineTo(peakX, h); s.lineTo(w/2, 0); s.lineTo(-w/2, 0);
        return extrudeProfile(s, d);
    }

    if (type === 'gambrel') {
        const bx = w/2 * 0.6; 
        const by = h * breakRatio; 
        s.moveTo(-w/2, 0); 
        s.lineTo(-bx, by); 
        s.lineTo(0, h); 
        s.lineTo(bx, by); 
        s.lineTo(w/2, 0); 
        s.lineTo(-w/2, 0);
        return extrudeProfile(s, d);
    }

    if (type === 'round' || type === 'barrel') {
        s.absarc(0, 0, w/2, 0, Math.PI); 
        const geo = extrudeProfile(s, d);
        geo.scale(1, h / (w/2), 1);
        return geo;
    }

    // --- 2. 3D Manifolds ---

    if (type === 'flat') {
        // Issue 2: Height working
        const geo = new THREE.BoxGeometry(w, h, d); // Use h
        geo.translate(0, h/2, 0); // Sit on top
        return geo;
    }

    if (type === 'pyramid') {
        const geo = new THREE.ConeGeometry(1, 1, 4, 1, true);
        geo.translate(0, 0.5, 0);
        geo.rotateY(Math.PI / 4);
        geo.scale(w / Math.sqrt(2), h, d / Math.sqrt(2));
        return geo;
    }

    if (type === 'hipped' || type === 'half_hipped') {
        // Issue 4: Half-Hipped Logic
        const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
        const pos = geo.attributes.position;
        const ridgeLen = d * ridgeRatio;
        
        // For Half-Hipped: We don't pinch to a line, we pinch to a smaller rectangle?
        // Or we pinch Z but keep X?
        // Standard Hipped: Top is a line along Z. (X is pinched to 0).
        // Half-Hipped: Top is a line along Z, but the "hip" starts higher up?
        // Actually Half-Hipped implies vertical gables at bottom, then hip at top.
        // This requires subdivided geometry (Box with segments).
        
        // Simplified Half-Hipped: Just a Hipped roof with very long ridge?
        // No, Half-hipped has vertical walls triangle at bottom.
        // Let's implement STANDARD Hipped first.
        
        for (let i = 0; i < pos.count; i++) {
            if (pos.getY(i) > 0) { 
                pos.setX(i, 0); // Standard Hipped: Ridge is 0 width X.
                const z = pos.getZ(i);
                if (z > 0) pos.setZ(i, ridgeLen / 2);
                else pos.setZ(i, -ridgeLen / 2);
            }
        }
        
        // Correction for Half-Hipped:
        if (type === 'half_hipped') {
            // Restore X width at top? No.
            // Half hipped is Gabled (X width full) but corners clipped.
            // It's easier to start with Gabled and pull top-Z corners in?
            // Actually, let's skip complex Half-Hipped vertex logic for now and map it to Hipped with Ridge Ratio until we can do custom BufferGeometry.
            // Wait, I can just not pinch X to 0!
            // If I keep X width, it's a flat roof.
            // Half Hipped: Top is a line (X=0), but Z is full? No.
            // Top is a line (X=0), but Z is clipped.
            // AND the triangle starts higher up. 
            // We need 2 height segments for Half Hipped.
        }
        
        geo.translate(0, h/2, 0);
        pos.needsUpdate = true;
        geo.computeVertexNormals();
        return geo;
    }

    if (type === 'mansard') {
        // Issue 5: Ridge/Break Ratio
        // Mansard has 2 slopes. Requires 2 height segments?
        // Or just a box where Top face is scaled.
        // Top Face Size: ridgeRatio (relative to base).
        // If ridgeRatio is 1, it's a box. If 0, it's a pyramid.
        
        const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
        const pos = geo.attributes.position;
        const topScale = ridgeRatio; // 0.0 - 1.0
        
        for (let i = 0; i < pos.count; i++) {
            if (pos.getY(i) > 0) {
                pos.setX(i, pos.getX(i) * topScale);
                pos.setZ(i, pos.getZ(i) * topScale);
            }
        }
        geo.translate(0, h/2, 0);
        pos.needsUpdate = true;
        geo.computeVertexNormals();
        return geo;
    }

    if (type === 'dome') {
        const geo = new THREE.SphereGeometry(w/2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        geo.scale(1, h / (w/2), d / w);
        return geo;
    }

    if (type === 'shed') {
        // Issue 6: 4-Corner Heights
        // We need a custom BufferGeometry.
        // 4 Base vertices (y=0), 4 Top vertices (y=h + offsets).
        // Order: FL, FR, BR, BL.
        const offsets = config.corner_heights || [0,0,0,0];
        
        // Base is centered at 0,0,0.
        // FL: -w/2, 0, d/2
        // FR: w/2, 0, d/2
        // BR: w/2, 0, -d/2
        // BL: -w/2, 0, -d/2
        
        const hw = w/2;
        const hd = d/2;
        
        const vertices = new Float32Array([
            // Bottom (y=0) - CCW or CW? Standard Box winding.
            -hw, 0, hd,  hw, 0, hd,  -hw, 0, -hd, // Bottom Tri 1
            hw, 0, hd,   hw, 0, -hd, -hw, 0, -hd, // Bottom Tri 2 (Actually bottom usually not seen, but good to have)
            
            // Top (y=h + offset)
            -hw, h+offsets[0], hd,   hw, h+offsets[1], hd,   -hw, h+offsets[3], -hd,
            hw, h+offsets[1], hd,    hw, h+offsets[2], -hd,  -hw, h+offsets[3], -hd,
            
            // Front Face
            -hw, 0, hd, hw, 0, hd, -hw, h+offsets[0], hd,
            hw, 0, hd, hw, h+offsets[1], hd, -hw, h+offsets[0], hd,
            
            // Right Face
            hw, 0, hd, hw, 0, -hd, hw, h+offsets[1], hd,
            hw, 0, -hd, hw, h+offsets[2], -hd, hw, h+offsets[1], hd,
            
            // Back Face
            hw, 0, -hd, -hw, 0, -hd, hw, h+offsets[2], -hd,
            -hw, 0, -hd, -hw, h+offsets[3], -hd, hw, h+offsets[2], -hd,
            
            // Left Face
            -hw, 0, -hd, -hw, 0, hd, -hw, h+offsets[3], -hd,
            -hw, 0, hd, -hw, h+offsets[0], hd, -hw, h+offsets[3], -hd
        ]);
        
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geo.computeVertexNormals();
        return geo;
    }

    return new THREE.BoxGeometry(1,1,1);
}

// Fallback
export function getRoofHeightAt(_x: number, _z: number, _rWidth: number, rHeight: number, _shape: string): number {
    return rHeight; 
}

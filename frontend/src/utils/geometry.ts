import * as THREE from 'three';
import type { RoofConfig } from '../types/schema';

function extrudeProfile(shape: THREE.Shape, depth: number, center: boolean = true) {
    const geo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: depth, bevelEnabled: false });
    if (center) geo.translate(0, 0, -depth / 2);
    return geo;
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

import * as THREE from 'three';
import type { RoofConfig } from '../types/schema';

// Helper to create shape based on profile
function extrudeProfile(shape: THREE.Shape, depth: number, center: boolean = true) {
    const geo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: depth, bevelEnabled: false });
    if (center) geo.translate(0, 0, -depth / 2);
    return geo;
}

export function createRoofGeometry(width: number, depth: number, config: RoofConfig) {
    const { type, height, overhang, orientation } = config;
    
    // Total Dimensions with Overhang
    const rW = width + (overhang * 2);
    const rD = depth + (overhang * 2);

    // Orientation Logic:
    // We construct the "Profile" in XY plane.
    // "Length" is the dimension perpendicular to the profile (Extrusion depth).
    // "Width" is the dimension of the profile base.
    
    let profileW = rW;
    let extrusionD = rD;
    let rotate = false;

    if (orientation === 'across') {
        // Ridge runs Left-Right (X). Profile is seen from Side (Z).
        // Profile Width = rD. Extrusion Depth = rW.
        profileW = rD;
        extrusionD = rW;
        rotate = true;
    } 
    // 'along' (Default): Ridge runs Front-Back (Z). Profile is seen from Front (X).
    // Profile Width = rW. Extrusion Depth = rD.

    const geo = createProfileGeometry(type, profileW, height, extrusionD, config);

    // If 'across', we rotate 90 deg Y to align.
    if (rotate) {
        geo.rotateY(Math.PI / 2);
    }

    // Shift up to sit on top of box (usually Origin is at bottom-center of roof)
    // Geometry logic should anchor at Y=0.
    
    return geo;
}

function createProfileGeometry(type: string, w: number, h: number, d: number, config: RoofConfig) {
    const s = new THREE.Shape();
    
    // Defaults
    const ridgeRatio = config.ridge_ratio ?? 0.5; // Hipped top length ratio
    const breakRatio = config.slope_break_ratio ?? 0.5; // Mansard break height
    const peakOffset = config.peak_offset ?? 0.0; // Saltbox offset

    // --- 1. Extruded Shapes (Gabled, Gambrel, Mansard, Shed, Saltbox, Round) ---
    
    if (type === 'gabled') {
        s.moveTo(-w/2, 0); s.lineTo(0, h); s.lineTo(w/2, 0); s.lineTo(-w/2, 0);
        return extrudeProfile(s, d);
    }
    
    if (type === 'saltbox') {
        // Asymmetric Peak
        const peakX = peakOffset * w; // e.g. 0.25 * width
        s.moveTo(-w/2, 0); s.lineTo(peakX, h); s.lineTo(w/2, 0); s.lineTo(-w/2, 0);
        return extrudeProfile(s, d);
    }

    if (type === 'shed' || type === 'skillion') {
        // Single Slope
        s.moveTo(-w/2, 0); s.lineTo(-w/2, h); s.lineTo(w/2, 0); s.lineTo(-w/2, 0); // High Left, Low Right
        // Or centered? Usually shed spans full width.
        // Let's make it slope L->R
        return extrudeProfile(s, d);
    }

    if (type === 'gambrel') {
        // Two slopes
        const bx = w/2 * 0.6; // Break X (width)
        const by = h * breakRatio; // Break Y (height)
        s.moveTo(-w/2, 0); 
        s.lineTo(-bx, by); 
        s.lineTo(0, h); 
        s.lineTo(bx, by); 
        s.lineTo(w/2, 0); 
        s.lineTo(-w/2, 0);
        return extrudeProfile(s, d);
    }

    if (type === 'round' || type === 'barrel') {
        // Semi-circle
        s.absarc(0, 0, w/2, 0, Math.PI); // Half circle
        // But height might not match radius. We need to scale.
        // absarc creates perfect circle.
        const geo = extrudeProfile(s, d);
        // Scale height to match config
        geo.scale(1, h / (w/2), 1);
        return geo;
    }

    // --- 2. 3D Manifolds (Hipped, Pyramid, Mansard, Half-Hipped, Dome) ---
    // These cannot be simple extrusions. We construct custom BufferGeometry or use primitives.

    if (type === 'pyramid') {
        const geo = new THREE.ConeGeometry(1, 1, 4, 1, true); // base 1, height 1
        geo.translate(0, 0.5, 0); // anchor bottom
        geo.rotateY(Math.PI / 4); // Align corners
        geo.scale(w / Math.sqrt(2), h, d / Math.sqrt(2)); // Scale to fit box
        return geo;
    }

    if (type === 'hipped') {
        // A pyramid with a line ridge instead of a point.
        // Create 4 vertices for base, 2 for ridge.
        // Ridge Length = d * ridgeRatio (if along Z) or w * ridgeRatio (if along X)?
        // Wait, 'w' and 'd' here are local profile width/depth.
        // 'w' is Profile Width. 'd' is Extrusion Depth.
        
        // This is complex to generate procedurally with variable ridge.
        // Trick: Cylinder with 4 sides (Box), taper top? No.
        // Let's use a "Box" where top vertices are pinched in.
        
        // Manual BufferGeometry is best here.
        // Or Extrude a Trapezoid? No, it tapers in Z too.
        
        // Let's stick to a simplified logic: 
        // 1. Box geometry.
        // 2. Move top vertices inward.
        
        const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
        const pos = geo.attributes.position;
        // Top vertices have y > 0 (approx h/2).
        // Vertices: 0,1,4,5 are usually front/back right?
        // Let's iterate.
        
        // Target Ridge: 
        // Z-axis ridge (along d). Length = d * ridgeRatio.
        // X-axis pinch = 0 (pointy)? No, ridge has width 0? Yes.
        // Z-axis pinch = (d - ridgeLen) / 2.
        
        const ridgeLen = d * ridgeRatio;
        // const zOffset = (d - ridgeLen) / 2;
        
        for (let i = 0; i < pos.count; i++) {
            if (pos.getY(i) > 0) { // Top vertices
                // Set X to 0 (center)
                pos.setX(i, 0);
                
                // Pinch Z
                const z = pos.getZ(i);
                if (z > 0) pos.setZ(i, ridgeLen / 2);
                else pos.setZ(i, -ridgeLen / 2);
            } else {
                // Bottom vertices - shift Y to 0 (Box center is 0)
                // We want anchor at bottom.
                // Currently Box center is 0. Height is h.
                // Shift whole mesh later.
            }
        }
        geo.translate(0, h/2, 0); // Shift so bottom is at 0
        pos.needsUpdate = true;
        geo.computeVertexNormals();
        return geo;
    }

    if (type === 'half_hipped') {
        // Like Gabled, but the tips of the gable triangle are clipped.
        // Gabled shape extruded, then sliced? Hard.
        // Box manipulation again.
        
        const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
        const pos = geo.attributes.position;
        // Top vertices (Ridge). 
        // X = 0.
        // Z = full depth d? No, pinched slightly.
        
        const clipRatio = 0.2; // 20% clip
        // const ridgeLen = d * (1 - clipRatio*2);
        
        for (let i = 0; i < pos.count; i++) {
            if (pos.getY(i) > 0) {
                pos.setX(i, 0); // Ridge center
                const z = pos.getZ(i);
                // Pinch Z
                if (z > 0) pos.setZ(i, d/2 - (d * clipRatio));
                else pos.setZ(i, -d/2 + (d * clipRatio));
            }
        }
        geo.translate(0, h/2, 0);
        pos.needsUpdate = true;
        geo.computeVertexNormals();
        return geo;
    }

    if (type === 'mansard') {
        // Two-part hipped. 
        // 1. Bottom Frustum (Steep).
        // 2. Top Low Frustum or Flat.
        // Simplification: A Box with top scaled down (Frustum).
        // But Mansard usually has a flat top or shallow top.
        
        const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
        const pos = geo.attributes.position;
        
        // Scale top face X and Z by (1 - breakRatio) ?? No.
        // Mansard looks like /---\ .
        const topScale = 0.6; // Top is 60% of base width
        
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
        geo.scale(1, h / (w/2), d / w); // Stretch to fit rectangular base approx
        return geo;
    }

    // Flat
    const geo = new THREE.BoxGeometry(w, 0.2, d);
    geo.translate(0, 0.1, 0);
    return geo;
}
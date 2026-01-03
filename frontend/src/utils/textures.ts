import * as THREE from 'three';

const textureCache: { [key: string]: THREE.CanvasTexture } = {};

function createTexture(id: string, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
    if (textureCache[id]) return textureCache[id];

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        draw(ctx, size, size);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    // Assume 1 unit = 1 meter. Texture size covers ~2-3 meters.
    // If brick row is 0.1m, we need 20 rows in 2m.
    // Let's adjust repeat later in material.
    textureCache[id] = tex;
    return tex;
}

export function getProceduralTexture(type: string, colorHex: string): THREE.Texture | null {
    const key = `${type}_${colorHex}`;
    
    // Parse color for shading
    const c = new THREE.Color(colorHex);
    const baseR = Math.floor(c.r * 255);
    const baseG = Math.floor(c.g * 255);
    const baseB = Math.floor(c.b * 255);
    const darker = `rgb(${baseR*0.8}, ${baseG*0.8}, ${baseB*0.8})`;
    const base = `rgb(${baseR}, ${baseG}, ${baseB})`;

    if (type === 'brick') {
        return createTexture(key, (ctx, w, h) => {
            ctx.fillStyle = base; // Mortar color (actually inverse?) 
            // Usually base is mortar, bricks are colored.
            // Let's make base Mortar (light grey)
            ctx.fillStyle = '#DDDDDD';
            ctx.fillRect(0, 0, w, h);
            
            const rows = 16;
            const rowH = h / rows;
            const brickH = rowH * 0.9; // 10% mortar
            
            for (let y = 0; y < rows; y++) {
                const offset = (y % 2) * (w / 4);
                const brickW = w / 2.2;
                for (let x = -1; x < 4; x++) {
                    // Random variation
                    const noise = Math.random() * 0.1;
                    const r = Math.min(255, baseR * (0.9 + noise));
                    const g = Math.min(255, baseG * (0.9 + noise));
                    const b = Math.min(255, baseB * (0.9 + noise));
                    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    
                    ctx.fillRect(x * (brickW + 10) + offset, y * rowH, brickW, brickH);
                }
            }
        });
    }

    if (type === 'stucco') {
        return createTexture(key, (ctx, w, h) => {
            ctx.fillStyle = base;
            ctx.fillRect(0, 0, w, h);
            // Noise
            for (let i = 0; i < 50000; i++) {
                const x = Math.random() * w;
                const y = Math.random() * h;
                const alpha = Math.random() * 0.1;
                ctx.fillStyle = `rgba(0,0,0,${alpha})`;
                ctx.fillRect(x, y, 2, 2);
            }
        });
    }

    if (type === 'wood') {
        return createTexture(key, (ctx, w, h) => {
            ctx.fillStyle = base;
            ctx.fillRect(0, 0, w, h);
            const planks = 10;
            const pH = h / planks;
            
            for (let i = 0; i < planks; i++) {
                // Plank Variation
                const shade = 0.9 + Math.random() * 0.2;
                const r = Math.min(255, baseR * shade);
                const g = Math.min(255, baseG * shade);
                const b = Math.min(255, baseB * shade);
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.fillRect(0, i * pH, w, pH - 2); // Gap
                
                // Grain
                ctx.fillStyle = `rgba(0,0,0,0.1)`;
                for(let j=0; j<20; j++) {
                    const y = i*pH + Math.random() * pH;
                    ctx.fillRect(0, y, w, 1);
                }
            }
        });
    }

    if (type === 'shingles') {
        return createTexture(key, (ctx, w, h) => {
            ctx.fillStyle = darker;
            ctx.fillRect(0, 0, w, h);
            const rows = 12;
            const cols = 8;
            const rH = h / rows;
            const cW = w / cols;
            
            for (let y = 0; y < rows; y++) {
                const off = (y%2) * (cW/2);
                for (let x = -1; x < cols; x++) {
                    const r = Math.min(255, baseR * (0.9 + Math.random()*0.2));
                    const g = Math.min(255, baseG * (0.9 + Math.random()*0.2));
                    const b = Math.min(255, baseB * (0.9 + Math.random()*0.2));
                    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    ctx.fillRect(x*cW + off, y*rH, cW-2, rH-2);
                }
            }
        });
    }

    if (type === 'tiles') { // Spanish style
        return createTexture(key, (ctx, w, h) => {
            ctx.fillStyle = darker;
            ctx.fillRect(0, 0, w, h);
            const rows = 10;
            const cols = 10;
            const rH = h / rows;
            const cW = w / cols;
            
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const r = Math.min(255, baseR * (0.95 + Math.random()*0.1));
                    const g = Math.min(255, baseG * (0.95 + Math.random()*0.1));
                    const b = Math.min(255, baseB * (0.95 + Math.random()*0.1));
                    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    
                    ctx.beginPath();
                    ctx.arc(x*cW + cW/2, y*rH + rH, cW/2, Math.PI, 0); // Semicircle
                    ctx.fill();
                }
            }
        });
    }
    
    if (type === 'metal') { // Standing seam
        return createTexture(key, (ctx, w, h) => {
            ctx.fillStyle = base;
            ctx.fillRect(0, 0, w, h);
            const ribs = 8;
            const ribW = w / ribs;
            ctx.fillStyle = darker;
            for(let i=0; i<ribs; i++) {
                ctx.fillRect(i*ribW, 0, 4, h); // Seam
            }
        });
    }

    return null;
}

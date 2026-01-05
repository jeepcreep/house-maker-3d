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
    textureCache[id] = tex;
    return tex;
}

// We ignore colorHex here and return neutral grayscale textures 
// so MeshStandardMaterial can tint them.
// NOTE: Values must be mid-grey (approx 128) to allow lighting headroom. 
// If too bright, they blow out to white under strong light.
export function getProceduralTexture(type: string, _colorHex: string): THREE.Texture | null {
    const key = `neutral_${type}`; 
    
    if (type === 'brick') {
        return createTexture(key, (ctx, w, h) => {
            // Mortar (Darker Grey)
            ctx.fillStyle = '#606060'; 
            ctx.fillRect(0, 0, w, h);
            
            const rows = 16;
            const rowH = h / rows;
            const brickH = rowH * 0.85; 
            
            for (let y = 0; y < rows; y++) {
                const offset = (y % 2) * (w / 4);
                const brickW = w / 2.1;
                for (let x = -1; x < 4; x++) {
                    // Brick Face (Mid Grey)
                    const val = 140 + Math.random() * 40; // 140-180
                    ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
                    ctx.fillRect(x * (brickW + 10) + offset, y * rowH, brickW, brickH);
                }
            }
        });
    }

    if (type === 'stucco') {
        return createTexture(key, (ctx, w, h) => {
            // Base Mid Grey
            ctx.fillStyle = '#AAAAAA';
            ctx.fillRect(0, 0, w, h);
            // Noise (Darker/Lighter)
            for (let i = 0; i < 80000; i++) {
                const x = Math.random() * w;
                const y = Math.random() * h;
                const val = Math.random() > 0.5 ? 80 : 160;
                ctx.fillStyle = `rgba(${val},${val},${val},0.3)`; 
                ctx.fillRect(x, y, 2, 2);
            }
        });
    }

    if (type === 'wood') {
        return createTexture(key, (ctx, w, h) => {
            // Gaps (Black)
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, w, h);
            const planks = 10;
            const pH = h / planks;
            
            for (let i = 0; i < planks; i++) {
                // Plank (Mid Grey)
                const shade = 100 + Math.random() * 60;
                ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
                ctx.fillRect(0, i * pH + 2, w, pH - 4); 
                
                // Grain
                ctx.fillStyle = `rgba(0,0,0,0.3)`;
                for(let j=0; j<30; j++) {
                    const y = i*pH + 2 + Math.random() * (pH-4);
                    ctx.fillRect(Math.random() * w, y, Math.random() * 150, 1);
                }
            }
        });
    }

    if (type === 'shingles') {
        return createTexture(key, (ctx, w, h) => {
            ctx.fillStyle = '#222222'; // Dark gaps
            ctx.fillRect(0, 0, w, h);
            const rows = 12;
            const cols = 8;
            const rH = h / rows;
            const cW = w / cols;
            
            for (let y = 0; y < rows; y++) {
                const off = (y%2) * (cW/2);
                for (let x = -1; x < cols; x++) {
                    const val = 100 + Math.random() * 50; // Mid Grey
                    ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
                    ctx.fillRect(x*cW + off, y*rH, cW-2, rH-2);
                }
            }
        });
    }

    if (type === 'tiles') { // Spanish style
        return createTexture(key, (ctx, w, h) => {
            ctx.fillStyle = '#333333';
            ctx.fillRect(0, 0, w, h);
            const rows = 10;
            const cols = 10;
            const rH = h / rows;
            const cW = w / cols;
            
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const val = 120 + Math.random() * 40; // Mid Grey
                    ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
                    ctx.beginPath();
                    ctx.arc(x*cW + cW/2, y*rH + rH, cW/2, Math.PI, 0); 
                    ctx.fill();
                }
            }
        });
    }
    
    if (type === 'metal') { // Standing seam
        return createTexture(key, (ctx, w, h) => {
            ctx.fillStyle = '#AAAAAA';
            ctx.fillRect(0, 0, w, h);
            const ribs = 8;
            const ribW = w / ribs;
            ctx.fillStyle = '#555555';
            for(let i=0; i<ribs; i++) {
                ctx.fillRect(i*ribW, 0, 4, h); 
            }
        });
    }

    return null;
}
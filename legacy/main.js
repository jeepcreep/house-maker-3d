import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- KONFIGURATION & STATE ---
const dom = {
    viewport: document.getElementById('viewport'),
    input: document.getElementById('json-input'),
    console: document.getElementById('error-console')
};

let scene, camera, renderer, controls, houseGroup;

// Standard JSON Daten (damit man nicht immer pasten muss)
const DEFAULT_JSON = {
    "parts": [{
      "id": "main_house",
      "dimensions": { "width": 10.0, "height": 9.0, "depth": 8.0 },
      "material": { "color_hex": "#F0F0F0" },
      "roof": { "shape": "hipped", "height": 3.5, "overhang": 0.5, "color_hex": "#B54B35" },
      "facades": [
        {
          "orientation": "front",
          "grid": {
            "floors": 3, "columns": 3,
            "map": [
              ["window_round_fixed", "decor_medallion", "window_round_fixed"],
              ["window_rect", "balcony_with_door", "window_rect"],
              ["window_arch_fixed", "door_main", "window_arch_fixed"]
            ]
          },
          "elements": {
            "window_rect": { "type": "window", "style": "rectangular", "divisions": { "cols": 2, "rows": 2 }, "frame_color_hex": "#2F4F4F", "glass_color_hex": "#aaccff", "glass_opacity": 0.4 },
            "window_round_fixed": { "type": "window", "style": "round", "frame_color_hex": "#2F4F4F", "glass_color_hex": "#aaccff", "glass_opacity": 0.5, "width_ratio": 0.5, "height_ratio": 0.5 },
            "window_arch_fixed": { "type": "window", "style": "arch_round", "divisions": { "cols": 2, "rows": 1 }, "frame_color_hex": "#2F4F4F", "glass_color_hex": "#aaccff", "glass_opacity": 0.3, "width_ratio": 0.7, "height_ratio": 0.85 },
            "door_main": { "type": "door", "color_hex": "#2F4F4F", "width_ratio": 0.7, "height_ratio": 0.9 },
            "balcony_with_door": { "type": "balcony", "railing_color_hex": "#222", "door_attributes": { "color_hex": "#553322", "width_ratio": 0.8, "height_ratio": 0.85 } },
            "decor_medallion": { "type": "decoration", "style": "circle", "color_hex": "#999999", "width_ratio": 0.4 }
          }
        }
      ]
    }]
};

// --- INITIALISIERUNG ---
function init() {
    // Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Fallback, CSS macht Gradient
    
    houseGroup = new THREE.Group();
    scene.add(houseGroup);

    // Camera
    camera = new THREE.PerspectiveCamera(45, dom.viewport.clientWidth / dom.viewport.clientHeight, 0.1, 100);
    camera.position.set(18, 14, 25);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(dom.viewport.clientWidth, dom.viewport.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    dom.viewport.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Environment
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x556655 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 25, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    dom.input.addEventListener('input', () => validateAndBuild(dom.input.value));

    // Start with Default Data
    dom.input.value = JSON.stringify(DEFAULT_JSON, null, 2);
    validateAndBuild(dom.input.value);

    // Start Loop
    animate();
}

function onWindowResize() {
    camera.aspect = dom.viewport.clientWidth / dom.viewport.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(dom.viewport.clientWidth, dom.viewport.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// --- LOGGING & VALIDATOR ---
function logError(msg) { 
    dom.console.innerHTML = `❌ ${msg}`; 
    dom.console.style.color = "#ff5555"; 
    dom.input.classList.add('error'); 
}

function logSuccess(msg) { 
    dom.console.innerHTML = `✅ ${msg}`; 
    dom.console.style.color = "#55ff55"; 
    dom.input.classList.remove('error'); 
}

function logWarn(msg) { 
    dom.console.innerHTML += `<br>⚠️ ${msg}`; 
}

function validateAndBuild(jsonString) {
    let data;
    try { 
        data = JSON.parse(jsonString); 
    } catch (e) { 
        logError("Syntax Fehler: " + e.message); 
        return; 
    }

    if (!data.parts || data.parts.length === 0) { 
        logError("Fehler: Keine 'parts' definiert."); 
        return; 
    }

    // Semantischer Check
    let warnings = [];
    data.parts.forEach((part) => {
        if(part.facades) {
            part.facades.forEach((fac) => {
                const definedElements = Object.keys(fac.elements || {});
                fac.grid.map.forEach((row) => {
                    row.forEach((cellID) => {
                        if (cellID && cellID !== "wall" && !definedElements.includes(cellID)) {
                            warnings.push(`Element '${cellID}' wird benutzt, ist aber nicht definiert!`);
                        }
                    });
                });
            });
        }
    });

    if (warnings.length > 0) {
        logSuccess("Gebaut mit Warnungen:");
        warnings.forEach(w => logWarn(w));
    } else {
        logSuccess("JSON Validierung erfolgreich. Rendering...");
    }

    try {
        buildHouse(data);
    } catch (e) {
        logError("Runtime Fehler: " + e.message);
        console.error(e);
    }
}

// --- 3D BUILDER LOGIC ---

function buildHouse(data) {
    houseGroup.clear();
    const part = data.parts[0];
    const dims = part.dimensions;

    // 1. Wände
    const wallGeo = new THREE.BoxGeometry(dims.width, dims.height, dims.depth);
    const wallMat = new THREE.MeshStandardMaterial({ color: part.material.color_hex });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = dims.height / 2;
    walls.castShadow = true;
    walls.receiveShadow = true;
    houseGroup.add(walls);

    // 2. Dach
    createRoof(part, dims);

    // 3. Fassaden
    if (part.facades) {
        part.facades.forEach(facade => renderFacade(facade, dims, walls));
    }
}

function createRoof(part, dims) {
    const r = part.roof;
    const oh = r.overhang || 0;
    const rW = dims.width + (oh * 2);
    const rD = dims.depth + (oh * 2);
    const rH = r.height;

    let geo;
    if (r.shape === 'gabled') {
        const s = new THREE.Shape();
        s.moveTo(-rW/2, 0); s.lineTo(0, rH); s.lineTo(rW/2, 0); s.lineTo(-rW/2, 0);
        geo = new THREE.ExtrudeGeometry(s, { steps: 1, depth: rD, bevelEnabled: false });
        geo.translate(0, 0, -rD/2);
    } else {
        geo = new THREE.ConeGeometry(1, 1, 4, 1, true);
        geo.translate(0, 0.5, 0);
        geo.rotateY(Math.PI / 4);
        geo.scale(rW / Math.sqrt(2), rH, rD / Math.sqrt(2));
    }

    const roof = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: r.color_hex, side: THREE.DoubleSide }));
    roof.position.y = dims.height;
    houseGroup.add(roof);
}

function renderFacade(facade, houseDims, parent) {
    const grid = facade.grid;
    const elements = facade.elements;
    const fGroup = new THREE.Group();
    
    let rot = 0;
    let dist = houseDims.depth / 2;

    if (facade.orientation === 'back') {
        rot = Math.PI;
    } else if (facade.orientation === 'right') {
        rot = -Math.PI / 2;
        dist = houseDims.width / 2;
    } else if (facade.orientation === 'left') {
        rot = Math.PI / 2;
        dist = houseDims.width / 2;
    }

    fGroup.rotation.y = rot;
    parent.add(fGroup);

    const wW = (rot === 0 || rot === Math.PI) ? houseDims.width : houseDims.depth;
    const cW = wW / grid.columns;
    const rH = houseDims.height / grid.floors;

    grid.map.forEach((row, rI) => {
        const fI = (grid.floors - 1) - rI;
        row.forEach((id, cI) => {
            if (!id || id === "wall" || !elements[id]) return;

            const def = elements[id];
            const cx = -(wW / 2) + (cI * cW) + (cW / 2);
            const cy = -(houseDims.height / 2) + (fI * rH) + (rH / 2);

            const el = createElement(def, cW, rH);
            el.position.set(cx, cy, dist + 0.02);
            fGroup.add(el);
        });
    });
}

// --- ELEMENT FACTORY ---
function createElement(def, cellW, cellH) {
    const wRatio = def.width_ratio || 0.5;
    const hRatio = def.height_ratio || 0.6;
    const realW = cellW * wRatio;
    const realH = cellH * hRatio;
    const fDepth = 0.15;
    
    const fMat = new THREE.MeshStandardMaterial({ color: def.frame_color_hex || 0x333333 });
    const gMat = new THREE.MeshPhysicalMaterial({
        color: def.glass_color_hex || 0xaaccff,
        transparent: true,
        opacity: (def.glass_opacity !== undefined ? def.glass_opacity : 0.6),
        roughness: 0,
        metalness: 0.1,
        side: THREE.DoubleSide
    });

    if (def.type === 'window') {
        if (def.style === 'round') return createWindowRound(realW, fDepth, fMat, gMat);
        if (def.style === 'arch_round') return createWindowArched(realW, realH, fDepth, fMat, gMat, def.divisions);
        return createWindowRect(realW, realH, fDepth, fMat, gMat, def.divisions);
    } 
    else if (def.type === 'balcony') {
        return createBalcony(realW, realH, cellH, def.railing_color_hex, def.door_attributes);
    } 
    else if (def.type === 'door') {
        return createDoorStandard(realW, realH, cellH, def.color_hex);
    } 
    else if (def.type === 'decoration') {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(realW/2, realW/2, 0.05, 32), new THREE.MeshStandardMaterial({ color: def.color_hex || 0x888888 }));
        mesh.rotation.x = Math.PI / 2;
        const g = new THREE.Group(); g.add(mesh); return g;
    }
    return new THREE.Group();
}

// --- SPECIALIZED BUILDERS ---

function createWindowRound(realW, fDepth, fMat, gMat) {
    const g = new THREE.Group();
    const rad = realW / 2;
    const fThick = 0.08;

    const shape = new THREE.Shape().absarc(0, 0, rad, 0, Math.PI * 2);
    shape.holes.push(new THREE.Path().absarc(0, 0, rad - fThick, 0, Math.PI * 2, true));
    
    const frameGeo = new THREE.ExtrudeGeometry(shape, { depth: fDepth, bevelEnabled: false, curveSegments: 64 });
    frameGeo.translate(0, 0, -fDepth / 2);
    g.add(new THREE.Mesh(frameGeo, fMat));

    const glass = new THREE.Mesh(new THREE.CircleGeometry(rad - fThick, 64), gMat);
    glass.position.z = -0.02;
    g.add(glass);

    return g;
}

function createWindowArched(realW, realH, fDepth, fMat, gMat, divs) {
    const g = new THREE.Group();
    const rad = realW / 2;
    const fThick = 0.08;
    const seamY = (realH / 2) - rad;
    const rectH = realH - rad;

    // 1. Rechteckiger Teil
    if (rectH > 0.01) {
        const rectCY = (-realH / 2 + seamY) / 2;
        const addBox = (w, h, x, y) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, fDepth), fMat);
            m.position.set(x, y, 0);
            g.add(m);
        };

        addBox(fThick, rectH, -rad + fThick / 2, rectCY); // Links
        addBox(fThick, rectH, rad - fThick / 2, rectCY);  // Rechts
        addBox(realW, fThick, 0, -realH / 2 + fThick / 2); // Unten
        
        // --- DER FIX: Kämpfer (Transom Bar) oben ---
        addBox(realW, fThick, 0, seamY - fThick/2);

        const glassRect = new THREE.Mesh(new THREE.BoxGeometry(realW - fThick * 2, rectH - fThick, 0.02), gMat);
        glassRect.position.set(0, rectCY, -0.02);
        g.add(glassRect);

        if (divs && divs.cols > 1) for (let i = 1; i < divs.cols; i++) addBox(0.03, rectH - fThick, -rad + (realW / divs.cols) * i, rectCY);
        if (divs && divs.rows > 1) for (let i = 1; i < divs.rows; i++) addBox(realW - fThick, 0.03, 0, -realH / 2 + (rectH / divs.rows) * i);
    }

    // 2. Bogen Teil
    const archShape = new THREE.Shape();
    archShape.absarc(0, 0, rad, 0, Math.PI, false);
    archShape.lineTo(-rad + fThick, 0);
    archShape.absarc(0, 0, rad - fThick, Math.PI, 0, true);
    archShape.lineTo(rad, 0);

    const archGeo = new THREE.ExtrudeGeometry(archShape, { depth: fDepth, bevelEnabled: false, curveSegments: 64 });
    archGeo.translate(0, 0, -fDepth / 2);
    
    const archMesh = new THREE.Mesh(archGeo, fMat);
    archMesh.position.set(0, seamY, 0);
    g.add(archMesh);

    const glassShape = new THREE.Shape();
    glassShape.absarc(0, 0, rad - fThick, 0, Math.PI, false);
    glassShape.lineTo(-(rad - fThick), 0);
    
    const glassGeo = new THREE.ExtrudeGeometry(glassShape, { depth: 0.02, bevelEnabled: false, curveSegments: 64 });
    glassGeo.translate(0, 0, -0.02);
    
    const glassMesh = new THREE.Mesh(glassGeo, gMat);
    glassMesh.position.set(0, seamY, -0.02);
    g.add(glassMesh);

    return g;
}

function createWindowRect(realW, realH, fDepth, fMat, gMat, divs) {
    const g = new THREE.Group();
    const fThick = 0.08;
    const addBox = (w, h, x, y) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, fDepth), fMat);
        m.position.set(x, y, 0);
        g.add(m);
    };

    addBox(fThick, realH, -realW / 2 + fThick / 2, 0);
    addBox(fThick, realH, realW / 2 - fThick / 2, 0);
    addBox(realW, fThick, 0, -realH / 2 + fThick / 2);
    addBox(realW, fThick, 0, realH / 2 - fThick / 2);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(realW - fThick, realH - fThick, 0.02), gMat);
    glass.position.z = -0.02;
    g.add(glass);

    if (divs && divs.cols > 1) for (let i = 1; i < divs.cols; i++) addBox(0.03, realH - fThick, -realW / 2 + (realW / divs.cols) * i, 0);
    if (divs && divs.rows > 1) for (let i = 1; i < divs.rows; i++) addBox(realW - fThick, 0.03, 0, -realH / 2 + (realH / divs.rows) * i);

    return g;
}

function createDoorStandard(realW, realH, cellH, colorHex) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(realW, realH, 0.1), new THREE.MeshStandardMaterial({ color: colorHex || 0x442211 }));
    door.position.y = -(cellH * 0.5) + (realH * 0.5);
    const g = new THREE.Group(); g.add(door); return g;
}

function createBalcony(realW, realH, cellH, railColor, doorAttr) {
    const g = new THREE.Group();
    const depth = 1.0;
    // Tür dahinter
    const dAttr = doorAttr || {};
    const dW = realW * (dAttr.width_ratio || 0.8);
    const dH = cellH * (dAttr.height_ratio || 0.85);
    const door = createDoorStandard(dW, dH, cellH, dAttr.color_hex || 0x553322);
    door.position.z = -0.05;
    g.add(door);

    // Boden
    const floor = new THREE.Mesh(new THREE.BoxGeometry(realW, 0.1, depth), new THREE.MeshStandardMaterial({ color: 0x888888 }));
    floor.position.set(0, -(cellH * 0.5) + 0.05, depth / 2);
    g.add(floor);

    // Geländer
    const rMat = new THREE.MeshStandardMaterial({ color: railColor || 0x222222 });
    const rH = 0.9;
    const rT = 0.05;
    const addRail = (w, h, d, x, y, z) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), rMat);
        m.position.set(x, y, z);
        g.add(m);
    };

    addRail(realW, rH, rT, 0, -(cellH * 0.5) + rH / 2, depth - rT / 2); // Front
    addRail(rT, rH, depth, -realW / 2 + rT / 2, -(cellH * 0.5) + rH / 2, depth / 2); // Links
    addRail(rT, rH, depth, realW / 2 - rT / 2, -(cellH * 0.5) + rH / 2, depth / 2); // Rechts

    return g;
}

// Start
init();
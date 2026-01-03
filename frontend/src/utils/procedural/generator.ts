import type { HouseProject, HouseModule, FacadeElement, RoofType } from '../../types/schema';
import { SeededRandom } from './random';

export type HouseStyle = 'suburban' | 'victorian' | 'modern' | 'alpine' | 'mediterranean' | 'ranch' | 'industrial' | 'german' | 'scandinavian' | 'japanese' | 'chinese' | 'gruenderzeit' | 'neue_sachlichkeit' | 'random';

export interface ProceduralParams {
    style: HouseStyle;
    seed: string;
    complexity: number;
    heightBias: number;
    symmetry: number;
    detailing: number;
}

const DEFAULT_WINDOW: FacadeElement = {
    type: 'window', width_ratio: 0.6, height_ratio: 0.6, offset_x: 0, offset_y: 0,
    window: { mullions_cols: 2, mullions_rows: 2 }
};
const DEFAULT_DOOR: FacadeElement = {
    type: 'door', width_ratio: 0.7, height_ratio: 0.85, offset_x: 0, offset_y: 0,
    door: { leafs: 1, has_window: false }
};

export function generateProceduralHouse(params: ProceduralParams): HouseProject {
    const { seed, heightBias, symmetry, detailing } = params;
    const rng = new SeededRandom(seed);
    
    let style = params.style;
    const ALL_STYLES = ['suburban', 'victorian', 'modern', 'alpine', 'mediterranean', 'ranch', 'industrial', 'german', 'scandinavian', 'japanese', 'chinese', 'gruenderzeit', 'neue_sachlichkeit'];
    if (style === 'random') {
        style = rng.pick(ALL_STYLES) as HouseStyle;
    }

    const modules: HouseModule[] = [];
    
    // --- STYLE DEFINITIONS ---
    const CONFIG: Record<string, any> = {
        suburban: { walls: ['#F0F8FF', '#F5F5DC'], roofs: ['#8B4513', '#555555'], textures: { wall: 'wood', roof: 'shingles' } },
        victorian: { walls: ['#E6E6FA', '#FFE4E1'], roofs: ['#2F4F4F', '#483D8B'], textures: { wall: 'wood', roof: 'shingles' } },
        modern: { walls: ['#FFFFFF', '#333333'], roofs: ['#222222'], textures: { wall: 'stucco', roof: 'metal' } },
        alpine: { walls: ['#8B4513', '#CD853F', '#DEB887'], roofs: ['#555555', '#696969'], textures: { wall: 'wood', roof: 'shingles' } },
        mediterranean: { walls: ['#FFDEAD', '#F5DEB3', '#FFF8DC', '#FFDAB9', '#FFC0CB', '#FFFFE0'], roofs: ['#E9967A', '#CD5C5C', '#FFA07A'], textures: { wall: 'stucco', roof: 'tiles' } },
        ranch: { walls: ['#FFFFFF', '#FAFAD2'], roofs: ['#708090', '#778899'], textures: { wall: 'wood', roof: 'shingles' } },
        industrial: { walls: ['#A9A9A9'], roofs: ['#555555'], textures: { wall: 'brick', roof: 'metal' } },
        german: { walls: ['#F0F0F0', '#FFFFF0'], roofs: ['#8B4513', '#A52A2A'], textures: { wall: 'stucco', roof: 'tiles' } },
        scandinavian: { walls: ['#8B0000', '#DAA520', '#2F4F4F'], roofs: ['#333333', '#696969'], textures: { wall: 'wood', roof: 'metal' } },
        japanese: { walls: ['#F5F5DC', '#FFFFFF'], roofs: ['#333333', '#444444'], textures: { wall: 'stucco', roof: 'tiles' } },
        chinese: { walls: ['#B22222', '#F0F0F0'], roofs: ['#FFD700', '#333333'], textures: { wall: 'stucco', roof: 'tiles' } },
        gruenderzeit: { walls: ['#DCDCDC', '#EEDD82', '#FFE4C4'], roofs: ['#2F4F4F', '#696969'], textures: { wall: 'stucco', roof: 'shingles' } },
        neue_sachlichkeit: { walls: ['#FFFFFF', '#F5F5F5', '#C0C0C0'], roofs: ['#333333'], textures: { wall: 'stucco', roof: 'metal' } }
    };
    
    const styleConfig = CONFIG[style as keyof typeof CONFIG] || CONFIG['suburban'];
    const ROOF_TYPES: { [key: string]: RoofType[] } = {
        suburban: ['gabled', 'hipped'], victorian: ['hipped', 'mansard', 'pyramid'], modern: ['shed', 'shed', 'flat'], // 2:1 preference for shed
        alpine: ['gabled'], mediterranean: ['hipped'], ranch: ['gabled', 'hipped'], industrial: ['shed', 'shed', 'flat'],
        german: ['gabled', 'hipped', 'half_hipped'], scandinavian: ['gabled', 'saltbox'],
        japanese: ['hipped', 'gabled'], chinese: ['hipped', 'pyramid'],
        gruenderzeit: ['mansard', 'hipped'], neue_sachlichkeit: ['flat', 'shed']
    };

    // --- GENERATION ---
    const wallColor = rng.pick(styleConfig.walls) as string;
    const roofColor = rng.pick(styleConfig.roofs) as string;
    const roofType = rng.pick(ROOF_TYPES[style] || ['gabled']);

    // Modern/Industrial Roof offsets
    let cornerHeights: [number, number, number, number] = [0, 0, 0, 0];
    if ((style === 'modern' || style === 'industrial' || style === 'neue_sachlichkeit') && (roofType === 'shed' || roofType === 'flat')) {
        // Randomly lift corners to create slope
        // Neue Sachlichkeit: Low slope. Industrial: Steeper.
        const minLift = style === 'neue_sachlichkeit' ? 0.1 : 0.5;
        const maxLift = style === 'neue_sachlichkeit' ? 0.4 : 1.2;
        const lift = rng.range(minLift, maxLift);
        
        const mode = rng.intRange(0, 3);
        if (mode === 0) cornerHeights = [lift, lift, 0, 0]; // Back high
        else if (mode === 1) cornerHeights = [0, 0, lift, lift]; // Front high
        else if (mode === 2) cornerHeights = [lift, 0, 0, lift]; // Left high
        else cornerHeights = [0, lift, lift, 0]; // Right high
    }

    let floors = rng.intRange(1, 2);
    if (heightBias > 0.6) floors += rng.intRange(1, 2);
    if (heightBias < 0.3) floors = 1;
    let units = rng.intRange(2, 4);
    if (heightBias < 0.4) units += rng.intRange(1, 3);
    const depth = rng.intRange(2, 3);

    let winW = 0.6 - (Math.max(0, units - 3) * 0.05);
    let winH = 0.6 - (Math.max(0, floors - 2) * 0.05);

    // ROOT
    const root: HouseModule = {
        id: 'main',
        grid: { floors, units, depth },
        roof: { 
            type: roofType, 
            orientation: rng.pick(['along', 'across']), 
            height: (roofType === 'flat' || roofType === 'shed') ? rng.range(0.2, 0.8) : rng.range(1.5, 3.5), // Cap flat/shed
            overhang: style === 'alpine' ? 0.8 : (style === 'modern' ? 0 : 0.4), 
            color_hex: roofColor, 
            texture_id: styleConfig.textures.roof, 
            dormers: [],
            corner_heights: cornerHeights
        },
        wall_color_hex: wallColor,
        wall_texture_id: styleConfig.textures.wall,
        facade: {
            pattern: 'fill_window',
            base_window: { ...DEFAULT_WINDOW, width_ratio: winW, height_ratio: winH, window: { mullions_cols: rng.intRange(1,3), mullions_rows: rng.intRange(1,3) } },
            base_door: { ...DEFAULT_DOOR },
            overrides: {},
            timbering: { enabled: false, color: '#443322', beam_width: 0.15, patterns: ['frame'], floors_indices: [], faces: {front:true, back:true, left:true, right:true} }
        }
    };

    // Style Specifics
    if (style === 'victorian') {
        root.facade.base_window.height_ratio *= 1.1; 
        root.facade.base_window.window!.shape = rng.bool(0.5) ? 'arch' : 'rect';
        if (rng.bool(detailing)) {
            root.facade.timbering!.enabled = true;
            root.facade.timbering!.patterns = ['frame', 'cross'];
            root.facade.timbering!.floors_indices = [floors-1];
        }
    } else if (style === 'alpine' || style === 'german') {
        root.facade.timbering!.enabled = true;
        root.facade.timbering!.patterns = rng.pick([['frame', 'cross'], ['frame', 'diamond'], ['frame']]);
        if (rng.bool(0.3)) root.facade.timbering!.faces = { front: true, back: false, left: true, right: true };
        if (rng.bool(0.3)) root.facade.timbering!.floors_indices = [floors-1];
        else root.facade.timbering!.floors_indices = Array.from({length: floors}, (_, i) => i);

        root.roof.overhang = 0.8;
        if (style === 'german') root.roof.height = 3.5; 
        
        // Alpine Balconies
        if (style === 'alpine' && floors > 1) {
            for (let f=1; f<floors; f++) {
                for (let u=0; u<units; u++) {
                    root.facade.overrides[`${u}_${f}_front`] = {
                        ...root.facade.base_window,
                        offset_x: 0, offset_y: 0,
                        balcony: { depth: 1.2, railing_height: 1.0, railing_type: 'bars', floor_color: '#553322', railing_color: '#332211' }
                    };
                }
            }
        }
    } else if (style === 'mediterranean') {
        root.facade.base_window.window!.shape = 'arch';
        const shuttersClosed = rng.bool(0.3);
        root.facade.base_window.window!.shutters = { 
            open: !shuttersClosed, 
            style: 'louvred', 
            color: rng.pick(['#553322', '#2F4F4F', '#006400']) 
        };
        root.roof.height = 1.5; 
    } else if (style === 'scandinavian') {
        root.roof.height = 2.5; 
        root.wall_color_hex = rng.pick(['#8B0000', '#DAA520', '#333333']);
        root.facade.base_window.window!.frame_color = '#FFFFFF';
    } else if (style === 'japanese' || style === 'chinese') {
        root.roof.overhang = 1.0;
        root.roof.height = 2.0;
        root.facade.base_window.window!.mullions_cols = 3; 
        root.facade.base_window.window!.mullions_rows = 4;
        root.facade.timbering!.enabled = true;
        root.facade.timbering!.color = '#222';
        root.facade.timbering!.patterns = ['frame'];
        root.facade.timbering!.floors_indices = Array.from({length: floors}, (_, i) => i);
    } else if (style === 'gruenderzeit') {
        root.facade.base_window.height_ratio = 0.75;
        root.facade.base_window.window!.mullions_cols = 2;
        root.facade.base_window.window!.mullions_rows = 3;
    } else if (style === 'neue_sachlichkeit') {
        root.facade.base_window.width_ratio = 0.8;
        root.facade.base_window.height_ratio = 0.5;
        root.facade.base_window.window!.mullions_cols = 3;
        root.facade.base_window.window!.mullions_rows = 1;
    }

    modules.push(root);

    // --- RANDOM EMPTY WALLS ---
    if (style !== 'modern' && style !== 'neue_sachlichkeit') { 
        const emptyProb = 0.1 + (1 - detailing) * 0.2;
        ['left', 'right', 'back'].forEach(face => {
            const cols = (face === 'left' || face === 'right') ? depth : units;
            for (let f=0; f<floors; f++) {
                for (let c=0; c<cols; c++) {
                    if (rng.bool(emptyProb)) {
                        root.facade.overrides[`${c}_${f}_${face}`] = { type: 'empty', width_ratio: 0, height_ratio: 0, offset_x: 0, offset_y: 0 };
                    }
                }
            }
        });
    }

    // --- ATTACHMENTS ---
    const numAttachments = Math.floor(params.complexity * 4); 
    
    for (let i = 0; i < numAttachments; i++) {
        const type = rng.pick(['wing', 'tower', 'porch_module', 'garage']);
        
        if (type === 'wing') {
            const side = rng.pick(['left', 'right']);
            const wingW = rng.intRange(1, 2);
            const wingH = Math.max(1, floors - rng.intRange(0, 1));
            const wing: HouseModule = {
                id: `wing_${i}`,
                grid: { floors: wingH, units: wingW, depth: Math.max(1, depth - 1) },
                roof: { ...root.roof, height: root.roof.height * 0.8 },
                wall_color_hex: wallColor,
                wall_texture_id: root.wall_texture_id,
                facade: { ...root.facade, overrides: {} },
                attachment: { parent_id: 'main', face: side as any, origin_x: 0, origin_y: 0 }
            };
            wing.facade.base_window.width_ratio *= 0.9;
            if (rng.bool(0.2)) wing.facade.pattern = 'empty';
            
            modules.push(wing);
        } else if (type === 'tower' && (style === 'victorian' || style === 'mediterranean' || style === 'modern' || style === 'german')) {
            const onRoof = style === 'modern' || rng.bool(0.3);
            const tW = 1;
            const tH = floors + (onRoof ? 1 : 1.5);
            modules.push({
                id: `tower_${i}`,
                grid: { floors: tH, units: tW, depth: 1 },
                roof: { ...root.roof, type: 'pyramid', height: 2.5, overhang: 0.2 },
                wall_color_hex: wallColor,
                wall_texture_id: root.wall_texture_id,
                facade: { 
                    pattern: 'fill_window', 
                    base_window: { ...root.facade.base_window, width_ratio: 0.5 },
                    base_door: DEFAULT_DOOR,
                    overrides: {} 
                },
                attachment: onRoof 
                    ? { parent_id: 'main', face: 'top', origin_x: rng.intRange(0, units-1), origin_y: 0 }
                    : { parent_id: 'main', face: 'front', origin_x: rng.pick([0, units-1]), origin_y: 0 }
            });
        }
    }

    // --- DETAILING PASS ---
    if (detailing > 0) {
        // Dormers
        if (style !== 'modern' && style !== 'japanese' && style !== 'chinese' && style !== 'neue_sachlichkeit' && rng.bool(detailing)) {
            const dCount = rng.intRange(1, Math.max(1, Math.floor(units/2)));
            let dElev = 0.25; let dY = -2.0;
            if (root.roof.type === 'mansard') { dElev = 0.6; dY = -1.5; }
            else if (root.roof.type === 'hipped') { dElev = 0.35; dY = -1.8; }

            for (let k=0; k<dCount; k++) {
                root.roof.dormers!.push({
                    id: `d_${k}`, face: 'front', 
                    position: (k + 0.5) / dCount, 
                    elevation: dElev, y_offset: dY,
                    width: 1.2, height: 1.5, type: 'gabled',
                    color: wallColor, roof_color: roofColor,
                    window: root.facade.base_window.window!
                });
            }
        }
        
        // Balconies
        const balconyProb = detailing * 0.5;
        for (let f=1; f<floors; f++) { 
            for (let u=0; u<units; u++) {
                if (rng.bool(balconyProb) && !root.facade.overrides[`${u}_${f}_front`]) {
                    root.facade.overrides[`${u}_${f}_front`] = {
                        ...root.facade.base_window,
                        offset_x: 0, offset_y: 0,
                        balcony: {
                            depth: 1.0, railing_height: 1.0, 
                            railing_type: style === 'modern' ? 'glass' : 'bars',
                            floor_color: '#555', railing_color: '#333'
                        }
                    };
                }
            }
        }
    }

    // Front Door
    const doorX = Math.floor(units / 2);
    const finalDoorX = symmetry > 0.8 ? doorX : rng.intRange(0, units-1);
    root.facade.overrides[`${finalDoorX}_0_front`] = {
        ...root.facade.base_door,
        offset_x: 0, offset_y: 0,
        porch: (style === 'suburban' || style === 'ranch' || style === 'scandinavian' || style === 'alpine') ? {
            depth: 1.5, width_ratio: 1.5, eaves_height: 2.6, 
            roof_shape: rng.pick(['gabled', 'shed']), roof_color: root.roof.color_hex, deck_height: 0.2
        } : undefined,
        stairs: { width_ratio: 1.5, height: 0.4, depth: 1.0, color: '#999' }
    };

    // Back Door
    if (units > 1 && rng.bool(0.7)) {
        const backDoorX = rng.intRange(0, units-1);
        root.facade.overrides[`${backDoorX}_0_back`] = {
            type: 'door', width_ratio: 0.6, height_ratio: 0.8, offset_x: 0, offset_y: 0,
            door: { leafs: 1, has_window: false, color: '#554433' },
            stairs: { width_ratio: 1.0, height: 0.4, depth: 0.8, color: '#777' }
        };
    }

    return {
        global_dimensions: { mode: 'relative', reference_sizing: 1, floor_height: 3, unit_width: 4, cell_depth: 4 },
        modules,
        default_wall_color_hex: wallColor
    };
}
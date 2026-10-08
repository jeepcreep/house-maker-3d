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
    const { seed, complexity, heightBias, symmetry, detailing } = params;
    const rng = new SeededRandom(seed);
    
    let style = params.style;
    const ALL_STYLES = ['suburban', 'victorian', 'modern', 'alpine', 'mediterranean', 'ranch', 'industrial', 'german', 'scandinavian', 'japanese', 'chinese', 'gruenderzeit', 'neue_sachlichkeit'];
    if (style === 'random') {
        style = rng.pick(ALL_STYLES) as HouseStyle;
    }

    const modules: HouseModule[] = [];
    
    // --- STYLE DEFINITIONS ---
    const CONFIG: Record<string, any> = {
        suburban: { walls: ['#F0F8FF', '#F5F5DC', '#E0E0E0', '#FAF0E6'], roofs: ['#8B4513', '#555555', '#708090'], textures: { wall: 'wood', roof: 'shingles' } },
        victorian: { walls: ['#E6E6FA', '#FFE4E1', '#F0E68C', '#BC8F8F'], roofs: ['#2F4F4F', '#483D8B', '#800000'], textures: { wall: 'wood', roof: 'shingles' } },
        modern: { walls: ['#FFFFFF', '#333333', '#1A1A1A', '#F5F5F5'], roofs: ['#222222', '#444444'], textures: { wall: 'stucco', roof: 'metal' } },
        alpine: { walls: ['#8B4513', '#CD853F', '#DEB887', '#FDF5E6'], roofs: ['#555555', '#696969', '#2F4F4F'], textures: { wall: 'wood', roof: 'shingles' } },
        mediterranean: { walls: ['#FFDEAD', '#F5DEB3', '#FFF8DC', '#FFDAB9', '#FFC0CB', '#FFFFE0', '#FF7F50'], roofs: ['#E9967A', '#CD5C5C', '#FFA07A', '#B22222'], textures: { wall: 'stucco', roof: 'tiles' } },
        ranch: { walls: ['#FFFFFF', '#FAFAD2', '#D3D3D3'], roofs: ['#708090', '#778899', '#2F4F4F'], textures: { wall: 'wood', roof: 'shingles' } },
        industrial: { walls: ['#A9A9A9', '#707070', '#3E3E3E'], roofs: ['#555555', '#222222'], textures: { wall: 'brick', roof: 'metal' } },
        german: { walls: ['#F0F0F0', '#FFFFF0', '#FFF5EE'], roofs: ['#8B4513', '#A52A2A', '#D2691E'], textures: { wall: 'stucco', roof: 'tiles' } },
        scandinavian: { walls: ['#8B0000', '#DAA520', '#2F4F4F', '#F0F0F0', '#222222'], roofs: ['#333333', '#696969', '#1C1C1C'], textures: { wall: 'wood', roof: 'metal' } },
        japanese: { walls: ['#F5F5DC', '#FFFFFF', '#FAF9F6'], roofs: ['#333333', '#444444', '#1A1A1A'], textures: { wall: 'stucco', roof: 'tiles' } },
        chinese: { walls: ['#B22222', '#F0F0F0', '#FFFFFF'], roofs: ['#FFD700', '#333333', '#2F4F4F'], textures: { wall: 'stucco', roof: 'tiles' } },
        gruenderzeit: { walls: ['#DCDCDC', '#EEDD82', '#FFE4C4', '#F5F5DC'], roofs: ['#2F4F4F', '#696969', '#483D8B'], textures: { wall: 'stucco', roof: 'shingles' } },
        neue_sachlichkeit: { walls: ['#FFFFFF', '#F5F5F5', '#8B0000', '#B0B0B0'], roofs: ['#333333', '#000000'], textures: { wall: 'brick', roof: 'metal' } }
    };
    
    const styleConfig = CONFIG[style as keyof typeof CONFIG] || CONFIG['suburban'];
    const ROOF_TYPES: { [key: string]: RoofType[] } = {
        suburban: ['gabled', 'hipped'], victorian: ['hipped', 'mansard', 'pyramid'], modern: ['shed', 'shed', 'flat'],
        alpine: ['gabled'], mediterranean: ['hipped'], ranch: ['gabled', 'hipped'], industrial: ['shed', 'shed', 'flat'],
        german: ['gabled', 'hipped', 'half_hipped'], scandinavian: ['gabled', 'saltbox'],
        japanese: ['pyramid', 'gabled'], chinese: ['pyramid', 'hipped'], // Hogyo = Pyramid
        gruenderzeit: ['mansard', 'hipped'], neue_sachlichkeit: ['flat', 'shed']
    };

    // --- GENERATION ---
    const wallColor = rng.pick(styleConfig.walls) as string;
    const roofColor = rng.pick(styleConfig.roofs) as string;
    const roofType = rng.pick(ROOF_TYPES[style] || ['gabled']);
    
    let wallTex = styleConfig.textures.wall;
    if (style === 'neue_sachlichkeit' && wallColor === '#8B0000') wallTex = 'brick';
    else if (style === 'neue_sachlichkeit') wallTex = 'stucco';

    // Modern/Industrial Roof offsets
    let cornerHeights: [number, number, number, number] = [0, 0, 0, 0];
    if ((style === 'modern' || style === 'industrial' || style === 'neue_sachlichkeit') && (roofType === 'shed' || roofType === 'flat')) {
        const minLift = style === 'neue_sachlichkeit' ? 0.1 : 0.5;
        const maxLift = style === 'neue_sachlichkeit' ? 0.4 : 1.2;
        const lift = rng.range(minLift, maxLift);
        const mode = rng.intRange(0, 3);
        if (mode === 0) cornerHeights = [lift, lift, 0, 0];
        else if (mode === 1) cornerHeights = [0, 0, lift, lift];
        else if (mode === 2) cornerHeights = [lift, 0, 0, lift];
        else cornerHeights = [0, lift, lift, 0];
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
            type: roofType, orientation: rng.pick(['along', 'across']), 
            height: (roofType === 'flat' || roofType === 'shed') ? rng.range(0.2, 0.8) : rng.range(1.5, 3.5), 
            overhang: style === 'alpine' || style === 'japanese' || style === 'chinese' ? 1.0 : 0.4, 
            color_hex: roofColor, texture_id: styleConfig.textures.roof, dormers: [], corner_heights: cornerHeights
        },
        wall_color_hex: wallColor,
        wall_texture_id: wallTex,
        facade: {
            pattern: 'fill_window',
            base_window: { ...DEFAULT_WINDOW, width_ratio: winW, height_ratio: winH, window: { mullions_cols: 2, mullions_rows: 2 } },
            base_door: { ...DEFAULT_DOOR },
            overrides: {},
            timbering: { enabled: false, color: '#443322', beam_width: 0.15, patterns: ['frame'], floors_indices: [], faces: {front:true, back:true, left:true, right:true} }
        }
    };

    // Style Specifics
    if (style === 'victorian' || style === 'gruenderzeit') {
        root.facade.base_window.height_ratio *= 1.2; 
        root.facade.base_window.window!.shape = rng.bool(0.6) ? 'arch' : 'rect';
        if (style === 'gruenderzeit') {
            root.facade.base_window.window!.mullions_rows = 3;
            floors = Math.max(3, floors); 
        }
    } else if (style === 'alpine' || style === 'german') {
        root.facade.timbering!.enabled = true;
        root.facade.timbering!.patterns = rng.pick([['frame', 'cross'], ['frame', 'diamond']]);
        root.facade.timbering!.floors_indices = Array.from({length: floors}, (_, i) => i);
        if (style === 'alpine') root.facade.base_window.window!.flower_box = false;
    } else if (style === 'mediterranean') {
        root.facade.base_window.window!.shape = 'arch';
        // Base state (will randomize in detailing)
        root.facade.base_window.window!.shutters = { open: true, style: 'louvred', color: rng.pick(['#553322', '#2F4F4F']) };
    } else if (style === 'scandinavian') {
        root.roof.height = 2.5; 
        root.wall_color_hex = rng.pick(['#8B0000', '#DAA520', '#333333']);
        root.facade.base_window.window!.frame_color = '#FFFFFF'; // White Frames
        root.facade.base_window.window!.glass_color = '#dDEEFF';
    } else if (style === 'japanese' || style === 'chinese') {
        root.roof.overhang = 1.0;
        root.roof.height = 2.0;
        root.facade.base_window.window!.mullions_cols = 3; 
        root.facade.base_window.window!.mullions_rows = 4;
        root.facade.timbering!.enabled = true;
        root.facade.timbering!.color = '#222';
        root.facade.timbering!.patterns = ['frame'];
        root.facade.timbering!.floors_indices = Array.from({length: floors}, (_, i) => i);
    } else if (style === 'neue_sachlichkeit') {
        root.facade.base_window.width_ratio = 0.85;
        root.facade.base_window.height_ratio = 0.45;
        root.facade.base_window.window!.mullions_cols = 3;
        root.facade.base_window.window!.mullions_rows = 1;
    }

    modules.push(root);

    // --- ENGAWA (Japanese Arcade) ---
    if ((style === 'japanese' || style === 'chinese') && complexity > 0.3) {
        // Add wrap-around porch modules (Front, Left, Right)
        ['front', 'left', 'right'].forEach(face => {
            modules.push({
                id: `engawa_${face}`,
                grid: { floors: 1, units: (face==='front'?units:depth), depth: 1.0 },
                roof: { type: 'shed', orientation: 'along', height: 0.5, overhang: 0.5, color_hex: roofColor, texture_id: 'tiles' },
                wall_color_hex: '#222', // Dark posts
                facade: { pattern: 'empty', overrides: {}, base_window: DEFAULT_WINDOW, base_door: DEFAULT_DOOR }, // Just roof and deck
                attachment: { parent_id: 'main', face: face as any, origin_x: 0, origin_y: 0 }
            });
        });
    }

    // --- TIERED ROOFS (Japanese/Chinese) ---
    if ((style === 'japanese' || style === 'chinese') && complexity > 0.4) {
        const topW = Math.max(1, units - 1);
        const topD = Math.max(1, depth - 1);
        modules.push({
            id: 'tier_2',
            grid: { floors: 1, units: topW, depth: topD },
            roof: { ...root.roof, height: 1.5, overhang: 1.2 },
            wall_color_hex: wallColor, wall_texture_id: root.wall_texture_id,
            facade: { ...root.facade, overrides: {} },
            attachment: { parent_id: 'main', face: 'top', origin_x: 0.5, origin_y: 0 }
        });
    }

    // --- L-SHAPE / EXTENSIONS ---
    if (complexity > 0.6 && !['japanese', 'chinese'].includes(style)) {
        const extUnits = rng.intRange(1, units);
        const extDepth = rng.intRange(2, 3);
        const face = rng.pick(['left', 'right']) as any;
        modules.push({
            id: 'extension_side',
            grid: { floors: Math.max(1, floors - rng.intRange(0, 1)), units: extUnits, depth: extDepth },
            roof: { 
                type: roofType, orientation: 'along', 
                height: root.roof.height * 0.8, overhang: root.roof.overhang, 
                color_hex: roofColor, texture_id: root.roof.texture_id, dormers: [] 
            },
            wall_color_hex: wallColor, wall_texture_id: root.wall_texture_id,
            facade: { ...root.facade, overrides: {} },
            attachment: { parent_id: 'main', face: face, origin_x: 0, origin_y: 0 }
        });
    }

    // --- DETAILING PASS ---
    if (detailing > 0) {
        // Randomize Window Mullions for variety
        if (rng.bool(detailing * 0.5)) {
            root.facade.base_window.window!.mullions_cols = rng.intRange(1, 3);
            root.facade.base_window.window!.mullions_rows = rng.intRange(1, 3);
        }

        // Mediterranean Shutter Variety
        if (style === 'mediterranean') {
            for (let f=0; f<floors; f++) {
                for (let u=0; u<units; u++) {
                    const key = `${u}_${f}_front`; // And sides? Just front for now.
                    if (rng.bool(0.5)) { // 50% variety
                        root.facade.overrides[key] = {
                            ...root.facade.base_window,
                            offset_x: 0, offset_y: 0,
                            window: { 
                                ...root.facade.base_window.window!, 
                                shutters: { 
                                    open: rng.bool(0.5), // Random open/close
                                    style: 'louvred', 
                                    color: root.facade.base_window.window!.shutters!.color 
                                } 
                            }
                        };
                    }
                }
            }
        }

        // Dormers
        if (!['modern', 'japanese', 'chinese', 'neue_sachlichkeit'].includes(style) && rng.bool(detailing)) {
            const dCount = rng.intRange(1, Math.max(1, Math.floor(units/2)));
            for (let k=0; k<dCount; k++) {
                root.roof.dormers!.push({
                    id: `d_${k}`, face: 'front', position: (k + 0.5) / dCount, elevation: 0.25, y_offset: -2.0,
                    width: 1.2, height: 1.5, type: 'gabled', color: wallColor, roof_color: roofColor,
                    window: { ...root.facade.base_window.window!, flower_box: false }
                });
            }
        }
        
        // Balconies & Alpine Flowers
        const balconyProb = detailing * 0.6;
        for (let f=1; f<floors; f++) { 
            for (let u=0; u<units; u++) {
                const key = `${u}_${f}_front`;
                let hasBalcony = false;
                
                // Add Balconies
                if (rng.bool(balconyProb) || (style === 'alpine' && f === 1)) { 
                    hasBalcony = true;
                    root.facade.overrides[key] = {
                        ...root.facade.base_window,
                        offset_x: 0, offset_y: 0,
                        balcony: { 
                            depth: 1.1, railing_height: 1.0, 
                            railing_type: style === 'modern' || style === 'neue_sachlichkeit' ? 'glass' : 'bars',
                            floor_color: '#553322', railing_color: '#332211'
                        }
                    };
                }
                
                // Alpine Flower Boxes
                if (style === 'alpine') {
                    const addFlower = hasBalcony ? true : rng.bool(0.3); 
                    if (addFlower) {
                        const existing = root.facade.overrides[key] || { ...root.facade.base_window };
                        root.facade.overrides[key] = {
                            ...existing,
                            window: { ...existing.window!, flower_box: true }
                        };
                    }
                }
            }
        }
    }

    // Front Door & Porch (Skip for Japanese/Chinese as they have Engawa)
    if (style !== 'japanese' && style !== 'chinese') {
        const doorX = Math.floor(units / 2);
        const finalDoorX = symmetry > 0.8 ? doorX : rng.intRange(0, units-1);
        const porchWidth = style === 'ranch' ? 2.5 : 1.5;
        root.facade.overrides[`${finalDoorX}_0_front`] = {
            ...root.facade.base_door,
            offset_x: 0, offset_y: 0,
            porch: (style !== 'modern' && style !== 'neue_sachlichkeit' && rng.bool(detailing + 0.3)) ? {
                depth: rng.range(1.2, 2.0), width_ratio: porchWidth, eaves_height: 2.6, 
                roof_shape: rng.pick(['gabled', 'shed', 'flat']), roof_color: root.roof.color_hex, deck_height: 0.2
            } : undefined,
            stairs: { width_ratio: 1.5, height: 0.4, depth: 1.0, color: '#999' }
        };
    }

    return { global_dimensions: { mode: 'relative', reference_sizing: 1, floor_height: 3, unit_width: 4, cell_depth: 4 }, modules, default_wall_color_hex: wallColor };
}
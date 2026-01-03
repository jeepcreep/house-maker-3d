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
        suburban: { walls: ['#F0F8FF', '#F5F5DC'], roofs: ['#8B4513', '#555555'], textures: { wall: 'wood', roof: 'shingles' } },
        victorian: { walls: ['#E6E6FA', '#FFE4E1'], roofs: ['#2F4F4F', '#483D8B'], textures: { wall: 'wood', roof: 'shingles' } },
        modern: { walls: ['#FFFFFF', '#333333'], roofs: ['#222222'], textures: { wall: 'stucco', roof: 'metal' } },
        alpine: { walls: ['#DEB887'], roofs: ['#696969'], textures: { wall: 'wood', roof: 'shingles' } },
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
        suburban: ['gabled', 'hipped'], victorian: ['hipped', 'mansard', 'pyramid'], modern: ['shed', 'shed', 'flat'],
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
        wall_texture_id: styleConfig.textures.wall,
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
            floors = Math.max(3, floors); // Gründerzeit is tall
        }
    } else if (style === 'alpine' || style === 'german') {
        root.facade.timbering!.enabled = true;
        root.facade.timbering!.patterns = rng.pick([['frame', 'cross'], ['frame', 'diamond']]);
        root.facade.timbering!.floors_indices = Array.from({length: floors}, (_, i) => i);
        if (style === 'alpine') {
            root.facade.base_window.window!.flower_box = true; // Add flower boxes
        }
    } else if (style === 'mediterranean') {
        root.facade.base_window.window!.shape = 'arch';
        const shuttersClosed = rng.bool(0.3);
        root.facade.base_window.window!.shutters = { open: !shuttersClosed, style: 'louvred', color: rng.pick(['#553322', '#2F4F4F']) };
    } else if (style === 'neue_sachlichkeit') {
        root.facade.base_window.width_ratio = 0.85;
        root.facade.base_window.height_ratio = 0.45;
        root.facade.base_window.window!.mullions_cols = 3;
        root.facade.base_window.window!.mullions_rows = 1;
    }

    modules.push(root);

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

    // --- DETAILING PASS ---
    if (detailing > 0) {
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
        
        // Balconies
        const balconyProb = detailing * 0.6;
        for (let f=1; f<floors; f++) { 
            for (let u=0; u<units; u++) {
                if (rng.bool(balconyProb) || (style === 'alpine' && f === 1)) { // Force alpine 2nd floor
                    root.facade.overrides[`${u}_${f}_front`] = {
                        ...root.facade.base_window,
                        offset_x: 0, offset_y: 0,
                        balcony: { 
                            depth: 1.1, railing_height: 1.0, 
                            railing_type: style === 'modern' || style === 'neue_sachlichkeit' ? 'glass' : 'bars',
                            floor_color: '#553322', railing_color: '#332211'
                        }
                    };
                }
            }
        }
    }

    // Front Door & Porch
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

    return { global_dimensions: { mode: 'relative', reference_sizing: 1, floor_height: 3, unit_width: 4, cell_depth: 4 }, modules, default_wall_color_hex: wallColor };
}

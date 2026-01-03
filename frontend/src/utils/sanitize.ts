import type { HouseProject, FacadeElement, HouseModule, DormerConfig } from '../types/schema';

const DEFAULT_WINDOW: FacadeElement = {
    type: 'window',
    width_ratio: 0.6, height_ratio: 0.6,
    offset_x: 0, offset_y: 0,
    window: { mullions_cols: 2, mullions_rows: 2 }
};

const DEFAULT_DOOR: FacadeElement = {
    type: 'door',
    width_ratio: 0.7, height_ratio: 0.85,
    offset_x: 0, offset_y: 0,
    door: { leafs: 1, has_window: false }
};

export function sanitizeProject(p: any): HouseProject {
    if (!p) return p;
    
    // Ensure global dimensions
    if (!p.global_dimensions) {
        p.global_dimensions = { mode: 'relative', reference_sizing: 1.0, floor_height: 3.0, unit_width: 4.0, cell_depth: 4.0 };
    }
    
    // Ensure modules array
    if (!p.modules || !Array.isArray(p.modules)) p.modules = [];
    
    p.modules.forEach((m: HouseModule) => {
        // Grid
        if (!m.grid) m.grid = { floors: 1, units: 1, depth: 2 };
        m.grid.floors = m.grid.floors || 1;
        m.grid.units = m.grid.units || 1;
        m.grid.depth = m.grid.depth || 2; // Default depth 2
        
        // Roof
        if (!m.roof) m.roof = { type: 'flat', orientation: 'across', height: 0.2, overhang: 0.1, color_hex: '#444' };
        m.roof.height = m.roof.height ?? 1.5;
        
        // Facade
        if (!m.facade) {
            m.facade = {
                pattern: 'fill_window',
                base_window: { ...DEFAULT_WINDOW },
                base_door: { ...DEFAULT_DOOR },
                overrides: {}
            };
        }
        
        // Ensure Base Elements have ratios
        const sanitizeEl = (el: FacadeElement, fallback: FacadeElement) => {
            if (!el) return { ...fallback };
            el.width_ratio = el.width_ratio ?? fallback.width_ratio;
            el.height_ratio = el.height_ratio ?? fallback.height_ratio;
            el.offset_x = 0; // Force 0 to align columns
            el.offset_y = el.offset_y ?? 0;
            return el;
        };
        
        m.facade.base_window = sanitizeEl(m.facade.base_window, DEFAULT_WINDOW);
        m.facade.base_door = sanitizeEl(m.facade.base_door, DEFAULT_DOOR);
        
        // Overrides
        if (!m.facade.overrides) m.facade.overrides = {};
        
        // Fix Malformed Keys (AI often outputs "face_u_f" instead of "u_f_face")
        const newOverrides: any = {};
        Object.entries(m.facade.overrides).forEach(([key, val]) => {
            let finalKey = key;
            // Check for "front_0_0" pattern
            const wrongMatch = key.match(/^(front|back|left|right)_(\d+)_(\d+)$/);
            if (wrongMatch) {
                // wrongMatch[1] = face, [2] = u, [3] = f
                // Target: "u_f_face"
                finalKey = `${wrongMatch[2]}_${wrongMatch[3]}_${wrongMatch[1]}`;
            }
            newOverrides[finalKey] = val;
        });
        m.facade.overrides = newOverrides;

        Object.values(m.facade.overrides).forEach((el: any) => {
            el.width_ratio = el.width_ratio ?? 0.6;
            el.height_ratio = el.height_ratio ?? 0.6;
            el.offset_x = 0; // Force 0
        });
        
        // Dormers
        if (m.roof.dormers) {
            m.roof.dormers.forEach((d: DormerConfig) => {
                d.y_offset = d.y_offset ?? -2.0;
                d.position = d.position ?? 0.5;
                d.elevation = d.elevation ?? 0.25; // Lower default elevation
                d.rotation_y = d.rotation_y ?? 0;
                d.rotation_x = d.rotation_x ?? 0;
                // Ensure window config in dormer
                if (!d.window) d.window = { mullions_cols: 2, mullions_rows: 2 };
            });
        }
    });
    
    return p as HouseProject;
}

// --- FACADE ELEMENTS ---

export interface WindowConfig {
  mullions_cols: number; // 1 = no split (just frame)
  mullions_rows: number;
  frame_color?: string;
  glass_color?: string;
  transom_height?: number; // Optional horizontal bar height (0.0 - 1.0)
}

export interface DoorConfig {
  leafs: 1 | 2;
  color?: string;
  has_window: boolean;
  handle_color?: string;
}

export interface FacadeElement {
  type: 'window' | 'door' | 'empty';
  
  // Sizing (Relative to Cell)
  width_ratio: number;  // 0.1 - 1.0
  height_ratio: number; // 0.1 - 1.0
  
  // Positioning (Relative to Cell Center)
  offset_x: number; // -0.5 to 0.5
  offset_y: number; // -0.5 to 0.5 (For doors, ignored/auto-calculated)

  // Details
  window?: WindowConfig;
  door?: DoorConfig;
}

// Map of "x,y,face" -> Element
// Key Format: `${u}_${f}_${face}` (e.g. "0_0_front")
export interface ElementOverrideMap {
  [key: string]: FacadeElement;
}

export interface ModuleFacadeConfig {
  // Global Pattern for this module
  pattern: 'empty' | 'fill_window' | 'ground_commercial';
  
  // Base Style for Pattern Elements
  base_window: FacadeElement;
  base_door: FacadeElement; // For ground_commercial

  // Specific Overrides
  overrides: ElementOverrideMap;
}

// --- MODULES ---

export type RoofType = 'flat' | 'gabled' | 'hipped' | 'half_hipped' | 'pyramid' | 'gambrel' | 'mansard' | 'shed' | 'saltbox' | 'round' | 'dome';
export type RoofOrientation = 'along' | 'across'; 

export interface RoofConfig {
  type: RoofType;
  orientation: RoofOrientation;
  overhang: number; 
  height: number; 
  color_hex: string;
  ridge_ratio?: number; 
  slope_break_ratio?: number; 
  peak_offset?: number; 
  corner_heights?: [number, number, number, number];
}

export interface DimensionConfig {
  mode: 'absolute' | 'relative';
  reference_sizing: number; 
  floor_height: number; 
  unit_width: number; 
  cell_depth: number;
  
  // Absolute Mode
  total_height?: number; 
  total_width?: number;
  total_depth?: number;
}

export interface GridCounts {
  floors: number;
  units: number; 
  depth: number; 
}

export interface ModuleAttachment {
  parent_id: string;
  face: 'front' | 'back' | 'left' | 'right' | 'top'; 
  origin_x: number; 
  origin_y: number; 
}

export interface HouseModule {
  id: string;
  grid: GridCounts;
  roof: RoofConfig;
  wall_color_hex?: string;
  attachment?: ModuleAttachment;
  
  // NEW: Facade Configuration
  facade: ModuleFacadeConfig;
}

export interface HouseProject {
  global_dimensions: DimensionConfig;
  modules: HouseModule[];
  default_wall_color_hex: string;
}

// --- DEFAULTS ---

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

export const DEFAULT_PROJECT: HouseProject = {
  default_wall_color_hex: "#F0F0F0",
  global_dimensions: {
    mode: 'relative',
    reference_sizing: 1.0,
    floor_height: 3.0,
    unit_width: 4.0,
    cell_depth: 4.0
  },
  modules: [
    // 1. MAIN HOUSE
    {
      id: "main",
      grid: { floors: 2, units: 3, depth: 2 },
      roof: { type: 'gabled', orientation: 'across', height: 3.0, overhang: 0.4, color_hex: "#B54B35" },
      facade: {
          pattern: 'fill_window',
          base_window: DEFAULT_WINDOW,
          base_door: DEFAULT_DOOR,
          overrides: {
              "1_0_front": DEFAULT_DOOR
          }
      }
    },
    // 2. BAY WINDOW
    {
      id: "bay_window",
      grid: { floors: 1, units: 1, depth: 0.5 },
      roof: { type: 'flat', orientation: 'across', height: 0.2, overhang: 0.1, color_hex: "#444" },
      facade: {
          pattern: 'fill_window',
          base_window: { ...DEFAULT_WINDOW, width_ratio: 0.8, height_ratio: 0.8 },
          base_door: DEFAULT_DOOR,
          overrides: {}
      },
      attachment: { parent_id: "main", face: "front", origin_x: 1, origin_y: 0 }
    },
    // 3. SUNROOM
    {
      id: "sunroom",
      grid: { floors: 1, units: 2, depth: 1.5 },
      wall_color_hex: "#aaccff",
      roof: { type: 'flat', orientation: 'across', height: 0.2, overhang: 0.2, color_hex: "#555" },
      facade: {
          pattern: 'fill_window',
          base_window: { ...DEFAULT_WINDOW, width_ratio: 0.9, height_ratio: 0.9, window: { mullions_cols: 3, mullions_rows: 1 } },
          base_door: DEFAULT_DOOR,
          overrides: {}
      },
      attachment: { parent_id: "main", face: "back", origin_x: 0, origin_y: 0 }
    },
    // 4. TOWER
    {
      id: "tower",
      grid: { floors: 2, units: 1, depth: 1 },
      roof: { type: 'pyramid', orientation: 'across', height: 2.0, overhang: 0.3, color_hex: "#B54B35" },
      facade: {
          pattern: 'fill_window',
          base_window: { ...DEFAULT_WINDOW, width_ratio: 0.4, height_ratio: 0.4 },
          base_door: DEFAULT_DOOR,
          overrides: {}
      },
      attachment: { parent_id: "main", face: "top", origin_x: 2, origin_y: 0 }
    }
  ]
};
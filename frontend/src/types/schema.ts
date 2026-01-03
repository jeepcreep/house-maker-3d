// --- FACADE ELEMENTS ---

export interface ShutterConfig {
  color: string;
  style: 'louvred' | 'panel' | 'board';
  open: boolean; 
}

export interface WindowConfig {
  shape?: 'rect' | 'arch' | 'round'; // Explicit shape control
  mullions_cols: number; 
  mullions_rows: number;
  frame_color?: string;
  glass_color?: string;
  transom_height?: number; 
  shutters?: ShutterConfig;
  
  // Corner Radii (0.0 = Square, 1.0 = Max Radius)
  corner_radius_tl?: number;
  corner_radius_tr?: number;
  corner_radius_bl?: number;
  corner_radius_br?: number;
}

export interface BalconyConfig {
  depth: number; // How far it sticks out (meters approx, or relative)
  railing_height: number; 
  railing_type: 'glass' | 'bars' | 'solid';
  floor_color?: string;
  railing_color?: string;
}

export interface PorchConfig {
  depth: number;
  width_ratio: number; // Relative to cell width
  eaves_height: number; // Height of columns
  roof_shape: 'flat' | 'gabled' | 'shed';
  roof_color?: string;
  deck_height: number; // Height of floor base
}

export interface StairConfig {
  width_ratio: number; 
  height: number; // Total height drop
  depth: number; // Total run length
  color?: string;
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
  balcony?: BalconyConfig;
  porch?: PorchConfig;
  stairs?: StairConfig;
}

// Map of "x,y,face" -> Element
// Key Format: `${u}_${f}_${face}` (e.g. "0_0_front")
export interface ElementOverrideMap {
  [key: string]: FacadeElement;
}

export interface TimberConfig {
  enabled: boolean;
  color: string;
  beam_width: number;
  patterns: ('frame' | 'cross' | 'diamond')[];
  floors_indices: number[]; // e.g. [0, 1]
  faces: { front: boolean; back: boolean; left: boolean; right: boolean; };
}

export interface ModuleFacadeConfig {
  // Global Pattern for this module
  pattern: 'empty' | 'fill_window' | 'ground_commercial';
  
  // Timbering
  timbering?: TimberConfig;
  
  // Base Style for Pattern Elements
  base_window: FacadeElement;
  base_door: FacadeElement; // For ground_commercial

  // Specific Overrides
  overrides: ElementOverrideMap;
}

// --- MODULES ---

export type RoofType = 'flat' | 'gabled' | 'hipped' | 'half_hipped' | 'pyramid' | 'gambrel' | 'mansard' | 'shed' | 'saltbox' | 'round' | 'dome';
export type RoofOrientation = 'along' | 'across'; 

export interface DormerConfig {
  id: string;
  face: 'front' | 'back' | 'left' | 'right';
  position: number; // 0.0 to 1.0 (Horizontal center)
  elevation: number; // 0.0 to 1.0 (Vertical up the slope)
  y_offset?: number; // Manual vertical adjustment
  rotation_y?: number; // Manual Y rotation
  rotation_x?: number; // Manual X rotation
  width: number; 
  height: number;
  type: 'gabled' | 'shed' | 'flat' | 'arched' | 'skylight';
  color?: string; // Wall color
  roof_color?: string; // New: Roof color
  window: WindowConfig;
}

export interface RoofConfig {
  type: RoofType;
  orientation: RoofOrientation;
  overhang: number; 
  height: number; 
  color_hex: string;
  texture_id?: string; // e.g. 'shingles', 'tiles'
  ridge_ratio?: number; 
  slope_break_ratio?: number; 
  peak_offset?: number; 
  corner_heights?: [number, number, number, number];
  dormers?: DormerConfig[];
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
  wall_texture_id?: string; // e.g. 'brick', 'stucco'
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
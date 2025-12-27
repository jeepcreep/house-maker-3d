export type RoofType = 
  | 'flat' 
  | 'gabled' 
  | 'hipped' 
  | 'half_hipped' 
  | 'pyramid' 
  | 'gambrel' 
  | 'mansard' 
  | 'shed' // Skillion
  | 'saltbox' 
  | 'round' // Barrel
  | 'dome';

export type RoofOrientation = 'along' | 'across'; 

export interface RoofConfig {
  type: RoofType;
  orientation: RoofOrientation;
  overhang: number; 
  height: number; 
  color_hex: string;
  
  // Variability Parameters (Optional, with sane defaults)
  
  // For Hipped/Half-Hipped/Mansard: How wide is the top ridge relative to width? (0 = Pyramid, 1 = Gabled)
  ridge_ratio?: number; 
  
  // For Gambrel/Mansard: Where does the slope break happen vertically? (0.0 - 1.0)
  slope_break_ratio?: number; 
  
  // For Saltbox: Offset of the peak from center (-0.5 to 0.5)
  peak_offset?: number; 
}

export interface DimensionConfig {
  mode: 'absolute' | 'relative';
  reference_sizing: number; // e.g. 3.0 meters (Base unit)

  // Absolute Mode (Total Meters)
  total_height?: number; 
  total_width?: number;
  total_depth?: number;

  // Relative Mode (Multipliers of reference_sizing)
  floor_height?: number; 
  unit_width?: number;
  cell_depth?: number;
}

export interface GridCounts {
  floors: number;
  units: number; 
  depth: number; 
}

export interface ModuleAttachment {
  parent_id: string;
  face: 'front' | 'back' | 'left' | 'right' | 'top'; 
  
  // Anchor points on the parent face (0-based indices)
  // X: Unit index (horizontal)
  // Y: Floor index (vertical)
  origin_x: number; 
  origin_y: number; 
}

export interface HouseModule {
  id: string;
  grid: GridCounts;
  
  // Each module has its own roof
  roof: RoofConfig;
  
  // Optional Visual Override
  wall_color_hex?: string;

  // If undefined, this is the ROOT module (at 0,0,0)
  attachment?: ModuleAttachment;
}

export interface HouseProject {
  global_dimensions: DimensionConfig;
  modules: HouseModule[];
  
  // Global defaults
  default_wall_color_hex: string;
}

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
    // 1. MAIN HOUSE (Root)
    {
      id: "main",
      grid: { floors: 2, units: 3, depth: 2 },
      roof: { type: 'gabled', orientation: 'across', height: 3.0, overhang: 0.4, color_hex: "#B54B35" }
    },
    // 2. BAY WINDOW (Front)
    {
      id: "bay_window",
      grid: { floors: 1, units: 1, depth: 1 }, // Small box
      roof: { type: 'flat', orientation: 'across', height: 0.2, overhang: 0.1, color_hex: "#444" },
      attachment: {
        parent_id: "main",
        face: "front",
        origin_x: 1, // Center unit (0, 1, 2)
        origin_y: 0  // Ground floor
      }
    },
    // 3. SUNROOM (Back)
    {
      id: "sunroom",
      grid: { floors: 1, units: 2, depth: 1 }, // Wider
      wall_color_hex: "#aaccff", // Glass-ish
      roof: { type: 'flat', orientation: 'across', height: 0.2, overhang: 0.2, color_hex: "#555" },
      attachment: {
        parent_id: "main",
        face: "back",
        origin_x: 0, // Start at left
        origin_y: 0
      }
    },
    // 4. TOWER (Top)
    {
      id: "tower",
      grid: { floors: 1, units: 1, depth: 1 },
      roof: { type: 'pyramid', orientation: 'across', height: 2.0, overhang: 0.3, color_hex: "#B54B35" },
      attachment: {
        parent_id: "main",
        face: "top",
        origin_x: 2, // Right side
        origin_y: 0  // Front side (depth index 0)
      }
    }
  ]
};

// --- Legacy Types (Required for compilation of unused components if any remain) ---

export interface ElementDivisions {
  cols: number;
  rows: number;
}

export interface DoorAttributes {
  color_hex?: string;
  width_ratio?: number;
  height_ratio?: number;
}

export interface ShutterAttributes {
  style: 'solid' | 'slats' | 'panel';
  color_hex: string;
  width_ratio?: number; 
}

export interface HouseElement {
  type: 'window' | 'door' | 'balcony' | 'decoration';
  style?: 'rectangular' | 'round' | 'arch_round' | 'circle'; 
  divisions?: ElementDivisions;
  frame_color_hex?: string;
  glass_color_hex?: string;
  glass_opacity?: number;
  width_ratio?: number;
  height_ratio?: number;
  color_hex?: string;
  shutters?: ShutterAttributes;
  has_flower_box?: boolean;
  flower_box_color_hex?: string;
  railing_color_hex?: string;
  door_attributes?: DoorAttributes;
}

export interface ElementDictionary {
  [key: string]: HouseElement;
}

export interface GridDefinition {
  floors: number;
  columns: number;
  map: string[][]; 
}

export interface Extrusion {
    id: string;
    type: 'dormer' | 'bay_window' | 'annex'; 
    width_ratio: number;
    height_ratio: number;
    depth: number;
    x_ratio: number; 
    y_ratio: number; 
    roof?: any; 
    facade_content: Facade; 
}

export interface Facade {
  orientation: 'front' | 'back' | 'left' | 'right';
  grid: GridDefinition;
  elements: ElementDictionary;
  extrusions?: Extrusion[]; 
}
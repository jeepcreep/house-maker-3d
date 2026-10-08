"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const dotenv_1 = __importDefault(require("dotenv"));
const generative_ai_1 = require("@google/generative-ai");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = 8000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// File Upload
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Gemini Config
const apiKey = process.env.GOOGLE_API_KEY;
// Use the environment variable directly. Fallback is handled downstream if needed, 
// but we prioritize the user's config.
const modelName = process.env.GEMINI_MODEL_NAME;
if (!apiKey) {
    console.warn("Warning: GOOGLE_API_KEY not set in backend/.env");
}
if (!modelName) {
    console.warn("Warning: GEMINI_MODEL_NAME not set in backend/.env. Defaulting to 'gemini-1.5-flash' for safety.");
}
const activeModel = modelName || 'gemini-1.5-flash';
console.log(`[Backend] Initializing AI with model: ${activeModel}`);
const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey || "");
// Schema Definition (Typescript interface as string for the prompt)
const SCHEMA_DEFINITION = `
export interface ShutterConfig { color: string; style: 'louvred' | 'panel' | 'board'; open: boolean; }
export interface WindowConfig { shape?: 'rect' | 'arch' | 'round'; mullions_cols: number; mullions_rows: number; frame_color?: string; glass_color?: string; transom_height?: number; shutters?: ShutterConfig; corner_radius_tl?: number; corner_radius_tr?: number; corner_radius_bl?: number; corner_radius_br?: number; }
export interface BalconyConfig { depth: number; railing_height: number; railing_type: 'glass' | 'bars' | 'solid'; floor_color?: string; railing_color?: string; }
export interface PorchConfig { depth: number; width_ratio: number; eaves_height: number; roof_shape: 'flat' | 'gabled' | 'shed'; roof_color?: string; deck_height: number; }
export interface StairConfig { width_ratio: number; height: number; depth: number; color?: string; }
export interface DoorConfig { leafs: 1 | 2; color?: string; has_window: boolean; handle_color?: string; }
export interface FacadeElement { type: 'window' | 'door' | 'empty'; width_ratio: number; height_ratio: number; offset_x: number; offset_y: number; window?: WindowConfig; door?: DoorConfig; balcony?: BalconyConfig; porch?: PorchConfig; stairs?: StairConfig; }
// Key Format: "u_f_face" (e.g. "0_0_front", "2_1_back"). u=column, f=floor.
export interface ElementOverrideMap { [key: string]: FacadeElement; }
export interface TimberConfig { enabled: boolean; color: string; beam_width: number; patterns: ('frame' | 'cross' | 'diamond')[]; floors_indices: number[]; faces: { front: boolean; back: boolean; left: boolean; right: boolean; }; }
export interface ModuleFacadeConfig { pattern: 'empty' | 'fill_window' | 'ground_commercial'; timbering?: TimberConfig; base_window: FacadeElement; base_door: FacadeElement; overrides: ElementOverrideMap; }
export type RoofType = 'flat' | 'gabled' | 'hipped' | 'half_hipped' | 'pyramid' | 'gambrel' | 'mansard' | 'shed' | 'saltbox' | 'round' | 'dome';
export interface DormerConfig { id: string; face: 'front' | 'back' | 'left' | 'right'; position: number; elevation: number; y_offset?: number; rotation_y?: number; rotation_x?: number; width: number; height: number; type: 'gabled' | 'shed' | 'flat' | 'arched' | 'skylight'; color?: string; roof_color?: string; window: WindowConfig; }
export interface RoofConfig { type: RoofType; orientation: 'along' | 'across'; overhang: number; height: number; color_hex: string; ridge_ratio?: number; slope_break_ratio?: number; peak_offset?: number; corner_heights?: [number, number, number, number]; dormers?: DormerConfig[]; }
export interface GridCounts { floors: number; units: number; depth: number; }
export interface ModuleAttachment { parent_id: string; face: 'front' | 'back' | 'left' | 'right' | 'top'; origin_x: number; origin_y: number; }
export interface HouseModule { id: string; grid: GridCounts; roof: RoofConfig; wall_color_hex?: string; attachment?: ModuleAttachment; facade: ModuleFacadeConfig; }
export interface DimensionConfig { mode: 'absolute' | 'relative'; reference_sizing: number; floor_height: number; unit_width: number; cell_depth: number; }
export interface HouseProject { global_dimensions: DimensionConfig; modules: HouseModule[]; default_wall_color_hex: string; }
`;
const SYSTEM_PROMPT = `
You are an expert architectural AI. Your task is to analyze the provided image of a house and reconstruct it as a 3D model.

# Workflow:
1. ANALYSIS: First, provide a detailed textual description of the house. Identify the main volumes (modules), the roof shape, wall colors, window patterns, and special details (dormers, timbering, porches, etc.).
2. JSON GENERATION: Based on your analysis, provide a valid JSON object matching the 'HouseProject' interface defined below. Place the JSON inside a \`\`\`json code block.

# JSON Rules:
- Strictly adhere to the 'HouseProject' schema.
- Decompose the house into 'modules'. Main body is 'main'. Extensions are attached.
- Estimate dimensions (floors, units) based on visible proportions.
- Detect roof types (gabled, hipped, mansard, etc.).
- Facade: map windows/doors to the grid using 'overrides' or 'patterns'.
- Details: Include dormers, timbering, balconies, or porches if visible.

# Schema Definition:
${SCHEMA_DEFINITION}
`;
const SYSTEM_PROMPT_UPDATE = `
You are an expert architectural AI. Your task is to modify an existing 3D house model based on natural language instructions.

# Workflow:
1. ANALYSIS: Briefly analyze the current JSON model and the user's request.
2. JSON GENERATION: Provide the UPDATED valid JSON object matching the 'HouseProject' interface. Place the JSON inside a \`\`\`json code block.

# Rules:
- Strictly adhere to the 'HouseProject' schema.
- Keep all parts of the house that are not mentioned in the request.
- If the user asks to "add" something, create the appropriate module or override.
- If the user asks to "change" something (color, roof type, dimensions), update the existing fields.
- Ensure the resulting model is structurally sound (e.g., attachments make sense).

# Schema Definition:
${SCHEMA_DEFINITION}
`;
app.get('/', (req, res) => {
    res.send({ message: "House Maker API (Node/TS)", model: activeModel });
});
app.post('/generate', upload.single('file'), async (req, res) => {
    if (!apiKey) {
        res.status(500).json({ error: "Server API Key not configured." });
        return;
    }
    try {
        const file = req.file;
        const promptText = req.body.prompt || "";
        if (!file) {
            res.status(400).json({ error: "No file uploaded" });
            return;
        }
        const model = genAI.getGenerativeModel({ model: activeModel });
        const imagePart = {
            inlineData: {
                data: file.buffer.toString('base64'),
                mimeType: file.mimetype
            }
        };
        const parts = [
            SYSTEM_PROMPT,
            imagePart,
        ];
        if (promptText) {
            parts.push(`User Tip: ${promptText}`);
        }
        const result = await model.generateContent(parts);
        const response = await result.response;
        const text = response.text();
        // Extract JSON using Regex
        let jsonText = text;
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonText = jsonMatch[1];
        }
        else {
            // Fallback: try to find start/end braces if no markdown
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                jsonText = text.substring(start, end + 1);
            }
        }
        const data = JSON.parse(jsonText.trim());
        // Inject debug info
        res.json({ ...data, _debug_raw_text: text });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});
app.post('/update', async (req, res) => {
    if (!apiKey) {
        res.status(500).json({ error: "Server API Key not configured." });
        return;
    }
    try {
        const { currentProject, instruction } = req.body;
        if (!currentProject || !instruction) {
            res.status(400).json({ error: "Missing currentProject or instruction" });
            return;
        }
        const model = genAI.getGenerativeModel({ model: activeModel });
        const prompt = `
        CURRENT MODEL:
        ${JSON.stringify(currentProject, null, 2)}

        USER INSTRUCTION:
        ${instruction}
        `;
        const result = await model.generateContent([
            SYSTEM_PROMPT_UPDATE,
            prompt
        ]);
        const response = await result.response;
        const text = response.text();
        // Extract JSON using Regex
        let jsonText = text;
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonText = jsonMatch[1];
        }
        else {
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                jsonText = text.substring(start, end + 1);
            }
        }
        const data = JSON.parse(jsonText.trim());
        res.json({ ...data, _debug_raw_text: text });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

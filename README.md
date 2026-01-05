# House Maker 3D

A professional-grade architectural prototyping tool for creating, visualizing, and procedurally generating 3D house models directly in the browser. 

The project combines a precise **Grid-based Builder** with a **Procedural Engine** and an **AI Vision Architect** to bridge the gap between imagination and structured 3D data.

## 🚀 Key Features

*   **3D Scene Viewer:** High-performance rendering using React Three Fiber (Three.js) with real-time lighting, shadows, and environment mapping.
*   **Procedural Architect 3.0:** Instant generation of houses across 13+ architectural styles including *Alpine, Japanese (Hogyo/Engawa), Mediterranean, Scandinavian, Gründerzeit, and Neue Sachlichkeit*.
*   **AI Architect:** Image-to-JSON reconstruction. Upload a photo of a real house and let Google Gemini (2.0/2.5) analyze the structure and facade to rebuild it in 3D.
*   **Facade System:** Granular control over window grids (mullions), shapes (arched/round), shutters, flower boxes, balconies, porches, and stairs.
*   **Procedural Materials:** Dynamic grayscale textures (Brick, Stucco, Wood, Tile, Shingles, Metal) generated on-the-fly via Canvas and tinted by user-selected colors.
*   **Direct Interaction:** Click-to-Select logic allows you to select modules, roofs, or windows directly in the 3D view for instant editing.
*   **Persistent Storage:** Save and load your designs locally to iterate over time.

## 🛠 Tech Stack

*   **Frontend:** React 19, TypeScript, Three.js, React Three Fiber (R3F), Vite.
*   **Backend:** Node.js, Express, TypeScript, Multer.
*   **AI:** Google Generative AI (Gemini SDK).
*   **Data Format:** Custom XBJ (JSON) schema designed for architectural modularity.

## 🏁 How to Run

### 1. Backend (AI Services)
1. Navigate to the `backend/` directory.
2. Create a `.env` file based on `.env.example`.
3. Add your `GOOGLE_API_KEY`.
4. Run:
   ```bash
   npm install
   npm run dev
   ```

### 2. Frontend (The App)
1. Navigate to the `frontend/` directory.
2. Run:
   ```bash
   npm install
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

## 🏗 Schema Architecture

The core of the project is the `HouseProject` JSON schema. Every house is a collection of `modules` (boxes) with:
*   **Grid:** Unit-based dimensions for perfect alignment.
*   **Roof:** Sophisticated shapes (Gabled, Hipped, Mansard, Saltbox, etc.) with manual corner offsets.
*   **Attachments:** Hierarchical parent-child relationships for towers, wings, and extensions.
*   **Facades:** A pattern-based system with per-cell overrides for specific elements.

## 🗺 Roadmap (Upcoming Features)

*   [ ] **Export System:** Ability to export generated models to `.GLB` or `.OBJ` for use in Blender/Unity.
*   [ ] **Interior Logic:** Support for floor plans, interior walls, and basic furniture placement.
*   [ ] **Landscaping:** Procedural garden, fence, and terrain generation.
*   [ ] **Advanced Materials:** PBR (Physically Based Rendering) texture support for even higher realism.
*   [ ] **Undo/Redo:** History management for the manual builder.

---
*Created with focus on architectural precision and AI-driven creativity.*

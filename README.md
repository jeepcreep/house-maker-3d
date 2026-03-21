# 🏠 House Maker 3D: The Architectural Prototyping Suite

Welcome to **House Maker 3D**, a high-performance, browser-based tool for designing and generating 3D architectural models. Whether you're using **AI-powered vision** to reconstruct real buildings or building from scratch with a **procedural grid system**, House Maker 3D turns complex architectural data into interactive 3D scenes.

---

## 🌟 Core Pillars

### 1. 🤖 AI Vision Architect
Bridge the gap between reality and digital twins. Upload a photo of any house, and our **Google Gemini-powered** backend will analyze the structure, roof type, colors, and facade elements to generate a precise 3D JSON reconstruction.

### 2. 🧱 Procedural Grid System
Design with mathematical precision. Every house is built on a modular grid, allowing for:
*   **13+ Architectural Styles:** From *Alpine* and *Japanese Engawa* to *Modernist* and *Gründerzeit*.
*   **7+ Facade Add-ons:** Balconies, Porches, Timbering, Stairs, Dormers, Skylights, and Shutters.
*   **Dynamic Roofs:** 12+ roof types including Gabled, Hipped, Mansard, and Gambrel with custom overhangs and ridge ratios.

### 3. 🏢 Real Estate & PropTech (Spin-off)
The project includes a specialized **Real Estate** branch focused on:
*   **Virtual Staging:** Interactive tabbed interfaces for different property styles.
*   **Marketing Tools:** Configurable Hero headlines, SEO-optimized titles, and customizable CTA buttons for property listings.
*   **Public Embedding:** Share your 3D models via read-only public routes (`/embed/[id]`).

---

## 🛠 Technical Stack

*   **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Three.js](https://threejs.org/) via [React Three Fiber (R3F)](https://r3f.docs.pmnd.rs/).
*   **Backend:** [Node.js](https://nodejs.org/) (Express/TypeScript) with [Google Generative AI SDK](https://ai.google.dev/).
*   **Build Tool:** [Vite](https://vitejs.dev/) for lightning-fast development.
*   **Schema:** Custom `HouseProject` JSON spec for portable architectural data.

---

## 🚀 Getting Started

### 1. Backend Setup (AI Services)
The backend handles the heavy lifting for AI image analysis.
1.  Navigate to `/backend`.
2.  Install dependencies: `npm install`.
3.  Create a `.env` file (see `.env.example`):
    ```env
    GOOGLE_API_KEY=your_gemini_api_key_here
    GEMINI_MODEL_NAME=gemini-1.5-flash
    ```
4.  Start the server: `npm run dev`. (Runs on `http://localhost:8000`).

### 2. Frontend Setup (The App)
1.  Navigate to `/frontend`.
2.  Install dependencies: `npm install`.
3.  Start the dev server: `npm run dev`.
4.  Open `http://localhost:5173` in your browser.

---

## 🏗 Schema & Extension
The heart of this project is the `HouseProject` schema (found in `frontend/src/types/schema.ts`). It decomposes architecture into:
*   **Modules:** The main structural volumes.
*   **Attachments:** Towers, wings, or extensions relative to a parent module.
*   **Overrides:** Specific cell-by-cell facade configurations for windows, doors, and balconies.

## 🗺 Roadmap
- [ ] **GLB/OBJ Export:** Download your models for Blender or Unity.
- [ ] **Floor Plan Logic:** Interior wall generation and room sizing.
- [ ] **Environment Engine:** Procedural terrain, fences, and foliage.
- [ ] **PBR Materials:** Enhanced realism with high-quality texture maps.

---
*Created with a passion for code and architecture. Let's build something beautiful.*

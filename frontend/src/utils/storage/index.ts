import type { HouseProject } from '../../types/schema';

export interface SavedHouse {
    id: string;
    name: string;
    date: string;
    data: HouseProject;
}

const STORAGE_KEY = 'house_maker_saves';

export const HouseStorage = {
    getAll: (): SavedHouse[] => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error("Failed to load saves", e);
            return [];
        }
    },

    save: (name: string, project: HouseProject, existingId?: string) => {
        const saves = HouseStorage.getAll();
        const now = new Date();
        const dateStr = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        
        if (existingId) {
            // Overwrite
            const updated = saves.map(s => s.id === existingId ? { ...s, data: project, date: dateStr, name: name || s.name } : s);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        } else {
            // Create New
            const newSave: SavedHouse = {
                id: Date.now().toString(), 
                name,
                date: dateStr,
                data: project
            };
            const updated = [...saves, newSave];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        }
    },

    delete: (id: string) => {
        const saves = HouseStorage.getAll();
        const updated = saves.filter(s => s.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
    }
};

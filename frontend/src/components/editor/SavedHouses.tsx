import React from 'react';
import type { SavedHouse } from '../../utils/storage';

interface Props {
    saves: SavedHouse[];
    onLoad: (save: SavedHouse) => void;
    onDelete: (id: string) => void;
}

export const SavedHouses: React.FC<Props> = ({ saves, onLoad, onDelete }) => {
    return (
        <div className="builder-form">
            <div className="form-section">
                <h3>📂 My Saved Houses</h3>
                {saves.length === 0 ? <p style={{ color: '#888' }}>No saved houses yet.</p> : (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {saves.map(s => (
                            <li key={s.id} style={{ 
                                background: '#2a2a2a', 
                                marginBottom: '10px', 
                                padding: '10px', 
                                borderRadius: '4px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', color: '#eee' }}>{s.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>{s.date}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button onClick={() => onLoad(s)} style={{ background: '#1976d2', padding: '5px 10px', fontSize: '0.8rem' }}>Load</button>
                                    <button onClick={() => onDelete(s.id)} style={{ background: '#c62828', padding: '5px 10px', fontSize: '0.8rem' }}>✖</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

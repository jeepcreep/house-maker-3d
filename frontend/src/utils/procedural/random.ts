export class SeededRandom {
    private seed: number;

    constructor(seed: number | string) {
        if (typeof seed === 'string') {
            this.seed = this.hashString(seed);
        } else {
            this.seed = seed;
        }
    }

    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    // Returns a pseudo-random number between 0 and 1
    next(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    // Range [min, max)
    range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }

    // Integer range [min, max] inclusive
    intRange(min: number, max: number): number {
        return Math.floor(this.range(min, max + 1));
    }

    // Pick random item from array
    pick<T>(arr: T[]): T {
        return arr[this.intRange(0, arr.length - 1)];
    }
    
    // Boolean with probability (0.0 - 1.0)
    bool(probability: number = 0.5): boolean {
        return this.next() < probability;
    }
}
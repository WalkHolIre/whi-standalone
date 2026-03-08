/**
 * Hiking Difficulty Engine
 * Ported from WHI Ground Control
 */

export type TerrainModifier = 'none' | 'light_bog' | 'heavy_bog' | 'exposed_ridge' | 'scrambling';

export interface DifficultyResult {
    effort_km: number;
    difficulty_score: number;
    difficulty_grade: 'Easy' | 'Moderate' | 'Challenging' | 'Challenging+';
}

const TERRAIN_MULTIPLIERS: Record<TerrainModifier, number> = {
    none: 1.0,
    light_bog: 1.15,
    heavy_bog: 1.3,
    exposed_ridge: 1.2,
    scrambling: 1.35,
};

/**
 * Calculates difficulty based on Naismith's Rule with terrain adjustments
 */
export const calculateDifficulty = (
    distanceKm: number,
    elevationGainM: number,
    terrainModifier: TerrainModifier = 'none'
): DifficultyResult => {
    // 1. Calculate base Effort Kilometres (EK)
    const baseEffortKm = distanceKm + elevationGainM / 100;

    // 2. Apply terrain modifier
    const multiplier = TERRAIN_MULTIPLIERS[terrainModifier] || 1.0;
    const adjustedScore = baseEffortKm * multiplier;

    // 3. Determine grade
    let grade: DifficultyResult['difficulty_grade'];
    if (adjustedScore < 18) grade = 'Easy';
    else if (adjustedScore < 25) grade = 'Moderate';
    else if (adjustedScore < 30) grade = 'Challenging';
    else grade = 'Challenging+';

    return {
        effort_km: Math.round(baseEffortKm * 10) / 10,
        difficulty_score: Math.round(adjustedScore * 10) / 10,
        difficulty_grade: grade,
    };
};

/**
 * Haversine formula to calculate distance between two coordinates
 */
export const haversineDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

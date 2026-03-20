// @ts-nocheck
"use client";

// Tour Code Format: [Type][Region]-[Destination]-[Duration][Difficulty]
// Example: SWI-WW-8M = Self-Guided, Wicklow, Wicklow Way, 8 days, Moderate

const TYPE_MAP = { guided: 'G', day_tour: 'D', self_guided: 'S' };
const DIFFICULTY_MAP = {
  'easy': 'E',
  'Easy': 'E',
  'moderate': 'M',
  'Moderate': 'M',
  'Intermediate': 'M',
  'challenging': 'D',
  'Challenging': 'D',
  'strenuous': 'D',
  'Strenuous': 'D',
};

export function generateTourCode(tourData, destination, region) {
  const category = tourData?.category || tourData?.tour_type || '';
  const typeLetter = TYPE_MAP[category] || 'S'; // Default to Self-Guided

  const regionCode = region?.code || 'XX';
  const destCode = destination?.code || 'XX';
  const days = tourData?.duration_days || '?';

  const difficulty = tourData?.tour_difficulty_grade || tourData?.difficulty_level || '';
  const diffLetter = DIFFICULTY_MAP[difficulty] || 'M'; // Default to Moderate

  return `${typeLetter}${regionCode}-${destCode}-${days}${diffLetter}`;
}
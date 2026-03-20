/**
 * Point of Interest (POI) Type Configuration
 * Defines available POI categories for itinerary editor
 */

export const POI_TYPE_OPTIONS = [
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'restaurant', label: 'Restaurant / Café' },
  { value: 'viewpoint', label: 'Viewpoint' },
  { value: 'historic', label: 'Historic Site' },
  { value: 'nature', label: 'Nature / Wildlife' },
  { value: 'transport', label: 'Transport' },
  { value: 'shop', label: 'Shop / Supplies' },
  { value: 'water', label: 'Water Point' },
  { value: 'warning', label: 'Warning / Hazard' },
  { value: 'other', label: 'Other' },
];

export function getPOITypeLabel(typeValue: string): string {
  const option = POI_TYPE_OPTIONS.find(opt => opt.value === typeValue);
  return option ? option.label : 'Unknown';
}

export function getPOITypeBadgeClass(typeValue: string): string {
  const colorMap: Record<string, string> = {
    accommodation: 'bg-blue-100 text-blue-800',
    restaurant: 'bg-orange-100 text-orange-800',
    viewpoint: 'bg-purple-100 text-purple-800',
    historic: 'bg-amber-100 text-amber-800',
    nature: 'bg-green-100 text-green-800',
    transport: 'bg-cyan-100 text-cyan-800',
    shop: 'bg-pink-100 text-pink-800',
    water: 'bg-blue-200 text-blue-900',
    warning: 'bg-red-100 text-red-800',
    other: 'bg-gray-100 text-gray-800',
  };
  return colorMap[typeValue] || 'bg-gray-100 text-gray-800';
}

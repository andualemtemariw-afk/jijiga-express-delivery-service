/**
 * Centralized Google Maps Platform configuration helper.
 * Manages Map ID resolution for Advanced Markers and Vector Map rendering.
 */

export const DEFAULT_GOOGLE_MAPS_MAP_ID = 'bf51a910020fa25a';

/**
 * Resolves the Google Maps Map ID for Advanced Markers and Vector Map capabilities.
 * Order of precedence:
 * 1. Explicit Vite environment variable: VITE_GOOGLE_MAPS_MAP_ID
 * 2. User-provided Map ID stored in browser localStorage
 * 3. Google Maps official sample vector Map ID ('bf51a910020fa25a') with Advanced Markers enabled
 */
export function getGoogleMapsMapId(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_MAP_ID) {
    const envId = String(import.meta.env.VITE_GOOGLE_MAPS_MAP_ID).trim();
    if (envId && envId !== 'DEMO_MAP_ID') return envId;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedId = localStorage.getItem('user_google_maps_map_id')?.trim();
    if (storedId && storedId !== 'DEMO_MAP_ID') return storedId;
  }
  return DEFAULT_GOOGLE_MAPS_MAP_ID;
}

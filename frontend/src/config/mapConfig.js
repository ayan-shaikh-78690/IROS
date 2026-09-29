/**
 * Map Configuration & Tile Provider Architecture
 * Isolated provider definition for IROS (Intelligent Route Optimization System).
 * Default: OpenStreetMap standard tiles (Zero API key required, 100% real geographic roads).
 */

export const MAP_PROVIDERS = {
  OPENSTREETMAP: {
    id: 'osm',
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    maxZoom: 19,
    minZoom: 3,
  },
};

export const ACTIVE_MAP_PROVIDER = MAP_PROVIDERS.OPENSTREETMAP;

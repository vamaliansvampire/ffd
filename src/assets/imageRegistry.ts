import heroUniverse from './images/hero_nexora_universe_1794581026278.jpg';
import novaPortrait from './images/assistant_nova_1794581026837.jpg';
import orionPortrait from './images/assistant_orion_1794581026684.jpg';
import titanPortrait from './images/assistant_titan_1794581026786.jpg';
import auraPortrait from './images/assistant_aura_1794581027669.jpg';
import echoPortrait from './images/assistant_echo_1794581028210.jpg';
import atlasPortrait from './images/assistant_atlas_1794581028523.jpg';

const ASSET_MAP: Record<string, string> = {
  '/src/assets/images/hero_nexora_universe_1794581026278.jpg': heroUniverse,
  '/src/assets/images/assistant_nova_1794581026837.jpg': novaPortrait,
  '/src/assets/images/assistant_orion_1794581026684.jpg': orionPortrait,
  '/src/assets/images/assistant_titan_1794581026786.jpg': titanPortrait,
  '/src/assets/images/assistant_aura_1794581027669.jpg': auraPortrait,
  '/src/assets/images/assistant_echo_1794581028210.jpg': echoPortrait,
  '/src/assets/images/assistant_atlas_1794581028523.jpg': atlasPortrait,
};

export function resolveImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (ASSET_MAP[url]) return ASSET_MAP[url];
  return url;
}

export const DEFAULT_HERO_IMAGE = heroUniverse;

// constants/formats.js

export const FORMATS_BY_TYPE = {
  vinyl: [
    { id: 'lp', label: 'LP (12")' },
    { id: 'single', label: 'Single (7")' },
    { id: 'ep', label: 'EP (10")' },
    { id: 'cd', label: 'CD' },
    { id: 'cassette', label: 'K7 Cassette' }
  ],
  book: [
    { id: 'paperback', label: 'Poche' },
    { id: 'hardcover', label: 'Broché / Relié' },
    { id: 'comic', label: 'Comics / BD' },
    { id: 'manga', label: 'Manga' },
    { id: 'ebook', label: 'Ebook' }
  ],
  movie: [
    { id: 'bluray_4k', label: '4K Ultra HD' },
    { id: 'bluray', label: 'Blu-Ray' },
    { id: 'dvd', label: 'DVD' },
    { id: 'vhs', label: 'VHS' }
  ],
  // 🎲 NOUVEAU : JEUX DE SOCIÉTÉ
  boardgame: [
    { id: 'base_game', label: 'Jeu de base' },
    { id: 'expansion', label: 'Extension' },
    { id: 'standalone', label: 'Standalone / Spin-off' },
    { id: 'card_game', label: 'Jeu de cartes' },
    { id: 'wargame', label: 'Jeu de figurines / Wargame' }
  ],
  // 🎮 NOUVEAU : JEUX VIDÉO
  videogame: [
    { id: 'cartridge', label: 'Cartouche' },
    { id: 'disc', label: 'Disque (CD/DVD/BR)' },
    { id: 'digital', label: 'Dématérialisé' },
    { id: 'collector_box', label: 'Édition Collector / Big Box' }
  ]
};

export function getFormatLabel(type, formatId) {
  if (!type || !formatId || !FORMATS_BY_TYPE[type]) return null;
  const found = FORMATS_BY_TYPE[type].find(f => f.id === formatId);
  return found ? found.label : null;
}
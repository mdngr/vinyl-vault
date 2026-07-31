export const FORMATS_BY_TYPE = {
  vinyl: [
    { id: 'vinyl_lp', label: '💿 Vinyle LP (12")' },
    { id: 'vinyl_single', label: '🎵 Vinyle Single (7")' },
    { id: 'cd', label: '💿 CD' },
    { id: 'cassette', label: '📻 Cassette' },
    { id: 'digital_music', label: '🎧 Numérique' }
  ],
  book: [
    { id: 'paperback', label: '📖 Livre de poche' },
    { id: 'hardcover', label: '📚 Relié / Hardcover' },
    { id: 'comic', label: '🎨 BD / Comics' },
    { id: 'manga', label: '⛩️ Manga' },
    { id: 'ebook', label: '📱 Ebook' }
  ],
  movie: [
    { id: 'bluray_4k', label: '✨ Blu-ray 4K UHD' },
    { id: 'bluray', label: '💿 Blu-ray HD' },
    { id: 'dvd', label: '📀 DVD' },
    { id: 'vhs', label: '📼 VHS' },
    { id: 'digital_movie', label: '🍿 Film Numérique' }
  ]
};

export function getFormatLabel(type, formatId) {
  if (!type || !formatId) return '';
  const list = FORMATS_BY_TYPE[type] || [];
  const found = list.find(f => f.id === formatId);
  return found ? found.label : formatId;
}
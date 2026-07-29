const DISCOGS_TOKEN = import.meta.env.VITE_DISCOGS_TOKEN;
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';

export async function searchMediaAPI(query, type) {
  if (!query) return [];

  if (type === 'vinyl') return await searchDiscogs(query);
  if (type === 'book') return await searchBooks(query);
  if (type === 'movie') return await searchMovies(query);

  return [];
}

// A. Discogs (Vinyles + Cote Release ID)
async function searchDiscogs(query) {
  const isBarcode = /^\d+$/.test(query);
  const param = isBarcode ? `barcode=${encodeURIComponent(query)}` : `q=${encodeURIComponent(query)}`;

  const res = await fetch(`https://api.discogs.com/database/search?${param}&type=release&format=Vinyl&token=${DISCOGS_TOKEN}&per_page=6`);
  const data = await res.json();

  if (!data.results || data.results.length === 0) return [];

  return await Promise.all(
    data.results.map(async (item) => {
      const parts = item.title.split(' - ');
      let realPrice = null;

      try {
        const releaseRes = await fetch(`https://api.discogs.com/releases/${item.id}?token=${DISCOGS_TOKEN}`);
        if (releaseRes.ok) {
          const releaseData = await releaseRes.json();
          if (releaseData.lowest_price) {
            realPrice = `${Math.round(releaseData.lowest_price)} € (Discogs)`;
          }
        }
      } catch (e) {}

      const countryInfo = item.country ? `[${item.country}]` : '';
      const yearInfo = item.year ? `(${item.year})` : '';

      return {
        title: parts[1] || item.title,
        artist: parts[0] || 'Artiste inconnu',
        year: item.year || '',
        genre: item.genre ? item.genre[0] : 'Musique',
        cover: item.cover_image || item.thumb,
        suggestedPrice: realPrice || `${countryInfo} ${yearInfo}`.trim() || 'Cote variable'
      };
    })
  );
}

// B. Livres & BDs (100% Open Library)
async function searchBooks(query) {
  const isIsbn = /^\d+$/.test(query);
  const results = [];

  try {
    if (isIsbn) {
      const res = await fetch(`https://openlibrary.org/isbn/${query}.json`);
      if (res.ok) {
        const b = await res.json();
        let authorName = 'Auteur inconnu';
        if (b.authors && b.authors.length > 0) {
          try {
            const authorRes = await fetch(`https://openlibrary.org${b.authors[0].key}.json`);
            if (authorRes.ok) {
              const authorData = await authorRes.json();
              authorName = authorData.name || authorName;
            }
          } catch (e) {}
        }

        const pages = b.number_of_pages || 0;
        let priceEst = '3 - 5 € (Poche)';
        if (pages > 0 && pages < 80) priceEst = '8 - 14 € (BD / Comic)';
        else if (pages >= 80) priceEst = '5 - 10 € (Broché)';

        results.push({
          title: b.title || 'Livre',
          artist: authorName,
          year: b.publish_date ? b.publish_date.substring(0, 4) : '',
          genre: 'Livre / BD',
          cover: `https://covers.openlibrary.org/b/isbn/${query}-L.jpg`,
          suggestedPrice: priceEst
        });
        return results;
      }
    }

    const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8`);
    const data = await res.json();

    if (data.docs && data.docs.length > 0) {
      data.docs.forEach(doc => {
        results.push({
          title: doc.title || 'Titre inconnu',
          artist: doc.author_name ? doc.author_name.join(', ') : 'Auteur inconnu',
          year: doc.first_publish_year ? String(doc.first_publish_year) : '',
          genre: doc.subject ? doc.subject[0] : 'Livre / BD',
          cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : '',
          suggestedPrice: '3 - 8 € (estimé)'
        });
      });
    }
  } catch (err) {
    console.error("Erreur Open Library :", err);
  }

  return results;
}

// C. DVDs & Blu-ray
async function searchMovies(query) {
  if (!TMDB_API_KEY) {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=movie&limit=6`);
    const data = await res.json();
    return (data.results || []).map(m => ({
      title: m.trackName,
      artist: m.artistName || 'Cinéma',
      year: m.releaseDate ? m.releaseDate.substring(0, 4) : '',
      genre: m.primaryGenreName || 'Film',
      cover: m.artworkUrl100 ? m.artworkUrl100.replace('100x100bb', '400x400bb') : '',
      suggestedPrice: '2 - 5 € (Occasion)'
    }));
  }

  const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=fr-FR`);
  const data = await res.json();
  return (data.results || []).slice(0, 6).map(m => ({
    title: m.title,
    artist: 'Film',
    year: m.release_date ? m.release_date.substring(0, 4) : '',
    genre: 'DVD / Blu-ray',
    cover: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '',
    suggestedPrice: '2 - 5 € (Occasion)'
  }));
}
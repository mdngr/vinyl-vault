import { createClient } from '@supabase/supabase-js';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const DISCOGS_TOKEN = import.meta.env.VITE_DISCOGS_TOKEN;
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || ''; // Optionnel si configuré dans Vercel

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
let items = [];
let activeTypeFilter = 'all';
let html5QrCode = null;
let currentUser = null;

// Éléments DOM
const grid = document.getElementById('vinyl-grid');
const searchInput = document.getElementById('search-input');
const apiSearchInput = document.getElementById('api-search-input');
const mediaTypeSelect = document.getElementById('media-type-select');
const btnSearch = document.getElementById('btn-search');
const btnScan = document.getElementById('btn-scan');
const btnCloseScanner = document.getElementById('btn-close-scanner');
const scannerModal = document.getElementById('scanner-modal');
const resultsContainer = document.getElementById('api-results');
const stats = document.getElementById('stats');

const btnAuth = document.getElementById('btn-auth');
const loginModal = document.getElementById('login-modal');
const btnCloseLogin = document.getElementById('btn-close-login');
const loginForm = document.getElementById('login-form');
const adminPanel = document.getElementById('admin-panel');

// --- Gestion Authentification ---

async function checkUserSession() {
    const { data: { session } } = await supabase.auth.getSession();
    updateUIForAuth(session?.user || null);

    supabase.auth.onAuthStateChange((_event, session) => {
        updateUIForAuth(session?.user || null);
    });
}

function updateUIForAuth(user) {
    currentUser = user;
    if (user) {
        btnAuth.textContent = '🔓 Déconnexion';
        btnAuth.className = 'btn btn-logout';
        adminPanel.style.display = 'block';
    } else {
        btnAuth.textContent = '🔒 Connexion Admin';
        btnAuth.className = 'btn btn-login';
        adminPanel.style.display = 'none';
    }
    renderItems(searchInput.value);
}

btnAuth.addEventListener('click', () => {
    if (currentUser) supabase.auth.signOut();
    else loginModal.style.display = 'flex';
});

btnCloseLogin.addEventListener('click', () => loginModal.style.display = 'none');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Échec : " + error.message);
    else {
        loginModal.style.display = 'none';
        loginForm.reset();
    }
});

// --- Chargement & Sauvegarde BDD ---

async function fetchItems() {
    const { data, error } = await supabase
        .from('vinyls')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur Supabase :', error.message);
        return;
    }

    items = data.map(item => ({
        id: item.id,
        title: item.title,
        artist: item.artist,
        year: item.year,
        genre: item.genre,
        cover: item.cover,
        type: item.type || 'vinyl'
    }));

    renderItems();
    updateStats();
}

async function addItem(item) {
    if (!currentUser) return alert("Connexion requise");

    const { error } = await supabase.from('vinyls').insert([{
        id: item.id,
        title: item.title,
        artist: item.artist,
        year: item.year,
        genre: item.genre,
        cover: item.cover,
        type: item.type
    }]);

    if (error) return alert("Erreur : " + error.message);

    items.unshift(item);
    renderItems(searchInput.value);
    updateStats();
}

window.deleteItem = async function(id) {
    if (!currentUser || !confirm("Supprimer cet élément ?")) return;

    const { error } = await supabase.from('vinyls').delete().eq('id', id);
    if (error) return alert("Erreur : " + error.message);

    items = items.filter(i => i.id !== id);
    renderItems(searchInput.value);
    updateStats();
};

// --- Moteur Multi-APIs ---

async function searchAPI(queryOverride = null) {
    const query = queryOverride || apiSearchInput.value.trim();
    const selectedType = mediaTypeSelect.value;
    if (!query) return;

    resultsContainer.style.display = 'flex';
    resultsContainer.innerHTML = '<p style="color:var(--text-secondary)">Recherche en cours...</p>';

    try {
        let results = [];
        if (selectedType === 'vinyl') {
            results = await searchDiscogs(query);
        } else if (selectedType === 'book') {
            results = await searchBooks(query);
        } else if (selectedType === 'movie') {
            results = await searchMovies(query);
        }
        displayResults(results, selectedType);
    } catch (err) {
        resultsContainer.innerHTML = `<p style="color:#ff5555">Erreur : ${err.message}</p>`;
    }
}

// 1. Vinyles (Discogs)
async function searchDiscogs(query) {
    const isBarcode = /^\d+$/.test(query);
    const param = isBarcode ? `barcode=${encodeURIComponent(query)}` : `q=${encodeURIComponent(query)}`;
    const res = await fetch(`https://api.discogs.com/database/search?${param}&type=release&format=Vinyl&token=${DISCOGS_TOKEN}&per_page=6`);
    const data = await res.json();

    return (data.results || []).map(item => {
        const parts = item.title.split(' - ');
        return {
            title: parts[1] || item.title,
            artist: parts[0] || 'Artiste inconnu',
            year: item.year || '',
            genre: item.genre ? item.genre[0] : 'Musique',
            cover: item.cover_image || item.thumb
        };
    });
}

// 2. Livres & BDs (Open Library & Google Books API)
async function searchBooks(query) {
    const isIsbn = /^\d+$/.test(query);
    
    if (isIsbn) {
        // Recherche prioritaire par ISBN via Open Library
        const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${query}&format=json&jscmd=data`);
        const data = await res.json();
        const bookKey = `ISBN:${query}`;
        if (data[bookKey]) {
            const b = data[bookKey];
            return [{
                title: b.title,
                artist: b.authors ? b.authors[0].name : 'Auteur inconnu',
                year: b.publish_date || '',
                genre: 'Livre / BD',
                cover: b.cover ? b.cover.medium : ''
            }];
        }
    }

    // Recherche générale via Google Books
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=6`);
    const data = await res.json();
    return (data.items || []).map(item => {
        const info = item.volumeInfo;
        return {
            title: info.title,
            artist: info.authors ? info.authors.join(', ') : 'Auteur inconnu',
            year: info.publishedDate ? info.publishedDate.substring(0, 4) : '',
            genre: info.categories ? info.categories[0] : 'Livre / BD',
            cover: info.imageLinks ? info.imageLinks.thumbnail.replace('http:', 'https:') : ''
        };
    });
}

// 3. Films & DVDs (TMDB ou Open Movie Database)
async function searchMovies(query) {
    if (!TMDB_API_KEY) {
        // Mode dégradé si pas de clé TMDB : Recherche OMDb publique / ITunes
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=movie&limit=6`);
        const data = await res.json();
        return (data.results || []).map(m => ({
            title: m.trackName,
            artist: m.artistName || 'Cinéma',
            year: m.releaseDate ? m.releaseDate.substring(0, 4) : '',
            genre: m.primaryGenreName || 'Film',
            cover: m.artworkUrl100 ? m.artworkUrl100.replace('100x100bb', '400x400bb') : ''
        }));
    }

    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=fr-FR`);
    const data = await res.json();
    return (data.results || []).slice(0, 6).map(m => ({
        title: m.title,
        artist: 'Film',
        year: m.release_date ? m.release_date.substring(0, 4) : '',
        genre: 'DVD / Blu-ray',
        cover: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : ''
    }));
}

// Affichage des candidats à l'ajout
function displayResults(results, type) {
    resultsContainer.innerHTML = '';
    if (!results || results.length === 0) {
        resultsContainer.innerHTML = '<p style="color:var(--text-secondary)">Aucun résultat trouvé.</p>';
        return;
    }

    results.forEach(item => {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <img src="${item.cover || 'https://via.placeholder.com/50'}" alt="">
            <div class="result-info">
                <div class="result-title">${item.title}</div>
                <div class="result-sub">${item.artist} ${item.year ? `(${item.year})` : ''}</div>
            </div>
        `;

        div.onclick = () => {
            addItem({
                id: Date.now(),
                title: item.title,
                artist: item.artist,
                year: item.year,
                genre: item.genre,
                cover: item.cover,
                type: type
            });
            resultsContainer.style.display = 'none';
            apiSearchInput.value = '';
        };

        resultsContainer.appendChild(div);
    });
}

// --- Scanner de Code-Barres ---

async function startScanner() {
    scannerModal.style.display = 'flex';
    const formatsSupported = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128
    ];

    html5QrCode = new Html5Qrcode("reader", { formatsToSupport: formatsSupported });

    try {
        await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 15, qrbox: { width: 280, height: 140 } },
            (decodedText) => {
                if (navigator.vibrate) navigator.vibrate(200);
                stopScanner();
                apiSearchInput.value = decodedText;
                searchAPI(decodedText);
            },
            () => {}
        );
    } catch (err) {
        alert("Erreur caméra : " + err);
        stopScanner();
    }
}

async function stopScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        await html5QrCode.stop();
        html5QrCode.clear();
    }
    scannerModal.style.display = 'none';
}

// --- Rendu & Filtres UI ---

function renderItems(filterText = '') {
    grid.innerHTML = '';

    const filtered = items.filter(i => {
        const matchesType = activeTypeFilter === 'all' || i.type === activeTypeFilter;
        const matchesText = i.title.toLowerCase().includes(filterText.toLowerCase()) ||
                            i.artist.toLowerCase().includes(filterText.toLowerCase());
        return matchesType && matchesText;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-secondary); grid-column:1/-1;">Aucun élément dans cette catégorie.</p>';
        return;
    }

    filtered.forEach(item => {
        const defaultCover = 'https://via.placeholder.com/200x300/2a2a2a/ffffff?text=Pas+d%27image';
        const card = document.createElement('div');
        card.className = 'vinyl-card';

        const deleteBtnHTML = currentUser ? `<button class="btn-delete" onclick="deleteItem(${item.id})">✕</button>` : '';
        const typeIcons = { vinyl: '💿 Vinyle', book: '📚 Livre / BD', movie: '🎬 DVD' };

        card.innerHTML = `
            ${deleteBtnHTML}
            <img class="cover-img" src="${item.cover || defaultCover}" alt="${item.title}" onerror="this.src='${defaultCover}'">
            <div class="card-body">
                <span class="type-tag">${typeIcons[item.type] || 'Œuvre'}</span>
                <div class="album-title">${item.title}</div>
                <div class="artist-name">${item.artist} ${item.year ? `(${item.year})` : ''}</div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function updateStats() {
    stats.textContent = `${items.length} élément(s)`;
}

// Gestion des onglets de catégorie
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        activeTypeFilter = e.target.dataset.type;
        renderItems(searchInput.value);
    });
});

// Événements
btnSearch.addEventListener('click', () => searchAPI());
btnScan.addEventListener('click', startScanner);
btnCloseScanner.addEventListener('click', stopScanner);
searchInput.addEventListener('input', (e) => renderItems(e.target.value));

// Initialisation
checkUserSession();
fetchItems();
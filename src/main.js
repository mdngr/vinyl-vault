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
// 2. Livres & BDs (Google Books API + Open Library Fallback)
async function searchBooks(query) {
    const isIsbn = /^\d+$/.test(query);
    const results = [];

    try {
        // A. Tentative prioritaire avec Google Books
        const googleQuery = isIsbn ? `isbn:${query}` : encodeURIComponent(query);
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${googleQuery}&maxResults=8`);
        const data = await res.json();

        if (data.items && data.items.length > 0) {
            data.items.forEach(item => {
                const info = item.volumeInfo;
                let coverUrl = '';
                
                if (info.imageLinks) {
                    coverUrl = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail;
                    coverUrl = coverUrl.replace('http:', 'https:');
                }

                results.push({
                    title: info.title || 'Titre inconnu',
                    artist: info.authors ? info.authors.join(', ') : 'Auteur inconnu',
                    year: info.publishedDate ? info.publishedDate.substring(0, 4) : '',
                    genre: info.categories ? info.categories[0] : 'Livre / BD',
                    cover: coverUrl
                });
            });
            return results;
        }
    } catch (err) {
        console.warn("Échec Google Books, tentative Open Library...", err);
    }

    // B. Fallback / Secours via Open Library
    try {
        if (isIsbn) {
            const coverUrl = `https://covers.openlibrary.org/b/isbn/${query}-L.jpg`;
            const res = await fetch(`https://openlibrary.org/isbn/${query}.json`);
            if (res.ok) {
                const b = await res.json();
                results.push({
                    title: b.title || 'Livre',
                    artist: 'Auteur inconnu',
                    year: b.publish_date ? b.publish_date.substring(0, 4) : '',
                    genre: 'Livre / BD',
                    cover: coverUrl
                });
                return results;
            }
        } else {
            const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=6`);
            const data = await res.json();
            if (data.docs) {
                data.docs.forEach(doc => {
                    results.push({
                        title: doc.title,
                        artist: doc.author_name ? doc.author_name[0] : 'Auteur inconnu',
                        year: doc.first_publish_year ? String(doc.first_publish_year) : '',
                        genre: 'Livre / BD',
                        cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : ''
                    });
                });
                return results;
            }
        }
    } catch (err) {
        console.error("Erreur Open Library :", err);
    }

    return results;
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
// --- Scanner avec support du Zoom et Focus ---

const zoomContainer = document.getElementById('zoom-container');
const zoomSlider = document.getElementById('zoom-slider');
const zoomValue = document.getElementById('zoom-value');
let videoTrack = null;

async function startScanner() {
    scannerModal.style.display = 'flex';
    zoomContainer.style.display = 'none';

    const formatsSupported = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128
    ];

    html5QrCode = new Html5Qrcode("reader", { formatsToSupport: formatsSupported });

    const config = {
        fps: 15,
        qrbox: { width: 280, height: 140 },
        videoConstraints: {
            facingMode: { exact: "environment" },
            focusMode: "continuous", // Force la mise au point continue
            width: { min: 1280, ideal: 1920 }, // Force la haute résolution pour la netteté
            height: { min: 720, ideal: 1080 }
        }
    };

    try {
        await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                if (navigator.vibrate) navigator.vibrate(200);
                stopScanner();
                apiSearchInput.value = decodedText;
                searchAPI(decodedText);
            },
            () => {}
        );

        // Récupérer la piste vidéo active pour piloter le zoom matériel
        initHardwareZoom();

    } catch (err) {
        // Fallback en mode simple si la caméra dédiée échoue
        try {
            await html5QrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 260, height: 130 } },
                (decodedText) => {
                    if (navigator.vibrate) navigator.vibrate(200);
                    stopScanner();
                    apiSearchInput.value = decodedText;
                    searchAPI(decodedText);
                },
                () => {}
            );
            initHardwareZoom();
        } catch (fallbackErr) {
            alert("Erreur caméra : " + fallbackErr);
            stopScanner();
        }
    }
}

function initHardwareZoom() {
    try {
        const videoElement = document.querySelector("#reader video");
        if (!videoElement || !videoElement.srcObject) return;

        videoTrack = videoElement.srcObject.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};

        // Si la caméra supporte le zoom
        if (capabilities.zoom) {
            zoomSlider.min = capabilities.zoom.min || 1;
            zoomSlider.max = Math.min(capabilities.zoom.max || 5, 5); // Limite à 5x pour garder la lisibilité
            zoomSlider.step = capabilities.zoom.step || 0.1;
            zoomSlider.value = capabilities.zoom.min || 1;
            zoomValue.textContent = `${zoomSlider.value}x`;

            zoomContainer.style.display = 'flex';

            // Écouter le slider de zoom
            zoomSlider.oninput = (e) => {
                const val = parseFloat(e.target.value);
                zoomValue.textContent = `${val.toFixed(1)}x`;
                videoTrack.applyConstraints({
                    advanced: [{ zoom: val }]
                }).catch(err => console.warn("Erreur application zoom :", err));
            };
        }
    } catch (e) {
        console.warn("Le zoom matériel n'est pas supporté sur ce navigateur/appareil.", e);
    }
}

async function stopScanner() {
    videoTrack = null;
    zoomContainer.style.display = 'none';

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
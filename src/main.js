import { createClient } from '@supabase/supabase-js';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// --- Variables d'Environnement & Initialisation Supabase ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const DISCOGS_TOKEN = import.meta.env.VITE_DISCOGS_TOKEN;
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// State local
let items = [];
let activeTypeFilter = 'all';
let currentViewMode = window.innerWidth < 768 ? 'list' : 'masonry'; // Vue Liste par défaut sur mobile

let html5QrCode = null;
let currentUser = null;
let videoTrack = null;

// --- Sélection des Éléments DOM ---
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

// Auth DOM
const btnAuth = document.getElementById('btn-auth');
const loginModal = document.getElementById('login-modal');
const btnCloseLogin = document.getElementById('btn-close-login');
const loginForm = document.getElementById('login-form');
const adminPanel = document.getElementById('admin-panel');

// View Switcher DOM
const btnViewGrid = document.getElementById('btn-view-grid');
const btnViewList = document.getElementById('btn-view-list');

// Scanner Zoom DOM
const zoomContainer = document.getElementById('zoom-container');
const zoomSlider = document.getElementById('zoom-slider');
const zoomValue = document.getElementById('zoom-value');

// Edit Modal DOM
const editModal = document.getElementById('edit-modal');
const btnCloseEdit = document.getElementById('btn-close-edit');
const editForm = document.getElementById('edit-form');
const editIdInput = document.getElementById('edit-id');
const editTitleInput = document.getElementById('edit-title');
const editArtistInput = document.getElementById('edit-artist');
const editYearInput = document.getElementById('edit-year');
const editGenreInput = document.getElementById('edit-genre');
const editCoverInput = document.getElementById('edit-cover');
const editTypeSelect = document.getElementById('edit-type');

// ==========================================
// 1. GESTION DU SWITCHER DE VUE (GRID / LIST)
// ==========================================

function setViewMode(mode) {
    currentViewMode = mode;
    if (mode === 'masonry') {
        grid.className = 'vinyl-grid view-masonry';
        if (btnViewGrid) btnViewGrid.classList.add('active');
        if (btnViewList) btnViewList.classList.remove('active');
    } else {
        grid.className = 'vinyl-grid view-list';
        if (btnViewList) btnViewList.classList.add('active');
        if (btnViewGrid) btnViewGrid.classList.remove('active');
    }
    renderItems(searchInput.value);
}

if (btnViewGrid) btnViewGrid.addEventListener('click', () => setViewMode('masonry'));
if (btnViewList) btnViewList.addEventListener('click', () => setViewMode('list'));

// ==========================================
// 2. AUTHENTIFICATION SUPABASE
// ==========================================

async function checkUserSession() {
    const { data: { session } } = await supabase.auth.getSession();
    updateUIForAuth(session?.user || null);

    supabase.auth.onAuthStateChange((_event, session) => {
        updateUIForAuth(session?.user || null);
    });
}

function updateUIForAuth(user) {
    currentUser = user;
    const authIcon = btnAuth.querySelector('.auth-icon');
    const authText = btnAuth.querySelector('.auth-text');

    if (user) {
        if (authIcon) authIcon.textContent = '🔓';
        if (authText) authText.textContent = 'Déconnexion';
        btnAuth.className = 'btn btn-logout';
        if (adminPanel) adminPanel.style.display = 'block';
    } else {
        if (authIcon) authIcon.textContent = '🔒';
        if (authText) authText.textContent = 'Connexion Admin';
        btnAuth.className = 'btn btn-login';
        if (adminPanel) adminPanel.style.display = 'none';
    }
    renderItems(searchInput.value);
}

btnAuth.addEventListener('click', () => {
    if (currentUser) supabase.auth.signOut();
    else loginModal.style.display = 'flex';
});

btnCloseLogin.addEventListener('click', () => {
    loginModal.style.display = 'none';
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        alert("Échec de connexion : " + error.message);
    } else {
        loginModal.style.display = 'none';
        loginForm.reset();
    }
});

// ==========================================
// 3. BASE DE DONNÉES SUPABASE (CRUD)
// ==========================================

// --- Récupération des données (avec secours LocalStorage pour le vide-grenier) ---
async function fetchItems() {
    // 1. Charger immédiatement le cache local s'il existe (affichage instantané sans réseau)
    const localData = localStorage.getItem('culture_vault_cache');
    if (localData) {
        try {
            items = JSON.parse(localData);
            setViewMode(currentViewMode);
            updateStats();
        } catch (e) { console.warn("Erreur lecture cache local", e); }
    }

    // 2. Tenter la mise à jour depuis Supabase
    try {
        const { data, error } = await supabase
            .from('vinyls')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            items = data.map(item => ({
                id: item.id,
                title: item.title,
                artist: item.artist,
                year: item.year,
                genre: item.genre,
                cover: item.cover,
                type: item.type || 'vinyl'
            }));

            // Sauvegarder dans le stockage physique du téléphone
            localStorage.setItem('culture_vault_cache', JSON.stringify(items));

            setViewMode(currentViewMode);
            updateStats();
        }
    } catch (err) {
        console.warn("Réseau indisponible : utilisation de la version hors-ligne enregistrée.", err);
    }
}

async function addItem(item) {
    if (!currentUser) return alert("Connexion requise pour ajouter des éléments.");

    const { error } = await supabase.from('vinyls').insert([{
        id: item.id,
        title: item.title,
        artist: item.artist,
        year: item.year,
        genre: item.genre,
        cover: item.cover,
        type: item.type
    }]);

    if (error) return alert("Erreur Supabase : " + error.message);

    items.unshift(item);
    renderItems(searchInput.value);
    updateStats();
}

window.deleteItem = async function(id) {
    if (!currentUser || !confirm("Supprimer cet élément de votre médiathèque ?")) return;

    const { error } = await supabase.from('vinyls').delete().eq('id', id);
    if (error) return alert("Erreur lors de la suppression : " + error.message);

    items = items.filter(i => i.id !== id);
    renderItems(searchInput.value);
    updateStats();
};

// --- Édition d'un élément ---

window.openEditModal = function(id) {
    if (!currentUser) return;
    const item = items.find(i => i.id === id);
    if (!item) return;

    editIdInput.value = item.id;
    editTitleInput.value = item.title || '';
    editArtistInput.value = item.artist || '';
    editYearInput.value = item.year || '';
    editGenreInput.value = item.genre || '';
    editCoverInput.value = item.cover || '';
    editTypeSelect.value = item.type || 'vinyl';

    editModal.style.display = 'flex';
};

btnCloseEdit.addEventListener('click', () => {
    editModal.style.display = 'none';
});

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const id = parseInt(editIdInput.value, 10);
    const updatedData = {
        title: editTitleInput.value.trim(),
        artist: editArtistInput.value.trim(),
        year: editYearInput.value.trim(),
        genre: editGenreInput.value.trim(),
        cover: editCoverInput.value.trim(),
        type: editTypeSelect.value
    };

    const { error } = await supabase
        .from('vinyls')
        .update(updatedData)
        .eq('id', id);

    if (error) {
        alert("Erreur lors de la modification : " + error.message);
        return;
    }

    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
        items[index] = { id, ...updatedData };
    }

    editModal.style.display = 'none';
    renderItems(searchInput.value);
});

// ==========================================
// 4. MOTEUR MULTI-APIS (RECHERCHE & EAN/ISBN)
// ==========================================

async function searchAPI(queryOverride = null) {
    const query = queryOverride || apiSearchInput.value.trim();
    const selectedType = mediaTypeSelect.value;
    if (!query) return;

    resultsContainer.style.display = 'flex';
    resultsContainer.innerHTML = '<p style="color:var(--text-secondary)">Recherche en cours...</p>';

    try {
        let results = [];
        if (selectedType === 'vinyl') results = await searchDiscogs(query);
        else if (selectedType === 'book') results = await searchBooks(query);
        else if (selectedType === 'movie') results = await searchMovies(query);

        displayResults(results, selectedType);
    } catch (err) {
        resultsContainer.innerHTML = `<p style="color:#ff5555">Erreur : ${err.message}</p>`;
    }
}

// A. Discogs (Vinyles)
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

// B. Livres & BDs (100 % Open Library / Internet Archive - Open Source)
async function searchBooks(query) {
    const isIsbn = /^\d+$/.test(query);
    const results = [];

    try {
        if (isIsbn) {
            // A. Recherche directe par code-barres / ISBN
            const res = await fetch(`https://openlibrary.org/isbn/${query}.json`);
            if (res.ok) {
                const b = await res.json();
                
                // Récupération du nom de l'auteur si disponible sous forme de clé
                let authorName = 'Auteur inconnu';
                if (b.authors && b.authors.length > 0) {
                    try {
                        const authorRes = await fetch(`https://openlibrary.org${b.authors[0].key}.json`);
                        if (authorRes.ok) {
                            const authorData = await authorRes.json();
                            authorName = authorData.name || authorName;
                        }
                    } catch (e) {
                        console.warn("Impossible de récupérer le nom de l'auteur", e);
                    }
                }

                results.push({
                    title: b.title || 'Livre',
                    artist: authorName,
                    year: b.publish_date ? b.publish_date.substring(0, 4) : '',
                    genre: 'Livre / BD',
                    cover: `https://covers.openlibrary.org/b/isbn/${query}-L.jpg`
                });
                return results;
            }
        }

        // B. Recherche par texte (Titre, Auteur, BD...)
        const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8`);
        const data = await res.json();

        if (data.docs && data.docs.length > 0) {
            data.docs.forEach(doc => {
                // Construction de l'URL de couverture haute résolution depuis leur CDN libre
                const coverUrl = doc.cover_i 
                    ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` 
                    : '';

                results.push({
                    title: doc.title || 'Titre inconnu',
                    artist: doc.author_name ? doc.author_name.join(', ') : 'Auteur inconnu',
                    year: doc.first_publish_year ? String(doc.first_publish_year) : '',
                    genre: doc.subject ? doc.subject[0] : 'Livre / BD',
                    cover: coverUrl
                });
            });
        }
    } catch (err) {
        console.error("Erreur Open Library :", err);
    }

    return results;
}

// C. DVDs & Blu-ray (TMDB ou OMDb/iTunes Fallback)
async function searchMovies(query) {
    if (!TMDB_API_KEY) {
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

function displayResults(results, type) {
    resultsContainer.innerHTML = '';
    if (!results || results.length === 0) {
        resultsContainer.innerHTML = '<p style="color:var(--text-secondary)">Aucun résultat trouvé.</p>';
        return;
    }

    results.forEach(item => {
        // Détection de doublon (même titre et même artiste/auteur pour la même catégorie)
        const isDuplicate = items.some(existingItem => 
            existingItem.type === type &&
            existingItem.title.toLowerCase().trim() === item.title.toLowerCase().trim() &&
            existingItem.artist.toLowerCase().trim() === item.artist.toLowerCase().trim()
        );

        const div = document.createElement('div');
        div.className = `result-item ${isDuplicate ? 'is-duplicate' : ''}`;
        
        const duplicateBadgeHTML = isDuplicate 
            ? '<span class="badge-duplicate">⚠️ Déjà dans la collection</span>' 
            : '';

        div.innerHTML = `
            <img src="${item.cover || 'https://via.placeholder.com/50'}" alt="">
            <div class="result-info">
                <div class="result-title">${item.title} ${duplicateBadgeHTML}</div>
                <div class="result-sub">${item.artist} ${item.year ? `(${item.year})` : ''}</div>
            </div>
        `;

        div.onclick = () => {
            // Alerte si l'élément est déjà présent
            if (isDuplicate) {
                const confirmAdd = confirm(`" ${item.title} " est déjà dans ta bibliothèque.\n\nSouhaites-tu tout de même l'ajouter en double ?`);
                if (!confirmAdd) return;
            }

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

// ==========================================
// 5. SCANNER DE CODE-BARRES & ZOOM MATÉRIEL
// ==========================================

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
            focusMode: "continuous",
            width: { min: 1280, ideal: 1920 },
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
        initHardwareZoom();
    } catch (err) {
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
            alert("Erreur d'accès à la caméra : " + fallbackErr);
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

        if (capabilities.zoom) {
            zoomSlider.min = capabilities.zoom.min || 1;
            zoomSlider.max = Math.min(capabilities.zoom.max || 5, 5);
            zoomSlider.step = capabilities.zoom.step || 0.1;
            zoomSlider.value = capabilities.zoom.min || 1;
            zoomValue.textContent = `${zoomSlider.value}x`;

            zoomContainer.style.display = 'flex';

            zoomSlider.oninput = (e) => {
                const val = parseFloat(e.target.value);
                zoomValue.textContent = `${val.toFixed(1)}x`;
                videoTrack.applyConstraints({ advanced: [{ zoom: val }] })
                    .catch(err => console.warn("Zoom error:", err));
            };
        }
    } catch (e) {
        console.warn("Le zoom matériel n'est pas supporté par ce système.", e);
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

// ==========================================
// 6. RENDU GRAPHIQUE ET FILTRES
// ==========================================

function renderItems(filterText = '') {
    const defaultCover = 'https://via.placeholder.com/200x300/2a2a2a/ffffff?text=Pas+d%27image';
    const typeIcons = { vinyl: '💿 Vinyle', book: '📚 Livre / BD', movie: '🎬 DVD' };
    const query = filterText.toLowerCase().trim();

    // 1. Récupérer tous les éléments de carte déjà présents dans le DOM
    const existingCards = Array.from(grid.children);
    
    // Si la liste a changé (ajout/suppression), on reconstruit
    if (existingCards.length !== items.length) {
        grid.innerHTML = '';
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'vinyl-card';
            card.dataset.id = item.id;
            card.dataset.type = item.type;
            card.dataset.search = `${item.title} ${item.artist}`.toLowerCase();

            const actionsHTML = currentUser ? `
                <div class="card-actions">
                    <button class="btn-card-action btn-edit-card" onclick="openEditModal(${item.id})" title="Modifier">✏️</button>
                    <button class="btn-card-action btn-delete-card" onclick="deleteItem(${item.id})" title="Supprimer">✕</button>
                </div>
            ` : '';

            card.innerHTML = `
                ${actionsHTML}
                <img class="cover-img" src="${item.cover || defaultCover}" alt="${item.title}" loading="lazy" onerror="this.src='${defaultCover}'">
                <div class="card-body">
                    <span class="type-tag">${typeIcons[item.type] || 'Œuvre'}</span>
                    <div class="album-title">${item.title}</div>
                    <div class="artist-name">${item.artist} ${item.year ? `(${item.year})` : ''}</div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // 2. Filtrer en modifiant simplement la propriété display (pas de rechargement d'image !)
    let visibleCount = 0;
    Array.from(grid.children).forEach(card => {
        const matchesType = activeTypeFilter === 'all' || card.dataset.type === activeTypeFilter;
        const matchesText = !query || card.dataset.search.includes(query);

        if (matchesType && matchesText) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
}

function updateStats() {
    stats.textContent = `${items.length} élément(s)`;
}

// Filtres catégories (Tous / Vinyles / Livres / Films)
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        activeTypeFilter = e.target.dataset.type;
        renderItems(searchInput.value);
    });
});

// Événements généraux
btnSearch.addEventListener('click', () => searchAPI());
btnScan.addEventListener('click', startScanner);
btnCloseScanner.addEventListener('click', stopScanner);
searchInput.addEventListener('input', (e) => renderItems(e.target.value));

// Initialisation au chargement
checkUserSession();
fetchItems();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('🏛️ Service Worker actif (Mode hors-ligne prêt) !', reg.scope))
      .catch((err) => console.warn('Échec enregistrement SW :', err));
  });
}
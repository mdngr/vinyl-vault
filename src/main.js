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
let currentViewMode = window.innerWidth < 768 ? 'list' : 'masonry';

let html5QrCode = null;
let currentUser = null;
let videoTrack = null;
let isSignUpMode = false;

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
const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
const authModalTitle = document.getElementById('auth-modal-title');
const btnAuthSubmit = document.getElementById('btn-auth-submit');

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
const editIsWishlistInput = document.getElementById('edit-is-wishlist');

// Lucky Dip DOM
const btnLuckyDip = document.getElementById('btn-lucky-dip');
const luckyModal = document.getElementById('lucky-modal');
const btnCloseLucky = document.getElementById('btn-close-lucky');
const btnRetryLucky = document.getElementById('btn-retry-lucky');
const luckyDisplay = document.getElementById('lucky-display');

// ==========================================
// 1. SWITCHER DE VUE (GRID / LIST)
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
// 2. AUTHENTIFICATION MULTI-UTILISATEURS
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
        if (authIcon) authIcon.textContent = '👤';
        if (authText) authText.textContent = 'Déconnexion';
        btnAuth.className = 'btn btn-logout';
        if (adminPanel) adminPanel.style.display = 'block';
    } else {
        if (authIcon) authIcon.textContent = '🔒';
        if (authText) authText.textContent = 'Connexion / Inscription';
        btnAuth.className = 'btn btn-login';
        if (adminPanel) adminPanel.style.display = 'none';
    }
    
    fetchItems();
}

btnAuth.addEventListener('click', () => {
    if (currentUser) {
        supabase.auth.signOut();
    } else {
        loginModal.style.display = 'flex';
    }
});

if (btnCloseLogin) {
    btnCloseLogin.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });
}

if (toggleAuthModeBtn) {
    toggleAuthModeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        isSignUpMode = !isSignUpMode;
        if (isSignUpMode) {
            if (authModalTitle) authModalTitle.textContent = '📝 Créer un compte';
            if (btnAuthSubmit) btnAuthSubmit.textContent = 'S\'inscrire';
            toggleAuthModeBtn.textContent = 'Déjà un compte ? Se connecter';
        } else {
            if (authModalTitle) authModalTitle.textContent = '🔓 Connexion à mon compte';
            if (btnAuthSubmit) btnAuthSubmit.textContent = 'Se connecter';
            toggleAuthModeBtn.textContent = 'Pas encore de compte ? S\'inscrire';
        }
    });
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (isSignUpMode) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
            alert("Erreur lors de l'inscription : " + error.message);
        } else {
            alert("Compte créé avec succès !");
            loginModal.style.display = 'none';
            loginForm.reset();
        }
    } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert("Échec de connexion : " + error.message);
        } else {
            loginModal.style.display = 'none';
            loginForm.reset();
        }
    }
});

// ==========================================
// 3. BASE DE DONNÉES (ISOLATION ET CACHE LOCAL)
// ==========================================

async function fetchItems() {
    if (!currentUser) {
        items = [];
        renderItems();
        updateStats();
        return;
    }

    const cacheKey = `culture_vault_cache_${currentUser.id}`;

    // 1. Restauration du cache local propre à cet utilisateur
    const localCache = localStorage.getItem(cacheKey);
    if (localCache) {
        try {
            items = JSON.parse(localCache);
            setViewMode(currentViewMode);
            updateStats();
        } catch (e) { console.warn("Erreur lecture cache local", e); }
    }

    // 2. Synchronisation sécurisée via Supabase
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
                type: item.type || 'vinyl',
                is_wishlist: !!item.is_wishlist
            }));

            localStorage.setItem(cacheKey, JSON.stringify(items));
            setViewMode(currentViewMode);
            updateStats();
        }
    } catch (err) {
        console.warn("Réseau indisponible, utilisation du cache local.", err);
    }
}

async function addItem(item) {
    if (!currentUser) return alert("Veuillez vous connecter pour ajouter des éléments.");

    const itemToInsert = {
        id: item.id,
        title: item.title,
        artist: item.artist,
        year: item.year,
        genre: item.genre,
        cover: item.cover,
        type: item.type,
        is_wishlist: item.is_wishlist || false,
        user_id: currentUser.id
    };

    const { error } = await supabase.from('vinyls').insert([itemToInsert]);

    if (error) return alert("Erreur Supabase : " + error.message);

    items.unshift(itemToInsert);
    localStorage.setItem(`culture_vault_cache_${currentUser.id}`, JSON.stringify(items));
    renderItems(searchInput.value);
    updateStats();
}

window.deleteItem = async function(id) {
    if (!currentUser || !confirm("Supprimer cet élément ?")) return;

    const { error } = await supabase.from('vinyls').delete().eq('id', id);
    if (error) return alert("Erreur de suppression : " + error.message);

    items = items.filter(i => i.id !== id);
    localStorage.setItem(`culture_vault_cache_${currentUser.id}`, JSON.stringify(items));
    renderItems(searchInput.value);
    updateStats();
};

// --- Modale d'édition ---

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
    if (editIsWishlistInput) editIsWishlistInput.checked = !!item.is_wishlist;

    editModal.style.display = 'flex';
};

if (btnCloseEdit) {
    btnCloseEdit.addEventListener('click', () => {
        editModal.style.display = 'none';
    });
}

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
        type: editTypeSelect.value,
        is_wishlist: editIsWishlistInput ? editIsWishlistInput.checked : false
    };

    const { error } = await supabase
        .from('vinyls')
        .update(updatedData)
        .eq('id', id);

    if (error) return alert("Erreur de modification : " + error.message);

    const index = items.findIndex(i => i.id === id);
    if (index !== -1) items[index] = { id, ...updatedData };

    localStorage.setItem(`culture_vault_cache_${currentUser.id}`, JSON.stringify(items));
    editModal.style.display = 'none';
    renderItems(searchInput.value);
});

// ==========================================
// 4. MOTEUR APIS (RECHERCHE & COTES REELLES)
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

// --- Affichage Résultats & Doublons ---

function displayResults(results, type) {
    resultsContainer.innerHTML = '';
    if (!results || results.length === 0) {
        resultsContainer.innerHTML = '<p style="color:var(--text-secondary)">Aucun résultat trouvé.</p>';
        return;
    }

    results.forEach(item => {
        const isDuplicate = items.some(existing => 
            existing.type === type &&
            !existing.is_wishlist &&
            existing.title.toLowerCase().trim() === item.title.toLowerCase().trim() &&
            existing.artist.toLowerCase().trim() === item.artist.toLowerCase().trim()
        );

        const div = document.createElement('div');
        div.className = `result-item ${isDuplicate ? 'is-duplicate' : ''}`;
        
        const duplicateBadge = isDuplicate ? '<span class="badge-duplicate">⚠️ Déjà dans la collection</span>' : '';

        div.innerHTML = `
            <img src="${item.cover || 'https://via.placeholder.com/50'}" alt="">
            <div class="result-info">
                <div class="result-title">${item.title} ${duplicateBadge}</div>
                <div class="result-sub">${item.artist} ${item.year ? `(${item.year})` : ''}</div>
                ${item.suggestedPrice ? `<div class="price-tag">🏷️ Cote approx. : ${item.suggestedPrice}</div>` : ''}
                <div style="display:flex; gap:6px; margin-top:6px;">
                    <button class="btn-add-collection btn btn-primary" style="padding:4px 8px; font-size:0.75rem;">+ Collection</button>
                    <button class="btn-add-wishlist">+ ✨ Wishlist</button>
                </div>
            </div>
        `;

        div.querySelector('.btn-add-collection').onclick = (e) => {
            e.stopPropagation();
            saveItemFromSearch(item, type, false, isDuplicate);
        };

        div.querySelector('.btn-add-wishlist').onclick = (e) => {
            e.stopPropagation();
            saveItemFromSearch(item, type, true, false);
        };

        resultsContainer.appendChild(div);
    });
}

function saveItemFromSearch(item, type, isWishlist, isDuplicate) {
    if (isDuplicate && !isWishlist) {
        if (!confirm(`"${item.title}" est déjà dans ta bibliothèque.\n\nSouhaites-tu tout de même l'ajouter en double ?`)) return;
    }

    addItem({
        id: Date.now(),
        title: item.title,
        artist: item.artist,
        year: item.year,
        genre: item.genre,
        cover: item.cover,
        type: type,
        is_wishlist: isWishlist
    });

    resultsContainer.style.display = 'none';
    apiSearchInput.value = '';
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
            focusMode: "continuous"
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
                videoTrack.applyConstraints({ advanced: [{ zoom: val }] });
            };
        }
    } catch (e) {}
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
    grid.innerHTML = '';
    const query = filterText.toLowerCase().trim();

    const filtered = items.filter(i => {
        let matchesType = false;
        if (activeTypeFilter === 'wishlist') {
            matchesType = i.is_wishlist === true;
        } else {
            const isCategoryMatch = (activeTypeFilter === 'all' || i.type === activeTypeFilter);
            matchesType = isCategoryMatch && !i.is_wishlist;
        }

        const matchesText = !query || 
            i.title.toLowerCase().includes(query) ||
            i.artist.toLowerCase().includes(query);

        return matchesType && matchesText;
    });

    if (filtered.length === 0) {
        const msg = activeTypeFilter === 'wishlist' 
            ? 'Aucun élément dans votre Wishlist.' 
            : 'Aucun élément trouvé dans cette catégorie.';
        grid.innerHTML = `<p style="color:var(--text-secondary); grid-column:1/-1;">${msg}</p>`;
        return;
    }

    filtered.forEach(item => {
        const defaultCover = 'https://via.placeholder.com/200x300/2a2a2a/ffffff?text=Pas+d%27image';
        const card = document.createElement('div');
        card.className = `vinyl-card ${item.is_wishlist ? 'is-wishlist' : ''}`;

        const actionsHTML = currentUser ? `
            <div class="card-actions">
                <button class="btn-card-action btn-edit-card" onclick="openEditModal(${item.id})" title="Modifier">✏️</button>
                <button class="btn-card-action btn-delete-card" onclick="deleteItem(${item.id})" title="Supprimer">✕</button>
            </div>
        ` : '';

        const typeIcons = { vinyl: '💿 Vinyle', book: '📚 Livre / BD', movie: '🎬 DVD' };
        const badgeHTML = item.is_wishlist 
            ? `<span class="tag-wishlist">✨ Wishlist</span>` 
            : `<span class="type-tag">${typeIcons[item.type] || 'Œuvre'}</span>`;

        card.innerHTML = `
            ${actionsHTML}
            <img class="cover-img" src="${item.cover || defaultCover}" alt="${item.title}" loading="lazy" onerror="this.src='${defaultCover}'">
            <div class="card-body">
                ${badgeHTML}
                <div class="album-title">${item.title}</div>
                <div class="artist-name">${item.artist} ${item.year ? `(${item.year})` : ''}</div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function updateStats() {
    const totalCollection = items.filter(i => !i.is_wishlist).length;
    const totalWishlist = items.filter(i => i.is_wishlist).length;
    stats.textContent = `${totalCollection} élément(s) • ${totalWishlist} wishlist`;
}

// ==========================================
// 7. LUCKY DIP (TIRAGE AU SORT)
// ==========================================

function runLuckyDip() {
    const pool = items.filter(i => {
        if (activeTypeFilter === 'wishlist') return i.is_wishlist;
        if (activeTypeFilter === 'all') return !i.is_wishlist;
        return i.type === activeTypeFilter && !i.is_wishlist;
    });

    if (pool.length === 0) {
        alert("Aucun élément disponible dans cette catégorie pour le tirage au sort !");
        return;
    }

    luckyModal.style.display = 'flex';
    luckyDisplay.innerHTML = '<p style="color:var(--text-secondary)">Mélange en cours... 🎲</p>';

    let counter = 0;
    const maxSteps = 12;
    const interval = setInterval(() => {
        const randomItem = pool[Math.floor(Math.random() * pool.length)];
        renderLuckyCard(randomItem, true);
        counter++;

        if (counter >= maxSteps) {
            clearInterval(interval);
            const finalChoice = pool[Math.floor(Math.random() * pool.length)];
            renderLuckyCard(finalChoice, false);
        }
    }, 100);
}

function renderLuckyCard(item, isRolling) {
    const defaultCover = 'https://via.placeholder.com/200x300/2a2a2a/ffffff?text=Pas+d%27image';
    const typeIcons = { vinyl: '💿 Vinyle', book: '📚 Livre / BD', movie: '🎬 DVD' };
    
    luckyDisplay.innerHTML = `
        <img class="lucky-card-img" src="${item.cover || defaultCover}" alt="${item.title}" onerror="this.src='${defaultCover}'">
        <span class="type-tag" style="display:block; margin-bottom:4px;">${typeIcons[item.type] || 'Œuvre'}</span>
        <div class="lucky-title">${item.title}</div>
        <div class="lucky-artist">${item.artist} ${item.year ? `(${item.year})` : ''}</div>
        ${!isRolling ? '<p style="color:#10b981; font-weight:bold; margin-top:10px; font-size:0.85rem;">🎉 Voilà ton choix pour aujourd\'hui !</p>' : ''}
    `;
}

// ==========================================
// 8. ÉVÉNEMENTS ET INITIALISATION
// ==========================================

// Filtres catégories
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

// Événements Lucky Dip
if (btnLuckyDip) btnLuckyDip.addEventListener('click', runLuckyDip);
if (btnRetryLucky) btnRetryLucky.addEventListener('click', runLuckyDip);
if (btnCloseLucky) btnCloseLucky.addEventListener('click', () => {
    luckyModal.style.display = 'none';
});

// Initialisation au chargement
checkUserSession();
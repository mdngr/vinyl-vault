import { createClient } from '@supabase/supabase-js';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const DISCOGS_TOKEN = import.meta.env.VITE_DISCOGS_TOKEN;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
let vinyls = [];
let html5QrCode = null;

const grid = document.getElementById('vinyl-grid');
const searchInput = document.getElementById('search-input');
const discogsSearchInput = document.getElementById('discogs-search');
const btnSearch = document.getElementById('btn-search');
const btnScan = document.getElementById('btn-scan');
const btnCloseScanner = document.getElementById('btn-close-scanner');
const scannerModal = document.getElementById('scanner-modal');
const resultsContainer = document.getElementById('discogs-results');
const stats = document.getElementById('stats');

async function fetchVinyls() {
    const { data, error } = await supabase
        .from('vinyls')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur Supabase :', error.message);
        return;
    }

    vinyls = data.map(v => ({
        id: v.id,
        title: v.title,
        artist: v.artist,
        year: v.year,
        genre: v.genre,
        cover: v.cover,
        discogsId: v.discogs_id
    }));

    renderVinyls();
    updateStats();
}

async function addVinyl(vinyl) {
    const { error } = await supabase
        .from('vinyls')
        .insert([{
            id: vinyl.id,
            title: vinyl.title,
            artist: vinyl.artist,
            year: vinyl.year,
            genre: vinyl.genre,
            cover: vinyl.cover,
            discogs_id: vinyl.discogsId
        }]);

    if (error) {
        alert("Erreur Supabase : " + error.message);
        return;
    }

    vinyls.unshift(vinyl);
    renderVinyls(searchInput.value);
    updateStats();
}

window.deleteVinyl = async function(id) {
    if (!confirm("Supprimer ce vinyle ?")) return;

    const { error } = await supabase
        .from('vinyls')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Erreur lors de la suppression : " + error.message);
        return;
    }

    vinyls = vinyls.filter(v => v.id !== id);
    renderVinyls(searchInput.value);
    updateStats();
};

// --- Recherche Discogs ---

async function searchDiscogs(barcodeQuery = null) {
    const query = barcodeQuery || discogsSearchInput.value.trim();
    if (!query) return;

    resultsContainer.style.display = 'flex';
    resultsContainer.innerHTML = '<p class="status-text">Recherche sur Discogs...</p>';

    try {
        const isBarcode = /^\d+$/.test(query);
        const searchParam = isBarcode ? `barcode=${encodeURIComponent(query)}` : `q=${encodeURIComponent(query)}`;
        const url = `https://api.discogs.com/database/search?${searchParam}&type=release&format=Vinyl&token=${DISCOGS_TOKEN}&per_page=6`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Erreur Discogs");

        const data = await response.json();
        displayDiscogsResults(data.results);
    } catch (error) {
        resultsContainer.innerHTML = `<p class="error-text">Erreur : ${error.message}</p>`;
    }
}

function displayDiscogsResults(results) {
    resultsContainer.innerHTML = '';

    if (!results || results.length === 0) {
        resultsContainer.innerHTML = '<p class="status-text">Aucun vinyle trouvé pour ce code-barres.</p>';
        return;
    }

    results.forEach(item => {
        const div = document.createElement('div');
        div.className = 'result-item';
        
        const parts = item.title.split(' - ');
        const artist = parts[0] || 'Artiste inconnu';
        const title = parts[1] || item.title;
        const year = item.year || '';
        const genre = item.genre ? item.genre[0] : '';
        const cover = item.cover_image || item.thumb;

        div.innerHTML = `
            <img src="${item.thumb || 'https://via.placeholder.com/50'}" alt="">
            <div class="result-info">
                <div class="result-title">${title}</div>
                <div class="result-sub">${artist} ${year ? `(${year})` : ''}</div>
            </div>
        `;

        div.onclick = () => {
            addVinyl({
                id: Date.now(),
                title,
                artist,
                year,
                genre,
                cover,
                discogsId: item.id
            });
            resultsContainer.style.display = 'none';
            discogsSearchInput.value = '';
        };

        resultsContainer.appendChild(div);
    });
}

// --- Scanner de Code-Barres Optimisé ---

async function startScanner() {
    scannerModal.style.display = 'flex';

    // Force la détection spécifique des formats de codes-barres (EAN-13, EAN-8, UPC)
    const formatsSupported = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128
    ];

    html5QrCode = new Html5Qrcode("reader", { formatsToSupport: formatsSupported });

    // Calcul dynamique de la zone de scan (rectangulaire, adaptée aux codes-barres)
    const qrboxFunction = function(viewfinderWidth, viewfinderHeight) {
        let minEdgePercentage = 0.8; 
        let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
        let qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
        return {
            width: qrboxSize,
            height: Math.floor(qrboxSize / 2) // Rectangle allongé
        };
    };

    const config = {
        fps: 15, // Fréquence de capture augmentée
        qrbox: qrboxFunction,
        videoConstraints: {
            facingMode: { exact: "environment" },
            width: { min: 640, ideal: 1280, max: 1920 }, // Force une bonne résolution HD
            height: { min: 480, ideal: 720, max: 1080 }
        }
    };

    try {
        await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                // Succès du scan
                if (navigator.vibrate) navigator.vibrate(200);
                stopScanner();
                discogsSearchInput.value = decodedText;
                searchDiscogs(decodedText);
            },
            () => { /* Frame ignorée */ }
        );
    } catch (err) {
        // Repli si la caméra arrière spécifique n'est pas trouvée
        console.warn("Échec configuration avancée, tentative en mode simple...", err);
        try {
            await html5QrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 280, height: 140 } },
                (decodedText) => {
                    if (navigator.vibrate) navigator.vibrate(200);
                    stopScanner();
                    discogsSearchInput.value = decodedText;
                    searchDiscogs(decodedText);
                },
                () => {}
            );
        } catch (fallbackErr) {
            alert("Erreur caméra : " + fallbackErr);
            stopScanner();
        }
    }
}

async function stopScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        await html5QrCode.stop();
        html5QrCode.clear();
    }
    scannerModal.style.display = 'none';
}

function updateStats() {
    stats.textContent = `${vinyls.length} vinyle(s)`;
}

function renderVinyls(filterText = '') {
    grid.innerHTML = '';
    
    const filtered = vinyls.filter(v => 
        v.title.toLowerCase().includes(filterText.toLowerCase()) ||
        v.artist.toLowerCase().includes(filterText.toLowerCase()) ||
        (v.genre && v.genre.toLowerCase().includes(filterText.toLowerCase()))
    );

    if (filtered.length === 0) {
        grid.innerHTML = '<p class="empty-message">Aucun vinyle affiché.</p>';
        return;
    }

    filtered.forEach(vinyl => {
        const defaultCover = 'https://via.placeholder.com/200x200/2a2a2a/ffffff?text=Pas+d%27image';
        const card = document.createElement('div');
        card.className = 'vinyl-card';
        card.innerHTML = `
            <button class="btn-delete" onclick="deleteVinyl(${vinyl.id})">✕</button>
            <img class="cover-img" src="${vinyl.cover || defaultCover}" alt="${vinyl.title}" onerror="this.src='${defaultCover}'">
            <div class="card-body">
                <div>
                    <div class="album-title">${vinyl.title}</div>
                    <div class="artist-name">${vinyl.artist} ${vinyl.year ? `(${vinyl.year})` : ''}</div>
                </div>
                ${vinyl.genre ? `<span class="badge">${vinyl.genre}</span>` : ''}
            </div>
        `;
        grid.appendChild(card);
    });
}

btnSearch.addEventListener('click', () => searchDiscogs());
btnScan.addEventListener('click', startScanner);
btnCloseScanner.addEventListener('click', stopScanner);
searchInput.addEventListener('input', (e) => renderVinyls(e.target.value));

fetchVinyls();
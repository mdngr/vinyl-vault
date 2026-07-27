import { createClient } from '@supabase/supabase-js';

// Récupération des variables d'environnement
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const DISCOGS_TOKEN = import.meta.env.VITE_DISCOGS_TOKEN;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
let vinyls = [];

// Éléments DOM
const grid = document.getElementById('vinyl-grid');
const searchInput = document.getElementById('search-input');
const discogsSearchInput = document.getElementById('discogs-search');
const btnSearch = document.getElementById('btn-search');
const resultsContainer = document.getElementById('discogs-results');
const stats = document.getElementById('stats');

// Charger les vinyles
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

// Ajouter un vinyle
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

// Supprimer un vinyle
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

// Recherche Discogs
async function searchDiscogs() {
    const query = discogsSearchInput.value.trim();
    if (!query) return;

    resultsContainer.style.display = 'flex';
    resultsContainer.innerHTML = '<p style="color:var(--text-secondary); font-size:0.85rem;">Recherche...</p>';

    try {
        const url = `https://api.discogs.com/database/search?q=${encodeURIComponent(query)}&type=release&format=Vinyl&token=${DISCOGS_TOKEN}&per_page=6`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Erreur Discogs");

        const data = await response.json();
        displayDiscogsResults(data.results);
    } catch (error) {
        resultsContainer.innerHTML = `<p style="color:#ff5555; font-size:0.85rem;">Erreur : ${error.message}</p>`;
    }
}

function displayDiscogsResults(results) {
    resultsContainer.innerHTML = '';

    if (!results || results.length === 0) {
        resultsContainer.innerHTML = '<p style="color:var(--text-secondary); font-size:0.85rem;">Aucun résultat.</p>';
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
        grid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1;">Aucun vinyle affiché.</p>';
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

// Événements
btnSearch.addEventListener('click', searchDiscogs);
searchInput.addEventListener('input', (e) => renderVinyls(e.target.value));

// Démarrage
fetchVinyls();
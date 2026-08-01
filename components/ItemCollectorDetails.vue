<template>
  <div class="collector-panel">
    <!-- En-tête bascule -->
    <button type="button" class="toggle-btn" @click="isOpen = !isOpen">
      <span class="toggle-title">🔍 Fiche Collectionneur</span>
      <span class="toggle-icon">{{ isOpen ? '▲' : '▼' }}</span>
    </button>

    <div v-if="isOpen" class="collector-content">
      
      <!-- 1. ÉTAT DE CONSERVATION & COMPLÉTUDE -->
      <div class="section-block">
        <h4 class="section-title">État & Conservation</h4>
        
        <div class="grid-2">
          <!-- État du Contenu -->
          <div class="field">
            <label>Contenu / Média</label>
            <select v-model="details.mediaCondition" class="custom-select" @change="emitUpdate">
              <option value="M">Mint (Neuf sous cello / Scellé)</option>
              <option value="NM">Near Mint (Comme neuf)</option>
              <option value="VG+">VG+ (Très bon état)</option>
              <option value="VG">VG (Bon état - Marques d'usage)</option>
              <option value="G">Good (Usé)</option>
              <option value="P">Poor (Abîmé / Incomplet)</option>
            </select>
          </div>

          <!-- État de la Boîte / Pochette -->
          <div class="field">
            <label>Boîte / Pochette</label>
            <select v-model="details.sleeveCondition" class="custom-select" @change="emitUpdate">
              <option value="M">Mint (Parfait état)</option>
              <option value="NM">Near Mint (Très légères usures)</option>
              <option value="VG+">VG+ (Cornes légèrement tassées)</option>
              <option value="VG">VG (Traces de pliure/frottement)</option>
              <option value="P">Poor (Déchiré/Manquant)</option>
            </select>
          </div>
        </div>

        <!-- Badges d'état rapide -->
        <div class="field margin-top">
          <label>Spécificités & Complétude</label>
          <div class="chips-selector">
            <button 
              v-for="tag in availableTags" 
              :key="tag.id"
              type="button"
              class="chip-tag"
              :class="{ active: details.tags?.includes(tag.id) }"
              @click="toggleTag(tag.id)"
            >
              {{ tag.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- 2. ÉDITION & DÉTAILS TECHNIQUES (ADAPTATIF) -->
      <div class="section-block">
        <h4 class="section-title">Pressage & Édition</h4>
        
        <div class="grid-2">
          <!-- Spécifique Musique / Vinyle -->
          <template v-if="itemType === 'vinyl'">
            <div class="field">
              <label>N° Matrice / Runout</label>
              <input v-model="details.matrix" type="text" placeholder="ex: Matrix MPO 21 1024" class="custom-input" @input="emitUpdate" />
            </div>
            <div class="field">
              <label>Pressage</label>
              <select v-model="details.pressingType" class="custom-select" @change="emitUpdate">
                <option value="first">Original (1st Press)</option>
                <option value="reissue">Réédition</option>
                <option value="test">Test Pressing</option>
                <option value="bootleg">Unofficial / Bootleg</option>
              </select>
            </div>
          </template>

          <!-- Spécifique Jeu vidéo -->
          <template v-else-if="itemType === 'videogame'">
            <div class="field">
              <label>Code Produit / Tranche</label>
              <input v-model="details.productCode" type="text" placeholder="ex: SLES-00001 / CUSA-1234" class="custom-input" @input="emitUpdate" />
            </div>
            <div class="field">
              <label>Région</label>
              <select v-model="details.region" class="custom-select" @change="emitUpdate">
                <option value="PAL-FR">PAL (France)</option>
                <option value="PAL-UK">PAL (UK / Europe)</option>
                <option value="NTSC-J">NTSC-J (Japon)</option>
                <option value="NTSC-U">NTSC-U (USA)</option>
              </select>
            </div>
          </template>

          <div class="field">
            <label>N° de Tirage Limité</label>
            <input v-model="details.limitedNumber" type="text" placeholder="ex: N° 0452 / 1000" class="custom-input" @input="emitUpdate" />
          </div>
          <div class="field">
            <label>N° de Catalogue / ISBN</label>
            <input v-model="details.catalogNumber" type="text" placeholder="ex: WARNER-84920" class="custom-input" @input="emitUpdate" />
          </div>
        </div>
      </div>

      <!-- 3. TRAÇABILITÉ & VALEUR FINANCIÈRE -->
      <div class="section-block">
        <h4 class="section-title">Achat & Estimation</h4>
        
        <div class="grid-3">
          <div class="field">
            <label>Prix d'achat</label>
            <div class="input-currency">
              <input v-model.number="details.purchasePrice" type="number" step="0.01" placeholder="0.00" class="custom-input" @input="emitUpdate" />
              <span>€</span>
            </div>
          </div>

          <div class="field">
            <label>Valeur estimée</label>
            <div class="input-currency">
              <input v-model.number="details.estimatedValue" type="number" step="0.01" placeholder="0.00" class="custom-input" @input="emitUpdate" />
              <span>€</span>
            </div>
          </div>

          <div class="field">
            <label>Date d'achat</label>
            <input v-model="details.purchaseDate" type="date" class="custom-input" @change="emitUpdate" />
          </div>
        </div>

        <div class="grid-2 margin-top">
          <div class="field">
            <label>Lieu / Vendeur</label>
            <input v-model="details.seller" type="text" placeholder="ex: Disquaire Angers, Vinted, Vide-grenier..." class="custom-input" @input="emitUpdate" />
          </div>
          
          <div class="field">
            <label>Emplacement physique</label>
            <input v-model="details.storageLocation" type="text" placeholder="ex: Étagère Kallax B, Boîte N°3..." class="custom-input" @input="emitUpdate" />
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  itemType: { type: String, default: 'vinyl' },
  modelValue: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);

const details = ref({
  mediaCondition: 'NM',
  sleeveCondition: 'VG+',
  tags: [],
  matrix: '',
  pressingType: 'first',
  productCode: '',
  region: 'PAL-FR',
  limitedNumber: '',
  catalogNumber: '',
  purchasePrice: null,
  estimatedValue: null,
  purchaseDate: '',
  seller: '',
  storageLocation: '',
  ...props.modelValue
});

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    details.value = { ...details.value, ...newVal };
  }
}, { deep: true });

function emitUpdate() {
  emit('update:modelValue', { ...details.value });
}

function toggleTag(tagId) {
  if (!details.value.tags) details.value.tags = [];
  const index = details.value.tags.indexOf(tagId);
  if (index === -1) {
    details.value.tags.push(tagId);
  } else {
    details.value.tags.splice(index, 1);
  }
  emitUpdate();
}

const availableTags = computed(() => {
  const common = [
    { id: 'sealed', label: '🔒 Scellé / Neuf' },
    { id: 'autographed', label: '✍️ Dédicacé' },
    { id: 'promo', label: '🏷️ Édition Promo' }
  ];

  if (props.itemType === 'vinyl') {
    return [
      ...common,
      { id: 'obi', label: '🇯🇵 OBI Banner' },
      { id: 'colored', label: '🎨 Vinyle Couleur' },
      { id: 'insert', label: '📄 Insert / Poster' }
    ];
  }

  if (props.itemType === 'videogame') {
    return [
      ...common,
      { id: 'cib', label: '📦 CIB (Complet avec Notice)' },
      { id: 'bigbox', label: '📦 Big Box PC' },
      { id: 'regcard', label: '🎟️ Carte d\'enregistrement' }
    ];
  }

  if (props.itemType === 'boardgame') {
    return [
      ...common,
      { id: 'kickstarter', label: '🚀 Édition Kickstarter' },
      { id: 'sleeved', label: '🃏 Cartes Protégées (Sleeved)' },
      { id: 'promos', label: '🎁 Goodies Promos' }
    ];
  }

  return common;
});
</script>

<style scoped>
.collector-panel {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  overflow: hidden;
  margin-top: 16px;
}

.toggle-btn {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: #27272a;
  border: none;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.toggle-btn:hover {
  background: #3f3f46;
}

.collector-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-block {
  border-bottom: 1px solid #27272a;
  padding-bottom: 16px;
}

.section-block:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #3b82f6;
  font-weight: 700;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
}

.margin-top {
  margin-top: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 0.75rem;
  color: #a1a1aa;
  font-weight: 600;
}

.custom-input, .custom-select {
  background: #09090b;
  border: 1px solid #3f3f46;
  color: #ffffff;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 0.85rem;
  outline: none;
}

.custom-input:focus, .custom-select:focus {
  border-color: #3b82f6;
}

.input-currency {
  position: relative;
  display: flex;
  align-items: center;
}

.input-currency .custom-input {
  width: 100%;
  padding-right: 24px;
}

.input-currency span {
  position: absolute;
  right: 10px;
  color: #71717a;
  font-size: 0.85rem;
}

.chips-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip-tag {
  background: #09090b;
  border: 1px solid #3f3f46;
  color: #a1a1aa;
  font-size: 0.75rem;
  padding: 6px 10px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chip-tag.active {
  background: rgba(59, 130, 246, 0.15);
  border-color: #3b82f6;
  color: #60a5fa;
  font-weight: 600;
}
</style>
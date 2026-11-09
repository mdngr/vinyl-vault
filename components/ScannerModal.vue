<template>
  <div v-if="isOpen" class="scanner-modal-overlay" @click.self="close">
    <div class="scanner-modal-content">
      <!-- En-tête -->
      <div class="scanner-header">
        <div class="title-group">
          <h3>📷 Scanner d'étagère</h3>
          <span v-if="scannedList.length > 0" class="badge-count">
            {{ scannedList.length }} livre(s)
          </span>
        </div>
        <button class="btn-close" @click="close">✕</button>
      </div>

      <!-- Zone Caméra avec Ligne Rouge de Scan -->
      <div id="reader-vue" class="scanner-viewport">
        <div class="laser-line"></div>
      </div>

      <!-- Contrôles du Zoom -->
      <div v-if="hasZoomSupport" class="zoom-controls">
        <button 
          type="button" 
          class="btn-zoom" 
          @click="zoomOut" 
          :disabled="zoomValue <= zoomMin"
        >
          🔍 -
        </button>
        <span class="zoom-label">{{ parseFloat(zoomValue).toFixed(1) }}x</span>
        <button 
          type="button" 
          class="btn-zoom" 
          @click="zoomIn" 
          :disabled="zoomValue >= zoomMax"
        >
          🔍 +
        </button>
      </div>

      <!-- Choix de destination globale -->
      <div class="target-selection">
        <label>Destination par défaut :</label>
        <select v-model="defaultTarget" class="target-select">
          <option value="library">📚 Bibliothèque</option>
          <option value="wishlist">⭐ Wishlist</option>
        </select>
      </div>

      <!-- File d'attente des scans accumulés -->
      <div v-if="scannedList.length > 0" class="scanned-queue">
        <div class="queue-header">
          <h4>En attente de validation</h4>
          <button class="btn-clear" @click="clearQueue">Vider</button>
        </div>

        <ul class="queue-list">
          <li v-for="(item, index) in scannedList" :key="item.isbn + '-' + index" class="queue-item">
            <span class="barcode-text"><code>{{ item.isbn }}</code></span>
            
            <select v-model="item.target" class="item-target-select">
              <option value="library">Bibliothèque</option>
              <option value="wishlist">Wishlist</option>
            </select>

            <button class="btn-remove" @click="removeItem(index)">✕</button>
          </li>
        </ul>

        <button class="btn-save" @click="confirmBatch">
          Ajouter les {{ scannedList.length }} livre(s)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close', 'batch-add']);

let html5QrCode = null;
let videoTrack = null;
let videoElement = null;

const hasZoomSupport = ref(false);
const isHardwareZoom = ref(false);
const zoomValue = ref(1);
const zoomMin = ref(1);
const zoomMax = ref(3);

// Scanner Continu
const scannedList = ref([]);
const scannedIsbns = ref(new Set());
const defaultTarget = ref('library');
const lastScanTimestamp = ref(0);

watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    scannedList.value = [];
    scannedIsbns.value.clear();
    await nextTick();
    startScanner();
  } else {
    stopScanner();
  }
});

async function startScanner() {
  if (!import.meta.client) return;

  try {
    const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

    const formatsSupported = [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.CODE_128
    ];

    html5QrCode = new Html5Qrcode("reader-vue", { formatsToSupport: formatsSupported });

    const config = {
      fps: 20, // Balayage fluide
      qrbox: { width: 280, height: 140 }
    };

    await html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => handleContinuousScan(decodedText),
      () => {}
    );

    setupZoom();
  } catch (err) {
    console.error("Erreur scanner caméra :", err);
    close();
  }
}

function handleContinuousScan(barcode) {
  const now = Date.now();

  // Cooldown de 1.5s pour éviter de relire 10 fois le même code lors du survol
  if (scannedIsbns.value.has(barcode) && (now - lastScanTimestamp.value < 1500)) {
    return;
  }

  if (!scannedIsbns.value.has(barcode)) {
    if (navigator.vibrate) navigator.vibrate(80);

    scannedIsbns.value.add(barcode);
    scannedList.value.push({
      isbn: barcode,
      target: defaultTarget.value
    });

    lastScanTimestamp.value = now;
  }
}

function removeItem(index) {
  const item = scannedList.value[index];
  if (item) {
    scannedIsbns.value.delete(item.isbn);
    scannedList.value.splice(index, 1);
  }
}

function clearQueue() {
  scannedList.value = [];
  scannedIsbns.value.clear();
}

function confirmBatch() {
  emit('batch-add', [...scannedList.value]);
  close();
}

function setupZoom() {
  if (!import.meta.client) return;
  let attempts = 0;

  const checkVideo = setInterval(() => {
    videoElement = document.querySelector("#reader-vue video");
    attempts++;

    if (videoElement && videoElement.srcObject) {
      clearInterval(checkVideo);

      const stream = videoElement.srcObject;
      videoTrack = stream.getVideoTracks()[0];

      const capabilities = videoTrack?.getCapabilities ? videoTrack.getCapabilities() : {};

      if (capabilities.zoom) {
        isHardwareZoom.value = true;
        zoomMin.value = capabilities.zoom.min || 1;
        zoomMax.value = Math.min(capabilities.zoom.max || 4, 4);
        zoomValue.value = capabilities.zoom.min || 1;
      } else {
        isHardwareZoom.value = false;
        zoomMin.value = 1;
        zoomMax.value = 3;
        zoomValue.value = 1;
      }

      hasZoomSupport.value = true;
    }

    if (attempts > 20) {
      clearInterval(checkVideo);
    }
  }, 200);
}

function zoomIn() {
  if (zoomValue.value < zoomMax.value) {
    zoomValue.value = Math.min(parseFloat((zoomValue.value + 0.3).toFixed(1)), zoomMax.value);
    applyZoom();
  }
}

function zoomOut() {
  if (zoomValue.value > zoomMin.value) {
    zoomValue.value = Math.max(parseFloat((zoomValue.value - 0.3).toFixed(1)), zoomMin.value);
    applyZoom();
  }
}

function applyZoom() {
  const zoomFactor = parseFloat(zoomValue.value);

  if (isHardwareZoom.value && videoTrack) {
    videoTrack.applyConstraints({ advanced: [{ zoom: zoomFactor }] }).catch(() => {});
  } else if (videoElement) {
    videoElement.style.transform = `scale(${zoomFactor})`;
    videoElement.style.transformOrigin = `center center`;
  }
}

async function stopScanner() {
  if (videoElement) {
    videoElement.style.transform = 'none';
  }

  videoTrack = null;
  videoElement = null;
  hasZoomSupport.value = false;

  if (html5QrCode && html5QrCode.isScanning) {
    try {
      await html5QrCode.stop();
      html5QrCode.clear();
    } catch (e) {
      console.warn("Erreur arrêt scanner :", e);
    }
  }
}

function close() {
  stopScanner();
  emit('close');
}

onUnmounted(() => {
  stopScanner();
});
</script>

<style scoped>
.scanner-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.scanner-modal-content {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 16px;
  padding: 20px;
  width: 90%;
  max-width: 460px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.scanner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  color: #fff;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.scanner-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.badge-count {
  background: #6366f1;
  color: #fff;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
}

.scanner-viewport {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  position: relative;
  min-height: 220px;
}

:deep(#reader-vue video) {
  transition: transform 0.1s ease-out;
  object-fit: cover;
}

/* 🔴 LIGNE ROUGE INTERACTIVE DE SCAN */
.laser-line {
  position: absolute;
  top: 50%;
  left: 10%;
  width: 80%;
  height: 2px;
  background: #ef4444;
  box-shadow: 0 0 10px #ef4444, 0 0 18px #ef4444;
  z-index: 10;
  pointer-events: none;
  animation: scan-anim 2s infinite ease-in-out;
}

@keyframes scan-anim {
  0% { transform: translateY(-40px); opacity: 0.6; }
  50% { transform: translateY(40px); opacity: 1; }
  100% { transform: translateY(-40px); opacity: 0.6; }
}

.zoom-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 12px;
}

.btn-zoom {
  background: #27272a;
  border: 1px solid #3f3f46;
  color: #fff;
  padding: 6px 14px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}

.btn-zoom:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.zoom-label {
  color: #a1a1aa;
  font-size: 0.85rem;
  font-weight: 600;
  min-width: 45px;
  text-align: center;
}

.target-selection {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14px;
  padding: 8px 12px;
  background: #27272a;
  border-radius: 8px;
  color: #d4d4d8;
  font-size: 0.85rem;
}

.target-select, .item-target-select {
  background: #18181b;
  border: 1px solid #3f3f46;
  color: #fff;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
}

.scanned-queue {
  margin-top: 16px;
  border-top: 1px solid #27272a;
  padding-top: 12px;
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.queue-header h4 {
  margin: 0;
  color: #a1a1aa;
  font-size: 0.85rem;
}

.btn-clear {
  background: none;
  border: none;
  color: #71717a;
  font-size: 0.75rem;
  cursor: pointer;
  text-decoration: underline;
}

.queue-list {
  list-style: none;
  padding: 0;
  margin: 0 0 12px 0;
  max-height: 140px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.queue-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #27272a;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
}

.barcode-text code {
  color: #38bdf8;
  font-family: monospace;
}

.btn-remove {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn-save {
  width: 100%;
  background: #6366f1;
  color: #fff;
  border: none;
  padding: 10px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-save:hover {
  background: #4f46e5;
}

.btn-close {
  background: none;
  border: none;
  color: #a1a1aa;
  font-size: 1.2rem;
  cursor: pointer;
}
</style>
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
        <video 
          v-if="isUsingNative"
          ref="videoRef" 
          autoplay 
          playsinline 
          muted 
          class="native-video"
          :style="{ transform: `scale(${zoomValue})`, transformOrigin: 'center center' }"
        ></video>
        <div class="laser-line"></div>
      </div>

      <!-- Contrôles du Zoom -->
      <div class="zoom-controls">
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

const videoRef = ref(null);
let mediaStream = null;
let videoTrack = null;
let nativeDetector = null;
let animationFrameId = null;
let html5QrCode = null;
const isUsingNative = ref(false);

// Zoom forcé à 2x par défaut
const zoomValue = ref(2.0);
const zoomMin = ref(1.0);
const zoomMax = ref(4.0);

const scannedList = ref([]);
const scannedIsbns = ref(new Set());
const defaultTarget = ref('library');
const lastScanTimestamp = ref(0);

watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    scannedList.value = [];
    scannedIsbns.value.clear();
    await nextTick();
    initScanner();
  } else {
    stopScanner();
  }
});

async function initScanner() {
  if (!import.meta.client) return;

  // 1. Tenter le scanner natif (iOS Safari 17+ / Chrome Android)
  if ('BarcodeDetector' in window) {
    try {
      const supportedFormats = await window.BarcodeDetector.getSupportedFormats();
      if (supportedFormats.includes('ean_13') || supportedFormats.includes('code_128')) {
        const started = await startNativeScanner();
        if (started) return;
      }
    } catch (e) {
      console.warn("BarcodeDetector natif indisponible, bascule html5-qrcode...", e);
    }
  }

  // 2. Fallback sur html5-qrcode
  startLibraryScanner();
}

async function startNativeScanner() {
  try {
    nativeDetector = new window.BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128']
    });

    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { min: 1280, ideal: 1920 },
        height: { min: 720, ideal: 1080 }
      }
    });

    isUsingNative.value = true;
    await nextTick();

    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream;
      await videoRef.value.play();
      videoTrack = mediaStream.getVideoTracks()[0];

      applyHardwareZoom();
      processNativeFrame();
      return true;
    }
  } catch (err) {
    console.warn("Erreur flux vidéo natif :", err);
    isUsingNative.value = false;
  }
  return false;
}

function processNativeFrame() {
  if (!isUsingNative.value || !videoRef.value || videoRef.value.readyState !== 4) {
    animationFrameId = requestAnimationFrame(processNativeFrame);
    return;
  }

  nativeDetector.detect(videoRef.value)
    .then((barcodes) => {
      if (barcodes.length > 0) {
        for (const barcode of barcodes) {
          if (barcode.rawValue) {
            handleContinuousScan(barcode.rawValue);
          }
        }
      }
    })
    .catch(() => {})
    .finally(() => {
      if (isUsingNative.value) {
        animationFrameId = requestAnimationFrame(processNativeFrame);
      }
    });
}

async function startLibraryScanner() {
  isUsingNative.value = false;
  try {
    const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

    const formatsSupported = [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.CODE_128
    ];

    html5QrCode = new Html5Qrcode("reader-vue", { 
      formatsToSupport: formatsSupported,
      verbose: false
    });

    const videoConstraints = {
      facingMode: "environment",
      width: { min: 1280, ideal: 1920 },
      height: { min: 720, ideal: 1080 }
    };

    const config = {
      fps: 15,
      qrbox: (viewfinderWidth, viewfinderHeight) => ({
        width: Math.floor(viewfinderWidth * 0.9),
        height: Math.floor(viewfinderHeight * 0.4)
      }),
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      }
    };

    await html5QrCode.start(
      videoConstraints,
      config,
      (decodedText) => handleContinuousScan(decodedText),
      () => {}
    );

    initLibraryZoom();
  } catch (err) {
    console.error("Erreur scanner caméra :", err);
    close();
  }
}

function initLibraryZoom() {
  let attempts = 0;
  const interval = setInterval(() => {
    const vElem = document.querySelector("#reader-vue video");
    attempts++;

    if (vElem && vElem.srcObject) {
      clearInterval(interval);
      const stream = vElem.srcObject;
      videoTrack = stream.getVideoTracks()[0];
      applyHardwareZoom();
      applyCssZoomToElement(vElem);
    }

    if (attempts > 20) clearInterval(interval);
  }, 150);
}

function applyHardwareZoom() {
  const factor = parseFloat(zoomValue.value);
  if (videoTrack && typeof videoTrack.applyConstraints === 'function') {
    videoTrack.applyConstraints({
      advanced: [{ zoom: factor }]
    }).catch(() => {});
  }
}

function applyCssZoomToElement(elem) {
  if (elem) {
    elem.style.transform = `scale(${zoomValue.value})`;
    elem.style.transformOrigin = `center center`;
  }
}

function zoomIn() {
  if (zoomValue.value < zoomMax.value) {
    zoomValue.value = Math.min(parseFloat((zoomValue.value + 0.3).toFixed(1)), zoomMax.value);
    updateZoom();
  }
}

function zoomOut() {
  if (zoomValue.value > zoomMin.value) {
    zoomValue.value = Math.max(parseFloat((zoomValue.value - 0.3).toFixed(1)), zoomMin.value);
    updateZoom();
  }
}

function updateZoom() {
  applyHardwareZoom();
  if (!isUsingNative.value) {
    const vElem = document.querySelector("#reader-vue video");
    applyCssZoomToElement(vElem);
  }
}

function handleContinuousScan(barcode) {
  const now = Date.now();

  // Cooldown de 1.5s entre deux détections du même code
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

async function stopScanner() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }

  const vElem = isUsingNative.value ? videoRef.value : document.querySelector("#reader-vue video");
  if (vElem) {
    vElem.style.transform = 'none';
  }

  videoTrack = null;
  isUsingNative.value = false;

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
  height: 260px;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  position: relative;
}

.native-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.15s ease-out;
}

:deep(#reader-vue video) {
  transition: transform 0.15s ease-out !important;
  object-fit: cover !important;
  width: 100% !important;
  height: 100% !important;
}

/* 🔴 LIGNE ROUGE DE SCAN */
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
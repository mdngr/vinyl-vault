<template>
  <div v-if="isOpen" class="scanner-modal-overlay" @click.self="close">
    <div class="scanner-modal-content">
      <div class="scanner-header">
        <h3>📷 Scanner un code-barres</h3>
        <button class="btn-close" @click="close">✕</button>
      </div>

      <div id="reader-vue" class="scanner-viewport"></div>

      <!-- Contrôle du Zoom par Boutons -->
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
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close', 'scan']);

let html5QrCode = null;
let videoTrack = null;
let videoElement = null;

const hasZoomSupport = ref(false);
const isHardwareZoom = ref(false);
const zoomValue = ref(1);
const zoomMin = ref(1);
const zoomMax = ref(3);

watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
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
      fps: 15,
      qrbox: { width: 280, height: 140 }
    };

    await html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        if (navigator.vibrate) navigator.vibrate(200);
        emit('scan', decodedText);
        close();
      },
      () => {}
    );

    setupZoom();
  } catch (err) {
    console.error("Erreur scanner caméra :", err);
    close();
  }
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
        // Zoom Optique / Matériel (Android)
        isHardwareZoom.value = true;
        zoomMin.value = capabilities.zoom.min || 1;
        zoomMax.value = Math.min(capabilities.zoom.max || 4, 4);
        zoomValue.value = capabilities.zoom.min || 1;
      } else {
        // Zoom Numérique CSS (iOS / Safari / Web)
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
  max-width: 450px;
}

.scanner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  color: #fff;
}

.scanner-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.scanner-viewport {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  position: relative;
}

:deep(#reader-vue video) {
  transition: transform 0.1s ease-out;
  object-fit: cover;
}

/* 🔘 BARRE DE ZOOM AVEC BOUTONS */
.zoom-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
  width: 100%;
}

.btn-zoom {
  background: #27272a;
  border: 1px solid #3f3f46;
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-zoom:hover:not(:disabled) {
  background: #3f3f46;
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

.btn-close {
  background: none;
  border: none;
  color: #a1a1aa;
  font-size: 1.2rem;
  cursor: pointer;
}
</style>
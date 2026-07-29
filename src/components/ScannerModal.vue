<template>
  <div v-if="isOpen" class="scanner-modal-overlay" @click.self="close">
    <div class="scanner-modal-content">
      <div class="scanner-header">
        <h3>📷 Scanner un code-barres</h3>
        <button class="btn-close" @click="close">✕</button>
      </div>

      <div id="reader-vue" class="scanner-viewport"></div>

      <!-- Contrôle du Zoom Matériel -->
      <div v-if="hasZoomSupport" class="zoom-controls">
        <span>🔍 Zoom: {{ zoomValue }}x</span>
        <input 
          type="range" 
          :min="zoomMin" 
          :max="zoomMax" 
          step="0.1" 
          v-model="zoomValue" 
          @input="applyZoom"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close', 'scan']);

let html5QrCode = null;
let videoTrack = null;

const hasZoomSupport = ref(false);
const zoomValue = ref(1);
const zoomMin = ref(1);
const zoomMax = ref(5);

watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    await nextTick();
    startScanner();
  } else {
    stopScanner();
  }
});

async function startScanner() {
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

  try {
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
    initHardwareZoom();
  } catch (err) {
    console.error("Erreur scanner caméra :", err);
    close();
  }
}

function initHardwareZoom() {
  try {
    const videoElement = document.querySelector("#reader-vue video");
    if (!videoElement || !videoElement.srcObject) return;

    videoTrack = videoElement.srcObject.getVideoTracks()[0];
    const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};

    if (capabilities.zoom) {
      zoomMin.value = capabilities.zoom.min || 1;
      zoomMax.value = Math.min(capabilities.zoom.max || 5, 5);
      zoomValue.value = capabilities.zoom.min || 1;
      hasZoomSupport.value = true;
    }
  } catch (e) {}
}

function applyZoom() {
  if (videoTrack) {
    videoTrack.applyConstraints({ advanced: [{ zoom: parseFloat(zoomValue.value) }] });
  }
}

async function stopScanner() {
  videoTrack = null;
  hasZoomSupport.value = false;

  if (html5QrCode && html5QrCode.isScanning) {
    await html5QrCode.stop();
    html5QrCode.clear();
  }
}

function close() {
  stopScanner();
  emit('close');
}
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
}

.scanner-viewport {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  font-size: 0.85rem;
  color: #a1a1aa;
}

.zoom-controls input[type="range"] {
  flex: 1;
}

.btn-close {
  background: none;
  border: none;
  color: #a1a1aa;
  font-size: 1.2rem;
  cursor: pointer;
}
</style>
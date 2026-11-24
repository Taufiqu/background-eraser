/**
 * QuickErase App Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const viewport = document.getElementById('viewport');
  const canvasWrapper = document.getElementById('canvasWrapper');
  const canvas = document.getElementById('mainCanvas');
  const dropzone = document.getElementById('dropzone');
  const imageInput = document.getElementById('imageInput');
  const dropzoneInput = document.getElementById('dropzoneInput');
  const sampleImageBtn = document.getElementById('sampleImageBtn');

  // Toolbar & Buttons
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const resetBtn = document.getElementById('resetBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomFitBtn = document.getElementById('zoomFitBtn');
  const zoomLevelText = document.getElementById('zoomLevelText');

  // Sliders & Controls
  const thresholdSlider = document.getElementById('thresholdSlider');
  const thresholdVal = document.getElementById('thresholdVal');
  const thresholdGroup = document.getElementById('thresholdGroup');

  const brushSizeSlider = document.getElementById('brushSizeSlider');
  const brushSizeVal = document.getElementById('brushSizeVal');
  const brushSizeGroup = document.getElementById('brushSizeGroup');

  const contiguousToggle = document.getElementById('contiguousToggle');
  const contiguousGroup = document.getElementById('contiguousGroup');

  const cursorOffsetSlider = document.getElementById('cursorOffsetSlider');
  const cursorOffsetVal = document.getElementById('cursorOffsetVal');

  const smoothEdgeSlider = document.getElementById('smoothEdgeSlider');
  const smoothEdgeVal = document.getElementById('smoothEdgeVal');

  const cursorRing = document.getElementById('cursorRing');
  const offsetConnector = document.getElementById('offsetConnector');
  const modeTipText = document.getElementById('modeTipText');

  const toolButtons = document.querySelectorAll('.tool-btn');

  // Managers
  const canvasMgr = new CanvasManager(canvas, canvasWrapper, viewport);
  const historyMgr = new HistoryManager(20);

  // App State
  let currentMode = 'auto'; // 'auto' | 'magic' | 'manual' | 'repair' | 'pan'
  let threshold = 35;
  let brushSize = 30;
  let contiguous = true;
  let cursorOffset = 0;
  let smoothEdge = 0;

  let isDrawing = false;
  let isPanning = false;
  let panStart = { x: 0, y: 0 };
  let lastImagePos = null;
  let magicSampleColor = null;

  const modeDescriptions = {
    auto: '<strong>Auto (Wand):</strong> Klik pada background untuk menghapus area sewarna seketika. Atur slider toleransi jika warna belum bersih.',
    magic: '<strong>Magic Brush:</strong> Sapukan kuas di dekat batas objek. Hanya warna yang disentuh titik tengah (+) yang akan terhapus.',
    manual: '<strong>Manual:</strong> Kuas penghapus biasa tanpa filter warna. Cocok untuk menghapus area bebas secara manual.',
    repair: '<strong>Repair:</strong> Sapukan kuas untuk mengembalikan bagian gambar asli yang tidak sengaja terhapus.',
    pan: '<strong>Pan & Zoom:</strong> Klik & geser kanvas untuk melihat detail gambar, atau gunakan scroll mouse.'
  };

  // --- INITIAL SETUP ---
  function updateUIState() {
    undoBtn.disabled = !historyMgr.canUndo();
    redoBtn.disabled = !historyMgr.canRedo();
    resetBtn.disabled = !canvasMgr.currentImageData;
    downloadBtn.disabled = !canvasMgr.currentImageData;
    zoomLevelText.textContent = `${Math.round(canvasMgr.scale * 100)}%`;

    // Visibilitas parameter sesuai mode
    if (currentMode === 'auto') {
      thresholdGroup.style.display = 'flex';
      brushSizeGroup.style.display = 'none';
      contiguousGroup.style.display = 'flex';
    } else if (currentMode === 'magic') {
      thresholdGroup.style.display = 'flex';
      brushSizeGroup.style.display = 'flex';
      contiguousGroup.style.display = 'none';
    } else if (currentMode === 'manual' || currentMode === 'repair') {
      thresholdGroup.style.display = 'none';
      brushSizeGroup.style.display = 'flex';
      contiguousGroup.style.display = 'none';
    } else {
      thresholdGroup.style.display = 'none';
      brushSizeGroup.style.display = 'none';
      contiguousGroup.style.display = 'none';
    }

    modeTipText.innerHTML = modeDescriptions[currentMode] || '';
  }

  // --- TOOL SWITCHING ---
  toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      toolButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      updateUIState();
      updateCursorAppearance();
    });
  });

  // --- SLIDER LISTENERS ---
  thresholdSlider.addEventListener('input', (e) => {
    threshold = parseInt(e.target.value, 10);
    thresholdVal.textContent = threshold;
  });

  brushSizeSlider.addEventListener('input', (e) => {
    brushSize = parseInt(e.target.value, 10);
    brushSizeVal.textContent = `${brushSize} px`;
    updateCursorAppearance();
  });

  contiguousToggle.addEventListener('change', (e) => {
    contiguous = e.target.checked;
  });

  cursorOffsetSlider.addEventListener('input', (e) => {
    cursorOffset = parseInt(e.target.value, 10);
    cursorOffsetVal.textContent = `${cursorOffset} px`;
  });

  smoothEdgeSlider.addEventListener('input', (e) => {
    smoothEdge = parseInt(e.target.value, 10);
    smoothEdgeVal.textContent = smoothEdge;
  });

  // --- CURSOR INDICATOR ---
  function updateCursorAppearance() {
    if (currentMode === 'pan') {
      cursorRing.style.display = 'none';
      viewport.style.cursor = 'grab';
      return;
    }

    viewport.style.cursor = 'none';
    cursorRing.style.display = 'block';

    const screenDiameter = brushSize * 2 * canvasMgr.scale;
    const finalSize = Math.max(8, screenDiameter);

    cursorRing.style.width = `${finalSize}px`;
    cursorRing.style.height = `${finalSize}px`;

    if (currentMode === 'auto') {
      // Auto mode hanya butuh target crosshair kecil
      cursorRing.style.width = '24px';
      cursorRing.style.height = '24px';
      cursorRing.style.borderRadius = '50%';
      cursorRing.style.borderColor = '#38bdf8';
    } else if (currentMode === 'magic') {
      cursorRing.style.borderColor = '#818cf8';
      cursorRing.style.borderRadius = '50%';
    } else if (currentMode === 'manual') {
      cursorRing.style.borderColor = '#ef4444';
      cursorRing.style.borderRadius = '50%';
    } else if (currentMode === 'repair') {
      cursorRing.style.borderColor = '#10b981';
      cursorRing.style.borderRadius = '50%';
    }

    if (cursorOffset > 0) {
      offsetConnector.style.display = 'block';
      offsetConnector.style.height = `${cursorOffset}px`;
    } else {
      offsetConnector.style.display = 'none';
    }
  }

  function moveCursor(e) {
    if (!canvasMgr.currentImageData) {
      cursorRing.style.display = 'none';
      viewport.style.cursor = 'default';
      return;
    }

    const clientX = e.clientX;
    const clientY = e.clientY - cursorOffset; // Terapkan offset agar kursor di atas jari/mouse

    cursorRing.style.left = `${clientX}px`;
    cursorRing.style.top = `${clientY}px`;
  }

  // --- IMAGE LOADING ---
  function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        canvasMgr.loadImage(img);
        historyMgr.clear();
        dropzone.style.display = 'none';
        updateUIState();
        updateCursorAppearance();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  imageInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  });

  dropzoneInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  });

  // Drag & Drop
  viewport.addEventListener('dragover', (e) => {
    e.preventDefault();
    viewport.style.borderColor = '#3b82f6';
  });

  viewport.addEventListener('dragleave', (e) => {
    e.preventDefault();
  });

  viewport.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  });

  // --- SAMPLE IMAGE GENERATOR ---
  sampleImageBtn.addEventListener('click', () => {
    // Generate a high-contrast sample image using offscreen canvas
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 600;
    sampleCanvas.height = 600;
    const sCtx = sampleCanvas.getContext('2d');

    // 1. Background (solid teal yang mudah di-erase dengan Auto)
    sCtx.fillStyle = '#06b6d4';
    sCtx.fillRect(0, 0, 600, 600);

    // 2. Central Object: A stylish camera
    // Camera body
    sCtx.fillStyle = '#1e293b';
    sCtx.beginPath();
    sCtx.roundRect(130, 200, 340, 240, 30);
    sCtx.fill();

    // Top flash & viewfinder
    sCtx.fillStyle = '#f59e0b';
    sCtx.beginPath();
    sCtx.roundRect(170, 150, 90, 50, 10);
    sCtx.fill();

    sCtx.fillStyle = '#ef4444';
    sCtx.beginPath();
    sCtx.arc(400, 175, 18, 0, Math.PI * 2);
    sCtx.fill();

    // Big Camera Lens (multi-circle)
    sCtx.fillStyle = '#334155';
    sCtx.beginPath();
    sCtx.arc(300, 320, 95, 0, Math.PI * 2);
    sCtx.fill();

    sCtx.fillStyle = '#0f172a';
    sCtx.beginPath();
    sCtx.arc(300, 320, 75, 0, Math.PI * 2);
    sCtx.fill();

    sCtx.fillStyle = '#3b82f6';
    sCtx.beginPath();
    sCtx.arc(300, 320, 50, 0, Math.PI * 2);
    sCtx.fill();

    // Lens reflection glare
    sCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    sCtx.beginPath();
    sCtx.arc(285, 305, 20, 0, Math.PI * 2);
    sCtx.fill();

    // Convert to image
    const img = new Image();
    img.onload = () => {
      canvasMgr.loadImage(img);
      historyMgr.clear();
      dropzone.style.display = 'none';
      updateUIState();
      updateCursorAppearance();
    };
    img.src = sampleCanvas.toDataURL();
  });

  // --- CANVAS INTERACTIONS (POINTER EVENTS) ---
  viewport.addEventListener('pointerenter', () => {
    if (canvasMgr.currentImageData && currentMode !== 'pan') {
      cursorRing.style.display = 'block';
    }
  });

  viewport.addEventListener('pointerleave', () => {
    cursorRing.style.display = 'none';
    isDrawing = false;
    isPanning = false;
  });

  viewport.addEventListener('pointermove', (e) => {
    moveCursor(e);

    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      panStart = { x: e.clientX, y: e.clientY };
      canvasMgr.panBy(dx, dy);
      return;
    }

    if (!isDrawing || !canvasMgr.currentImageData) return;

    const targetY = e.clientY - cursorOffset;
    const imgPos = canvasMgr.screenToImageCoords(e.clientX, targetY);

    if (currentMode === 'magic') {
      Algorithms.interpolateStroke(lastImagePos, imgPos, brushSize, (x, y) => {
        Algorithms.magicBrush(canvasMgr.currentImageData, x, y, brushSize, threshold, magicSampleColor);
      });
      canvasMgr.render();
      lastImagePos = imgPos;
    } else if (currentMode === 'manual') {
      Algorithms.interpolateStroke(lastImagePos, imgPos, brushSize, (x, y) => {
        Algorithms.manualBrush(canvasMgr.currentImageData, x, y, brushSize);
      });
      canvasMgr.render();
      lastImagePos = imgPos;
    } else if (currentMode === 'repair') {
      Algorithms.interpolateStroke(lastImagePos, imgPos, brushSize, (x, y) => {
        Algorithms.repairBrush(canvasMgr.currentImageData, canvasMgr.originalImageData, x, y, brushSize);
      });
      canvasMgr.render();
      lastImagePos = imgPos;
    }
  });

  viewport.addEventListener('pointerdown', (e) => {
    if (!canvasMgr.currentImageData) return;

    // Pan via mode 'pan', tombol spasi, atau klik tengah mouse
    if (currentMode === 'pan' || e.button === 1 || e.spaceKey) {
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY };
      viewport.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return; // Hanya klik kiri untuk tools

    const targetY = e.clientY - cursorOffset;
    const imgPos = canvasMgr.screenToImageCoords(e.clientX, targetY);
    lastImagePos = imgPos;

    if (currentMode === 'auto') {
      // Auto Mode: Magic Wand Flood Fill
      historyMgr.push(canvasMgr.currentImageData);
      const changed = Algorithms.floodFill(canvasMgr.currentImageData, imgPos.x, imgPos.y, threshold, contiguous);
      if (changed) {
        canvasMgr.render();
        updateUIState();
      }
    } else if (currentMode === 'magic') {
      // Simpan history sebelum mulai sapuan brush
      historyMgr.push(canvasMgr.currentImageData);
      isDrawing = true;

      // Ambil warna referensi awal di bawah target
      const idx = (Math.round(imgPos.y) * canvasMgr.imageWidth + Math.round(imgPos.x)) * 4;
      const d = canvasMgr.currentImageData.data;
      magicSampleColor = { r: d[idx], g: d[idx + 1], b: d[idx + 2] };

      Algorithms.magicBrush(canvasMgr.currentImageData, imgPos.x, imgPos.y, brushSize, threshold, magicSampleColor);
      canvasMgr.render();
      updateUIState();
    } else if (currentMode === 'manual') {
      historyMgr.push(canvasMgr.currentImageData);
      isDrawing = true;
      Algorithms.manualBrush(canvasMgr.currentImageData, imgPos.x, imgPos.y, brushSize);
      canvasMgr.render();
      updateUIState();
    } else if (currentMode === 'repair') {
      historyMgr.push(canvasMgr.currentImageData);
      isDrawing = true;
      Algorithms.repairBrush(canvasMgr.currentImageData, canvasMgr.originalImageData, imgPos.x, imgPos.y, brushSize);
      canvasMgr.render();
      updateUIState();
    }
  });

  window.addEventListener('pointerup', () => {
    isDrawing = false;
    magicSampleColor = null;
    if (isPanning) {
      isPanning = false;
      viewport.style.cursor = currentMode === 'pan' ? 'grab' : 'none';
    }
  });

  // --- ZOOM VIA MOUSE WHEEL ---
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!canvasMgr.currentImageData) return;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    canvasMgr.zoomAt(e.clientX, e.clientY, zoomFactor);
    updateUIState();
    updateCursorAppearance();
  }, { passive: false });

  // Floating Zoom Buttons
  zoomInBtn.addEventListener('click', () => {
    const vpRect = viewport.getBoundingClientRect();
    canvasMgr.zoomAt(vpRect.width / 2, vpRect.height / 2, 1.25);
    updateUIState();
    updateCursorAppearance();
  });

  zoomOutBtn.addEventListener('click', () => {
    const vpRect = viewport.getBoundingClientRect();
    canvasMgr.zoomAt(vpRect.width / 2, vpRect.height / 2, 0.8);
    updateUIState();
    updateCursorAppearance();
  });

  zoomFitBtn.addEventListener('click', () => {
    canvasMgr.fitToScreen();
    updateUIState();
    updateCursorAppearance();
  });

  // --- UNDO / REDO / RESET ---
  function doUndo() {
    if (!historyMgr.canUndo()) return;
    const prev = historyMgr.undo(canvasMgr.currentImageData);
    if (prev) {
      canvasMgr.setImageData(prev);
      updateUIState();
    }
  }

  function doRedo() {
    if (!historyMgr.canRedo()) return;
    const next = historyMgr.redo(canvasMgr.currentImageData);
    if (next) {
      canvasMgr.setImageData(next);
      updateUIState();
    }
  }

  undoBtn.addEventListener('click', doUndo);
  redoBtn.addEventListener('click', doRedo);

  resetBtn.addEventListener('click', () => {
    if (!canvasMgr.originalImageData) return;
    if (confirm('Kembalikan gambar ke kondisi awal? Semua editan akan dihapus.')) {
      historyMgr.push(canvasMgr.currentImageData);
      const restored = new ImageData(
        new Uint8ClampedArray(canvasMgr.originalImageData.data),
        canvasMgr.imageWidth,
        canvasMgr.imageHeight
      );
      canvasMgr.setImageData(restored);
      updateUIState();
    }
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        doRedo();
      } else {
        doUndo();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      doRedo();
    }
  });

  // --- DOWNLOAD PNG ---
  downloadBtn.addEventListener('click', () => {
    if (!canvasMgr.currentImageData) return;

    // Terapkan Smooth Edge jika disetel > 0
    let finalImageData = canvasMgr.currentImageData;
    if (smoothEdge > 0) {
      finalImageData = Algorithms.applySmoothEdge(canvasMgr.currentImageData, smoothEdge);
    }

    // Buat canvas sementara untuk ekspor gambar beresolusi penuh
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasMgr.imageWidth;
    exportCanvas.height = canvasMgr.imageHeight;
    const expCtx = exportCanvas.getContext('2d');
    expCtx.putImageData(finalImageData, 0, 0);

    // Trigger download
    const link = document.createElement('a');
    link.download = `quick-erase-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
});

/**
 * QuickErase - Pro App Controller
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

  // Header Elements
  const imageDimBadge = document.getElementById('imageDimBadge');
  const imageDimText = document.getElementById('imageDimText');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const resetBtn = document.getElementById('resetBtn');
  const downloadBtn = document.getElementById('downloadBtn');

  // Zoom Controls & Status
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomFitBtn = document.getElementById('zoomFitBtn');
  const zoomLevelText = document.getElementById('zoomLevelText');
  const pixelColorIndicator = document.getElementById('pixelColorIndicator');
  const pixelCoordText = document.getElementById('pixelCoordText');

  // Tools & Parameter Sliders
  const toolItems = document.querySelectorAll('.tool-item');
  const activeModeBadge = document.getElementById('activeModeBadge');
  const modeTipText = document.getElementById('modeTipText');

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

  // Fixed Cursor Reticle Elements
  const cursorRing = document.getElementById('cursorRing');
  const reticleCircle = document.getElementById('reticleCircle');
  const reticleLoupe = document.getElementById('reticleLoupe');
  const reticleLine = document.getElementById('reticleLine');
  const reticleTouchPoint = document.getElementById('reticleTouchPoint');

  // Managers
  const canvasMgr = new CanvasManager(canvas, canvasWrapper, viewport);
  const historyMgr = new HistoryManager(20);

  // App States
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

  const modeNames = {
    auto: 'AUTO (WAND)',
    magic: 'MAGIC BRUSH',
    manual: 'MANUAL ERASER',
    repair: 'REPAIR BRUSH',
    pan: 'PAN & ZOOM'
  };

  const modeDescriptions = {
    auto: '<strong>Auto (Color Wand):</strong> Klik atau geser target ke area background untuk menghapus warna sewarna instan. Naikkan slider toleransi jika warna belum bersih.',
    magic: '<strong>Magic Brush:</strong> Sapukan kuas di dekat batas objek. Hanya warna yang disentuh titik tengah (+) yang akan terhapus tanpa menembus garis batas.',
    manual: '<strong>Manual Eraser:</strong> Kuas penghapus standar. Menghapus seluruh area di dalam lingkaran brush.',
    repair: '<strong>Repair Brush:</strong> Pulihkan kembali piksel gambar asli yang tidak sengaja terhapus.',
    pan: '<strong>Pan & Zoom:</strong> Klik & geser kanvas untuk menavigasi, atau gunakan scroll mouse.'
  };

  // --- UI STATE SYNC ---
  function updateUIState() {
    undoBtn.disabled = !historyMgr.canUndo();
    redoBtn.disabled = !historyMgr.canRedo();
    resetBtn.disabled = !canvasMgr.currentImageData;
    downloadBtn.disabled = !canvasMgr.currentImageData;
    zoomLevelText.textContent = `${Math.round(canvasMgr.scale * 100)}%`;

    if (canvasMgr.imageWidth > 0) {
      imageDimBadge.style.display = 'flex';
      imageDimText.textContent = `${canvasMgr.imageWidth} × ${canvasMgr.imageHeight} px`;
    } else {
      imageDimBadge.style.display = 'none';
    }

    activeModeBadge.textContent = modeNames[currentMode] || 'TOOL';
    modeTipText.innerHTML = modeDescriptions[currentMode] || '';

    // Tampilkan slider sesuai mode aktif
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

    updateCursorAppearance();
  }

  // --- TOOL SWITCHING ---
  toolItems.forEach(btn => {
    btn.addEventListener('click', () => {
      toolItems.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      updateUIState();
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
    updateCursorAppearance();
  });

  smoothEdgeSlider.addEventListener('input', (e) => {
    smoothEdge = parseInt(e.target.value, 10);
    smoothEdgeVal.textContent = smoothEdge;
  });

  // --- RETICLE CURSOR ENGINE ---
  function updateCursorAppearance() {
    cursorRing.className = `reticle-cursor mode-${currentMode}`;

    if (currentMode === 'pan') {
      cursorRing.style.display = 'none';
      viewport.style.cursor = 'grab';
      return;
    }

    // Hitung diameter lingkaran di layar sesuai skala zoom
    let screenDiameter;
    if (currentMode === 'auto') {
      // Auto mode memakai reticle crosshair target konstan
      screenDiameter = 32;
    } else {
      screenDiameter = Math.max(12, brushSize * 2 * canvasMgr.scale);
    }

    reticleCircle.style.width = `${screenDiameter}px`;
    reticleCircle.style.height = `${screenDiameter}px`;

    // Offset line
    if (cursorOffset > 0) {
      reticleLine.style.display = 'block';
      reticleLine.style.height = `${cursorOffset}px`;
      reticleTouchPoint.style.display = 'block';
      reticleTouchPoint.style.top = `${cursorOffset}px`;
    } else {
      reticleLine.style.display = 'none';
      reticleTouchPoint.style.display = 'none';
    }
  }

  // Global Pointer Tracker (Tidak ada delay/loncat saat kursor masuk dari sidebar!)
  window.addEventListener('pointermove', (e) => {
    if (!canvasMgr.currentImageData || currentMode === 'pan') {
      cursorRing.style.display = 'none';
      viewport.style.cursor = currentMode === 'pan' ? 'grab' : 'default';
      return;
    }

    const vpRect = viewport.getBoundingClientRect();
    const isInsideViewport = (
      e.clientX >= vpRect.left &&
      e.clientX <= vpRect.right &&
      e.clientY >= vpRect.top &&
      e.clientY <= vpRect.bottom
    );

    if (!isInsideViewport) {
      // Kursor sedang berada di luar canvas (misal di sidebar atau header)
      cursorRing.style.display = 'none';
      return;
    }

    // Aktifkan reticle kursor
    cursorRing.style.display = 'block';
    viewport.style.cursor = 'none';

    // Titik target aktual (dengan offset)
    const targetX = e.clientX;
    const targetY = e.clientY - cursorOffset;

    cursorRing.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;

    // Cek koordinat pada gambar asli
    const imgPos = canvasMgr.screenToImageCoords(targetX, targetY);
    const inBounds = (
      imgPos.x >= 0 && imgPos.x < canvasMgr.imageWidth &&
      imgPos.y >= 0 && imgPos.y < canvasMgr.imageHeight
    );

    if (inBounds) {
      cursorRing.classList.remove('out-of-bounds');
      const px = Math.floor(imgPos.x);
      const py = Math.floor(imgPos.y);
      const idx = (py * canvasMgr.imageWidth + px) * 4;
      const d = canvasMgr.currentImageData.data;

      const r = d[idx];
      const g = d[idx + 1];
      const b = d[idx + 2];
      const a = d[idx + 3];

      // Update preview loupe dan status bar
      if (a === 0) {
        reticleLoupe.style.display = 'block';
        reticleLoupe.style.backgroundColor = '#ffffff';
        reticleLoupe.style.backgroundImage = 'radial-gradient(#94a3b8 1px, transparent 0)';
        reticleLoupe.style.backgroundSize = '4px 4px';
        pixelColorIndicator.style.backgroundColor = 'transparent';
        pixelCoordText.textContent = `X: ${px}, Y: ${py} • Transparan`;
      } else {
        const colorStr = `rgb(${r}, ${g}, ${b})`;
        reticleLoupe.style.display = 'block';
        reticleLoupe.style.backgroundImage = 'none';
        reticleLoupe.style.backgroundColor = colorStr;
        pixelColorIndicator.style.backgroundColor = colorStr;
        pixelCoordText.textContent = `X: ${px}, Y: ${py} • ${colorStr}`;
      }
    } else {
      cursorRing.classList.add('out-of-bounds');
      reticleLoupe.style.display = 'none';
      pixelCoordText.textContent = 'Di luar area gambar';
    }

    // Pan Viewport handling
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      panStart = { x: e.clientX, y: e.clientY };
      canvasMgr.panBy(dx, dy);
      updateCursorAppearance();
      return;
    }

    // Brush drawing handling
    if (!isDrawing || !inBounds) return;

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

  // --- CANVAS INTERACTIONS (POINTER DOWN / UP) ---
  viewport.addEventListener('pointerdown', (e) => {
    if (!canvasMgr.currentImageData) return;

    // Pan canvas via mode 'pan', middle click, atau spacebar
    if (currentMode === 'pan' || e.button === 1 || e.spaceKey) {
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY };
      viewport.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return; // Klik kiri saja

    const targetX = e.clientX;
    const targetY = e.clientY - cursorOffset;
    const imgPos = canvasMgr.screenToImageCoords(targetX, targetY);

    const inBounds = (
      imgPos.x >= 0 && imgPos.x < canvasMgr.imageWidth &&
      imgPos.y >= 0 && imgPos.y < canvasMgr.imageHeight
    );

    if (!inBounds) return;

    lastImagePos = imgPos;

    if (currentMode === 'auto') {
      // Auto Mode: Magic Wand
      historyMgr.push(canvasMgr.currentImageData);
      const changed = Algorithms.floodFill(canvasMgr.currentImageData, imgPos.x, imgPos.y, threshold, contiguous);
      if (changed) {
        canvasMgr.render();
        updateUIState();
      }
    } else if (currentMode === 'magic') {
      historyMgr.push(canvasMgr.currentImageData);
      isDrawing = true;

      // Sample warna awal di titik tengah
      const px = Math.floor(imgPos.x);
      const py = Math.floor(imgPos.y);
      const idx = (py * canvasMgr.imageWidth + px) * 4;
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

  // Drag & Drop File
  viewport.addEventListener('dragover', (e) => {
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
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 700;
    sampleCanvas.height = 700;
    const sCtx = sampleCanvas.getContext('2d');

    // 1. Background (Solid Sky Blue)
    sCtx.fillStyle = '#38bdf8';
    sCtx.fillRect(0, 0, 700, 700);

    // 2. Vintage Retro Camera Object
    // Body base
    sCtx.fillStyle = '#0f172a';
    sCtx.beginPath();
    sCtx.roundRect(150, 240, 400, 280, 28);
    sCtx.fill();

    // Leather body grip
    sCtx.fillStyle = '#b45309';
    sCtx.beginPath();
    sCtx.roundRect(165, 300, 370, 180, 14);
    sCtx.fill();

    // Top silver plate
    sCtx.fillStyle = '#e2e8f0';
    sCtx.beginPath();
    sCtx.roundRect(150, 210, 400, 50, [20, 20, 0, 0]);
    sCtx.fill();

    // Shutter button & dials
    sCtx.fillStyle = '#ef4444';
    sCtx.beginPath();
    sCtx.arc(480, 195, 16, 0, Math.PI * 2);
    sCtx.fill();

    sCtx.fillStyle = '#64748b';
    sCtx.beginPath();
    sCtx.roundRect(200, 185, 45, 30, 4);
    sCtx.fill();

    // Center Lens Rings
    sCtx.fillStyle = '#1e293b';
    sCtx.beginPath();
    sCtx.arc(350, 390, 110, 0, Math.PI * 2);
    sCtx.fill();

    sCtx.fillStyle = '#334155';
    sCtx.beginPath();
    sCtx.arc(350, 390, 90, 0, Math.PI * 2);
    sCtx.fill();

    sCtx.fillStyle = '#090d16';
    sCtx.beginPath();
    sCtx.arc(350, 390, 65, 0, Math.PI * 2);
    sCtx.fill();

    sCtx.fillStyle = '#2563eb';
    sCtx.beginPath();
    sCtx.arc(350, 390, 40, 0, Math.PI * 2);
    sCtx.fill();

    // Glass reflection
    sCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    sCtx.beginPath();
    sCtx.arc(335, 375, 18, 0, Math.PI * 2);
    sCtx.fill();

    const img = new Image();
    img.onload = () => {
      canvasMgr.loadImage(img);
      historyMgr.clear();
      dropzone.style.display = 'none';
      updateUIState();
    };
    img.src = sampleCanvas.toDataURL();
  });

  // --- ZOOM VIA WHEEL ---
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!canvasMgr.currentImageData) return;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    canvasMgr.zoomAt(e.clientX, e.clientY, zoomFactor);
    updateUIState();
  }, { passive: false });

  zoomInBtn.addEventListener('click', () => {
    const vpRect = viewport.getBoundingClientRect();
    canvasMgr.zoomAt(vpRect.width / 2, vpRect.height / 2, 1.25);
    updateUIState();
  });

  zoomOutBtn.addEventListener('click', () => {
    const vpRect = viewport.getBoundingClientRect();
    canvasMgr.zoomAt(vpRect.width / 2, vpRect.height / 2, 0.8);
    updateUIState();
  });

  zoomFitBtn.addEventListener('click', () => {
    canvasMgr.fitToScreen();
    updateUIState();
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
    if (confirm('Kembalikan gambar ke kondisi awal? Semua editan akan dibatalkan.')) {
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

  // Shortcuts
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) doRedo();
      else doUndo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      doRedo();
    }
  });

  // --- EXPORT PNG ---
  downloadBtn.addEventListener('click', () => {
    if (!canvasMgr.currentImageData) return;

    let finalImageData = canvasMgr.currentImageData;
    if (smoothEdge > 0) {
      finalImageData = Algorithms.applySmoothEdge(canvasMgr.currentImageData, smoothEdge);
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasMgr.imageWidth;
    exportCanvas.height = canvasMgr.imageHeight;
    const expCtx = exportCanvas.getContext('2d');
    expCtx.putImageData(finalImageData, 0, 0);

    const link = document.createElement('a');
    link.download = `quick-erase-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
});

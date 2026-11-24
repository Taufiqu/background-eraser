/**
 * Canvas & Viewport Manager
 * Menangani rendering, zoom, pan, dan konversi koordinat layar ke piksel gambar
 */

class CanvasManager {
  constructor(canvas, wrapper, viewport) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.wrapper = wrapper;
    this.viewport = viewport;

    // Dimensi gambar asli
    this.imageWidth = 0;
    this.imageHeight = 0;

    // State Transformasi Viewport (Pan & Zoom)
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;

    // ImageData Utama & Asli (untuk repair)
    this.currentImageData = null;
    this.originalImageData = null;
  }

  /**
   * Muat gambar baru ke canvas
   */
  loadImage(imgElement) {
    this.imageWidth = imgElement.naturalWidth || imgElement.width;
    this.imageHeight = imgElement.naturalHeight || imgElement.height;

    this.canvas.width = this.imageWidth;
    this.canvas.height = this.imageHeight;

    // Gambar ke canvas dan simpan ImageData
    this.ctx.clearRect(0, 0, this.imageWidth, this.imageHeight);
    this.ctx.drawImage(imgElement, 0, 0);

    this.currentImageData = this.ctx.getImageData(0, 0, this.imageWidth, this.imageHeight);
    // Clone untuk original ImageData (dipakai fitur repair)
    this.originalImageData = new ImageData(
      new Uint8ClampedArray(this.currentImageData.data),
      this.imageWidth,
      this.imageHeight
    );

    this.fitToScreen();
  }

  /**
   * Update tampilan kanvas dari currentImageData
   */
  render() {
    if (!this.currentImageData) return;
    this.ctx.putImageData(this.currentImageData, 0, 0);
  }

  /**
   * Set ImageData langsung (misal saat undo/redo/smooth edge)
   */
  setImageData(imageData) {
    this.currentImageData = imageData;
    this.render();
  }

  /**
   * Auto fit gambar agar pas di tengah layar saat pertama kali dibuka
   */
  fitToScreen() {
    if (!this.imageWidth || !this.imageHeight) return;

    const vpRect = this.viewport.getBoundingClientRect();
    const padding = 40;
    const availW = vpRect.width - padding * 2;
    const availH = vpRect.height - padding * 2;

    const scaleX = availW / this.imageWidth;
    const scaleY = availH / this.imageHeight;
    this.scale = Math.min(scaleX, scaleY, 1.0); // Jangan melebihi 100% jika gambar kecil

    this.centerView();
  }

  centerView() {
    const vpRect = this.viewport.getBoundingClientRect();
    const renderedW = this.imageWidth * this.scale;
    const renderedH = this.imageHeight * this.scale;

    this.panX = (vpRect.width - renderedW) / 2;
    this.panY = (vpRect.height - renderedH) / 2;

    this.updateTransform();
  }

  zoomAt(pointX, pointY, zoomFactor) {
    const newScale = Math.max(0.1, Math.min(20, this.scale * zoomFactor));
    if (newScale === this.scale) return;

    // Zoom memusat ke titik kursor
    const mouseX = pointX - this.panX;
    const mouseY = pointY - this.panY;

    this.panX -= (mouseX * (newScale / this.scale)) - mouseX;
    this.panY -= (mouseY * (newScale / this.scale)) - mouseY;
    this.scale = newScale;

    this.updateTransform();
  }

  panBy(dx, dy) {
    this.panX += dx;
    this.panY += dy;
    this.updateTransform();
  }

  updateTransform() {
    this.wrapper.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
  }

  /**
   * Konversi koordinat kursor layar (clientX, clientY) ke piksel gambar asli
   */
  screenToImageCoords(clientX, clientY) {
    const rect = this.wrapper.getBoundingClientRect();
    const x = (clientX - rect.left) / this.scale;
    const y = (clientY - rect.top) / this.scale;
    return { x, y };
  }
}

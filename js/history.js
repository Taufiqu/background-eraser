/**
 * History Manager - Undo / Redo Stack untuk ImageData
 */

class HistoryManager {
  constructor(maxDepth = 15) {
    this.maxDepth = maxDepth;
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Clone ImageData agar terisolasi di memori
   */
  cloneImageData(imageData) {
    return new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
  }

  /**
   * Simpan snapshot state baru
   */
  push(imageData) {
    this.undoStack.push(this.cloneImageData(imageData));
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift(); // Buang riwayat paling tua
    }
    this.redoStack = []; // Reset redo setiap ada aksi baru
  }

  /**
   * Batalkan aksi terakhir (Undo)
   */
  undo(currentImageData) {
    if (!this.canUndo()) return null;

    // Simpan keadaan saat ini ke redo stack sebelum mundur
    this.redoStack.push(this.cloneImageData(currentImageData));
    return this.undoStack.pop();
  }

  /**
   * Ulangi aksi (Redo)
   */
  redo(currentImageData) {
    if (!this.canRedo()) return null;

    // Simpan keadaan saat ini ke undo stack sebelum maju
    this.undoStack.push(this.cloneImageData(currentImageData));
    return this.redoStack.pop();
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}

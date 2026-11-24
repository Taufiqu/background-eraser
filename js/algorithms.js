/**
 * QuickErase - Image Processing & Algorithms (Pure Computer Vision / Non-AI)
 */

const Algorithms = {
  // Max squared distance with human eye perceptual weights: 2*R^2 + 4*G^2 + 3*B^2
  MAX_DIST_SQ: 2 * 255 * 255 + 4 * 255 * 255 + 3 * 255 * 255, // 585,225

  /**
   * Hitung batas jarak kuadrat dari slider threshold (1 - 100)
   */
  getThresholdLimitSq(threshold) {
    const norm = Math.max(1, Math.min(100, threshold)) / 100;
    return norm * norm * this.MAX_DIST_SQ;
  },

  /**
   * Jarak warna perseptual kuadrat (tanpa Math.sqrt agar super kencang)
   */
  colorDistSq(r1, g1, b1, r2, g2, b2) {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
  },

  /**
   * Mode Auto: Scanline Flood Fill (Magic Wand)
   * Mengubah alpha piksel sewarna menjadi 0 (transparan)
   */
  floodFill(imageData, startX, startY, threshold, contiguous = true) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    startX = Math.floor(startX);
    startY = Math.floor(startY);

    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return false;

    const startIdx = (startY * width + startX) * 4;
    const targetR = data[startIdx];
    const targetG = data[startIdx + 1];
    const targetB = data[startIdx + 2];
    const targetA = data[startIdx + 3];

    // Jika piksel target sudah transparan, tidak perlu hapus lagi
    if (targetA === 0) return false;

    const limitSq = this.getThresholdLimitSq(threshold);

    // MODE GLOBAL (Hapus semua warna yang sama di seluruh gambar)
    if (!contiguous) {
      let changed = false;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        const dSq = this.colorDistSq(targetR, targetG, targetB, data[i], data[i + 1], data[i + 2]);
        if (dSq <= limitSq) {
          data[i + 3] = 0; // Transparan
          changed = true;
        }
      }
      return changed;
    }

    // MODE CONTIGUOUS (Scanline Stack Flood Fill - Super Cepat)
    const visited = new Uint8Array(width * height);
    const stack = [[startX, startY]];
    let changed = false;

    while (stack.length > 0) {
      const [curX, curY] = stack.pop();
      let y = curY;

      // Geser ke ujung kiri span yang cocok
      let leftX = curX;
      while (leftX >= 0) {
        const pIdx = y * width + leftX;
        if (visited[pIdx]) break;

        const dIdx = pIdx * 4;
        if (data[dIdx + 3] === 0) break;

        const dSq = this.colorDistSq(targetR, targetG, targetB, data[dIdx], data[dIdx + 1], data[dIdx + 2]);
        if (dSq > limitSq) break;

        leftX--;
      }
      leftX++;

      // Geser ke ujung kanan span yang cocok
      let rightX = curX;
      while (rightX < width) {
        const pIdx = y * width + rightX;
        if (visited[pIdx]) break;

        const dIdx = pIdx * 4;
        if (data[dIdx + 3] === 0) break;

        const dSq = this.colorDistSq(targetR, targetG, targetB, data[dIdx], data[dIdx + 1], data[dIdx + 2]);
        if (dSq > limitSq) break;

        rightX++;
      }
      rightX--;

      // Tandai dan hapus piksel di rentang [leftX, rightX]
      let spanAboveAdded = false;
      let spanBelowAdded = false;

      for (let x = leftX; x <= rightX; x++) {
        const pIdx = y * width + x;
        visited[pIdx] = 1;
        data[pIdx * 4 + 3] = 0; // Set Alpha = 0 (Hapus)
        changed = true;

        // Cek baris atas (y - 1)
        if (y > 0) {
          const upIdx = (y - 1) * width + x;
          if (!visited[upIdx] && data[upIdx * 4 + 3] > 0) {
            const dSq = this.colorDistSq(targetR, targetG, targetB, data[upIdx * 4], data[upIdx * 4 + 1], data[upIdx * 4 + 2]);
            if (dSq <= limitSq) {
              if (!spanAboveAdded) {
                stack.push([x, y - 1]);
                spanAboveAdded = true;
              }
            } else {
              spanAboveAdded = false;
            }
          } else {
            spanAboveAdded = false;
          }
        }

        // Cek baris bawah (y + 1)
        if (y < height - 1) {
          const downIdx = (y + 1) * width + x;
          if (!visited[downIdx] && data[downIdx * 4 + 3] > 0) {
            const dSq = this.colorDistSq(targetR, targetG, targetB, data[downIdx * 4], data[downIdx * 4 + 1], data[downIdx * 4 + 2]);
            if (dSq <= limitSq) {
              if (!spanBelowAdded) {
                stack.push([x, y + 1]);
                spanBelowAdded = true;
              }
            } else {
              spanBelowAdded = false;
            }
          } else {
            spanBelowAdded = false;
          }
        }
      }
    }

    return changed;
  },

  /**
   * Magic Brush: Hanya menghapus warna yang disentuh titik tengah brush di dalam radius
   */
  magicBrush(imageData, cx, cy, radius, threshold, sampleColor = null) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    cx = Math.round(cx);
    cy = Math.round(cy);

    if (cx < 0 || cx >= width || cy < 0 || cy >= height) return false;

    // Ambil sampel warna di titik tengah jika belum ada
    let sR, sG, sB;
    if (sampleColor) {
      sR = sampleColor.r;
      sG = sampleColor.g;
      sB = sampleColor.b;
    } else {
      const cIdx = (cy * width + cx) * 4;
      sR = data[cIdx];
      sG = data[cIdx + 1];
      sB = data[cIdx + 2];
      // Jika titik tengah transparan, cari piksel terdekat dalam radius kecil
      if (data[cIdx + 3] === 0) {
        let found = false;
        const searchR = Math.min(5, radius);
        for (let dy = -searchR; dy <= searchR && !found; dy++) {
          for (let dx = -searchR; dx <= searchR && !found; dx++) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = (ny * width + nx) * 4;
              if (data[nIdx + 3] > 0) {
                sR = data[nIdx];
                sG = data[nIdx + 1];
                sB = data[nIdx + 2];
                found = true;
              }
            }
          }
        }
        if (!found) return false;
      }
    }

    const limitSq = this.getThresholdLimitSq(threshold);
    const rSq = radius * radius;
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(width - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(height - 1, Math.ceil(cy + radius));

    let changed = false;

    for (let y = minY; y <= maxY; y++) {
      const dy = y - cy;
      const dySq = dy * dy;
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        if (dx * dx + dySq <= rSq) {
          const idx = (y * width + x) * 4;
          if (data[idx + 3] === 0) continue; // Sudah transparan

          const dSq = this.colorDistSq(sR, sG, sB, data[idx], data[idx + 1], data[idx + 2]);
          if (dSq <= limitSq) {
            data[idx + 3] = 0; // Hapus
            changed = true;
          }
        }
      }
    }

    return changed;
  },

  /**
   * Manual Eraser: Hapus semua piksel di dalam lingkaran radius
   */
  manualBrush(imageData, cx, cy, radius) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    cx = Math.round(cx);
    cy = Math.round(cy);

    const rSq = radius * radius;
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(width - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(height - 1, Math.ceil(cy + radius));

    let changed = false;

    for (let y = minY; y <= maxY; y++) {
      const dy = y - cy;
      const dySq = dy * dy;
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        if (dx * dx + dySq <= rSq) {
          const idx = (y * width + x) * 4;
          if (data[idx + 3] !== 0) {
            data[idx + 3] = 0;
            changed = true;
          }
        }
      }
    }

    return changed;
  },

  /**
   * Repair Brush: Pulihkan piksel dari data gambar asli
   */
  repairBrush(imageData, origImageData, cx, cy, radius) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const origData = origImageData.data;

    cx = Math.round(cx);
    cy = Math.round(cy);

    const rSq = radius * radius;
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(width - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(height - 1, Math.ceil(cy + radius));

    let changed = false;

    for (let y = minY; y <= maxY; y++) {
      const dy = y - cy;
      const dySq = dy * dy;
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        if (dx * dx + dySq <= rSq) {
          const idx = (y * width + x) * 4;
          if (data[idx + 3] !== origData[idx + 3] || data[idx] !== origData[idx]) {
            data[idx] = origData[idx];
            data[idx + 1] = origData[idx + 1];
            data[idx + 2] = origData[idx + 2];
            data[idx + 3] = origData[idx + 3];
            changed = true;
          }
        }
      }
    }

    return changed;
  },

  /**
   * Interpolasi sapuan garis agar saat brush digerakkan cepat tidak putus-putus
   */
  interpolateStroke(p1, p2, radius, callback) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);
    const stepSize = Math.max(1, radius * 0.4);
    const steps = Math.ceil(dist / stepSize);

    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      const x = p1.x + dx * t;
      const y = p1.y + dy * t;
      callback(x, y);
    }
  },

  /**
   * Smooth Edge (Level 1 - 5) persis HandyCloset
   * Mengikis border halo warna background dan menghaluskan tepian masker alpha
   */
  applySmoothEdge(sourceImageData, level) {
    if (level <= 0) return sourceImageData;

    const width = sourceImageData.width;
    const height = sourceImageData.height;
    const srcData = sourceImageData.data;

    // Buat salinan imageData baru
    const output = new ImageData(new Uint8ClampedArray(srcData), width, height);
    const outData = output.data;

    // 1. Alpha Erosion (kikis border luar sebanyak 'level' piksel)
    const erodePasses = Math.min(level, 5);
    for (let pass = 0; pass < erodePasses; pass++) {
      const tempAlpha = new Uint8Array(width * height);
      for (let i = 0; i < width * height; i++) {
        tempAlpha[i] = outData[i * 4 + 3];
      }

      for (let y = 1; y < height - 1; y++) {
        const row = y * width;
        for (let x = 1; x < width - 1; x++) {
          const idx = row + x;
          if (tempAlpha[idx] === 0) continue;

          // Cek 8-neighbourhood agar erosi merata diagonal
          if (
            tempAlpha[idx - 1] === 0 ||
            tempAlpha[idx + 1] === 0 ||
            tempAlpha[idx - width] === 0 ||
            tempAlpha[idx + width] === 0 ||
            tempAlpha[idx - width - 1] === 0 ||
            tempAlpha[idx - width + 1] === 0 ||
            tempAlpha[idx + width - 1] === 0 ||
            tempAlpha[idx + width + 1] === 0
          ) {
            // Erosi penuh piksel terluar yang bersentuhan dengan background transparan
            outData[idx * 4 + 3] = 0;
          }
        }
      }
    }

    // 2. Feathering / Antialiasing Tepian (agar potongan halus dan tidak bergerigi)
    const tempAlpha = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      tempAlpha[i] = outData[i * 4 + 3];
    }

    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = row + x;
        // Hanya proses piksel tepi yang bersebelahan dengan transparan
        if (tempAlpha[idx] > 0) {
          const hasZeroNeighbor = (
            tempAlpha[idx - 1] === 0 ||
            tempAlpha[idx + 1] === 0 ||
            tempAlpha[idx - width] === 0 ||
            tempAlpha[idx + width] === 0
          );

          if (hasZeroNeighbor) {
            // Rata-rata bobot halus untuk antialiasing
            const sum =
              tempAlpha[idx - width - 1] * 0.5 + tempAlpha[idx - width] + tempAlpha[idx - width + 1] * 0.5 +
              tempAlpha[idx - 1] + tempAlpha[idx] * 2 + tempAlpha[idx + 1] +
              tempAlpha[idx + width - 1] * 0.5 + tempAlpha[idx + width] + tempAlpha[idx + width + 1] * 0.5;
            outData[idx * 4 + 3] = Math.min(255, Math.round(sum / 7.5));
          }
        }
      }
    }

    return output;
  }
};

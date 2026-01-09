import * as THREE from "three";

function setTextureColorSpace(tex: THREE.Texture) {
  const anyTex = tex as any;
  if (anyTex.colorSpace !== undefined && (THREE as any).SRGBColorSpace) {
    anyTex.colorSpace = (THREE as any).SRGBColorSpace;
  } else if (anyTex.encoding !== undefined && (THREE as any).sRGBEncoding) {
    anyTex.encoding = (THREE as any).sRGBEncoding;
  }
}

export function createTileTexture(size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#dbcbbd";
  ctx.fillRect(0, 0, size, size);

  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 10;
    img.data[i] = Math.min(255, Math.max(0, img.data[i] + n));
    img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1] + n));
    img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

  const tiles = 8;
  const step = size / tiles;

  ctx.strokeStyle = "rgba(120,110,100,0.55)";
  ctx.lineWidth = 2;
  for (let i = 0; i <= tiles; i++) {
    const p = Math.round(i * step) + 0.5;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  setTextureColorSpace(tex);
  tex.needsUpdate = true;

  return tex;
}

export function createBrickTexture(size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#d6d2cc";
  ctx.fillRect(0, 0, size, size);

  const brickW = Math.floor(size / 8);
  const brickH = Math.floor(size / 16);
  const mortar = 4;

  for (let y = 0; y < size; y += brickH + mortar) {
    const row = Math.floor(y / (brickH + mortar));
    const offset = (row % 2) * Math.floor((brickW + mortar) / 2);

    for (let x = -offset; x < size; x += brickW + mortar) {
      const bx = x + mortar;
      const by = y + mortar;

      const r = 150 + Math.random() * 30;
      const g = 60 + Math.random() * 20;
      const b = 55 + Math.random() * 20;

      ctx.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
      ctx.fillRect(bx, by, brickW, brickH);

      ctx.fillStyle = "rgba(0,0,0,0.10)";
      ctx.fillRect(bx, by + brickH - 3, brickW, 3);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  setTextureColorSpace(tex);
  tex.needsUpdate = true;

  return tex;
}

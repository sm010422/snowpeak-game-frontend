import * as THREE from "three";

export function buildNameLabel(name: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";

    // roundRect 지원 안 하는 브라우저 대비
    if ((ctx as any).roundRect) {
      (ctx as any).roundRect(0, 0, 256, 64, 20);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, 256, 64);
    }

    ctx.font = "bold 32px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, 128, 32);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.position.y = 2.2;
  sprite.scale.set(2, 0.5, 1);

  return { sprite, texture, material };
}

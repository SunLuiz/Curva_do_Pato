import * as THREE from "three";
import { BIOME_PALETTES, CELESTIAL_COLORS, HUD_3D_COLORS } from "./themePalette";

function rgbComponents(val) {
  const num =
    typeof val === "number"
      ? val
      : parseInt(String(val || "0xffffff").replace("#", ""), 16) || 0;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function toCss(val, alpha = 1) {
  const [r, g, b] = rgbComponents(val);
  return alpha < 1 ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgb(${r}, ${g}, ${b})`;
}

function createPrng(seedInit) {
  let s = seedInit >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function createCosmicSkyTexture(planetId = "earth_ne") {
  const w = 1024;
  const h = 512;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d");
  const palette = BIOME_PALETTES[planetId] || BIOME_PALETTES.earth_ne;
  const isMoon = planetId === "moon_artemis";
  const isMars = planetId === "mars_jezero";
  const rand = createPrng(isMoon ? 7717 : isMars ? 4409 : 1973);

  // Equirectangular zenith (y=0) -> horizon (y=h*0.56) -> nadir (y=h)
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  if (isMoon) {
    grad.addColorStop(0.0, "rgb(2, 4, 12)");
    grad.addColorStop(0.38, "rgb(6, 10, 22)");
    grad.addColorStop(0.55, "rgb(14, 19, 34)");
    grad.addColorStop(0.68, "rgb(18, 20, 26)");
    grad.addColorStop(1.0, "rgb(10, 12, 16)");
  } else if (isMars) {
    grad.addColorStop(0.0, "rgb(28, 16, 30)");
    grad.addColorStop(0.28, "rgb(74, 38, 42)");
    grad.addColorStop(0.46, toCss(palette.sky));
    grad.addColorStop(0.56, toCss(palette.fog));
    grad.addColorStop(1.0, "rgb(64, 34, 24)");
  } else {
    const [sr, sg, sb] = rgbComponents(palette.sky);
    const zenith = `rgb(${Math.round(sr * 0.28)}, ${Math.round(sg * 0.38)}, ${Math.min(255, Math.round(sb * 0.68) + 32)})`;
    grad.addColorStop(0.0, zenith);
    grad.addColorStop(0.32, toCss(palette.sky));
    grad.addColorStop(0.54, toCss(palette.fog));
    grad.addColorStop(1.0, toCss(palette.groundLow));
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Tilted Milky Way galactic core + nebula dust band (strongest on Moon/Mars, high zenith trace on Earth)
  const mwAlpha = isMoon ? 0.42 : isMars ? 0.24 : 0.08;
  const nebulaBase = isMars ? CELESTIAL_COLORS.nebulaMars : CELESTIAL_COLORS.nebulaMoon;
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  const bandSteps = 90;
  for (let i = 0; i < bandSteps; i++) {
    const t = i / bandSteps;
    const bx = t * w;
    const by = h * (0.28 - 0.14 * Math.sin(t * Math.PI * 2 + 0.6));
    const rad = 46 + rand() * 58;
    const g = ctx.createRadialGradient(bx, by, 2, bx, by, rad);
    const core = i % 3 === 0 ? CELESTIAL_COLORS.starBlue : nebulaBase;
    g.addColorStop(0.0, toCss(core, mwAlpha * (0.45 + rand() * 0.45)));
    g.addColorStop(0.5, toCss(CELESTIAL_COLORS.starAmber, mwAlpha * 0.18));
    g.addColorStop(1.0, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dense micro-star cluster along the galactic ribbon
  const bandStars = isMoon ? 720 : isMars ? 340 : 120;
  for (let i = 0; i < bandStars; i++) {
    const t = rand();
    const sx = t * w;
    const centerY = h * (0.28 - 0.14 * Math.sin(t * Math.PI * 2 + 0.6));
    const scatter = (rand() + rand() - 1) * 52;
    const sy = Math.max(4, Math.min(h * 0.54, centerY + scatter));
    const sz = rand() < 0.12 ? 1.5 : 0.9;
    const tint =
      rand() < 0.25
        ? CELESTIAL_COLORS.starBlue
        : rand() < 0.45
        ? CELESTIAL_COLORS.starAmber
        : CELESTIAL_COLORS.starWhite;
    ctx.fillStyle = toCss(tint, (isMoon ? 0.78 : isMars ? 0.42 : 0.16) * (0.4 + rand() * 0.6));
    ctx.beginPath();
    ctx.arc(sx, sy, sz, 0, Math.PI * 2);
    ctx.fill();
  }

  // Soft horizon atmospheric glow / Mars sunset scattering
  if (!isMoon) {
    const glowY = h * 0.53;
    const glow = ctx.createLinearGradient(0, glowY - 48, 0, glowY + 26);
    glow.addColorStop(0.0, "rgba(255,255,255,0)");
    glow.addColorStop(0.65, toCss(palette.sun, isMars ? 0.18 : 0.12));
    glow.addColorStop(1.0, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, glowY - 48, w, 74);
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function createSolarPanelTexture() {
  const size = 256;
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = toCss(HUD_3D_COLORS.solarBlue);
  ctx.fillRect(0, 0, size, size);

  const cells = 8;
  const cellSize = size / cells;

  // Photovoltaic wafer grid & silver busbars
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const x = col * cellSize;
      const y = row * cellSize;
      const g = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
      g.addColorStop(0.0, "rgba(28, 74, 158, 0.92)");
      g.addColorStop(0.5, "rgba(18, 52, 122, 0.98)");
      g.addColorStop(1.0, "rgba(32, 86, 178, 0.92)");
      ctx.fillStyle = g;
      ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

      // Horizontal silver collector fingers
      ctx.strokeStyle = toCss(HUD_3D_COLORS.roverWheelRim, 0.25);
      ctx.lineWidth = 1;
      for (let f = 1; f <= 3; f++) {
        const fy = Math.round(y + (cellSize * f) / 4) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x + 2, fy);
        ctx.lineTo(x + cellSize - 2, fy);
        ctx.stroke();
      }
    }
  }

  // Bright vertical busbar ribbons
  ctx.fillStyle = toCss(HUD_3D_COLORS.roverWheelRim, 0.72);
  for (let col = 0; col < cells; col++) {
    const bx = col * cellSize + cellSize * 0.48;
    ctx.fillRect(bx, 0, 1.5, size);
  }

  // Outer seam border
  ctx.strokeStyle = toCss(HUD_3D_COLORS.roverStrut, 0.85);
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, size - 3, size - 3);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function createTerrainDetailTexture(planetId = "earth_ne") {
  const size = 512;
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const isMoon = planetId === "moon_artemis";
  const isMars = planetId === "mars_jezero";
  const rand = createPrng(isMoon ? 9123 : isMars ? 6217 : 3191);

  // Near-white neutral base so vertex colors carry accurate biome hue without muddy darkening
  ctx.fillStyle = "rgb(238, 236, 234)";
  ctx.fillRect(0, 0, size, size);

  // Tileable wind-blown regolith ripples perpendicular to NW -> SE wind vector
  const rippleCount = isMoon ? 26 : 36;
  for (let i = 0; i < rippleCount; i++) {
    const yBase = (i / rippleCount) * size;
    ctx.strokeStyle = i % 2 === 0 ? "rgba(255, 255, 255, 0.34)" : "rgba(182, 176, 170, 0.28)";
    ctx.lineWidth = isMoon ? 2.2 : 1.7;
    ctx.beginPath();
    for (let x = 0; x <= size; x += 16) {
      const wave = Math.sin((x / size) * Math.PI * 4 + i * 0.7) * 4.5;
      const wy = yBase + wave + (x / size) * 32;
      if (x === 0) ctx.moveTo(x, wy % size);
      else ctx.lineTo(x, wy % size);
    }
    ctx.stroke();
  }

  // Sharp mineral micro-grains (basalt & quartz speckles)
  const grains = 2600;
  for (let i = 0; i < grains; i++) {
    const gx = rand() * size;
    const gy = rand() * size;
    const r = 0.7 + rand() * 1.6;
    const bright = rand() > 0.48;
    ctx.fillStyle = bright
      ? `rgba(255, 252, 246, ${0.18 + rand() * 0.22})`
      : `rgba(148, 142, 136, ${0.18 + rand() * 0.24})`;
    ctx.fillRect(gx, gy, r, r);
  }

  // Faint micro-craters on Moon / Mars
  if (isMoon || isMars) {
    const pits = isMoon ? 42 : 18;
    for (let i = 0; i < pits; i++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const cr = 3 + rand() * 9;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(165, 162, 160, 0.22)";
      ctx.beginPath();
      ctx.arc(cx + cr * 0.14, cy + cr * 0.14, cr * 0.78, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function createPlanetOrbTexture(kind) {
  const size = 256;
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const rand = createPrng(
    kind === "earth" ? 101 : kind === "moon" ? 202 : kind === "ringed_planet" ? 303 : 404
  );

  if (kind === "sun_halo") {
    const cx = size / 2;
    const grad = ctx.createRadialGradient(cx, cx, 4, cx, cx, cx);
    grad.addColorStop(0.0, "rgba(255, 254, 240, 1.0)");
    grad.addColorStop(0.18, "rgba(255, 235, 175, 0.85)");
    grad.addColorStop(0.45, "rgba(255, 198, 110, 0.28)");
    grad.addColorStop(1.0, "rgba(255, 180, 90, 0.0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  } else if (kind === "ring_disc") {
    const cx = size / 2;
    const grad = ctx.createRadialGradient(cx, cx, size * 0.24, cx, cx, size * 0.49);
    grad.addColorStop(0.0, "rgba(0,0,0,0)");
    grad.addColorStop(0.12, toCss(CELESTIAL_COLORS.saturnRing, 0.38));
    grad.addColorStop(0.38, toCss(CELESTIAL_COLORS.saturnRing, 0.85));
    grad.addColorStop(0.52, "rgba(35, 30, 26, 0.14)"); // Cassini gap
    grad.addColorStop(0.62, toCss(CELESTIAL_COLORS.saturnRing, 0.72));
    grad.addColorStop(0.92, toCss(CELESTIAL_COLORS.saturnRing, 0.22));
    grad.addColorStop(1.0, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  } else if (kind === "earth") {
    ctx.fillStyle = toCss(CELESTIAL_COLORS.earthOcean);
    ctx.fillRect(0, 0, size, size);
    // Continental shelves
    ctx.fillStyle = toCss(CELESTIAL_COLORS.earthLand, 0.92);
    for (let i = 0; i < 16; i++) {
      const lx = rand() * size;
      const ly = 36 + rand() * (size - 72);
      ctx.beginPath();
      ctx.ellipse(lx, ly, 14 + rand() * 28, 9 + rand() * 18, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    // Polar ice caps
    ctx.fillStyle = "rgba(242, 248, 255, 0.9)";
    ctx.fillRect(0, 0, size, 18);
    ctx.fillRect(0, size - 18, size, 18);
    // Swirling cloud bands
    ctx.fillStyle = "rgba(255, 255, 255, 0.48)";
    for (let i = 0; i < 24; i++) {
      const wx = rand() * size;
      const wy = rand() * size;
      ctx.beginPath();
      ctx.ellipse(wx, wy, 20 + rand() * 44, 3 + rand() * 7, -0.18 + rand() * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === "moon") {
    ctx.fillStyle = "rgb(186, 190, 198)";
    ctx.fillRect(0, 0, size, size);
    // Dark lunar maria
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = "rgba(112, 118, 128, 0.55)";
      ctx.beginPath();
      ctx.ellipse(rand() * size, rand() * size, 16 + rand() * 28, 12 + rand() * 22, rand(), 0, Math.PI * 2);
      ctx.fill();
    }
    // Circular craters
    for (let i = 0; i < 36; i++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const r = 3 + rand() * 11;
      ctx.fillStyle = "rgba(95, 100, 110, 0.42)";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(232, 236, 242, 0.45)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  } else {
    // Ringed gas giant bands
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0.0, toCss(CELESTIAL_COLORS.saturnBody));
    g.addColorStop(0.25, toCss(CELESTIAL_COLORS.saturnRing));
    g.addColorStop(0.45, toCss(CELESTIAL_COLORS.saturnBody));
    g.addColorStop(0.68, toCss(CELESTIAL_COLORS.saturnRing));
    g.addColorStop(1.0, toCss(CELESTIAL_COLORS.saturnBody));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

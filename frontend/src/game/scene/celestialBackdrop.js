import * as THREE from "three";
import { BIOME_PALETTES, CELESTIAL_COLORS } from "./themePalette";
import { createCosmicSkyTexture, createPlanetOrbTexture } from "./proceduralTextures";

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createCelestialBackdrop({ scene, planetId = "earth_ne", reducedMotion = false }) {
  const palette = BIOME_PALETTES[planetId] || BIOME_PALETTES.earth_ne;
  const isMoon = planetId === "moon_artemis";
  const isMars = planetId === "mars_jezero";

  const root = new THREE.Group();
  root.name = "celestialBackdrop";
  scene.add(root);

  const geometries = [];
  const materials = [];
  const textures = [];

  const trackGeo = (g) => {
    geometries.push(g);
    return g;
  };
  const trackMat = (m) => {
    materials.push(m);
    return m;
  };
  const trackTex = (t) => {
    textures.push(t);
    return t;
  };

  // 1. Equirectangular Sky Dome (Milky Way + Atmospheric Gradient)
  const skyTex = trackTex(createCosmicSkyTexture(planetId));
  const skyGeo = trackGeo(new THREE.SphereGeometry(215, 40, 24));
  const skyMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    })
  );
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyDome.renderOrder = -10;
  root.add(skyDome);

  // 2. Multi-magnitude Color-Temperature Starfield
  const starCount = isMoon ? 920 : isMars ? 520 : 240;
  const rand = seededRandom(isMoon ? 5501 : isMars ? 3307 : 1103);
  const starPos = new Float32Array(starCount * 3);
  const starCol = new Float32Array(starCount * 3);

  const cWhite = new THREE.Color(CELESTIAL_COLORS.starWhite);
  const cBlue = new THREE.Color(CELESTIAL_COLORS.starBlue);
  const cAmber = new THREE.Color(CELESTIAL_COLORS.starAmber);

  const minY = isMoon ? -4 : isMars ? 16 : 44;
  for (let i = 0; i < starCount; i++) {
    const theta = rand() * Math.PI * 2;
    const minPhi = isMoon ? 0.04 : isMars ? 0.12 : 0.34;
    const yNorm = minPhi + rand() * (1 - minPhi);
    const rHoriz = Math.sqrt(Math.max(0.01, 1 - yNorm * yNorm));
    const rad = 185 + rand() * 14;
    const sy = Math.max(minY, yNorm * rad);
    starPos[i * 3] = Math.cos(theta) * rHoriz * rad;
    starPos[i * 3 + 1] = sy;
    starPos[i * 3 + 2] = Math.sin(theta) * rHoriz * rad;

    const pick = rand();
    const base = pick < 0.28 ? cBlue : pick < 0.5 ? cAmber : cWhite;
    const mag = 0.45 + rand() * 0.55;
    starCol[i * 3] = base.r * mag;
    starCol[i * 3 + 1] = base.g * mag;
    starCol[i * 3 + 2] = base.b * mag;
  }

  const starGeo = trackGeo(new THREE.BufferGeometry());
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(starCol, 3));
  const starMat = trackMat(
    new THREE.PointsMaterial({
      size: isMoon ? 1.15 : isMars ? 0.95 : 0.72,
      vertexColors: true,
      transparent: true,
      opacity: isMoon ? 0.96 : isMars ? 0.68 : 0.28,
      fog: false,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  const stars = new THREE.Points(starGeo, starMat);
  stars.renderOrder = -8;
  root.add(stars);

  // 3. Sun Core Disc + Coronal Halo Sprite synced to directional sun light
  const sunHaloTex = trackTex(createPlanetOrbTexture("sun_halo"));
  const sunGroup = new THREE.Group();
  const sunDiscGeo = trackGeo(new THREE.SphereGeometry(isMars ? 3.8 : 5.4, 20, 16));
  const sunDiscMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: palette.sun,
      fog: false,
    })
  );
  const sunDisc = new THREE.Mesh(sunDiscGeo, sunDiscMat);
  const sunHaloMat = trackMat(
    new THREE.SpriteMaterial({
      map: sunHaloTex,
      color: palette.sun,
      transparent: true,
      opacity: isMoon ? 0.55 : 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  const sunHalo = new THREE.Sprite(sunHaloMat);
  sunHalo.scale.set(isMars ? 24 : 34, isMars ? 24 : 34, 1);
  sunGroup.add(sunDisc, sunHalo);
  root.add(sunGroup);

  // 4. Horizon & Orbital Planets per Biome
  const rotatingBodies = [];
  let phobosMesh = null;
  let deimosMesh = null;

  const addRingedPlanet = (pos, radius) => {
    const bodyTex = trackTex(createPlanetOrbTexture("ringed_planet"));
    const ringTex = trackTex(createPlanetOrbTexture("ring_disc"));
    const group = new THREE.Group();
    group.position.copy(pos);

    const pGeo = trackGeo(new THREE.SphereGeometry(radius, 24, 18));
    const pMat = trackMat(new THREE.MeshBasicMaterial({ map: bodyTex, fog: false }));
    const planet = new THREE.Mesh(pGeo, pMat);

    const rGeo = trackGeo(new THREE.RingGeometry(radius * 1.4, radius * 2.55, 48));
    const rMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: ringTex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        fog: false,
        depthWrite: false,
      })
    );
    const ring = new THREE.Mesh(rGeo, rMat);
    ring.rotation.x = Math.PI * 0.37;
    ring.rotation.y = 0.28;

    group.add(planet, ring);
    root.add(group);
    rotatingBodies.push({ mesh: planet, speed: 0.025 });
  };

  if (isMoon) {
    // Iconic Clouded Blue Earthrise over Forward Lunar Horizon (+Z)
    const earthTex = trackTex(createPlanetOrbTexture("earth"));
    const earthGroup = new THREE.Group();
    earthGroup.position.set(-54, 27, 146);

    const earthGeo = trackGeo(new THREE.SphereGeometry(11.5, 32, 24));
    const earthMat = trackMat(new THREE.MeshBasicMaterial({ map: earthTex, fog: false }));
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.rotation.z = 0.41;

    const atmoGeo = trackGeo(new THREE.SphereGeometry(12.35, 32, 24));
    const atmoMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: CELESTIAL_COLORS.earthAtmo,
        transparent: true,
        opacity: 0.26,
        side: THREE.BackSide,
        fog: false,
        depthWrite: false,
      })
    );
    const atmo = new THREE.Mesh(atmoGeo, atmoMat);
    earthGroup.add(earthMesh, atmo);
    root.add(earthGroup);
    rotatingBodies.push({ mesh: earthMesh, speed: 0.04 });

    // Distant Ringed Giant in deep space (+Z right sky)
    addRingedPlanet(new THREE.Vector3(76, 35, 138), 5.2);
  } else if (isMars) {
    // Phobos (potato-shaped prograde moon) & Deimos in forward twilight sky (+Z)
    const phobosGeo = trackGeo(new THREE.IcosahedronGeometry(3.2, 1));
    const phobosMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: CELESTIAL_COLORS.phobosRock,
        roughness: 0.94,
        flatShading: true,
        fog: false,
        emissive: CELESTIAL_COLORS.phobosRock,
        emissiveIntensity: 0.22,
      })
    );
    phobosMesh = new THREE.Mesh(phobosGeo, phobosMat);
    phobosMesh.scale.set(1.28, 0.88, 1.04);
    phobosMesh.position.set(-48, 32, 140);
    root.add(phobosMesh);

    const deimosGeo = trackGeo(new THREE.IcosahedronGeometry(1.6, 1));
    const deimosMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: CELESTIAL_COLORS.deimosRock,
        roughness: 0.9,
        flatShading: true,
        fog: false,
        emissive: CELESTIAL_COLORS.deimosRock,
        emissiveIntensity: 0.24,
      })
    );
    deimosMesh = new THREE.Mesh(deimosGeo, deimosMat);
    deimosMesh.scale.set(1.18, 0.9, 0.95);
    deimosMesh.position.set(103, 38, 117);
    root.add(deimosMesh);

    // Pale Blue Dot (Earth visible from Mars twilight sky)
    const earthDotGeo = trackGeo(new THREE.SphereGeometry(2.1, 16, 12));
    const earthDotMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: CELESTIAL_COLORS.earthAtmo,
        fog: false,
      })
    );
    const earthDot = new THREE.Mesh(earthDotGeo, earthDotMat);
    earthDot.position.set(42, 26, 146);
    root.add(earthDot);

    addRingedPlanet(new THREE.Vector3(-88, 38, 124), 4.0);
  } else {
    // Earth atmospheric daytime cratered Moon visible above forward horizon (+Z)
    const moonTex = trackTex(createPlanetOrbTexture("moon"));
    const moonGeo = trackGeo(new THREE.SphereGeometry(5.6, 24, 18));
    const moonMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: moonTex,
        transparent: true,
        opacity: 0.72,
        fog: false,
      })
    );
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(-54, 34, 142);
    root.add(moonMesh);
    rotatingBodies.push({ mesh: moonMesh, speed: 0.008 });
  }

  const update = (elapsedSec, sunPos) => {
    if (sunPos) {
      // Project directional light vector out onto distant sky sphere radius (~175 m)
      const len = Math.hypot(sunPos.x, sunPos.y, sunPos.z) || 1;
      const dist = 175;
      sunGroup.position.set(
        (sunPos.x / len) * dist,
        Math.max(12, (sunPos.y / len) * dist),
        (sunPos.z / len) * dist
      );
    }

    if (reducedMotion) return;

    skyDome.rotation.y = Math.PI * 0.65 + elapsedSec * 0.0022;
    stars.rotation.y = elapsedSec * 0.003;

    for (const item of rotatingBodies) {
      item.mesh.rotation.y = elapsedSec * item.speed;
    }

    if (phobosMesh) {
      const a = elapsedSec * 0.045 + 1.9;
      phobosMesh.position.set(Math.cos(a) * 148, 32 + Math.sin(a * 0.7) * 6, Math.sin(a) * 148);
      phobosMesh.rotation.y = elapsedSec * 0.12;
    }
    if (deimosMesh) {
      const b = -elapsedSec * 0.022 + 0.85;
      deimosMesh.position.set(Math.cos(b) * 156, 38 + Math.cos(b) * 5, Math.sin(b) * 156);
      deimosMesh.rotation.y = elapsedSec * 0.07;
    }
  };

  const dispose = () => {
    scene.remove(root);
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  return { update, dispose };
}

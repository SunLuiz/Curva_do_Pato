import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { BIOME_PALETTES, HUD_3D_COLORS, SPRITE_PALETTE } from "./themePalette";
import { terrainHeight, terrainNormal, getMissionZones, findZonesAt } from "../sim/terrainField";
import { dispatchAction, getRuntime, tickRuntime, togglePauseRuntime } from "../store";
import { soundEngine } from "../soundEngine";
import { createSolarPanelTexture, createTerrainDetailTexture } from "./proceduralTextures";
import { createCelestialBackdrop } from "./celestialBackdrop";

function createZoneLabelSprite(text, borderCss) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 112;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = SPRITE_PALETTE.bg;
    ctx.strokeStyle = borderCss;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(10, 12, canvas.width - 20, canvas.height - 24, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = SPRITE_PALETTE.text;
    ctx.font = "700 28px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text.slice(0, 34), canvas.width / 2, canvas.height / 2 + 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    opacity: 0.94,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(9.2, 2.05, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function createZoneMesh(zone, palette, missionId, lang = "en") {
  const group = new THREE.Group();
  const y = terrainHeight(missionId, zone.x, zone.z);
  group.position.set(zone.x, y, zone.z);

  const ringColor =
    zone.kind === "hazard"
      ? HUD_3D_COLORS.dangerRed
      : zone.kind === "hazard_choice"
      ? HUD_3D_COLORS.warnAmber
      : zone.kind === "bess" || zone.kind === "beacon"
      ? HUD_3D_COLORS.cyan
      : HUD_3D_COLORS.safeGreen;

  const borderCss =
    zone.kind === "hazard"
      ? SPRITE_PALETTE.danger
      : zone.kind === "hazard_choice"
      ? SPRITE_PALETTE.warn
      : zone.kind === "bess" || zone.kind === "beacon"
      ? SPRITE_PALETTE.cyan
      : SPRITE_PALETTE.safe;

  // Ground beacon ring
  const ringGeo = new THREE.RingGeometry(zone.radius * 0.82, zone.radius, 36);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: ringColor,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.25;
  group.add(ring);

  // Landmark structure by kind
  if (zone.kind === "shelter") {
    if (zone.id === "lava_tube") {
      // Lava tube arch
      const archGeo = new THREE.TorusGeometry(4.2, 1.35, 10, 20, Math.PI);
      const archMat = new THREE.MeshStandardMaterial({ color: palette.rock, roughness: 0.9 });
      const arch = new THREE.Mesh(archGeo, archMat);
      arch.position.set(0, 0.2, 0);
      group.add(arch);
    } else {
      // Protective boulder arc along NW windward rim (-X, -Z) shielding against NW -> SE wind
      const rockMat = new THREE.MeshStandardMaterial({ color: palette.rock, roughness: 0.92, flatShading: true });
      const b1 = new THREE.Mesh(new THREE.DodecahedronGeometry(3.3, 0), rockMat);
      b1.position.set(-2.8, 2.0, -2.2);
      b1.scale.set(1.25, 1.25, 1.05);
      b1.castShadow = true;
      b1.receiveShadow = true;
      const b2 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.3, 0), rockMat);
      b2.position.set(-0.6, 1.35, -3.1);
      b2.castShadow = true;
      b2.receiveShadow = true;
      const b3 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.1, 0), rockMat);
      b3.position.set(-3.3, 1.25, -0.1);
      b3.castShadow = true;
      b3.receiveShadow = true;
      group.add(b1, b2, b3);
    }
  } else if (zone.kind === "bess") {
    if (zone.id === "greenhouse_soc") {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(3.2, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({
          color: HUD_3D_COLORS.safeGreen,
          emissive: 0x164a28,
          transparent: true,
          opacity: 0.72,
        })
      );
      dome.castShadow = true;
      group.add(dome);
    } else {
      const dock = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 2.2, 3.8),
        new THREE.MeshStandardMaterial({
          color: HUD_3D_COLORS.roverBody,
          metalness: 0.35,
          roughness: 0.45,
        })
      );
      dock.position.y = 1.1;
      dock.castShadow = true;
      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 0.9, 2.8, 12),
        new THREE.MeshStandardMaterial({
          color: HUD_3D_COLORS.cyan,
          emissive: 0x186a7a,
        })
      );
      core.position.y = 1.5;
      group.add(dock, core);
    }
  } else if (zone.kind === "beacon" || zone.kind === "sample" || zone.kind === "hazard_choice") {
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.45, 5.2, 10),
      new THREE.MeshStandardMaterial({ color: HUD_3D_COLORS.roverGold, metalness: 0.5 })
    );
    tower.position.y = 2.6;
    tower.castShadow = true;
    const orb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.85, 0),
      new THREE.MeshStandardMaterial({ color: ringColor, emissive: ringColor, emissiveIntensity: 0.6 })
    );
    orb.position.y = 5.6;
    orb.userData.pulse = true;
    group.add(tower, orb);

    // 64m EDL Lander silhouette + retro-plume blast ring on M3 landing beacon
    if (missionId === "M3" && zone.id === "landing_beacon") {
      const landerDeck = new THREE.Mesh(
        new THREE.CylinderGeometry(1.45, 1.75, 0.7, 8),
        new THREE.MeshStandardMaterial({ color: HUD_3D_COLORS.roverBody, metalness: 0.45, roughness: 0.4 })
      );
      landerDeck.position.set(3.1, 1.45, 1.2);
      landerDeck.castShadow = true;
      const blastRingGeo = new THREE.RingGeometry(2.3, 3.3, 24);
      blastRingGeo.rotateX(-Math.PI / 2);
      const blastRing = new THREE.Mesh(
        blastRingGeo,
        new THREE.MeshBasicMaterial({ color: HUD_3D_COLORS.warnAmber, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
      );
      blastRing.position.set(3.1, 0.14, 1.2);
      group.add(landerDeck, blastRing);
    }
  } else if (zone.kind === "ridge") {
    const marker = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 2.4, 8),
      new THREE.MeshStandardMaterial({ color: HUD_3D_COLORS.safeGreen, emissive: 0x1a5e32 })
    );
    marker.position.y = 1.6;
    marker.rotation.x = Math.PI;
    marker.userData.pulse = true;
    group.add(marker);
  } else if (zone.kind === "hazard") {
    const pylonGeo = new THREE.CylinderGeometry(0.18, 0.22, 2.2, 8);
    const pylonMat = new THREE.MeshStandardMaterial({
      color: HUD_3D_COLORS.dangerRed,
      emissive: 0x661610,
    });
    for (const [px, pz] of [[zone.radius * 0.78, 0], [-zone.radius * 0.78, 0], [0, zone.radius * 0.78], [0, -zone.radius * 0.78]]) {
      const pylon = new THREE.Mesh(pylonGeo, pylonMat);
      pylon.position.set(px, 1.1, pz);
      pylon.castShadow = true;
      group.add(pylon);
    }
    // Raised volcanic crater rim ejecta rocks around hazard perimeter
    const ejectaMat = new THREE.MeshStandardMaterial({
      color: palette.rock,
      roughness: 0.92,
      flatShading: true,
    });
    const ejectaGeo = new THREE.DodecahedronGeometry(0.9, 0);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + 0.35;
      const rr = zone.radius * (0.94 + (i % 3) * 0.08);
      const rx = Math.cos(a) * rr;
      const rz = Math.sin(a) * rr;
      const ry = terrainHeight(missionId, zone.x + rx, zone.z + rz) - y + 0.32;
      const boulder = new THREE.Mesh(ejectaGeo, ejectaMat);
      boulder.position.set(rx, ry, rz);
      boulder.rotation.set(i * 0.5, a, i * 0.3);
      boulder.scale.set(1.1 + (i % 2) * 0.45, 0.72 + (i % 3) * 0.2, 1.0);
      boulder.castShadow = true;
      boulder.receiveShadow = true;
      group.add(boulder);
    }
  }

  const labelText = lang === "pt" ? zone.labelPt || zone.id : zone.labelEn || zone.id;
  const suffix =
    missionId === "M3" && zone.id === "crater_alpha"
      ? " (>40% SLIP · 1.8× Wh/km)"
      : "";
  const sprite = createZoneLabelSprite(`${labelText}${suffix}`, borderCss);
  sprite.position.set(0, zone.kind === "beacon" || zone.kind === "sample" ? 7.3 : 4.4, 0);
  group.add(sprite);

  group.userData.zoneId = zone.id;
  group.userData.ringMat = ringMat;
  return group;
}

function createRoverModel() {
  const root = new THREE.Group();
  const chassisPivot = new THREE.Group();
  root.add(chassisPivot);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: HUD_3D_COLORS.roverBody,
    roughness: 0.38,
    metalness: 0.32,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: HUD_3D_COLORS.roverGold,
    roughness: 0.3,
    metalness: 0.72,
  });
  const strutMat = new THREE.MeshStandardMaterial({
    color: HUD_3D_COLORS.roverStrut,
    roughness: 0.4,
    metalness: 0.75,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: HUD_3D_COLORS.roverWheel,
    roughness: 0.85,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: HUD_3D_COLORS.roverWheelRim,
    roughness: 0.32,
    metalness: 0.78,
  });
  const grouserMat = new THREE.MeshStandardMaterial({
    color: HUD_3D_COLORS.roverGrouser,
    roughness: 0.45,
    metalness: 0.6,
  });
  const solarTex = createSolarPanelTexture();
  const solarMat = new THREE.MeshStandardMaterial({
    map: solarTex,
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0.42,
  });

  // Main warm electronics box + forward avionics collar
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.72, 2.5), bodyMat);
  body.position.y = 0.82;
  body.castShadow = true;
  body.receiveShadow = true;
  chassisPivot.add(body);

  // Gold RTG / battery deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.26, 1.1), goldMat);
  deck.position.set(0, 1.24, -0.48);
  deck.castShadow = true;
  chassisPivot.add(deck);

  // Rocker-bogie metallic suspension struts linking L/R wheels to chassis
  const bogieGeo = new THREE.BoxGeometry(0.11, 0.11, 2.25);
  const strutGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.62, 8);
  for (const sx of [-0.92, 0.92]) {
    const bogie = new THREE.Mesh(bogieGeo, strutMat);
    bogie.position.set(sx, 0.56, 0);
    bogie.castShadow = true;
    chassisPivot.add(bogie);
    for (const sz of [-1.05, 0, 1.05]) {
      const leg = new THREE.Mesh(strutGeo, strutMat);
      leg.position.set(sx * 0.98, 0.48, sz);
      chassisPivot.add(leg);
    }
  }

  // 6 Detailed Rocker-Bogie wheels (metallic rim, gold hub, 8 raised grouser cleats + steering pivots)
  const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.32, 20);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.34, 16);
  rimGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.37, 12);
  hubGeo.rotateZ(Math.PI / 2);
  const grouserGeo = new THREE.BoxGeometry(0.34, 0.052, 0.062);

  const wheelAssemblies = [];
  for (const sx of [-1.05, 1.05]) {
    for (const sz of [-1.05, 0, 1.05]) {
      const steerPivot = new THREE.Group();
      steerPivot.position.set(sx, 0.38, sz);

      const spinGroup = new THREE.Group();
      const tire = new THREE.Mesh(tireGeo, wheelMat);
      tire.castShadow = true;
      const rim = new THREE.Mesh(rimGeo, rimMat);
      const hub = new THREE.Mesh(hubGeo, goldMat);
      spinGroup.add(tire, rim, hub);

      // 8 raised grouser bars spaced around wheel perimeter so spin is immediately crisp
      for (let gIdx = 0; gIdx < 8; gIdx += 1) {
        const ang = (gIdx / 8) * Math.PI * 2;
        const cleat = new THREE.Mesh(grouserGeo, grouserMat);
        cleat.position.set(0, Math.cos(ang) * 0.382, Math.sin(ang) * 0.382);
        cleat.rotation.x = -ang;
        spinGroup.add(cleat);
      }

      steerPivot.add(spinGroup);
      root.add(steerPivot);
      wheelAssemblies.push({
        steerPivot,
        spinGroup,
        steerDir: sz > 0.5 ? 1 : sz < -0.5 ? -0.45 : 0,
      });
    }
  }

  // Twin front LED headlights + volumetric subtle forward beam cones (+Z nose)
  const lampGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12);
  lampGeo.rotateX(Math.PI / 2);
  const lampMat = new THREE.MeshBasicMaterial({ color: HUD_3D_COLORS.headlightBeam });
  const beamGeo = new THREE.ConeGeometry(0.42, 2.2, 12, 1, true);
  beamGeo.rotateX(-Math.PI / 2);
  beamGeo.translate(0, 0, 1.1);
  const beamMat = new THREE.MeshBasicMaterial({
    color: HUD_3D_COLORS.headlightBeam,
    transparent: true,
    opacity: 0.09,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (const hx of [-0.56, 0.56]) {
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(hx, 0.88, 1.26);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(hx, 0.88, 1.28);
    chassisPivot.add(lamp, beam);
  }

  // Forward Chassis Proa Chevron on +Z nose so facing direction is unmistakable
  const proaGeo = new THREE.ConeGeometry(0.24, 0.52, 4);
  proaGeo.rotateX(Math.PI / 2);
  const proaMesh = new THREE.Mesh(
    proaGeo,
    new THREE.MeshBasicMaterial({ color: HUD_3D_COLORS.warnAmber })
  );
  proaMesh.position.set(0, 0.62, 1.56);
  chassisPivot.add(proaMesh);

  // Left & Right articulated solar wings
  const wingGeo = new THREE.BoxGeometry(1.85, 0.08, 1.35);
  const leftWingPivot = new THREE.Group();
  leftWingPivot.position.set(-0.88, 1.15, 0.15);
  const leftWing = new THREE.Mesh(wingGeo, solarMat);
  leftWing.position.set(-0.95, 0, 0);
  leftWing.castShadow = true;
  leftWing.receiveShadow = true;
  leftWingPivot.add(leftWing);
  chassisPivot.add(leftWingPivot);

  const rightWingPivot = new THREE.Group();
  rightWingPivot.position.set(0.88, 1.15, 0.15);
  const rightWing = new THREE.Mesh(wingGeo, solarMat);
  rightWing.position.set(0.95, 0, 0);
  rightWing.castShadow = true;
  rightWing.receiveShadow = true;
  rightWingPivot.add(rightWing);
  chassisPivot.add(rightWingPivot);

  // Telescoping mast + NavCam head + Spinning Wind Anemometer
  const mastGroup = new THREE.Group();
  mastGroup.position.set(0.28, 1.2, 0.85);
  const mastPole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.45, 10), strutMat);
  mastPole.position.y = 0.72;
  mastPole.castShadow = true;
  const camHead = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.28, 0.36), bodyMat);
  camHead.position.y = 1.48;
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.12, 12),
    new THREE.MeshStandardMaterial({ color: HUD_3D_COLORS.cyan, emissive: HUD_3D_COLORS.cyan })
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 1.48, 0.2);

  // 3-cup spinning wind anemometer above NavCam
  const anemometerGroup = new THREE.Group();
  anemometerGroup.position.set(-0.2, 1.72, -0.05);
  const cupArmGeo = new THREE.BoxGeometry(0.32, 0.025, 0.025);
  const cupGeo = new THREE.SphereGeometry(0.055, 8, 6);
  for (let c = 0; c < 3; c += 1) {
    const a = (c / 3) * Math.PI * 2;
    const arm = new THREE.Mesh(cupArmGeo, rimMat);
    arm.rotation.y = a;
    const cup = new THREE.Mesh(cupGeo, goldMat);
    cup.position.set(Math.cos(a) * 0.17, 0, -Math.sin(a) * 0.17);
    anemometerGroup.add(arm, cup);
  }

  mastGroup.add(mastPole, camHead, lens, anemometerGroup);
  chassisPivot.add(mastGroup);

  // Status ring on ground + Overhead Floating Target Compass Arrow (never sinks into terrain)
  const statusRingMat = new THREE.MeshBasicMaterial({
    color: HUD_3D_COLORS.cyan,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
  });
  const statusRing = new THREE.Mesh(new THREE.RingGeometry(1.78, 2.04, 32), statusRingMat);
  statusRing.rotation.x = -Math.PI / 2;
  statusRing.position.y = 0.12;
  root.add(statusRing);

  const navArrowPivot = new THREE.Group();
  navArrowPivot.position.y = 2.62;
  const arrowMat = new THREE.MeshBasicMaterial({ color: HUD_3D_COLORS.safeGreen });
  const arrowShaft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.72), arrowMat);
  arrowShaft.position.z = 0.28;
  const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.65, 6), arrowMat);
  arrowHead.rotation.x = Math.PI / 2;
  arrowHead.position.z = 0.85;
  navArrowPivot.add(arrowShaft, arrowHead);
  root.add(navArrowPivot);

  return {
    root,
    chassisPivot,
    wheelAssemblies,
    leftWingPivot,
    rightWingPivot,
    mastGroup,
    anemometerGroup,
    solarMat,
    statusRingMat,
    navArrowPivot,
  };
}

export default function RoverViewport3D({
  missionId,
  planetId,
  lang = "en",
  camMode = "chase",
  onToggleCamMode,
  onToggleFullscreen,
  onToggleMute,
  onRetry,
  touchInputRef,
  reducedMotion = false,
}) {
  const hostRef = useRef(null);
  const camModeRef = useRef(camMode);
  const onToggleCamRef = useRef(onToggleCamMode);
  const onToggleFullscreenRef = useRef(onToggleFullscreen);
  const onToggleMuteRef = useRef(onToggleMute);
  const onRetryRef = useRef(onRetry);
  camModeRef.current = camMode;
  onToggleCamRef.current = onToggleCamMode;
  onToggleFullscreenRef.current = onToggleFullscreen;
  onToggleMuteRef.current = onToggleMute;
  onRetryRef.current = onRetry;
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    const container = hostRef.current;
    if (!container) return undefined;

    // WebGL availability check
    const probeCanvas = document.createElement("canvas");
    const hasGl = Boolean(probeCanvas.getContext("webgl2") || probeCanvas.getContext("webgl"));
    if (!hasGl) {
      setWebglError(true);
      return undefined;
    }

    const palette = BIOME_PALETTES[planetId] || BIOME_PALETTES.mars_jezero;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(palette.sky);
    scene.fog = new THREE.FogExp2(palette.fog, planetId === "moon_artemis" ? 0.0022 : 0.008);

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 420;
    const camera = new THREE.PerspectiveCamera(54, width / height, 0.2, 360);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Cosmic Sky Dome, Milky Way, Horizon Planets & Stars
    const backdrop = createCelestialBackdrop({ scene, planetId, reducedMotion });

    // Lighting + High-Resolution Rover-Tracking Shadow Frustum
    const hemi = new THREE.HemisphereLight(palette.sun, palette.groundLow, 0.85);
    scene.add(hemi);
    const ambient = new THREE.AmbientLight(palette.ambient, 0.45);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(palette.sun, 1.7);
    sun.position.set(28, 36, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.bias = -0.0005;
    sun.shadow.camera.near = 4;
    sun.shadow.camera.far = 115;
    sun.shadow.camera.left = -26;
    sun.shadow.camera.right = 26;
    sun.shadow.camera.top = 26;
    sun.shadow.camera.bottom = -26;
    scene.add(sun);
    scene.add(sun.target);

    // Mission Zone Metadata (needed for terrain geological vertex tinting + landmarks)
    const zones = getMissionZones(missionId);

    // High-Resolution Smooth Heightfield Terrain Mesh + Tileable Micro-Regolith Map
    const segs = 128;
    const size = 104;
    const terrainGeo = new THREE.PlaneGeometry(size, size, segs, segs);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);
    const colLow = new THREE.Color(palette.groundLow);
    const colHigh = new THREE.Color(palette.groundHigh);
    const sandHazardColor = new THREE.Color(HUD_3D_COLORS.sandHazard);
    const basaltSafeColor = new THREE.Color(HUD_3D_COLORS.basaltSafe);
    const tmpColor = new THREE.Color();

    for (let i = 0; i < posAttr.count; i += 1) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const vy = terrainHeight(missionId, vx, vz);
      posAttr.setY(i, vy);
      const t = Math.max(0, Math.min(1, (vy + 4) / 8.5));
      tmpColor.copy(colLow).lerp(colHigh, t);

      for (const z of zones) {
        const dz = Math.hypot(vx - z.x, vz - z.z);
        if (z.kind === "hazard" && dz < z.radius * 1.18) {
          const w = 1 - dz / (z.radius * 1.18);
          tmpColor.lerp(sandHazardColor, w * 0.65);
        } else if (
          (z.id === "safe_plateau" || z.id === "sun_ridge" || z.id === "landing_beacon") &&
          dz < z.radius * 1.1
        ) {
          const w = 1 - dz / (z.radius * 1.1);
          tmpColor.lerp(basaltSafeColor, w * 0.42);
        }
      }

      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }
    terrainGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainDetailTex = createTerrainDetailTexture(planetId);
    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainDetailTex,
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.04,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // Arena Boundary Markers
    const borderGeo = new THREE.RingGeometry(58, 59.2, 64);
    borderGeo.rotateX(-Math.PI / 2);
    const borderMat = new THREE.MeshBasicMaterial({ color: palette.accent, transparent: true, opacity: 0.22 });
    const borderMesh = new THREE.Mesh(borderGeo, borderMat);
    borderMesh.position.y = 0.2;
    scene.add(borderMesh);

    // Mission Zone Landmarks
    const zoneGroups = zones.map((z) => {
      const g = createZoneMesh(z, palette, missionId, lang);
      scene.add(g);
      return g;
    });

    // M3 Green Basalt Safe Corridor markers (northward bypass around Crater Alpha)
    if (missionId === "M3") {
      const waypointCoords = [
        [-14, -10],
        [-8, -14],
        [0, -17],
        [10, -18],
        [20, -20],
      ];
      const padGeo = new THREE.RingGeometry(0.7, 1.15, 16);
      padGeo.rotateX(-Math.PI / 2);
      const padMat = new THREE.MeshBasicMaterial({
        color: HUD_3D_COLORS.safeGreen,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      });
      for (const [wx, wz] of waypointCoords) {
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.set(wx, terrainHeight(missionId, wx, wz) + 0.18, wz);
        scene.add(pad);
      }
    }

    // M4 Subtle vegetation scrub props across Campinas biome terrain
    if (missionId === "M4") {
      const shrubCount = 28;
      const shrubGeo = new THREE.ConeGeometry(0.55, 1.5, 6);
      const shrubMat = new THREE.MeshStandardMaterial({ color: palette.accent, roughness: 0.88, flatShading: true });
      const shrubs = new THREE.InstancedMesh(shrubGeo, shrubMat, shrubCount);
      const sDummy = new THREE.Object3D();
      for (let i = 0; i < shrubCount; i += 1) {
        const sx = Math.sin(i * 12.7) * 34;
        const sz = Math.cos(i * 7.3) * 34;
        sDummy.position.set(sx, terrainHeight(missionId, sx, sz) + 0.72, sz);
        sDummy.scale.setScalar(0.8 + (i % 4) * 0.25);
        sDummy.updateMatrix();
        shrubs.setMatrixAt(i, sDummy.matrix);
      }
      scene.add(shrubs);
    }

    const baseTerrainColors = new Float32Array(colors);

    // Persistent Regolith Tire Tracks (InstancedMesh ring buffer, L/R paired stamps)
    const maxTrackPairs = 160;
    const maxTrackInstances = maxTrackPairs * 2;
    const trackGeo = new THREE.BoxGeometry(0.36, 0.035, 0.48);
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.96,
      metalness: 0.02,
      transparent: true,
      opacity: 0.72,
    });
    const trackMesh = new THREE.InstancedMesh(trackGeo, trackMat, maxTrackInstances);
    trackMesh.frustumCulled = false;
    trackMesh.receiveShadow = true;
    const trackDummy = new THREE.Object3D();
    trackDummy.scale.setScalar(0);
    trackDummy.updateMatrix();
    const cTrackFirm = new THREE.Color(HUD_3D_COLORS.trackFirm);
    const cTrackSlip = new THREE.Color(HUD_3D_COLORS.trackSlip);
    for (let i = 0; i < maxTrackInstances; i += 1) {
      trackMesh.setMatrixAt(i, trackDummy.matrix);
      trackMesh.setColorAt(i, cTrackFirm);
    }
    trackMesh.instanceMatrix.needsUpdate = true;
    if (trackMesh.instanceColor) trackMesh.instanceColor.needsUpdate = true;
    scene.add(trackMesh);

    // 5 Ground Breadcrumb Direction Chevrons pointing rover toward targetZone
    const crumbCount = 5;
    const crumbGeo = new THREE.ConeGeometry(0.28, 0.6, 4);
    crumbGeo.rotateX(Math.PI / 2);
    const crumbMat = new THREE.MeshBasicMaterial({
      color: HUD_3D_COLORS.safeGreen,
      transparent: true,
      opacity: 0.85,
    });
    const crumbsMesh = new THREE.InstancedMesh(crumbGeo, crumbMat, crumbCount);
    crumbsMesh.frustumCulled = false;
    crumbsMesh.visible = false;
    const crumbDummy = new THREE.Object3D();
    scene.add(crumbsMesh);

    // Wheel-slip regolith plume behind rear wheels
    const slipCount = 18;
    const slipGeo = new THREE.DodecahedronGeometry(0.28, 0);
    const slipMat = new THREE.MeshBasicMaterial({
      color: HUD_3D_COLORS.solarDusty,
      transparent: true,
      opacity: 0.55,
    });
    const slipMesh = new THREE.InstancedMesh(slipGeo, slipMat, slipCount);
    slipMesh.frustumCulled = false;
    const slipPuffs = Array.from({ length: slipCount }, (_, idx) => ({
      phase: idx / slipCount,
      side: idx % 2 === 0 ? -0.95 : 0.95,
    }));
    const slipDummy = new THREE.Object3D();
    slipMesh.visible = false;
    scene.add(slipMesh);

    // Rover Model
    const roverRig = createRoverModel();
    scene.add(roverRig.root);

    // Tether line when docked
    const tetherGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 1, 0),
    ]);
    const tetherLine = new THREE.Line(
      tetherGeo,
      new THREE.LineBasicMaterial({ color: HUD_3D_COLORS.cyan })
    );
    tetherLine.visible = false;
    scene.add(tetherLine);

    // Oriented Wind Streamlines / Dust Ribbons aligned to windDirRad (NW -> SE)
    const particleCount = reducedMotion ? 24 : 160;
    const partGeo = new THREE.BoxGeometry(1.45, 0.035, 0.055);
    const partMat = new THREE.MeshBasicMaterial({
      color: palette.sun,
      transparent: true,
      opacity: 0.48,
    });
    const particles = new THREE.InstancedMesh(partGeo, partMat, particleCount);
    particles.frustumCulled = false;
    const partOffsets = Array.from({ length: particleCount }, () => ({
      x: (Math.random() - 0.5) * 60,
      y: 0.4 + Math.random() * 5.2,
      z: (Math.random() - 0.5) * 60,
    }));
    const dummy = new THREE.Object3D();
    scene.add(particles);

    // Keyboard & Camera Drag State
    const keys = new Set();
    let camYawOffset = 0;
    let camDist = 11.5;
    let dragging = false;
    let lastMouseX = 0;
    let lastAlertCode = null;
    let lastStatus = "playing";

    const onKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) {
        e.preventDefault();
      }
      keys.add(k);
      if (e.repeat) return;
      if (k === "1" || k === " ") {
        dispatchAction("TOGGLE_WINGS");
        soundEngine.playActionClick("servo");
      } else if (k === "2") {
        dispatchAction("TOGGLE_MAST");
        soundEngine.playActionClick("servo");
      } else if (k === "3") {
        dispatchAction("TILT_PANELS");
        soundEngine.playActionClick("servo");
      } else if (k === "4") {
        dispatchAction("SANITIZE_OPTICS");
        soundEngine.playActionClick("purge");
      } else if (k === "5" || k === "e") {
        dispatchAction("COUPLE_DISPATCH");
        soundEngine.playActionClick("dock");
      } else if (k === "c") {
        onToggleCamRef.current?.();
      } else if (k === "f") {
        onToggleFullscreenRef.current?.();
      } else if (k === "r") {
        onRetryRef.current?.();
      } else if (k === "p") {
        togglePauseRuntime();
      } else if (k === "m") {
        onToggleMuteRef.current?.();
      }
    };

    const onKeyUp = (e) => {
      keys.delete(e.key.toLowerCase());
    };

    const onPointerDown = (e) => {
      dragging = true;
      lastMouseX = e.clientX;
    };
    const onPointerMove = (e) => {
      if (!dragging) return;
      camYawOffset += (e.clientX - lastMouseX) * 0.008;
      lastMouseX = e.clientX;
    };
    const onPointerUp = () => {
      dragging = false;
    };
    const onWheel = (e) => {
      camDist = Math.max(7, Math.min(20, camDist + e.deltaY * 0.01));
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    const domEl = renderer.domElement;
    domEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    domEl.addEventListener("wheel", onWheel, { passive: true });

    const ro = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    // Main 60 FPS Render & Sim Loop (pre-allocated vectors/colors for zero GC churn)
    let raf = 0;
    let lastTime = performance.now();
    let elapsedSec = 0;
    const camPos = new THREE.Vector3(0, 8, -14);
    const camTarget = new THREE.Vector3();
    const desiredCamVec = new THREE.Vector3();
    const dustyColor = new THREE.Color(HUD_3D_COLORS.solarDusty);
    const tetherPtA = new THREE.Vector3();
    const tetherPtB = new THREE.Vector3();
    const normVec = new THREE.Vector3();
    const fwdVec = new THREE.Vector3();
    const rightVec = new THREE.Vector3();
    const tangentFwd = new THREE.Vector3();
    const basisMat = new THREE.Matrix4();
    const sunDirVec = new THREE.Vector3();
    let lastTrackX = null;
    let lastTrackZ = null;
    let trackHead = 0;
    let lastSampledDecadesLen = 0;
    let wingAngle = 0;
    let chassisDrop = 0;
    let mastHeight = 1;

    const stampWheelTrack = (instIdx, wx, wz, headingRad, widthScale, trackColor) => {
      const wy = terrainHeight(missionId, wx, wz) + 0.03;
      const n = terrainNormal(missionId, wx, wz);
      normVec.set(n.nx, n.ny, n.nz).normalize();
      fwdVec.set(Math.sin(headingRad), 0, Math.cos(headingRad));
      rightVec.crossVectors(normVec, fwdVec);
      if (rightVec.lengthSq() < 1e-5) rightVec.set(1, 0, 0);
      else rightVec.normalize();
      tangentFwd.crossVectors(rightVec, normVec).normalize();
      basisMat.makeBasis(rightVec, normVec, tangentFwd);
      trackDummy.position.set(wx, wy, wz);
      trackDummy.quaternion.setFromRotationMatrix(basisMat);
      trackDummy.scale.set(widthScale, 1, 1);
      trackDummy.updateMatrix();
      trackMesh.setMatrixAt(instIdx, trackDummy.matrix);
      trackMesh.setColorAt(instIdx, trackColor);
    };

    const animate = (now) => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(0.06, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      elapsedSec += dt;

      const touch = touchInputRef?.current || { throttle: 0, steer: 0 };
      const forwardKey = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
      const steerKey = (keys.has("a") || keys.has("arrowleft") ? 1 : 0) - (keys.has("d") || keys.has("arrowright") ? 1 : 0);

      tickRuntime(
        {
          throttle: Math.max(-1, Math.min(1, forwardKey + touch.throttle)),
          steer: Math.max(-1, Math.min(1, steerKey + touch.steer)),
        },
        dt
      );

      const rt = getRuntime();
      if (!rt) return;

      // Audio cues on urgent transitions
      if (rt.alert.code !== lastAlertCode) {
        if (rt.alert.level === "danger" || rt.alert.level === "warn") {
          soundEngine.playAlertWarning();
        }
        lastAlertCode = rt.alert.code;
      }
      if (rt.status !== lastStatus) {
        if (rt.status === "won") soundEngine.playOutcome(true);
        else if (rt.status === "lost") soundEngine.playOutcome(false);
        lastStatus = rt.status;
      }

      const rv = rt.rover;
      const pt = rt.telemetry.currentPoint;
      const tau = pt?.tau ?? 0.4;
      const wind = pt?.windMs ?? 1.5;

      roverRig.root.position.set(rv.x, rv.y, rv.z);
      roverRig.root.rotation.set(0, rv.heading, 0);
      roverRig.chassisPivot.rotation.set(rv.pitch, 0, rv.roll);

      // Spin 6 grooved wheels proportional to speed + articulate 4-corner steering pivots
      const wheelSpin = rv.speed * dt * 2.4;
      const steerAng = rv.steerAngle || 0;
      for (const wa of roverRig.wheelAssemblies) {
        wa.spinGroup.rotation.x += wheelSpin;
        wa.steerPivot.rotation.y = steerAng * wa.steerDir;
      }

      // Spin mast cup anemometer proportionally to atmospheric wind
      if (rt.planet.rho > 0.001 && roverRig.anemometerGroup) {
        roverRig.anemometerGroup.rotation.y += dt * (1.5 + wind * 2.2);
      }

      // Stamp persistent L/R tire tread marks along terrain normal every ~0.42 m driven
      if (lastTrackX === null || lastTrackZ === null) {
        lastTrackX = rv.x;
        lastTrackZ = rv.z;
      } else if (Math.hypot(rv.x - lastTrackX, rv.z - lastTrackZ) >= 0.42) {
        const highSlip = (rv.wheelSlipPct || 0) >= 30;
        const wScale = highSlip ? 1.42 : 1.0;
        const tColor = highSlip ? cTrackSlip : cTrackFirm;
        const backX = rv.x - Math.sin(rv.heading) * 0.95;
        const backZ = rv.z - Math.cos(rv.heading) * 0.95;
        const sideX = Math.cos(rv.heading) * 1.02;
        const sideZ = -Math.sin(rv.heading) * 1.02;
        stampWheelTrack(trackHead * 2, backX - sideX, backZ - sideZ, rv.heading, wScale, tColor);
        stampWheelTrack(trackHead * 2 + 1, backX + sideX, backZ + sideZ, rv.heading, wScale, tColor);
        trackHead = (trackHead + 1) % maxTrackPairs;
        trackMesh.instanceMatrix.needsUpdate = true;
        if (trackMesh.instanceColor) trackMesh.instanceColor.needsUpdate = true;
        lastTrackX = rv.x;
        lastTrackZ = rv.z;
      }

      // Smooth wing animation: open (0), tilted (0.61), stowed (1.38)
      const targetWing = rv.wingsMode === "stowed" ? 1.38 : rv.wingsMode === "tilted" ? 0.61 : 0;
      wingAngle += (targetWing - wingAngle) * Math.min(1, dt * 8);
      roverRig.leftWingPivot.rotation.z = -wingAngle;
      roverRig.rightWingPivot.rotation.z = wingAngle;

      // Soiling color shift on solar panel wafer texture
      const soilMix = Math.min(1, rt.resources.soiling / 65);
      roverRig.solarMat.color.setHex(0xffffff).lerp(dustyColor, soilMix);

      // Smooth suspension & mast height
      const targetDrop = rv.mastRaised ? 0 : -0.22;
      const targetMast = rv.mastRaised ? 1.0 : 0.32;
      chassisDrop += (targetDrop - chassisDrop) * Math.min(1, dt * 8);
      mastHeight += (targetMast - mastHeight) * Math.min(1, dt * 8);
      roverRig.chassisPivot.position.y = chassisDrop;
      roverRig.mastGroup.scale.y = mastHeight;

      // Rover status ring color
      const ringColorHex =
        rv.sanitizePulseSec > 0
          ? HUD_3D_COLORS.purple
          : rt.alert.level === "danger"
          ? HUD_3D_COLORS.dangerRed
          : rt.alert.level === "warn"
          ? HUD_3D_COLORS.warnAmber
          : rt.alert.level === "success"
          ? HUD_3D_COLORS.safeGreen
          : HUD_3D_COLORS.cyan;
      roverRig.statusRingMat.color.setHex(ringColorHex);

      // Overhead floating target compass arrow + 5 ground breadcrumb chevrons
      const targetZone = zones.find((z) => z.id === rt.alert.targetZoneId);
      if (targetZone) {
        roverRig.navArrowPivot.visible = true;
        const dx = targetZone.x - rv.x;
        const dz = targetZone.z - rv.z;
        const dist = Math.hypot(dx, dz);
        const worldAngle = Math.atan2(dx, dz);
        roverRig.navArrowPivot.rotation.y = worldAngle - rv.heading;
        roverRig.navArrowPivot.position.y = 2.62 + Math.sin(now * 0.005) * 0.08;

        if (dist > 4.2) {
          crumbsMesh.visible = true;
          const minD = 2.8;
          const maxD = Math.min(13.0, dist - 1.5);
          for (let c = 0; c < crumbCount; c += 1) {
            const frac = crumbCount > 1 ? c / (crumbCount - 1) : 0;
            const dStep = minD + frac * Math.max(0.5, maxD - minD);
            const cx = rv.x + (dx / dist) * dStep;
            const cz = rv.z + (dz / dist) * dStep;
            const cy = terrainHeight(missionId, cx, cz) + 0.24;
            crumbDummy.position.set(cx, cy, cz);
            crumbDummy.rotation.set(0, worldAngle, 0);
            const pulseS = 0.92 + 0.18 * Math.sin(now * 0.006 - c * 0.9);
            crumbDummy.scale.setScalar(pulseS);
            crumbDummy.updateMatrix();
            crumbsMesh.setMatrixAt(c, crumbDummy.matrix);
          }
          crumbsMesh.instanceMatrix.needsUpdate = true;
        } else {
          crumbsMesh.visible = false;
        }
      } else {
        roverRig.navArrowPivot.visible = false;
        crumbsMesh.visible = false;
      }

      // Tether line when docked at BESS/Greenhouse
      if (rv.tethered && rv.tetherZoneId) {
        const dz = zones.find((z) => z.id === rv.tetherZoneId);
        if (dz) {
          tetherLine.visible = true;
          const zy = terrainHeight(missionId, dz.x, dz.z);
          tetherPtA.set(rv.x, rv.y + 1.0, rv.z);
          tetherPtB.set(dz.x, zy + 1.4, dz.z);
          tetherGeo.setFromPoints([tetherPtA, tetherPtB]);
        }
      } else {
        tetherLine.visible = false;
      }

      // Pulse zone beacons & highlight active M4 sampled poles
      const pulse = Math.sin(now * 0.004) * 0.25;
      for (const zg of zoneGroups) {
        const zid = zg.userData.zoneId;
        if (missionId === "M4" && rt.progress.sampledDecades.includes(zid)) {
          zg.userData.ringMat.color.setHex(HUD_3D_COLORS.safeGreen);
        }
        for (const ch of zg.children) {
          if (ch.userData.pulse) {
            ch.rotation.y += dt * 1.6;
            ch.position.y += pulse * 0.015;
          }
        }
      }

      // Dynamic Sun, Rover-Tracking Shadow Frustum, Sky Backdrop & Fog
      const dayFrac = rt.tickIndex / Math.max(1, rt.timeline.length - 1);
      const sunAngle = 0.25 + dayFrac * 2.6;
      sunDirVec.set(Math.cos(sunAngle) * 34, 14 + Math.sin(sunAngle) * 32, 18);
      sun.position.set(rv.x + sunDirVec.x, sunDirVec.y, rv.z + sunDirVec.z);
      sun.target.position.set(rv.x, rv.y, rv.z);
      sun.target.updateMatrixWorld();
      backdrop.update(elapsedSec, sunDirVec);

      if (missionId === "M5") {
        sun.intensity = Math.max(0.35, (pt?.primaryVal ?? 60) / 55);
      }
      scene.fog.density =
        planetId === "moon_artemis"
          ? 0.0018 + Math.min(0.015, tau * 0.005)
          : 0.004 + Math.min(0.052, tau * 0.013);

      // Stream directional wind ribbons along windDirRad (NW -> SE) with shelter attenuation
      const windDirRad = rv.windDirRad ?? Math.PI * 0.25;
      const wx = Math.cos(windDirRad);
      const wz = Math.sin(windDirRad);
      const particleSpeed = rt.planet.rho > 0.001 ? 4.2 + wind * 5.6 : 0.35;
      for (let i = 0; i < particleCount; i += 1) {
        const p = partOffsets[i];
        p.x += wx * particleSpeed * dt;
        p.z += wz * particleSpeed * dt;
        if (p.x > 30) p.x -= 60;
        else if (p.x < -30) p.x += 60;
        if (p.z > 30) p.z -= 60;
        else if (p.z < -30) p.z += 60;

        const px = rv.x + p.x;
        const pz = rv.z + p.z;
        const sheltered =
          rt.planet.rho > 0.001 &&
          findZonesAt(missionId, px, pz).some((z) => z.kind === "shelter" || z.kind === "crater_safe");
        const calmMult = sheltered ? 0.35 : 1.0;

        dummy.position.set(px, rv.y + p.y, pz);
        dummy.rotation.set(0, -windDirRad, 0);
        dummy.scale.set((0.8 + wind * 0.28) * calmMult, calmMult, calmMult);
        dummy.updateMatrix();
        particles.setMatrixAt(i, dummy.matrix);
      }
      particles.instanceMatrix.needsUpdate = true;
      partMat.opacity = rt.planet.rho > 0.001 ? Math.min(0.75, 0.16 + tau * 0.22) : 0.07;

      // Active wheel-slip eolian regolith plume behind rear wheels
      if (Math.abs(rv.speed) > 0.3 && (rv.wheelSlipPct || 0) >= 30) {
        slipMesh.visible = true;
        for (let i = 0; i < slipCount; i += 1) {
          const sp = slipPuffs[i];
          sp.phase = (sp.phase + dt * 1.45) % 1;
          const backDist = 1.25 + sp.phase * 2.4;
          const worldX = rv.x - Math.sin(rv.heading) * backDist + Math.cos(rv.heading) * sp.side;
          const worldZ = rv.z - Math.cos(rv.heading) * backDist - Math.sin(rv.heading) * sp.side;
          slipDummy.position.set(worldX, rv.y + 0.25 + sp.phase * 0.9, worldZ);
          slipDummy.scale.setScalar((1 - sp.phase * 0.6) * 0.95);
          slipDummy.updateMatrix();
          slipMesh.setMatrixAt(i, slipDummy.matrix);
        }
        slipMesh.instanceMatrix.needsUpdate = true;
      } else {
        slipMesh.visible = false;
      }

      // M4 dynamic decade biome color warming across sampled poles (dirty-flagged)
      if (missionId === "M4") {
        const curSampledLen = rt.progress.sampledDecades?.length || 0;
        if (curSampledLen !== lastSampledDecadesLen) {
          lastSampledDecadesLen = curSampledLen;
          const decFrac = Math.min(1, curSampledLen / 3);
          const colAttr = terrainGeo.attributes.color;
          if (colAttr) {
            const warmShift = decFrac * 0.14;
            for (let i = 0; i < posAttr.count; i += 1) {
              colAttr.array[i * 3] = Math.min(1, baseTerrainColors[i * 3] + warmShift);
              colAttr.array[i * 3 + 1] = Math.max(0, baseTerrainColors[i * 3 + 1] - warmShift * 0.25);
              colAttr.array[i * 3 + 2] = baseTerrainColors[i * 3 + 2];
            }
            colAttr.needsUpdate = true;
          }
        }
      }

      // Smooth 3rd-person chase vs. overhead tactical survey camera
      const camYaw = camModeRef.current === "survey" ? 0 : rv.heading + camYawOffset;
      const distHoriz = camModeRef.current === "survey" ? 15 : camDist;
      const desiredX = rv.x - Math.sin(camYaw) * distHoriz;
      const desiredZ = rv.z - Math.cos(camYaw) * distHoriz;
      const groundUnderCam = terrainHeight(missionId, desiredX, desiredZ);
      const desiredY =
        camModeRef.current === "survey"
          ? Math.max(rv.y + 24, groundUnderCam + 22)
          : Math.max(rv.y + 3.6, groundUnderCam + 2.3);
      desiredCamVec.set(desiredX, desiredY, desiredZ);
      camPos.lerp(desiredCamVec, Math.min(1, dt * 6.5));
      camera.position.copy(camPos);
      camTarget.set(rv.x, rv.y + (camModeRef.current === "survey" ? 0.4 : 2.05), rv.z);
      camera.lookAt(camTarget);

      // Continuous live acoustic telemetry feedback (Ocarina tempo/pitch + wind + distance sonar + wheel slip)
      if (rt.timeline && rt.timeline.length > 0) {
        let minP = Infinity;
        let maxP = -Infinity;
        for (let t = 0; t < rt.timeline.length; t += 1) {
          const v = rt.timeline[t].primaryVal;
          if (Number.isFinite(v)) {
            if (v < minP) minP = v;
            if (v > maxP) maxP = v;
          }
        }
        const spanP = Math.max(1e-5, maxP - minP);
        const currVal = Number.isFinite(pt?.primaryVal) ? pt.primaryVal : minP;
        const normVal = Math.max(0, Math.min(1, (currVal - minP) / spanP));
        const inSafeZone = findZonesAt(missionId, rv.x, rv.z).some(
          (z) => z.kind === "shelter" || z.kind === "crater_safe"
        );
        const distToGoal = targetZone ? Math.hypot(targetZone.x - rv.x, targetZone.z - rv.z) : 75;
        soundEngine.updateGameplayAudio({
          normVal,
          nearThreshold:
            rt.alert.level === "danger" || rt.alert.level === "warn" || Boolean(rt.telemetry.sentinelPending),
          windMs: wind,
          rho: rt.planet.rho,
          sheltered: inSafeZone,
          targetDist: distToGoal,
          speed: rv.effectiveSpeed ?? rv.speed,
          slipPct: rv.wheelSlipPct || 0,
          paused: rt.paused,
          status: rt.status,
        });
      }

      renderer.render(scene, camera);
    };

    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      soundEngine.stopAllLoops();
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      domEl.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      domEl.removeEventListener("wheel", onWheel);
      backdrop.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
      renderer.dispose();
    };
  }, [missionId, planetId, lang, reducedMotion, touchInputRef]);

  if (webglError) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
        <h3>WebGL2 unavailable in this browser</h3>
        <p style={{ color: "var(--ink-soft)", marginTop: "0.4rem" }}>
          Enable hardware acceleration to launch the 3D Rover Viewport, or explore Academy &amp; Cockpit.
        </p>
      </div>
    );
  }

  return <div ref={hostRef} className="viewport-canvas-host" />;
}

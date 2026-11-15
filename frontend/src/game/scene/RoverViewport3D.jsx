import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { BIOME_PALETTES, HUD_3D_COLORS } from "./themePalette";
import { terrainHeight, getMissionZones } from "../sim/terrainField";
import { dispatchAction, getRuntime, tickRuntime, togglePauseRuntime } from "../store";
import { soundEngine } from "../soundEngine";

function createZoneMesh(zone, palette, missionId) {
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
      // Protective boulder formation on windward edge
      const rockMat = new THREE.MeshStandardMaterial({ color: palette.rock, roughness: 0.92, flatShading: true });
      const b1 = new THREE.Mesh(new THREE.DodecahedronGeometry(3.4, 0), rockMat);
      b1.position.set(-2.5, 2.1, -1.8);
      b1.scale.set(1.2, 1.3, 1.0);
      b1.castShadow = true;
      const b2 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.3, 0), rockMat);
      b2.position.set(1.8, 1.4, -2.5);
      b2.castShadow = true;
      group.add(b1, b2);
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
      group.add(pylon);
    }
  }

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
    roughness: 0.4,
    metalness: 0.3,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: HUD_3D_COLORS.roverGold,
    roughness: 0.35,
    metalness: 0.65,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: HUD_3D_COLORS.roverWheel,
    roughness: 0.85,
  });
  const solarMat = new THREE.MeshStandardMaterial({
    color: HUD_3D_COLORS.solarBlue,
    roughness: 0.28,
    metalness: 0.55,
  });

  // Main warm electronics box
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.72, 2.5), bodyMat);
  body.position.y = 0.82;
  body.castShadow = true;
  chassisPivot.add(body);

  // Gold RTG / battery deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.25, 1.1), goldMat);
  deck.position.set(0, 1.24, -0.45);
  deck.castShadow = true;
  chassisPivot.add(deck);

  // 6 Rocker-bogie wheels
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.32, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheels = [];
  for (const sx of [-1.05, 1.05]) {
    for (const sz of [-1.05, 0, 1.05]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(sx, 0.38, sz);
      w.castShadow = true;
      root.add(w);
      wheels.push(w);
    }
  }

  // Left & Right articulated solar wings
  const wingGeo = new THREE.BoxGeometry(1.85, 0.08, 1.35);
  const leftWingPivot = new THREE.Group();
  leftWingPivot.position.set(-0.88, 1.15, 0.15);
  const leftWing = new THREE.Mesh(wingGeo, solarMat);
  leftWing.position.set(-0.95, 0, 0);
  leftWing.castShadow = true;
  leftWingPivot.add(leftWing);
  chassisPivot.add(leftWingPivot);

  const rightWingPivot = new THREE.Group();
  rightWingPivot.position.set(0.88, 1.15, 0.15);
  const rightWing = new THREE.Mesh(wingGeo, solarMat);
  rightWing.position.set(0.95, 0, 0);
  rightWing.castShadow = true;
  rightWingPivot.add(rightWing);
  chassisPivot.add(rightWingPivot);

  // Telescoping mast + NavCam head + Anemometer
  const mastGroup = new THREE.Group();
  mastGroup.position.set(0.28, 1.2, 0.85);
  const mastPole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.45, 10), bodyMat);
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
  mastGroup.add(mastPole, camHead, lens);
  chassisPivot.add(mastGroup);

  // Status ring & directional guide arrow on ground
  const statusRingMat = new THREE.MeshBasicMaterial({
    color: HUD_3D_COLORS.cyan,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
  });
  const statusRing = new THREE.Mesh(new THREE.RingGeometry(1.75, 2.02, 32), statusRingMat);
  statusRing.rotation.x = -Math.PI / 2;
  statusRing.position.y = 0.12;
  root.add(statusRing);

  const navArrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 0.9, 6),
    new THREE.MeshBasicMaterial({ color: HUD_3D_COLORS.safeGreen })
  );
  navArrow.rotation.x = Math.PI / 2;
  navArrow.position.set(0, 0.4, 2.55);
  const navArrowPivot = new THREE.Group();
  navArrowPivot.add(navArrow);
  root.add(navArrowPivot);

  return {
    root,
    chassisPivot,
    wheels,
    leftWingPivot,
    rightWingPivot,
    mastGroup,
    solarMat,
    statusRingMat,
    navArrowPivot,
  };
}

export default function RoverViewport3D({ missionId, planetId, touchInputRef, reducedMotion = false }) {
  const hostRef = useRef(null);
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
    scene.fog = new THREE.FogExp2(palette.fog, 0.009);

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 420;
    const camera = new THREE.PerspectiveCamera(54, width / height, 0.2, 260);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Lighting
    const hemi = new THREE.HemisphereLight(palette.sun, palette.groundLow, 0.85);
    scene.add(hemi);
    const ambient = new THREE.AmbientLight(palette.ambient, 0.45);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(palette.sun, 1.65);
    sun.position.set(28, 36, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 4;
    sun.shadow.camera.far = 120;
    sun.shadow.camera.left = -45;
    sun.shadow.camera.right = 45;
    sun.shadow.camera.top = 45;
    sun.shadow.camera.bottom = -45;
    scene.add(sun);

    // Heightfield Terrain Mesh
    const segs = 88;
    const size = 104;
    const terrainGeo = new THREE.PlaneGeometry(size, size, segs, segs);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);
    const colLow = new THREE.Color(palette.groundLow);
    const colHigh = new THREE.Color(palette.groundHigh);
    const tmpColor = new THREE.Color();

    for (let i = 0; i < posAttr.count; i += 1) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const vy = terrainHeight(missionId, vx, vz);
      posAttr.setY(i, vy);
      const t = Math.max(0, Math.min(1, (vy + 4) / 8.5));
      tmpColor.copy(colLow).lerp(colHigh, t);
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }
    terrainGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.04,
      flatShading: true,
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
    const zones = getMissionZones(missionId);
    const zoneGroups = zones.map((z) => {
      const g = createZoneMesh(z, palette, missionId);
      scene.add(g);
      return g;
    });

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

    // Instanced Dust / Wind Particles
    const particleCount = reducedMotion ? 24 : 160;
    const partGeo = new THREE.BoxGeometry(0.18, 0.06, 0.55);
    const partMat = new THREE.MeshBasicMaterial({
      color: palette.sun,
      transparent: true,
      opacity: 0.45,
    });
    const particles = new THREE.InstancedMesh(partGeo, partMat, particleCount);
    const partOffsets = Array.from({ length: particleCount }, () => ({
      x: (Math.random() - 0.5) * 60,
      y: 0.4 + Math.random() * 5.5,
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
      } else if (k === "p") {
        togglePauseRuntime();
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

    // Main 60 FPS Render & Sim Loop
    let raf = 0;
    let lastTime = performance.now();
    const camPos = new THREE.Vector3(0, 8, -14);
    const camTarget = new THREE.Vector3();
    let wingAngle = 0;
    let chassisDrop = 0;
    let mastHeight = 1;

    const animate = (now) => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(0.06, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

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
      roverRig.root.position.set(rv.x, rv.y, rv.z);
      roverRig.root.rotation.set(0, rv.heading, 0);
      roverRig.chassisPivot.rotation.set(rv.pitch, 0, rv.roll);

      // Spin 6 wheels proportional to speed
      const wheelSpin = rv.speed * dt * 2.4;
      for (const w of roverRig.wheels) {
        w.rotation.x += wheelSpin;
      }

      // Smooth wing animation: open (0), tilted (0.61), stowed (1.38)
      const targetWing = rv.wingsMode === "stowed" ? 1.38 : rv.wingsMode === "tilted" ? 0.61 : 0;
      wingAngle += (targetWing - wingAngle) * Math.min(1, dt * 8);
      roverRig.leftWingPivot.rotation.z = -wingAngle;
      roverRig.rightWingPivot.rotation.z = wingAngle;

      // Soiling color shift on solar panels
      const soilMix = Math.min(1, rt.resources.soiling / 65);
      roverRig.solarMat.color
        .setHex(HUD_3D_COLORS.solarBlue)
        .lerp(new THREE.Color(HUD_3D_COLORS.solarDusty), soilMix);

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

      // Directional guide arrow pointing to active targetZoneId
      const targetZone = zones.find((z) => z.id === rt.alert.targetZoneId);
      if (targetZone) {
        roverRig.navArrowPivot.visible = true;
        const worldAngle = Math.atan2(targetZone.x - rv.x, targetZone.z - rv.z);
        roverRig.navArrowPivot.rotation.y = worldAngle - rv.heading;
      } else {
        roverRig.navArrowPivot.visible = false;
      }

      // Tether line when docked at BESS/Greenhouse
      if (rv.tethered && rv.tetherZoneId) {
        const dz = zones.find((z) => z.id === rv.tetherZoneId);
        if (dz) {
          tetherLine.visible = true;
          const zy = terrainHeight(missionId, dz.x, dz.z);
          tetherGeo.setFromPoints([
            new THREE.Vector3(rv.x, rv.y + 1.0, rv.z),
            new THREE.Vector3(dz.x, zy + 1.4, dz.z),
          ]);
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

      // Dynamic Sun & Fog driven by real telemetry tick!
      const pt = rt.telemetry.currentPoint;
      const tau = pt?.tau ?? 0.4;
      const wind = pt?.windMs ?? 1.5;
      const dayFrac = rt.tickIndex / Math.max(1, rt.timeline.length - 1);
      const sunAngle = 0.25 + dayFrac * 2.6;
      sun.position.set(Math.cos(sunAngle) * 38, 12 + Math.sin(sunAngle) * 34, 18);
      if (missionId === "M5") {
        sun.intensity = Math.max(0.35, (pt?.primaryVal ?? 60) / 55);
      }
      scene.fog.density = 0.004 + Math.min(0.052, tau * 0.013);

      // Stream wind/dust particles scaled by planetary rho & wind speed
      const particleSpeed = rt.planet.rho > 0.001 ? 3.5 + wind * 5.2 : 0.4;
      for (let i = 0; i < particleCount; i += 1) {
        const p = partOffsets[i];
        p.x += particleSpeed * dt;
        if (p.x > 30) p.x = -30;
        dummy.position.set(rv.x + p.x, rv.y + p.y, rv.z + p.z);
        dummy.scale.set(1 + wind * 0.35, 1, 1);
        dummy.updateMatrix();
        particles.setMatrixAt(i, dummy.matrix);
      }
      particles.instanceMatrix.needsUpdate = true;
      partMat.opacity = rt.planet.rho > 0.001 ? Math.min(0.75, 0.16 + tau * 0.22) : 0.08;

      // Smooth 3rd-person chase camera behind rover heading
      const camYaw = rv.heading + camYawOffset;
      const desiredX = rv.x - Math.sin(camYaw) * camDist;
      const desiredZ = rv.z - Math.cos(camYaw) * camDist;
      const groundUnderCam = terrainHeight(missionId, desiredX, desiredZ);
      const desiredY = Math.max(rv.y + 5.2, groundUnderCam + 3.2);
      camPos.lerp(new THREE.Vector3(desiredX, desiredY, desiredZ), Math.min(1, dt * 6.5));
      camera.position.copy(camPos);
      camTarget.set(rv.x, rv.y + 1.35, rv.z);
      camera.lookAt(camTarget);

      renderer.render(scene, camera);
    };

    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      domEl.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      domEl.removeEventListener("wheel", onWheel);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [missionId, planetId, reducedMotion, touchInputRef]);

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

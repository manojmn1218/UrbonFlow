import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCcw, Layers, Navigation, Radio, Compass, Zap, Info } from 'lucide-react';
import { SENSORS, TRAFFIC_ROUTES } from '../data/trafficData';

export default function City3DVisualization({ selectedSensor, onSelectSensor, activeHorizon = '15m' }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const animationFrameId = useRef(null);
  const particlesRef = useRef([]);
  const pulseRingsRef = useRef([]);
  const sensorMeshesRef = useRef([]);

  const [isRotating, setIsRotating] = useState(true);
  const [wireframeMode, setWireframeMode] = useState(false);
  const [viewAngle, setViewAngle] = useState('isometric');
  const [hoveredSensor, setHoveredSensor] = useState(null);

  const currentSensor = SENSORS.find(s => s.id === selectedSensor) || SENSORS[0];

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 520;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf8fafc);
    scene.fog = new THREE.FogExp2(0xf8fafc, 0.0075);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    cameraRef.current = camera;
    camera.position.set(70, 65, 80);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(60, 100, 40);
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const blueFill = new THREE.DirectionalLight(0x3b82f6, 0.35);
    blueFill.position.set(-50, 40, -50);
    scene.add(blueFill);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 160, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.9, metalness: 0.1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(160, 40, 0xcbd5e1, 0xe2e8f0);
    gridHelper.position.y = 0.05;
    scene.add(gridHelper);

    const bay = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 24),
      new THREE.MeshStandardMaterial({ color: 0xbfdbfe, roughness: 0.3, metalness: 0.4 })
    );
    bay.rotation.x = -Math.PI / 2;
    bay.position.set(0, 0.1, -55);
    scene.add(bay);

    for (let bx = -40; bx <= 40; bx += 20) {
      const pier = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.2, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
      );
      pier.position.set(bx, 3, -55);
      pier.castShadow = true;
      scene.add(pier);
    }

    const buildingGroup = new THREE.Group();
    buildingGroup.name = "buildings";
    scene.add(buildingGroup);

    const cityBlocks = [
      { cx: 0, cz: 0, count: 20, maxH: 26, minH: 12 },
      { cx: 20, cz: -15, count: 14, maxH: 22, minH: 8 },
      { cx: -25, cz: -10, count: 15, maxH: 18, minH: 6 },
      { cx: 35, cz: 25, count: 12, maxH: 14, minH: 6 },
      { cx: -35, cz: 25, count: 12, maxH: 12, minH: 4 },
      { cx: 0, cz: 40, count: 16, maxH: 10, minH: 4 },
    ];

    const buildingMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4, metalness: 0.15 }),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3, metalness: 0.2 }),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5, metalness: 0.1 }),
    ];

    cityBlocks.forEach((block) => {
      for (let i = 0; i < block.count; i++) {
        const h = Math.random() * (block.maxH - block.minH) + block.minH;
        const w = Math.random() * 4 + 3.5;
        const d = Math.random() * 4 + 3.5;
        const x = block.cx + (Math.random() - 0.5) * 28;
        const z = block.cz + (Math.random() - 0.5) * 28;

        if (Math.abs(x) < 4 || Math.abs(z) < 4 || (Math.abs(x - z) < 3)) continue;

        const building = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          buildingMaterials[Math.floor(Math.random() * buildingMaterials.length)]
        );
        building.position.set(x, h / 2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        buildingGroup.add(building);

        if (h > 18) {
          const antenna = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.3, 4, 6),
            new THREE.MeshStandardMaterial({ color: 0x3b82f6 })
          );
          antenna.position.set(x, h + 2, z);
          buildingGroup.add(antenna);
        }
      }
    });

    const routesGroup = new THREE.Group();
    routesGroup.name = "routes";
    scene.add(routesGroup);

    const particles = [];
    particlesRef.current = particles;

    const routeSpecs = [
      {
        id: "RT-01",
        color: 0xef4444,
        points: [
          new THREE.Vector3(-45, 0.6, -20),
          new THREE.Vector3(-20, 0.6, -10),
          new THREE.Vector3(0, 0.6, 5),
          new THREE.Vector3(25, 0.6, 25),
          new THREE.Vector3(45, 0.6, 40),
        ],
        particleSpeed: 0.0015,
        particleCount: 16,
      },
      {
        id: "RT-02",
        color: 0xf97316,
        points: [
          new THREE.Vector3(-55, 0.6, 35),
          new THREE.Vector3(-25, 0.6, 18),
          new THREE.Vector3(10, 0.6, 12),
          new THREE.Vector3(40, 0.6, 5),
        ],
        particleSpeed: 0.003,
        particleCount: 14,
      },
      {
        id: "RT-03",
        color: 0xf59e0b,
        points: [
          new THREE.Vector3(-40, 0.6, -45),
          new THREE.Vector3(-40, 0.6, 0),
          new THREE.Vector3(-35, 0.6, 40),
          new THREE.Vector3(5, 0.6, 45),
        ],
        particleSpeed: 0.005,
        particleCount: 18,
      },
      {
        id: "RT-04",
        color: 0x10b981,
        points: [
          new THREE.Vector3(-20, 0.6, -55),
          new THREE.Vector3(15, 0.6, -30),
          new THREE.Vector3(45, 0.6, -10),
          new THREE.Vector3(65, 0.6, 20),
        ],
        particleSpeed: 0.0085,
        particleCount: 22,
      },
    ];

    routeSpecs.forEach((spec) => {
      const curve = new THREE.CatmullRomCurve3(spec.points);
      const points = curve.getPoints(80);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      const roadLine = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x334155, linewidth: 4 }));
      routesGroup.add(roadLine);

      const trafficLine = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: spec.color, linewidth: 3, transparent: true, opacity: 0.9 }));
      trafficLine.position.y += 0.2;
      routesGroup.add(trafficLine);

      const particleGeo = new THREE.SphereGeometry(0.55, 8, 8);
      const particleMat = new THREE.MeshBasicMaterial({ color: spec.color });

      for (let i = 0; i < spec.particleCount; i++) {
        const pMesh = new THREE.Mesh(particleGeo, particleMat);
        routesGroup.add(pMesh);
        particles.push({
          mesh: pMesh,
          curve,
          progress: i / spec.particleCount,
          speed: spec.particleSpeed,
        });
      }
    });

    const sensorGroup = new THREE.Group();
    sensorGroup.name = "sensors";
    scene.add(sensorGroup);

    const pulseRings = [];
    pulseRingsRef.current = pulseRings;
    const sensorMeshes = [];
    sensorMeshesRef.current = sensorMeshes;

    const sensorCoordsMap = {
      "SN-402": { x: 0, z: 5, color: 0xef4444 },
      "SN-118": { x: -25, z: 18, color: 0xf97316 },
      "SN-883": { x: 45, z: -10, color: 0x10b981 },
      "SN-520": { x: -38, z: 10, color: 0xf59e0b },
      "SN-312": { x: 60, z: 15, color: 0x10b981 },
      "SN-671": { x: -10, z: -35, color: 0xef4444 },
    };

    SENSORS.forEach((sensor) => {
      const coords = sensorCoordsMap[sensor.id] || { x: 10, z: 10, color: 0x3b82f6 };

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 5, 8),
        new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 })
      );
      stem.position.set(coords.x, 2.5, coords.z);
      sensorGroup.add(stem);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 16, 16),
        new THREE.MeshStandardMaterial({ color: coords.color, emissive: coords.color, emissiveIntensity: 0.6, roughness: 0.2 })
      );
      head.position.set(coords.x, 5.2, coords.z);
      head.userData = { sensorId: sensor.id, name: sensor.name, speed: sensor.speed, color: coords.color };
      sensorGroup.add(head);
      sensorMeshes.push(head);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 3.2, 24),
        new THREE.MeshBasicMaterial({ color: coords.color, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(coords.x, 0.2, coords.z);
      sensorGroup.add(ring);

      pulseRings.push({
        mesh: ring,
        scale: 1,
        opacity: 0.7,
        speed: 0.02 + Math.random() * 0.01,
      });
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(sensorMeshesRef.current);
      if (intersects.length > 0) {
        setHoveredSensor(intersects[0].object.userData);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredSensor(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const handlePointerDown = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(sensorMeshesRef.current);
      if (intersects.length > 0 && intersects[0].object.userData.sensorId && onSelectSensor) {
        onSelectSensor(intersects[0].object.userData.sensorId);
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraAngle = 0.8;
    let cameraRadius = 110;
    let cameraHeight = 65;

    const onMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
      cameraAngle -= deltaX * 0.008;
      cameraHeight = Math.max(25, Math.min(100, cameraHeight - deltaY * 0.4));
      camera.position.x = Math.sin(cameraAngle) * cameraRadius;
      camera.position.z = Math.cos(cameraAngle) * cameraRadius;
      camera.position.y = cameraHeight;
      camera.lookAt(0, 0, 0);
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e) => {
      e.preventDefault();
      cameraRadius = Math.max(45, Math.min(160, cameraRadius + e.deltaY * 0.08));
      camera.position.x = Math.sin(cameraAngle) * cameraRadius;
      camera.position.z = Math.cos(cameraAngle) * cameraRadius;
      camera.lookAt(0, 0, 0);
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    let angle = 0.8;
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);

      if (isRotating && !isDragging) {
        angle += 0.002;
        cameraAngle = angle;
        camera.position.x = Math.sin(angle) * cameraRadius;
        camera.position.z = Math.cos(angle) * cameraRadius;
        camera.position.y = cameraHeight;
        camera.lookAt(0, 0, 0);
      }

      particlesRef.current.forEach((p) => {
        p.progress = (p.progress + p.speed) % 1;
        const pos = p.curve.getPointAt(p.progress);
        p.mesh.position.set(pos.x, pos.y + 0.35, pos.z);
      });

      pulseRingsRef.current.forEach((r) => {
        r.scale += r.speed;
        r.opacity -= r.speed * 0.4;
        if (r.scale > 2.8) {
          r.scale = 0.8;
          r.opacity = 0.7;
        }
        r.mesh.scale.set(r.scale, r.scale, 1);
        r.mesh.material.opacity = Math.max(0, r.opacity);
      });

      sensorMeshesRef.current.forEach((mesh) => {
        if (mesh.userData.sensorId === selectedSensor) {
          mesh.position.y = 5.2 + Math.sin(Date.now() * 0.005) * 0.6;
          mesh.scale.set(1.4, 1.4, 1.4);
        } else {
          mesh.scale.set(1.0, 1.0, 1.0);
          mesh.position.y = 5.2;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight || 520;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('pointermove', handlePointerMove);
        renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
        renderer.domElement.removeEventListener('mousedown', onMouseDown);
        renderer.domElement.removeEventListener('wheel', onWheel);
      }
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      renderer.dispose();
    };
  }, [isRotating, selectedSensor]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const buildingGroup = sceneRef.current.getObjectByName("buildings");
    if (buildingGroup) {
      buildingGroup.children.forEach((child) => {
        if (child.material) child.material.wireframe = wireframeMode;
      });
    }
  }, [wireframeMode]);

  const handleCameraPreset = (preset) => {
    if (!cameraRef.current) return;
    setIsRotating(false);
    setViewAngle(preset);
    if (preset === 'top') {
      cameraRef.current.position.set(0, 130, 0.1);
    } else if (preset === 'downtown') {
      cameraRef.current.position.set(20, 35, 30);
    } else {
      cameraRef.current.position.set(70, 65, 80);
    }
    cameraRef.current.lookAt(0, 0, 0);
  };

  return (
    <div className="relative w-full h-[380px] sm:h-[420px] lg:h-[460px] rounded-2xl overflow-hidden bg-slate-900/5 border border-slate-200/80 shadow-premium group">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing select-none" />

      {/* FLOATING 1: Telemetry */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="glass-floating px-3.5 py-1.5 rounded-xl pointer-events-auto flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-slate-800 tracking-wide uppercase">3D Digital Twin</span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono font-medium border border-blue-200">
            60 FPS LIVE
          </span>
        </div>
        <div className="glass-floating px-3 py-1.5 rounded-xl pointer-events-auto hidden sm:flex items-center gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>1,284 Beacons</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-indigo-600" />
            <span>Rotatable 360°</span>
          </div>
        </div>
      </div>

      {/* FLOATING 2: Legend */}
      <div className="absolute top-4 right-4 z-20 pointer-events-auto">
        <div className="glass-floating p-3 rounded-xl max-w-[240px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Congestion Legend</span>
            <span className="text-[10px] text-slate-400 font-mono">FLOW LEVEL</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></span>
                <span className="text-slate-700 font-medium">Free Flow</span>
              </div>
              <span className="font-mono text-emerald-700 font-semibold">&gt; 55 km/h</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm"></span>
                <span className="text-slate-700 font-medium">Moderate</span>
              </div>
              <span className="font-mono text-amber-700 font-semibold">35-55 km/h</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500 shadow-sm"></span>
                <span className="text-slate-700 font-medium">Heavy Traffic</span>
              </div>
              <span className="font-mono text-orange-700 font-semibold">20-35 km/h</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm animate-pulse"></span>
                <span className="text-slate-700 font-medium">Severe / Standstill</span>
              </div>
              <span className="font-mono text-red-700 font-semibold">&lt; 20 km/h</span>
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING 3: Corridors List */}
      <div className="absolute left-4 top-20 z-20 hidden md:block max-w-[270px]">
        <div className="glass-floating p-3.5 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-blue-600" />
              Active Corridors
            </h4>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">4 Monitored</span>
          </div>
          <div className="space-y-2">
            {TRAFFIC_ROUTES.map((route) => (
              <div
                key={route.id}
                className={`p-2 rounded-lg border transition-all text-xs ${
                  route.status === 'Severe' ? 'bg-red-50/70 border-red-200' :
                  route.status === 'Heavy' ? 'bg-orange-50/70 border-orange-200' :
                  route.status === 'Moderate' ? 'bg-amber-50/70 border-amber-200' : 'bg-emerald-50/70 border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="truncate text-slate-800">{route.name.split(':')[0]}</span>
                  <span className={`font-mono text-[11px] px-1.5 py-0.2 rounded font-bold ${route.textClass}`}>
                    {route.speed} km/h
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                  <span>Delay: {route.delay}</span>
                  <span className="font-mono">{route.congestion}% congestion</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FLOATING 4: Selected Sensor Inspector */}
      <div className="absolute bottom-16 right-4 z-20 max-w-[310px] w-full">
        <div className="glass-floating p-4 rounded-xl border border-slate-200 shadow-float">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                  {currentSensor.id}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  currentSensor.congestion > 75 ? 'bg-red-100 text-red-800' :
                  currentSensor.congestion > 50 ? 'bg-orange-100 text-orange-800' :
                  currentSensor.congestion > 25 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {currentSensor.level}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-1">{currentSensor.name}</h3>
              <p className="text-xs text-slate-500">{currentSensor.zone}</p>
            </div>
            <button
              onClick={() => onSelectSensor && onSelectSensor(currentSensor.id)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              title="Sensor Details"
            >
              <Info className="w-4 h-4 text-blue-600" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 p-2 rounded-lg">
              <span className="text-[10px] text-slate-400 block font-medium">CURRENT SPEED</span>
              <span className="text-sm font-bold font-mono text-slate-800">{currentSensor.speed} km/h</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Limit: {currentSensor.speedLimit} km/h</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg">
              <span className="text-[10px] text-slate-400 block font-medium">FLOW DENSITY</span>
              <span className="text-sm font-bold font-mono text-slate-800">{currentSensor.flowRate}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Vehicles / Hour</span>
            </div>
          </div>

          <div className="mt-2.5 p-2 rounded-lg bg-blue-50/80 border border-blue-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-blue-900 font-semibold">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span>AI {activeHorizon} Forecast:</span>
            </div>
            <span className="font-mono font-bold text-blue-700">
              {currentSensor.predictions[activeHorizon]?.speed} km/h ({currentSensor.predictions[activeHorizon]?.congestion}%)
            </span>
          </div>
        </div>
      </div>

      {/* FLOATING HOVER TOOLTIP */}
      {hoveredSensor && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="glass-floating px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-2 border border-blue-200">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></span>
            <span className="text-xs font-semibold text-slate-800">Click to Inspect: {hoveredSensor.name}</span>
            <span className="text-xs font-mono font-bold text-blue-600">({hoveredSensor.speed} km/h)</span>
          </div>
        </div>
      )}

      {/* FLOATING 5: Controls */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-2">
        <div className="glass-floating p-1.5 rounded-xl flex items-center gap-1.5 shadow-premium">
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              isRotating ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
            <span>{isRotating ? 'Auto Orbit' : 'Paused'}</span>
          </button>

          <button
            onClick={() => handleCameraPreset('isometric')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewAngle === 'isometric' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Isometric
          </button>

          <button
            onClick={() => handleCameraPreset('top')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewAngle === 'top' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Top View
          </button>

          <button
            onClick={() => handleCameraPreset('downtown')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewAngle === 'downtown' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Downtown Focus
          </button>

          <button
            onClick={() => setWireframeMode(!wireframeMode)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              wireframeMode ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
            title="Toggle Wireframe Architecture"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>

        <div className="hidden lg:flex items-center text-[11px] text-slate-500 glass-floating px-3 py-2 rounded-xl">
          <span>Drag to orbit • Scroll to zoom • Click beacon to select</span>
        </div>
      </div>
    </div>
  );
}

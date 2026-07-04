/* ============================================================
   Interactive 3D Globe for Home Page
   Three.js based Earth with animal habitat markers
   ============================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const container = document.getElementById('globe-3d-container');
if (!container) throw new Error('Globe container not found');

// ===== Scene Setup =====
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(0, 0.2, 3.6);

// WebGL renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.domElement.setAttribute('aria-label', 'Interactive globe showing animal habitat locations. Drag to rotate.');
renderer.domElement.setAttribute('role', 'application');
container.appendChild(renderer.domElement);

// CSS2D renderer for persistent labels
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(container.clientWidth, container.clientHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.left = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
labelRenderer.domElement.style.zIndex = '1';
container.appendChild(labelRenderer.domElement);

// ===== Controls =====
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.6;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.5;
controls.minDistance = 2.0;
controls.maxDistance = 6;
controls.enablePan = false;
controls.enableZoom = true;
controls.target.set(0, 0, 0);

// Pause auto-rotate during drag, resume after 4s idle
let rotTimeout = null;
renderer.domElement.addEventListener('pointerdown', function() {
  controls.autoRotate = false;
  clearTimeout(rotTimeout);

  // Hide drag hint on first interaction
  const hint = document.getElementById('globe-hint');
  if (hint) hint.classList.add('is-hidden');
});
renderer.domElement.addEventListener('pointerup', function() {
  clearTimeout(rotTimeout);
  rotTimeout = setTimeout(function() { controls.autoRotate = true; }, 4000);
});
renderer.domElement.addEventListener('pointerleave', function() {
  clearTimeout(rotTimeout);
  rotTimeout = setTimeout(function() { controls.autoRotate = true; }, 1500);
});

// ===== Lighting =====
const ambientLight = new THREE.AmbientLight(0x444466, 0.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
sunLight.position.set(5, 3, 5);
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0x4488ff, 0.5);
fillLight.position.set(-3, -1, -4);
scene.add(fillLight);

// ===== Earth =====
const textureLoader = new THREE.TextureLoader();
const EARTH_URL = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const BUMP_URL  = 'https://unpkg.com/three-globe/example/img/earth-topology.png';
const WATER_URL = 'https://unpkg.com/three-globe/example/img/earth-water.png';

const earthGroup = new THREE.Group();
scene.add(earthGroup);

const earthGeo = new THREE.SphereGeometry(1, 64, 64);
const earthMat = new THREE.MeshPhongMaterial({
  color: 0x88bbff,
  emissive: 0x000022,
  emissiveIntensity: 0.05,
  specular: new THREE.Color(0x333333),
  shininess: 5,
});
const earth = new THREE.Mesh(earthGeo, earthMat);
earthGroup.add(earth);

// Load textures asynchronously
textureLoader.load(EARTH_URL, function(map) {
  earthMat.map = map;
  earthMat.color.set(0xffffff);
  earthMat.needsUpdate = true;
});
textureLoader.load(BUMP_URL, function(map) {
  earthMat.bumpMap = map;
  earthMat.bumpScale = 0.04;
  earthMat.needsUpdate = true;
});
textureLoader.load(WATER_URL, function(map) {
  earthMat.specularMap = map;
  earthMat.specular = new THREE.Color(0x555555);
  earthMat.needsUpdate = true;
});

// Atmosphere glow
const glowGeo = new THREE.SphereGeometry(1.015, 64, 64);
const glowMat = new THREE.MeshPhongMaterial({
  color: 0x4488ff,
  transparent: true,
  opacity: 0.12,
  side: THREE.BackSide,
});
const atmosphere = new THREE.Mesh(glowGeo, glowMat);
earthGroup.add(atmosphere);

// ===== Location & Label Data =====
const markers = [];
const labelObjects = [];

function latLngToPos(lat, lng, radius) {
  radius = radius || 1.025;
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Expanded animal habitats
const locations = [
  // Africa
  { lat: -1.29, lng: 36.82, region: 'East Africa', animals: 'Lion · Elephant · Giraffe · Zebra', emoji: '\u{1F981}', major: true },
  { lat: -25.75, lng: 28.19, region: 'Southern Africa', animals: 'Rhino · Hippo · Wild Dog', emoji: '\u{1F98F}', major: false },
  { lat: 3.0,   lng: 12.0,  region: 'Central Africa', animals: 'Gorilla · Chimpanzee · Okapi', emoji: '\u{1F98D}', major: false },
  // Asia
  { lat: 20.0,  lng: 78.0,  region: 'India', animals: 'Bengal Tiger · Elephant · Peacock', emoji: '\u{1F42F}', major: true },
  { lat: 30.59, lng: 104.06, region: 'China', animals: 'Giant Panda · Golden Monkey', emoji: '\u{1F43C}', major: true },
  { lat: -2.0,  lng: 118.0, region: 'Southeast Asia', animals: 'Orangutan · Komodo Dragon', emoji: '\u{1F9A7}', major: false },
  { lat: 46.0,  lng: 75.0,  region: 'Central Asia', animals: 'Snow Leopard · Yak', emoji: '\u{1F406}', major: false },
  // Australia & Oceania
  { lat: -25.0, lng: 134.0, region: 'Australia', animals: 'Kangaroo · Koala · Platypus', emoji: '\u{1F998}', major: true },
  { lat: -40.0, lng: 175.0, region: 'New Zealand', animals: 'Kiwi · Kakapo · Tuatara', emoji: '\u{1F426}', major: false },
  // Europe
  { lat: 50.0,  lng: 10.0,  region: 'Europe', animals: 'Wolf · Brown Bear · Red Fox', emoji: '\u{1F43A}', major: true },
  { lat: 62.0,  lng: 25.0,  region: 'Scandinavia', animals: 'Moose · Reindeer · Lynx', emoji: '\u{1F98C}', major: false },
  // North America
  { lat: 45.0,  lng: -100.0, region: 'North America', animals: 'Bald Eagle · Grizzly · Bison', emoji: '\u{1F985}', major: true },
  { lat: 35.0,  lng: -85.0,  region: 'Appalachia', animals: 'White-tailed Deer · Raccoon', emoji: '\u{1F98C}', major: false },
  // Central & South America
  { lat: 20.0,  lng: -98.0,  region: 'Central America', animals: 'Jaguar · Toucan · Quetzal', emoji: '\u{1F99C}', major: true },
  { lat: -5.0,  lng: -60.0,  region: 'Amazon', animals: 'Sloth · Anaconda · Macaw', emoji: '\u{1F40D}', major: true },
  { lat: -15.0, lng: -70.0,  region: 'Andes', animals: 'Llama · Condor · Chinchilla', emoji: '\u{1F999}', major: false },
  { lat: -40.0, lng: -65.0,  region: 'Patagonia', animals: 'Puma · Guanaco · Fox', emoji: '\u{1F406}', major: false },
  // Polar
  { lat: -75.0, lng: 120.0,  region: 'Antarctica', animals: 'Penguin · Seal · Albatross', emoji: '\u{1F427}', major: true },
  { lat: 72.0,  lng: -40.0,  region: 'Arctic', animals: 'Polar Bear · Walrus · Arctic Fox', emoji: '\u{1F43B}', major: true },
  // Oceans
  { lat: 0.0,   lng: -150.0, region: 'Pacific Ocean', animals: 'Humpback Whale · Dolphin', emoji: '\u{1F40B}', major: false },
  { lat: 35.0,  lng: -35.0,  region: 'Atlantic Ocean', animals: 'Bluefin Tuna · Manta Ray', emoji: '\u{1F41F}', major: false },
];

// ===== Create Markers =====
function createMarkers() {
  const dotGeo = new THREE.SphereGeometry(0.028, 10, 10);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xff5533 });

  locations.forEach(function(loc) {
    const pos = latLngToPos(loc.lat, loc.lng);

    // Main dot
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.copy(pos);
    earthGroup.add(dot);

    // Pulse ring
    const ringGeo = new THREE.RingGeometry(0.025, 0.050, 20);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff8844,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pos);
    ring.lookAt(new THREE.Vector3(0, 0, 0));
    earthGroup.add(ring);

    // Connecting line
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      pos.clone().multiplyScalar(1.01),
    ]);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xff8844,
      transparent: true,
      opacity: 0.2,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    earthGroup.add(line);

    markers.push({
      dot, ring, line, pos,
      lat: loc.lat, lng: loc.lng,
      region: loc.region, animals: loc.animals,
      emoji: loc.emoji, major: loc.major,
      phase: Math.random() * Math.PI * 2,
    });
  });
}
createMarkers();

// ===== Create SVG Badge Labels =====
function createLabels() {
  const labelRadius = 1.14;

  const REGION_COLORS = {
    'East Africa': '#FF6B35',
    'Southern Africa': '#E85D2C',
    'Central Africa': '#D44A1E',
    'India': '#E74C3C',
    'China': '#C0392B',
    'Southeast Asia': '#A93226',
    'Central Asia': '#A93226',
    'Australia': '#2ECC71',
    'New Zealand': '#27AE60',
    'Europe': '#3498DB',
    'Scandinavia': '#2980B9',
    'North America': '#9B59B6',
    'Appalachia': '#8E44AD',
    'Central America': '#1ABC9C',
    'Amazon': '#16A085',
    'Andes': '#138D75',
    'Patagonia': '#0E6655',
    'Antarctica': '#00BCD4',
    'Arctic': '#0097A7',
    'Pacific Ocean': '#1976D2',
    'Atlantic Ocean': '#1565C0'
  };

  function getColor(region) {
    return REGION_COLORS[region] || '#666';
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';

  locations.forEach(function(loc) {
    const pos = latLngToPos(loc.lat, loc.lng, labelRadius);
    const color = getColor(loc.region);

    const div = document.createElement('div');
    div.className = 'marker-badge';

    if (loc.major) {
      const svgEl = document.createElementNS(SVG_NS, 'svg');
      svgEl.setAttribute('viewBox', '0 0 36 36');
      svgEl.setAttribute('width', '36');
      svgEl.setAttribute('height', '36');
      svgEl.setAttribute('class', 'marker-badge__svg');

      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('cx', '18');
      circle.setAttribute('cy', '18');
      circle.setAttribute('r', '16');
      circle.setAttribute('fill', color);
      circle.setAttribute('stroke', 'rgba(255,255,255,0.35)');
      circle.setAttribute('stroke-width', '1.5');
      svgEl.appendChild(circle);

      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', '18');
      text.setAttribute('y', '23');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '16');
      text.setAttribute('dominant-baseline', 'central');
      text.textContent = loc.emoji;
      svgEl.appendChild(text);

      div.appendChild(svgEl);

      const labelSpan = document.createElement('span');
      labelSpan.className = 'marker-badge__label';
      labelSpan.textContent = loc.region;
      div.appendChild(labelSpan);
    } else {
      const svgEl = document.createElementNS(SVG_NS, 'svg');
      svgEl.setAttribute('viewBox', '0 0 20 20');
      svgEl.setAttribute('width', '20');
      svgEl.setAttribute('height', '20');
      svgEl.setAttribute('class', 'marker-badge__svg');

      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('cx', '10');
      circle.setAttribute('cy', '10');
      circle.setAttribute('r', '6');
      circle.setAttribute('fill', color);
      circle.setAttribute('opacity', '0.8');
      svgEl.appendChild(circle);

      div.appendChild(svgEl);
    }

    const label = new CSS2DObject(div);
    label.position.copy(pos);
    label.userData = { loc, major: loc.major };
    earthGroup.add(label);
    labelObjects.push(label);
  });
}
createLabels();

// ===== Hover tooltip =====
const tooltip = document.createElement('div');
tooltip.className = 'globe-tooltip';
tooltip.style.display = 'none';
container.appendChild(tooltip);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const allDotMeshes = markers.map(function(m) { return m.dot; });

renderer.domElement.addEventListener('pointermove', function(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(allDotMeshes);

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    let markerData = null;
    for (let i = 0; i < markers.length; i++) {
      if (markers[i].dot === hit) { markerData = markers[i]; break; }
    }
    if (markerData) {
      tooltip.textContent = markerData.emoji + ' ' + markerData.region + ' — ' + markerData.animals;
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX - rect.left + 14) + 'px';
      tooltip.style.top = (e.clientY - rect.top - 10) + 'px';
      container.style.cursor = 'pointer';
    }
  } else {
    tooltip.style.display = 'none';
    container.style.cursor = 'grab';
  }
});

// ===== Public API for integration with home.js =====
window.__globe = {
  rotateTo: function(lat, lng) {
    const targetY = (lng / 180) * Math.PI + Math.PI;
    const currentY = earthGroup.rotation.y;
    let diff = targetY - currentY;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    earthGroup.rotation.y += diff;

    const targetX = Math.sin((lat / 90) * 0.8) * 0.5;
    gsapTo(camera.position, { y: targetX }, 1000);
  },
};

// Listen for globe:rotate custom event (decoupled from home.js)
document.addEventListener('globe:rotate', function(e) {
  if (e.detail && window.__globe.rotateTo) {
    window.__globe.rotateTo(e.detail.lat, e.detail.lng);
  }
});

// Simple tween helper
function gsapTo(obj, target, duration) {
  const start = { y: obj.y };
  let startTime = null;
  function step(ts) {
    if (!startTime) startTime = ts;
    const progress = Math.min((ts - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    obj.y = start.y + (target.y - start.y) * ease;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ===== Resize =====
function onResize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
}
window.addEventListener('resize', onResize);

// ===== Animation Loop =====
const tempVec = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);

  const time = Date.now() / 1000;

  // Pulse markers
  markers.forEach(function(m) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.5 + m.phase);
    m.ring.material.opacity = 0.3 + 0.5 * pulse;
    const s = 0.8 + 0.6 * pulse;
    m.ring.scale.set(s, s, s);
    m.line.material.opacity = 0.1 + 0.2 * pulse;
  });

  // Hide labels on the far side of the globe
  camera.getWorldPosition(tempVec);
  const cameraPos = tempVec.clone();

  labelObjects.forEach(function(label) {
    const worldPos = new THREE.Vector3();
    label.getWorldPosition(worldPos);

    const toLabel = worldPos.clone().normalize();
    const toCamera = cameraPos.clone().normalize();

    const dot = toLabel.dot(toCamera);
    label.element.style.opacity = dot > 0.15 ? '1' : '0';
  });

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();

// ===== Dark mode =====
window.__globe.resize = onResize;

function applyTheme() {
  scene.background = null;
}
applyTheme();
document.addEventListener('themeChanged', applyTheme);

// Signal ready
document.dispatchEvent(new CustomEvent('globeReady'));

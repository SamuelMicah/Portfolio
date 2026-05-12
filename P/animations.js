import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const USE_SCROLL_ANIMATION = true;
const MODEL_URL = new URL('../temp/push_up.glb', import.meta.url).href;
const MAX_PIXEL_RATIO = 1.5;

const container = document.getElementById('3d-viewport');
const scrollTrigger = document.querySelector('.p-scroll-trigger-wrapper');

let scene;
let camera;
let renderer;
let mixer;
let action;
let clip;
let clock;
let isStarted = false;
let isLoaded = false;
let pendingScrollFrame = null;
let pendingResizeFrame = null;

function setupScene() {
    if (renderer || !container) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, getAspect(), 0.1, 100);

    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: window.devicePixelRatio <= 1.5,
        powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    resizeRenderer();
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffcc99, 1.5);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    clock = new THREE.Clock();
    loadModel();
}

function getAspect() {
    const width = container?.clientWidth || window.innerWidth || 1;
    const height = container?.clientHeight || window.innerHeight || 1;
    return width / height;
}

function resizeRenderer() {
    if (!renderer || !camera || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) return;

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

function loadModel() {
    const loader = new GLTFLoader();

    loader.load(MODEL_URL, (gltf) => {
        const model = gltf.scene;
        scene.add(model);

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3()).length();

        camera.position.set(center.x, center.y + size * 0.375, center.z + size * 1.125);
        camera.lookAt(center);

        if (gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            clip = gltf.animations[0];
            action = mixer.clipAction(clip);
            action.play();
            action.paused = USE_SCROLL_ANIMATION;
        }

        isLoaded = true;
        updateScrollAnimation();
        renderLoop();
    }, undefined, (err) => console.error("Error loading model:", err));
}

function updateScrollAnimation() {
    if (!USE_SCROLL_ANIMATION || !action || !mixer || !clip || !scrollTrigger) return;
    if (scrollTrigger.offsetParent === null) return;

    const rect = scrollTrigger.getBoundingClientRect();
    const viewHeight = window.innerHeight;
    const distanceTraveled = viewHeight - rect.top;
    const totalDistance = viewHeight + rect.height;
    const progress = Math.max(0, Math.min(1, distanceTraveled / totalDistance));

    action.time = progress * clip.duration;
    mixer.update(0);
}

function requestScrollUpdate() {
    if (pendingScrollFrame !== null) return;

    pendingScrollFrame = requestAnimationFrame(() => {
        pendingScrollFrame = null;
        updateScrollAnimation();
        renderLoop();
    });
}

function renderLoop() {
    if (!renderer || !scene || !camera) return;

    const delta = clock?.getDelta() || 0;
    if (!USE_SCROLL_ANIMATION && mixer) {
        mixer.update(delta);
    }

    renderer.render(scene, camera);
}

function onResize() {
    if (pendingResizeFrame !== null) return;

    pendingResizeFrame = requestAnimationFrame(() => {
        pendingResizeFrame = null;
        resizeRenderer();
        renderLoop();
    });
}

export function stopPAnimation() {
    if (!renderer || !isStarted) return;

    renderer.setAnimationLoop(null);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', requestScrollUpdate);
    isStarted = false;
}

export function startPAnimation() {
    if (!container) return;

    setupScene();
    resizeRenderer();

    if (!renderer || isStarted) return;

    clock?.start();
    renderer.setAnimationLoop(USE_SCROLL_ANIMATION ? null : renderLoop);
    window.addEventListener('resize', onResize, { passive: true });

    if (USE_SCROLL_ANIMATION) {
        window.addEventListener('scroll', requestScrollUpdate, { passive: true });
        updateScrollAnimation();
    }

    if (isLoaded) renderLoop();
    isStarted = true;
}

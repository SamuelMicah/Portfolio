import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const USE_SCROLL_ANIMATION = true; 

const container = document.getElementById('3d-viewport');

//Scene Setup
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);

// Renderer
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffcc99, 1.5);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// Model Loading
let mixer, action, clip;
const loader = new GLTFLoader();

loader.load('', (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    // Auto-center model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();

    camera.position.set(center.x, center.y + size * 0.375, center.z + size * 1.125);
    camera.lookAt(center);

    // Animation Setup
    if(gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        clip = gltf.animations[0];
        action = mixer.clipAction(clip);
        
        // LOGIC SPLIT: Scroll vs Auto
        action.play(); 
        
        if (USE_SCROLL_ANIMATION) {
            action.paused = true; 
        } else {
            action.paused = false; 
        }
    }
}, undefined, (err) => console.error("Error loading model:", err));

// Scroll Logic
const scrollTrigger = document.querySelector('.p-scroll-trigger-wrapper');

function updateScrollAnimation() {
    // Safety check: if container is hidden, stop immediately
    if (scrollTrigger.offsetParent === null) return; 

    if (!USE_SCROLL_ANIMATION || !action || !mixer || !scrollTrigger) return;

    const rect = scrollTrigger.getBoundingClientRect();
    const viewHeight = window.innerHeight;
    const distanceTraveled = viewHeight - rect.top;
    const totalDistance = viewHeight + rect.height;
    
    let progress = distanceTraveled / totalDistance;
    progress = Math.max(0, Math.min(1, progress));

    action.time = progress * clip.duration;
    mixer.update(0);
}

// Loop Setup
const clock = new THREE.Clock();

// 1. DEFINE THE LOOP AS A NAMED FUNCTION
function renderLoop() {
    const delta = clock.getDelta();

    if (!USE_SCROLL_ANIMATION && mixer) {
        mixer.update(delta);
    }

    renderer.render(scene, camera);
}

export function stopPAnimation() {
    if (renderer) {
        // 1. Stop the Render Loop
        renderer.setAnimationLoop(null);
        
        // 2. STOP LISTENING TO SCROLL (Saves CPU)
        if (USE_SCROLL_ANIMATION) {
            window.removeEventListener('scroll', updateScrollAnimation);
        }
    }
}

export function startPAnimation() {
    if (renderer && container) {
        // 1. Force Resize (existing fix)
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        if (width > 0 && height > 0) {
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }

        // 2. Start Clock and Loop
        clock.start(); 
        renderer.setAnimationLoop(renderLoop);

        // 3. [NEW] Force Instant Render
        // Paints the frame NOW, without waiting for the next screen refresh
        renderLoop();

        // 4. Scroll Listener
        if (USE_SCROLL_ANIMATION) {
            window.addEventListener('scroll', updateScrollAnimation);
            updateScrollAnimation(); 
        }
    }
}

// Event Listeners
window.addEventListener('resize', () => {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

if (USE_SCROLL_ANIMATION) {
    window.addEventListener('scroll', updateScrollAnimation);
    updateScrollAnimation(); 
}
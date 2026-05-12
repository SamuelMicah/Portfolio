import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.getElementById('animation-canvas');

// --- Scene Setup ---
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);

// Renderer
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
container.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Slightly brighter for clarity
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffcc99, 1.5);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// --- Model & Animation Loading ---
let mixer;
const loader = new GLTFLoader();
const clock = new THREE.Clock();

// Using root-relative path as discussed
loader.load(new URL('../../../temp/push_up.glb', import.meta.url).href, (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    // Auto-center and Auto-scale Camera
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();

    camera.position.set(center.x, center.y + size * 0.375, center.z + size * 1.125);
    camera.lookAt(center);

    // Animation Setup
    if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        const clip = gltf.animations[0];
        const action = mixer.clipAction(clip);
        
        action.play(); 
    }
}, undefined, (err) => {
    console.error("Error loading model. Check if the path is correct.", err);
});

function renderLoop() {
    if (mixer) {
        const delta = clock.getDelta();
        mixer.update(delta);
    }
    renderer.render(scene, camera);
}

// --- Controller Functions ---

export function stopPAnimation() {
    if (renderer) {
        renderer.setAnimationLoop(null);
    }
}

export function startPAnimation() {
    if (renderer && container) {
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        if (width > 0 && height > 0) {
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }

        clock.start(); 
        renderer.setAnimationLoop(renderLoop);
    }
}

// --- Event Listeners ---
window.addEventListener('resize', () => {
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

// Initialize on load
startPAnimation();

// --- Performance & Cleanup Logic ---

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            startPAnimation();
        } else {
            stopPAnimation();
        }
    });
}, { threshold: 0.1 }); // Triggers if even 10% of the iframe is visible

// Observe the body of the iframe document
observer.observe(document.body);

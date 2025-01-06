import * as THREE from 'three';
import vertex from './shaders/vertex.glsl';
import fragment from './shaders/fragment.glsl';


class AudioVisualizer {
    constructor(containerId, audioFile) {
        this.container = document.getElementById(containerId);
        this.audioFile = audioFile;
        this.fftSize = 128;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.analyser = null;
        this.uniforms = null;

        this.init = this.init.bind(this);
        this.animate = this.animate.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
    }

    async init() {

        // Scene setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();

        // Audio setup
        const listener = new THREE.AudioListener();
        const audio = new THREE.Audio(listener);

        // Handle audio loading based on a device
        if (/(iPad|iPhone|iPod)/g.test(navigator.userAgent)) {
            const loader = new THREE.AudioLoader();
            const buffer = await new Promise((resolve) => {
                loader.load(this.audioFile, resolve);
            });
            audio.setBuffer(buffer);
            audio.play();
        } else {
            const mediaElement = new Audio(this.audioFile);
            await mediaElement.play();
            audio.setMediaElementSource(mediaElement);
        }

        this.analyser = new THREE.AudioAnalyser(audio, this.fftSize);

        // Create audio data texture
        const audioDataTexture = new THREE.DataTexture(
            this.analyser.data,
            this.fftSize / 2,
            1,
            THREE.RedFormat
        );

        // Shader uniforms
        this.uniforms = {
            tAudioData: { value: audioDataTexture },
            iResolution: {
                value: new THREE.Vector2(
                    window.innerWidth,
                    window.innerHeight
                )
            },
            iTime: { value: 0 },
            iChannel0: {
                value: await new Promise((resolve) => {
                    new THREE.TextureLoader().load(
                        "/textures/img.png",
                        (texture) => {
                            texture.wrapS = THREE.RepeatWrapping;
                            texture.wrapT = THREE.RepeatWrapping;
                            resolve(texture);
                        }
                    );
                })
            },
            iChannel1: { value: audioDataTexture }  // Set audio texture as iChannel1
        };

        // Create visualization mesh
        const material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: vertex,
            fragmentShader: fragment,
        });

        const geometry = new THREE.PlaneGeometry(1, 1);
        const mesh = new THREE.Mesh(geometry, material);
        this.scene.add(mesh);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);

        // Event listeners
        window.addEventListener('resize', this.onWindowResize);

        // Start animation loop
        this.renderer.setAnimationLoop(this.animate);
    }

    onWindowResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
    }

    animate() {
        this.analyser.getFrequencyData();
        this.uniforms.tAudioData.value.needsUpdate = true;
        this.uniforms.iChannel1.value.needsUpdate = true;
        this.uniforms.iTime.value += 0.1;
        this.renderer.render(this.scene, this.camera);
    }
}

// Usage
const visualizer = new AudioVisualizer(
    'container',
    '/sounds/376737_Skullbeatz___Bad_Cat_Maste.ogg'
);

const startButton = document.getElementById('startButton');
startButton.addEventListener('click', () => {
    const overlay = document.getElementById('overlay');
    overlay.remove();
    visualizer.init();
});
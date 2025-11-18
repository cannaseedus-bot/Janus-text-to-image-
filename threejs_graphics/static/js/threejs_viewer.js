/**
 * MX2PRO Three.js Graphics Engine
 * Enhanced 3D visualization for Janus Text-to-Image
 */

class ThreeJSViewer {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            backgroundColor: 0x000000,
            cameraFOV: 75,
            cameraPosition: { x: 0, y: 0, z: 5 },
            enableOrbitControls: true,
            enablePostProcessing: true,
            ...options
        };

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.imageObjects = [];
        this.animationFrameId = null;

        this.init();
    }

    init() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupLighting();

        if (this.options.enableOrbitControls) {
            this.setupControls();
        }

        this.setupEventListeners();
        this.animate();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.options.backgroundColor);

        // Add fog for depth perception
        this.scene.fog = new THREE.Fog(this.options.backgroundColor, 10, 50);
    }

    setupCamera() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(
            this.options.cameraFOV,
            aspect,
            0.1,
            1000
        );

        this.camera.position.set(
            this.options.cameraPosition.x,
            this.options.cameraPosition.y,
            this.options.cameraPosition.z
        );
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });

        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.container.appendChild(this.renderer.domElement);
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Main directional light
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(5, 10, 7.5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        this.scene.add(mainLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);

        // Rim light
        const rimLight = new THREE.DirectionalLight(0xff8844, 0.4);
        rimLight.position.set(0, -5, -10);
        this.scene.add(rimLight);
    }

    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 50;
        this.controls.maxPolarAngle = Math.PI / 1.5;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    addImagePlane(imageUrl, position = { x: 0, y: 0, z: 0 }, scale = 1) {
        const loader = new THREE.TextureLoader();

        loader.load(imageUrl, (texture) => {
            const aspect = texture.image.width / texture.image.height;
            const geometry = new THREE.PlaneGeometry(aspect * scale, scale);

            const material = new THREE.MeshStandardMaterial({
                map: texture,
                side: THREE.DoubleSide,
                roughness: 0.8,
                metalness: 0.2
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(position.x, position.y, position.z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Add to scene and track
            this.scene.add(mesh);
            this.imageObjects.push({
                mesh: mesh,
                url: imageUrl,
                originalPosition: { ...position }
            });

            // Add frame
            this.addFrame(mesh, aspect * scale, scale);
        });
    }

    addFrame(imageMesh, width, height) {
        const frameThickness = 0.05;
        const frameDepth = 0.1;

        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.3,
            metalness: 0.7
        });

        // Top
        const topGeometry = new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, frameDepth);
        const topFrame = new THREE.Mesh(topGeometry, frameMaterial);
        topFrame.position.set(0, height / 2 + frameThickness / 2, -frameDepth / 2);
        imageMesh.add(topFrame);

        // Bottom
        const bottomFrame = topFrame.clone();
        bottomFrame.position.y = -(height / 2 + frameThickness / 2);
        imageMesh.add(bottomFrame);

        // Left
        const sideGeometry = new THREE.BoxGeometry(frameThickness, height + frameThickness * 2, frameDepth);
        const leftFrame = new THREE.Mesh(sideGeometry, frameMaterial);
        leftFrame.position.set(-(width / 2 + frameThickness / 2), 0, -frameDepth / 2);
        imageMesh.add(leftFrame);

        // Right
        const rightFrame = leftFrame.clone();
        rightFrame.position.x = width / 2 + frameThickness / 2;
        imageMesh.add(rightFrame);
    }

    createParticleSystem(imageUrl) {
        const loader = new THREE.TextureLoader();

        loader.load(imageUrl, (texture) => {
            const particleCount = 10000;
            const positions = new Float32Array(particleCount * 3);
            const colors = new Float32Array(particleCount * 3);

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = texture.image.width;
            canvas.height = texture.image.height;
            ctx.drawImage(texture.image, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < particleCount; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const index = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;

                positions[i * 3] = (x / canvas.width - 0.5) * 2;
                positions[i * 3 + 1] = -(y / canvas.height - 0.5) * 2;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

                colors[i * 3] = imageData.data[index] / 255;
                colors[i * 3 + 1] = imageData.data[index + 1] / 255;
                colors[i * 3 + 2] = imageData.data[index + 2] / 255;
            }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            const material = new THREE.PointsMaterial({
                size: 0.01,
                vertexColors: true,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            });

            const particles = new THREE.Points(geometry, material);
            this.scene.add(particles);

            // Animate particles
            particles.userData.animate = (time) => {
                particles.rotation.y = time * 0.0001;
            };

            this.imageObjects.push({ mesh: particles, url: imageUrl, isParticles: true });
        });
    }

    clearImages() {
        this.imageObjects.forEach(obj => {
            this.scene.remove(obj.mesh);
            if (obj.mesh.geometry) obj.mesh.geometry.dispose();
            if (obj.mesh.material) {
                if (obj.mesh.material.map) obj.mesh.material.map.dispose();
                obj.mesh.material.dispose();
            }
        });
        this.imageObjects = [];
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());

        const time = Date.now();

        // Animate image objects
        this.imageObjects.forEach(obj => {
            if (obj.isParticles && obj.mesh.userData.animate) {
                obj.mesh.userData.animate(time);
            } else {
                // Subtle floating animation for image planes
                obj.mesh.position.y = obj.originalPosition.y + Math.sin(time * 0.001) * 0.05;
            }
        });

        if (this.controls) {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        this.clearImages();

        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThreeJSViewer;
}

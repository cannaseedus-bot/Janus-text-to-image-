/**
 * MX2PRO 3D Image Gallery
 * Advanced 3D gallery visualization for generated images
 */

class ImageGallery3D extends ThreeJSViewer {
    constructor(containerId, options = {}) {
        const galleryOptions = {
            backgroundColor: 0x0a0a0a,
            layout: 'grid', // 'grid', 'carousel', 'spiral', 'wall'
            spacing: 2.5,
            imageScale: 1.5,
            autoRotate: false,
            showLabels: true,
            ...options
        };

        super(containerId, galleryOptions);
        this.currentLayout = galleryOptions.layout;
        this.imageSpacing = galleryOptions.spacing;
        this.imageScale = galleryOptions.imageScale;
        this.showLabels = galleryOptions.showLabels;
        this.autoRotate = galleryOptions.autoRotate;
        this.labels = [];
    }

    addImages(imageUrls, metadata = []) {
        this.clearImages();

        imageUrls.forEach((url, index) => {
            const position = this.calculatePosition(index, imageUrls.length);
            this.addImagePlane(url, position, this.imageScale);

            if (this.showLabels && metadata[index]) {
                this.addLabel(metadata[index], position, index);
            }
        });
    }

    calculatePosition(index, total) {
        switch (this.currentLayout) {
            case 'grid':
                return this.calculateGridPosition(index, total);
            case 'carousel':
                return this.calculateCarouselPosition(index, total);
            case 'spiral':
                return this.calculateSpiralPosition(index, total);
            case 'wall':
                return this.calculateWallPosition(index, total);
            default:
                return { x: 0, y: 0, z: 0 };
        }
    }

    calculateGridPosition(index, total) {
        const cols = Math.ceil(Math.sqrt(total));
        const row = Math.floor(index / cols);
        const col = index % cols;

        return {
            x: (col - cols / 2) * this.imageSpacing,
            y: -(row - Math.ceil(total / cols) / 2) * this.imageSpacing,
            z: 0
        };
    }

    calculateCarouselPosition(index, total) {
        const angle = (index / total) * Math.PI * 2;
        const radius = 5;

        return {
            x: Math.cos(angle) * radius,
            y: 0,
            z: Math.sin(angle) * radius
        };
    }

    calculateSpiralPosition(index, total) {
        const angle = index * 0.5;
        const radius = 2 + index * 0.3;
        const height = index * 0.4 - (total * 0.2);

        return {
            x: Math.cos(angle) * radius,
            y: height,
            z: Math.sin(angle) * radius
        };
    }

    calculateWallPosition(index, total) {
        const cols = 5;
        const row = Math.floor(index / cols);
        const col = index % cols;

        return {
            x: (col - cols / 2) * this.imageSpacing,
            y: (2 - row) * this.imageSpacing,
            z: -2
        };
    }

    addLabel(text, position, index) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;

        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.font = 'Bold 36px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText(text, canvas.width / 2, canvas.height / 2 + 12);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);

        sprite.position.set(position.x, position.y - 1.2, position.z);
        sprite.scale.set(2, 0.5, 1);

        this.scene.add(sprite);
        this.labels.push(sprite);
    }

    setLayout(layoutType) {
        this.currentLayout = layoutType;
        this.repositionImages();
    }

    repositionImages() {
        const total = this.imageObjects.length;

        this.imageObjects.forEach((obj, index) => {
            if (!obj.isParticles) {
                const newPosition = this.calculatePosition(index, total);
                obj.originalPosition = newPosition;

                // Animate to new position
                this.animateObjectToPosition(obj.mesh, newPosition, 1000);
            }
        });

        // Update labels
        this.labels.forEach((label, index) => {
            if (index < total) {
                const position = this.calculatePosition(index, total);
                this.animateObjectToPosition(label,
                    { x: position.x, y: position.y - 1.2, z: position.z },
                    1000
                );
            }
        });
    }

    animateObjectToPosition(object, targetPosition, duration) {
        const startPosition = {
            x: object.position.x,
            y: object.position.y,
            z: object.position.z
        };

        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-in-out)
            const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            object.position.x = startPosition.x + (targetPosition.x - startPosition.x) * eased;
            object.position.y = startPosition.y + (targetPosition.y - startPosition.y) * eased;
            object.position.z = startPosition.z + (targetPosition.z - startPosition.z) * eased;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    enableAutoRotate(speed = 0.0005) {
        this.autoRotate = true;
        this.rotationSpeed = speed;
    }

    disableAutoRotate() {
        this.autoRotate = false;
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());

        const time = Date.now();

        // Auto-rotate camera around the scene
        if (this.autoRotate && this.currentLayout === 'carousel') {
            const radius = this.camera.position.length();
            this.camera.position.x = Math.cos(time * this.rotationSpeed) * radius;
            this.camera.position.z = Math.sin(time * this.rotationSpeed) * radius;
            this.camera.lookAt(this.scene.position);
        }

        // Animate image objects
        this.imageObjects.forEach(obj => {
            if (obj.isParticles && obj.mesh.userData.animate) {
                obj.mesh.userData.animate(time);
            } else {
                // Subtle floating animation for image planes
                const offset = obj.originalPosition || { x: 0, y: 0, z: 0 };
                obj.mesh.position.y = offset.y + Math.sin(time * 0.001 + obj.mesh.id) * 0.05;
            }
        });

        if (this.controls) {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);
    }

    createTransitionEffect(fromLayout, toLayout) {
        // Scatter effect
        this.imageObjects.forEach(obj => {
            if (!obj.isParticles) {
                const randomPos = {
                    x: (Math.random() - 0.5) * 20,
                    y: (Math.random() - 0.5) * 20,
                    z: (Math.random() - 0.5) * 20
                };

                this.animateObjectToPosition(obj.mesh, randomPos, 500);

                setTimeout(() => {
                    const newPos = this.calculatePosition(
                        this.imageObjects.indexOf(obj),
                        this.imageObjects.length
                    );
                    this.animateObjectToPosition(obj.mesh, newPos, 500);
                }, 500);
            }
        });
    }

    exportScene(filename = 'gallery-scene.json') {
        const sceneData = {
            images: this.imageObjects.map(obj => ({
                url: obj.url,
                position: obj.originalPosition,
                isParticles: obj.isParticles || false
            })),
            layout: this.currentLayout,
            camera: {
                position: this.camera.position,
                rotation: this.camera.rotation
            }
        };

        const blob = new Blob([JSON.stringify(sceneData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    importScene(sceneData) {
        this.clearImages();

        const imageUrls = sceneData.images.map(img => img.url);
        sceneData.images.forEach((img, index) => {
            if (img.isParticles) {
                this.createParticleSystem(img.url);
            } else {
                this.addImagePlane(img.url, img.position, this.imageScale);
            }
        });

        if (sceneData.camera) {
            this.camera.position.copy(sceneData.camera.position);
            this.camera.rotation.copy(sceneData.camera.rotation);
        }

        this.currentLayout = sceneData.layout || 'grid';
    }

    dispose() {
        // Clean up labels
        this.labels.forEach(label => {
            if (label.material.map) {
                label.material.map.dispose();
            }
            label.material.dispose();
            this.scene.remove(label);
        });
        this.labels = [];

        super.dispose();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageGallery3D;
}

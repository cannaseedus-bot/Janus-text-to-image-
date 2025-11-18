# MX2PRO Three.js Graphics Integration

Enhanced 3D visualization for Janus Text-to-Image using Three.js WebGL rendering.

## Overview

This module provides advanced 3D graphics capabilities for visualizing generated images from the Janus model. It uses Three.js for WebGL-accelerated rendering and provides multiple layout options, interactive controls, and stunning visual effects.

## Features

### Core Features
- **3D Image Gallery**: Display generated images in an interactive 3D environment
- **Multiple Layouts**: Grid, Carousel, Spiral, and Wall gallery modes
- **WebGL Rendering**: Hardware-accelerated graphics using Three.js
- **Interactive Controls**: Mouse/touch controls for camera manipulation
- **Real-time Effects**: Dynamic lighting, shadows, and particle systems

### Advanced Features
- **Particle System**: Convert images to particle-based visualizations
- **Auto-Rotate**: Automatic camera rotation around the scene
- **Scene Export**: Save and load 3D gallery configurations
- **Responsive Design**: Adapts to different screen sizes
- **Frame Monitoring**: Real-time FPS counter

### Layout Modes

1. **Grid Layout**: Organize images in a clean grid pattern
   - Ideal for comparing multiple images
   - Adjustable spacing and scale

2. **Carousel**: Circular gallery arrangement
   - Perfect for presentation mode
   - Auto-rotate support

3. **Spiral**: Dynamic spiral configuration
   - Creates an artistic arrangement
   - Gradually ascending/descending images

4. **Wall Gallery**: Traditional museum-style wall display
   - Multiple rows of framed images
   - Professional presentation

## Architecture

```
threejs_graphics/
├── server.py                    # Flask server for API and static files
├── static/
│   ├── js/
│   │   ├── threejs_viewer.js   # Core Three.js viewer class
│   │   └── image_gallery_3d.js # 3D gallery implementation
│   └── css/
│       └── threejs_viewer.css  # Styling and animations
├── templates/
│   └── viewer.html             # Main viewer interface
└── README.md                   # This file
```

## Installation

### Requirements
- Python 3.8+
- Flask 2.3+
- Modern web browser with WebGL support

### Install Dependencies

```bash
# Install Python dependencies
pip install flask flask-cors pillow

# Or install from project requirements.txt
pip install -r ../requirements.txt
```

## Usage

### Starting the Server

#### Option 1: Standalone Server
```bash
cd threejs_graphics
python server.py
```

The server will start on `http://localhost:5001`

#### Option 2: With Enhanced Gradio Demo
```bash
# From project root
python demo/app_mx2pro.py
```

This automatically starts both the Gradio interface (port 7860) and Three.js server (port 5001).

### Server Options

```bash
python server.py --host 0.0.0.0 --port 5001 --debug
```

Options:
- `--host`: Host to bind to (default: 0.0.0.0)
- `--port`: Port to bind to (default: 5001)
- `--debug`: Enable debug mode

## API Endpoints

### GET /
Main viewer interface

### GET /api/sample-images
Get generated images from the Janus model

Response:
```json
{
  "images": ["url1", "url2", ...],
  "metadata": ["label1", "label2", ...],
  "count": 5
}
```

### GET /api/images/{filename}
Serve a specific generated image

### POST /api/upload
Upload an image to the gallery

Request: multipart/form-data with 'image' field

Response:
```json
{
  "success": true,
  "filename": "image.jpg",
  "url": "/api/uploads/image.jpg"
}
```

### POST /api/scene/save
Save current 3D scene configuration

Request body:
```json
{
  "images": [...],
  "layout": "grid",
  "camera": {...}
}
```

### GET /api/scene/load
Load saved 3D scene configuration

### GET /health
Health check endpoint

## JavaScript API

### ThreeJSViewer Class

Base viewer class for 3D rendering.

```javascript
const viewer = new ThreeJSViewer('container-id', {
    backgroundColor: 0x000000,
    cameraFOV: 75,
    enableOrbitControls: true
});

// Add image
viewer.addImagePlane('/path/to/image.jpg', {x: 0, y: 0, z: 0}, 1.5);

// Create particle system
viewer.createParticleSystem('/path/to/image.jpg');

// Clear all images
viewer.clearImages();

// Cleanup
viewer.dispose();
```

### ImageGallery3D Class

Extended gallery with layout management.

```javascript
const gallery = new ImageGallery3D('container-id', {
    layout: 'grid',
    spacing: 2.5,
    imageScale: 1.5,
    autoRotate: false
});

// Add multiple images
gallery.addImages([url1, url2, url3], ['Label 1', 'Label 2', 'Label 3']);

// Change layout
gallery.setLayout('carousel');

// Enable auto-rotate
gallery.enableAutoRotate(0.0005);

// Export scene
gallery.exportScene('my-gallery.json');
```

## Customization

### Modifying Styles

Edit `static/css/threejs_viewer.css` to customize:
- Colors and gradients
- Panel layouts
- Animations
- Responsive breakpoints

### Adding New Layouts

In `image_gallery_3d.js`, add a new calculation method:

```javascript
calculateCustomPosition(index, total) {
    // Your custom positioning logic
    return {
        x: ...,
        y: ...,
        z: ...
    };
}
```

Then update the `calculatePosition` method to include your layout.

### Custom Visual Effects

Add custom shaders or materials in `threejs_viewer.js`:

```javascript
const customMaterial = new THREE.ShaderMaterial({
    uniforms: {...},
    vertexShader: '...',
    fragmentShader: '...'
});
```

## Integration with Janus

The Three.js graphics module seamlessly integrates with Janus:

1. **Generate Images**: Use Janus to create images
2. **Auto-Save**: Images are saved to `generated_samples/`
3. **Auto-Load**: Three.js viewer loads images from this directory
4. **Real-time Updates**: As new images are generated, they appear in the gallery

### Integration Flow

```
User Prompt → Janus Model → Generated Images → saved to disk
                                    ↓
                          Three.js Server API
                                    ↓
                          3D Gallery Viewer → Interactive Display
```

## Performance Optimization

### Tips for Best Performance

1. **Image Resolution**: Keep images at reasonable sizes (1024x1024 or lower)
2. **Number of Images**: Optimal is 5-20 images in a scene
3. **Particle Count**: Reduce particle count for lower-end devices
4. **Shadows**: Disable shadows for better FPS on older hardware
5. **Post-Processing**: Disable for mobile devices

### Browser Compatibility

- Chrome/Edge 90+: Excellent
- Firefox 88+: Excellent
- Safari 14+: Good
- Mobile browsers: Good (with reduced effects)

## Troubleshooting

### Server won't start
- Check if port 5001 is available
- Ensure Flask is installed: `pip install flask`
- Try a different port: `python server.py --port 5002`

### Images not loading
- Verify `generated_samples/` directory exists
- Check file permissions
- Ensure images are in .jpg or .png format

### Low FPS
- Reduce number of images in scene
- Disable particle effects
- Turn off shadows in the viewer settings
- Close other browser tabs

### WebGL errors
- Update graphics drivers
- Try a different browser
- Check WebGL support: visit https://get.webgl.org/

## Development

### Running in Development Mode

```bash
python server.py --debug
```

This enables:
- Auto-reload on file changes
- Detailed error messages
- CORS headers for development

### Testing

```bash
# Test API endpoints
curl http://localhost:5001/health
curl http://localhost:5001/api/sample-images

# Load viewer in browser
open http://localhost:5001
```

## Future Enhancements

Planned features:
- [ ] VR/AR support for immersive viewing
- [ ] Real-time image generation preview
- [ ] Collaborative gallery editing
- [ ] Animation timeline for image transitions
- [ ] Advanced shader effects library
- [ ] Integration with ASX Language Framework
- [ ] Cloud storage for gallery scenes

## Credits

- **Three.js**: 3D graphics library
- **Janus**: Text-to-image model by DeepSeek AI
- **MX2PRO**: Graphics boost integration layer

## License

See main project LICENSE file.

## Support

For issues and questions:
- GitHub Issues: [project repository]
- Documentation: See main README.md
- Examples: Check `demo/app_mx2pro.py`

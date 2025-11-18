"""
MX2PRO Three.js Graphics Server
Flask server for serving Three.js visualization
"""

from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_cors import CORS
import os
import json
import base64
from pathlib import Path

app = Flask(__name__,
            static_folder='static',
            template_folder='templates')
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
GENERATED_IMAGES_FOLDER = '../generated_samples'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/')
def index():
    """Serve the main Three.js viewer page"""
    return render_template('viewer.html')

@app.route('/api/sample-images', methods=['GET'])
def get_sample_images():
    """Get sample images from the generated_samples folder"""
    try:
        images_path = Path(__file__).parent / GENERATED_IMAGES_FOLDER

        if not images_path.exists():
            return jsonify({
                'images': [],
                'metadata': [],
                'message': 'No generated images found'
            })

        image_files = []
        metadata = []

        for img_file in images_path.glob('*.jpg'):
            # Create URL for the image
            image_url = f'/api/images/{img_file.name}'
            image_files.append(image_url)
            metadata.append(f'Image {len(image_files)}')

        for img_file in images_path.glob('*.png'):
            image_url = f'/api/images/{img_file.name}'
            image_files.append(image_url)
            metadata.append(f'Image {len(image_files)}')

        return jsonify({
            'images': image_files,
            'metadata': metadata,
            'count': len(image_files)
        })
    except Exception as e:
        return jsonify({
            'error': str(e),
            'images': [],
            'metadata': []
        }), 500

@app.route('/api/images/<filename>')
def serve_image(filename):
    """Serve images from the generated_samples folder"""
    try:
        images_path = Path(__file__).parent / GENERATED_IMAGES_FOLDER
        return send_from_directory(images_path, filename)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@app.route('/api/upload', methods=['POST'])
def upload_image():
    """Handle image upload"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400

        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        filename = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(filename)

        return jsonify({
            'success': True,
            'filename': file.filename,
            'url': f'/api/uploads/{file.filename}'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/uploads/<filename>')
def serve_upload(filename):
    """Serve uploaded images"""
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/api/scene/save', methods=['POST'])
def save_scene():
    """Save 3D scene configuration"""
    try:
        scene_data = request.json
        scene_file = os.path.join(UPLOAD_FOLDER, 'scene.json')

        with open(scene_file, 'w') as f:
            json.dump(scene_data, f, indent=2)

        return jsonify({'success': True, 'message': 'Scene saved successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/scene/load', methods=['GET'])
def load_scene():
    """Load saved 3D scene configuration"""
    try:
        scene_file = os.path.join(UPLOAD_FOLDER, 'scene.json')

        if not os.path.exists(scene_file):
            return jsonify({'error': 'No saved scene found'}), 404

        with open(scene_file, 'r') as f:
            scene_data = json.load(f)

        return jsonify(scene_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-preview', methods=['POST'])
def generate_preview():
    """Generate a preview of the 3D scene"""
    try:
        data = request.json
        layout = data.get('layout', 'grid')
        image_count = data.get('image_count', 5)

        # This would integrate with the Janus model to generate preview images
        # For now, return mock data
        return jsonify({
            'success': True,
            'layout': layout,
            'preview_url': '/api/preview/default.png'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'MX2PRO Three.js Graphics Server',
        'version': '1.0.0'
    })

def run_server(host='0.0.0.0', port=5001, debug=False):
    """Run the Flask server"""
    print(f"""
    ╔═══════════════════════════════════════════════════════╗
    ║         MX2PRO Three.js Graphics Server               ║
    ║                                                       ║
    ║  Server running at: http://{host}:{port}           ║
    ║                                                       ║
    ║  Endpoints:                                           ║
    ║  - /                    : Main viewer                 ║
    ║  - /api/sample-images   : Get generated images        ║
    ║  - /api/upload          : Upload images               ║
    ║  - /health              : Health check                ║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝
    """)

    app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='MX2PRO Three.js Graphics Server')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=5001, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')

    args = parser.parse_args()
    run_server(host=args.host, port=args.port, debug=args.debug)

/**
 * World of DOOM Builder - Main Server
 * Game studio platform with addon marketplace
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/assets', express.static('assets'));
app.use('/addons', express.static('addons'));

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /wad|png|jpg|jpeg|json|zip/;
        const ext = path.extname(file.originalname).toLowerCase().slice(1);
        if (allowedTypes.test(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// ============================================
// API ROUTES
// ============================================

/**
 * GET /api/wads
 * List all available WAD files
 */
app.get('/api/wads', (req, res) => {
    const wadsDir = path.join(__dirname, 'wads');

    if (!fs.existsSync(wadsDir)) {
        return res.json({ wads: [], message: 'No WAD files found. Run ./download-freedoom.sh' });
    }

    const files = fs.readdirSync(wadsDir)
        .filter(file => file.toLowerCase().endsWith('.wad'))
        .map(file => {
            const stats = fs.statSync(path.join(wadsDir, file));
            return {
                name: file,
                size: stats.size,
                modified: stats.mtime,
                path: `/wads/${file}`
            };
        });

    res.json({ wads: files, count: files.length });
});

/**
 * GET /api/addons
 * List all marketplace addons
 */
app.get('/api/addons', (req, res) => {
    const addonsDir = path.join(__dirname, 'addons');

    if (!fs.existsSync(addonsDir)) {
        fs.mkdirSync(addonsDir, { recursive: true });
        return res.json({ addons: [] });
    }

    const addons = fs.readdirSync(addonsDir)
        .filter(dir => {
            const manifestPath = path.join(addonsDir, dir, 'manifest.json');
            return fs.existsSync(manifestPath);
        })
        .map(dir => {
            const manifestPath = path.join(addonsDir, dir, 'manifest.json');
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            return {
                id: dir,
                ...manifest,
                previewUrl: `/addons/${dir}/preview.png`
            };
        });

    res.json({ addons: addons, count: addons.length });
});

/**
 * POST /api/addons/create
 * Create a new addon
 */
app.post('/api/addons/create', (req, res) => {
    try {
        const { name, description, price, author } = req.body;

        const addonId = name.toLowerCase().replace(/\s+/g, '-');
        const addonDir = path.join(__dirname, 'addons', addonId);

        if (fs.existsSync(addonDir)) {
            return res.status(400).json({ error: 'Addon already exists' });
        }

        // Create addon structure
        fs.mkdirSync(path.join(addonDir, 'assets', 'sprites'), { recursive: true });
        fs.mkdirSync(path.join(addonDir, 'assets', 'textures'), { recursive: true });
        fs.mkdirSync(path.join(addonDir, 'assets', 'maps'), { recursive: true });

        // Create manifest
        const manifest = {
            name: name,
            description: description,
            version: '1.0.0',
            author: author,
            created: new Date().toISOString(),
            price: price || 0,
            currency: 'USD',
            license: 'commercial',
            assets: {
                sprites: 0,
                textures: 0,
                maps: 0
            }
        };

        fs.writeFileSync(
            path.join(addonDir, 'manifest.json'),
            JSON.stringify(manifest, null, 2)
        );

        // Create README
        const readme = `# ${name}\n\n${description}\n\nCreated: ${new Date().toLocaleDateString()}`;
        fs.writeFileSync(path.join(addonDir, 'README.md'), readme);

        res.json({
            success: true,
            addon: { id: addonId, ...manifest },
            message: 'Addon created successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/upload/wad
 * Upload a WAD file
 */
app.post('/api/upload/wad', upload.single('wad'), (req, res) => {
    try {
        const file = req.file;
        const wadsDir = path.join(__dirname, 'wads');

        if (!fs.existsSync(wadsDir)) {
            fs.mkdirSync(wadsDir, { recursive: true });
        }

        const targetPath = path.join(wadsDir, file.originalname);
        fs.renameSync(file.path, targetPath);

        res.json({
            success: true,
            file: file.originalname,
            size: file.size,
            message: 'WAD file uploaded successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/extract
 * Extract assets from WAD file
 */
app.post('/api/extract', async (req, res) => {
    try {
        const { wadFile, outputDir } = req.body;
        const WADExtractor = require('./tools/wad-extractor');

        const wadPath = path.join(__dirname, 'wads', wadFile);
        const extractDir = path.join(__dirname, 'assets', outputDir || 'extracted');

        const extractor = new WADExtractor(wadPath);
        const success = await extractor.load();

        if (!success) {
            return res.status(400).json({ error: 'Failed to load WAD file' });
        }

        const result = await extractor.extractAll(extractDir);

        res.json({
            success: true,
            ...result,
            message: 'Assets extracted successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/stats
 * Get platform statistics
 */
app.get('/api/stats', (req, res) => {
    const stats = {
        wads: 0,
        addons: 0,
        assets: {
            sprites: 0,
            textures: 0,
            maps: 0
        }
    };

    // Count WADs
    const wadsDir = path.join(__dirname, 'wads');
    if (fs.existsSync(wadsDir)) {
        stats.wads = fs.readdirSync(wadsDir).filter(f => f.endsWith('.wad')).length;
    }

    // Count addons
    const addonsDir = path.join(__dirname, 'addons');
    if (fs.existsSync(addonsDir)) {
        stats.addons = fs.readdirSync(addonsDir).length;
    }

    // Count assets
    const assetsDir = path.join(__dirname, 'assets', 'extracted');
    if (fs.existsSync(assetsDir)) {
        if (fs.existsSync(path.join(assetsDir, 'sprites'))) {
            stats.assets.sprites = fs.readdirSync(path.join(assetsDir, 'sprites')).length;
        }
        if (fs.existsSync(path.join(assetsDir, 'textures'))) {
            stats.assets.textures = fs.readdirSync(path.join(assetsDir, 'textures')).length;
        }
        if (fs.existsSync(path.join(assetsDir, 'maps'))) {
            stats.assets.maps = fs.readdirSync(path.join(assetsDir, 'maps')).length;
        }
    }

    res.json(stats);
});

// ============================================
// HTML ROUTES
// ============================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/studio', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'studio.html'));
});

app.get('/marketplace', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'marketplace.html'));
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║      World of DOOM Builder - Server Running          ║
╚═══════════════════════════════════════════════════════╝

🌐 Server: http://localhost:${PORT}
🎮 Studio: http://localhost:${PORT}/studio
🏪 Marketplace: http://localhost:${PORT}/marketplace

📂 Directories:
   - WADs: ./wads/
   - Assets: ./assets/
   - Addons: ./addons/

🚀 Ready to build DOOM-like RPG games!
    `);

    // Check for WAD files
    const wadsDir = path.join(__dirname, 'wads');
    if (!fs.existsSync(wadsDir) || fs.readdirSync(wadsDir).length === 0) {
        console.log(`
⚠️  No WAD files found!

To get started:
1. Download Freedoom (free): ./download-freedoom.sh
2. Or copy your own DOOM.WAD to: wads/
        `);
    }
});

module.exports = app;

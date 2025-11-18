/**
 * WAD Asset Extractor
 * Extracts sprites, textures, maps from DOOM WAD files
 * Works with any IWAD (DOOM, Freedoom, etc.)
 */

const fs = require('fs');
const path = require('path');

class WADExtractor {
    constructor(wadPath) {
        this.wadPath = wadPath;
        this.wadData = null;
        this.directory = [];
    }

    /**
     * Read WAD file header and directory
     */
    async load() {
        try {
            this.wadData = fs.readFileSync(this.wadPath);

            // Read WAD header
            const magic = this.wadData.toString('ascii', 0, 4);
            if (magic !== 'IWAD' && magic !== 'PWAD') {
                throw new Error('Invalid WAD file');
            }

            const numLumps = this.wadData.readInt32LE(4);
            const directoryOffset = this.wadData.readInt32LE(8);

            console.log(`📦 WAD Type: ${magic}`);
            console.log(`📊 Lumps: ${numLumps}`);
            console.log(`📍 Directory Offset: ${directoryOffset}`);

            // Read directory
            for (let i = 0; i < numLumps; i++) {
                const offset = directoryOffset + (i * 16);

                const lump = {
                    filepos: this.wadData.readInt32LE(offset),
                    size: this.wadData.readInt32LE(offset + 4),
                    name: this.wadData.toString('ascii', offset + 8, offset + 16).replace(/\0/g, '')
                };

                this.directory.push(lump);
            }

            console.log(`✅ Loaded ${this.directory.length} lumps`);
            return true;
        } catch (error) {
            console.error('❌ Error loading WAD:', error.message);
            return false;
        }
    }

    /**
     * Extract all sprites
     */
    async extractSprites(outputDir) {
        console.log('\n🎨 Extracting sprites...');

        const spritesDir = path.join(outputDir, 'sprites');
        fs.mkdirSync(spritesDir, { recursive: true });

        let spriteCount = 0;
        let inSpriteSection = false;

        for (const lump of this.directory) {
            // Sprite section is between S_START and S_END
            if (lump.name === 'S_START' || lump.name === 'SS_START') {
                inSpriteSection = true;
                continue;
            }
            if (lump.name === 'S_END' || lump.name === 'SS_END') {
                inSpriteSection = false;
                continue;
            }

            if (inSpriteSection && lump.size > 0) {
                const data = this.wadData.slice(lump.filepos, lump.filepos + lump.size);
                const outputPath = path.join(spritesDir, `${lump.name}.lmp`);
                fs.writeFileSync(outputPath, data);
                spriteCount++;
            }
        }

        console.log(`✅ Extracted ${spriteCount} sprites to ${spritesDir}`);
        return spriteCount;
    }

    /**
     * Extract all textures/flats
     */
    async extractTextures(outputDir) {
        console.log('\n🖼️  Extracting textures...');

        const texturesDir = path.join(outputDir, 'textures');
        fs.mkdirSync(texturesDir, { recursive: true });

        let textureCount = 0;
        let inFlatSection = false;

        for (const lump of this.directory) {
            // Flat section is between F_START and F_END
            if (lump.name === 'F_START' || lump.name === 'FF_START') {
                inFlatSection = true;
                continue;
            }
            if (lump.name === 'F_END' || lump.name === 'FF_END') {
                inFlatSection = false;
                continue;
            }

            if (inFlatSection && lump.size > 0) {
                const data = this.wadData.slice(lump.filepos, lump.filepos + lump.size);
                const outputPath = path.join(texturesDir, `${lump.name}.lmp`);
                fs.writeFileSync(outputPath, data);
                textureCount++;
            }
        }

        console.log(`✅ Extracted ${textureCount} textures to ${texturesDir}`);
        return textureCount;
    }

    /**
     * Extract all maps
     */
    async extractMaps(outputDir) {
        console.log('\n🗺️  Extracting maps...');

        const mapsDir = path.join(outputDir, 'maps');
        fs.mkdirSync(mapsDir, { recursive: true });

        let mapCount = 0;
        const mapMarkers = [];

        // Find all map markers (ExMx or MAPxx)
        for (let i = 0; i < this.directory.length; i++) {
            const name = this.directory[i].name;
            if (/^(E\dM\d|MAP\d{2})$/.test(name)) {
                mapMarkers.push({ index: i, name: name });
            }
        }

        for (const marker of mapMarkers) {
            const mapData = {
                name: marker.name,
                lumps: {}
            };

            // Extract map lumps (THINGS, LINEDEFS, SIDEDEFS, etc.)
            const mapLumpNames = ['THINGS', 'LINEDEFS', 'SIDEDEFS', 'VERTEXES', 'SEGS', 'SSECTORS', 'NODES', 'SECTORS', 'REJECT', 'BLOCKMAP'];

            for (let i = 1; i <= 10; i++) {
                const lump = this.directory[marker.index + i];
                if (lump && mapLumpNames.includes(lump.name)) {
                    const data = this.wadData.slice(lump.filepos, lump.filepos + lump.size);
                    mapData.lumps[lump.name] = data.toString('base64');
                }
            }

            const outputPath = path.join(mapsDir, `${marker.name}.json`);
            fs.writeFileSync(outputPath, JSON.stringify(mapData, null, 2));
            mapCount++;
        }

        console.log(`✅ Extracted ${mapCount} maps to ${mapsDir}`);
        return mapCount;
    }

    /**
     * Extract everything
     */
    async extractAll(outputDir) {
        console.log(`\n🚀 Extracting all assets from ${path.basename(this.wadPath)}...\n`);

        fs.mkdirSync(outputDir, { recursive: true });

        await this.extractSprites(outputDir);
        await this.extractTextures(outputDir);
        await this.extractMaps(outputDir);

        console.log('\n✅ Extraction complete!');

        // Generate index
        const index = {
            wad: path.basename(this.wadPath),
            extracted: new Date().toISOString(),
            stats: {
                sprites: fs.readdirSync(path.join(outputDir, 'sprites')).length,
                textures: fs.readdirSync(path.join(outputDir, 'textures')).length,
                maps: fs.readdirSync(path.join(outputDir, 'maps')).length
            }
        };

        fs.writeFileSync(
            path.join(outputDir, 'index.json'),
            JSON.stringify(index, null, 2)
        );

        console.log('\n📊 Extraction Summary:');
        console.log(`   Sprites: ${index.stats.sprites}`);
        console.log(`   Textures: ${index.stats.textures}`);
        console.log(`   Maps: ${index.stats.maps}`);

        return index;
    }

    /**
     * List all assets in WAD
     */
    listAssets() {
        console.log('\n📋 WAD Contents:\n');

        const categories = {
            sprites: [],
            textures: [],
            maps: [],
            sounds: [],
            music: [],
            other: []
        };

        let currentCategory = 'other';

        for (const lump of this.directory) {
            if (lump.name.match(/^(S_START|SS_START)$/)) currentCategory = 'sprites';
            else if (lump.name.match(/^(S_END|SS_END)$/)) currentCategory = 'other';
            else if (lump.name.match(/^(F_START|FF_START)$/)) currentCategory = 'textures';
            else if (lump.name.match(/^(F_END|FF_END)$/)) currentCategory = 'other';
            else if (lump.name.match(/^(E\dM\d|MAP\d{2})$/)) categories.maps.push(lump.name);
            else if (lump.name.match(/^DS/)) categories.sounds.push(lump.name);
            else if (lump.name.match(/^D_/)) categories.music.push(lump.name);
            else if (currentCategory === 'sprites' && lump.size > 0) categories.sprites.push(lump.name);
            else if (currentCategory === 'textures' && lump.size > 0) categories.textures.push(lump.name);
        }

        console.log(`🎨 Sprites: ${categories.sprites.length}`);
        console.log(`🖼️  Textures: ${categories.textures.length}`);
        console.log(`🗺️  Maps: ${categories.maps.length}`);
        console.log(`🔊 Sounds: ${categories.sounds.length}`);
        console.log(`🎵 Music: ${categories.music.length}`);

        return categories;
    }
}

// CLI Usage
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log(`
╔═══════════════════════════════════════════════════════╗
║           WAD Asset Extractor                         ║
╚═══════════════════════════════════════════════════════╝

Usage:
  node wad-extractor.js <wad-file> <output-dir>

Examples:
  node wad-extractor.js wads/freedoom1.wad assets/extracted
  node wad-extractor.js wads/doom.wad assets/doom

Options:
  --list    List assets without extracting
        `);
        process.exit(1);
    }

    const wadPath = args[0];
    const outputDir = args[1];
    const listOnly = args.includes('--list');

    const extractor = new WADExtractor(wadPath);

    extractor.load().then(success => {
        if (!success) {
            process.exit(1);
        }

        if (listOnly) {
            extractor.listAssets();
        } else {
            extractor.extractAll(outputDir);
        }
    });
}

module.exports = WADExtractor;

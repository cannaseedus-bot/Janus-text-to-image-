# 🚀 QUICKSTART - Build DOOM Addons in 5 Minutes

## Step 1: Install (30 seconds)

```bash
npm install
```

## Step 2: Get a Legal WAD File (2 minutes)

### Option A: FREE - Download Freedoom
```bash
./download-freedoom.sh
```

### Option B: FREE - Shareware DOOM
```bash
cd wads
wget http://distro.ibiblio.org/slitaz/sources/packages/d/doom1.wad
```

### Option C: BEST - Buy DOOM ($4.99)
1. Buy on Steam: https://store.steampowered.com/app/2280/
2. Copy DOOM.WAD to `wads/` folder

## Step 3: Start Studio (10 seconds)

```bash
npm run studio
```

Open: **http://localhost:3000/studio**

## Step 4: Extract Assets (1 minute)

1. Click "📦 Extract Assets"
2. Select your WAD file
3. Click "Extract All"
4. Wait for extraction to complete

## Step 5: Create Your First Addon (1 minute)

1. Click "➕ Create Addon"
2. Fill in:
   - Name: "My First Pack"
   - Description: "Custom weapons and monsters"
   - Author: Your Name
   - Price: 9.99
3. Click "Create"

## Step 6: Add Custom Content

Now you can:
- Add custom sprites to `addons/my-first-pack/assets/sprites/`
- Add custom textures to `addons/my-first-pack/assets/textures/`
- Add custom maps to `addons/my-first-pack/assets/maps/`

## Step 7: Package & Sell

1. Click "📤 Publish" on your addon
2. Set price
3. Upload preview image
4. Share marketplace link

---

## 💰 Start Earning

### Example Addons to Create:

**Fantasy RPG Pack ($19.99)**
- Medieval sprites
- Castle textures
- Fantasy maps

**Horror Pack ($14.99)**
- Zombie sprites
- Bloody textures
- Scary maps

**Sci-Fi Pack ($24.99)**
- Alien sprites
- Tech textures
- Space station maps

### Revenue Potential:

- Sell 10 packs @ $19.99 = $199
- Sell 100 packs @ $19.99 = $1,999
- Sell 1,000 packs @ $19.99 = $19,990

---

## 🎯 Next Steps

1. **Learn WAD Format**: Read `tools/wad-extractor.js`
2. **Create Assets**: Use sprite editor (coming soon)
3. **Build Marketplace**: Enable e-commerce
4. **Market Your Addons**: Social media, forums, Discord

---

## 📖 Documentation

- Full Docs: `README.md`
- WAD Extractor: `tools/wad-extractor.js`
- API Docs: See `server.js`
- Legal Info: `LICENSE.md`

---

## ⚖️ Legal Reminder

- ✅ You own the WAD file (bought or Freedoom)
- ✅ You own the custom content you create
- ✅ You can sell your custom content
- ❌ Don't distribute copyrighted WAD files
- ❌ Don't sell id Software's original content

---

## 🆘 Troubleshooting

**No WAD files?**
```bash
./download-freedoom.sh
```

**Can't extract?**
- Make sure WAD file is in `wads/` folder
- Check file is valid .wad format

**Need help?**
- GitHub Issues
- Discord: discord.gg/doombuilder
- Email: support@worldofdoombuilder.com

---

## ✅ You're Ready!

**Build amazing DOOM addons and start selling!** 🚀💰

Time to first addon: **5 minutes**
Time to first sale: **Depends on your marketing!**

**GO BUILD!** 🎮

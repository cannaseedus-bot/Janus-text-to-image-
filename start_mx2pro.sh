#!/bin/bash

# MX2PRO MICRONAUT AI Startup Script
# Launches both Three.js server and Gradio demo

echo "╔═══════════════════════════════════════════════════════╗"
echo "║         MX2PRO MICRONAUT AI - STARTUP                 ║"
echo "║   Enhanced Janus with Three.js Graphics Boost         ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    exit 1
fi

# Check if pip is installed
if ! command -v pip &> /dev/null; then
    echo "❌ Error: pip is not installed"
    exit 1
fi

# Check if requirements are installed
echo "📦 Checking dependencies..."
pip list | grep -q flask
if [ $? -ne 0 ]; then
    echo "⚠️  Flask not found. Installing dependencies..."
    pip install -r requirements.txt
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p generated_samples
mkdir -p threejs_graphics/uploads

# Start Three.js server in background
echo "🚀 Starting Three.js Graphics Server..."
cd threejs_graphics
python server.py &
THREEJS_PID=$!
cd ..

# Wait for Three.js server to start
echo "⏳ Waiting for Three.js server to start..."
sleep 3

# Check if Three.js server is running
if ps -p $THREEJS_PID > /dev/null; then
    echo "✅ Three.js server started successfully (PID: $THREEJS_PID)"
else
    echo "❌ Failed to start Three.js server"
    exit 1
fi

# Start Gradio demo
echo "🚀 Starting MX2PRO MICRONAUT AI Demo..."
python demo/app_mx2pro.py

# Cleanup on exit
echo ""
echo "🛑 Shutting down servers..."
kill $THREEJS_PID 2>/dev/null
echo "✅ Shutdown complete"

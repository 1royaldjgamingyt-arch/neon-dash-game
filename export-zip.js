#!/usr/bin/env node
/**
 * NEON DASH — Playgama & Standalone ZIP Exporter
 * Creates two ready-to-upload zip archives:
 * 1. neon-dash-playgama.zip: Production optimized build from dist/ (ready for Playgama)
 * 2. neon-dash-standalone.zip: Raw vanilla source files (index.html, style.css, game.js, rules.js, playgama-bridge-config.json)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');

console.log('📦 Starting NEON DASH Packaging Process...');

// 1. Build production bundle with Vite
console.log('⚡ Building production bundle with Vite...');
execSync('npm run build', { stdio: 'inherit' });

// 2. Ensure playgama-bridge-config.json is present in dist
const configFile = 'playgama-bridge-config.json';
const srcConfig = path.join(ROOT_DIR, configFile);
const dstConfig = path.join(DIST_DIR, configFile);
if (fs.existsSync(srcConfig)) {
  fs.copyFileSync(srcConfig, dstConfig);
  console.log(`📄 Copied ${configFile} to dist/`);
}

// 3. Python-based zero-dependency zip creation
const pythonScript = `
import os, zipfile

def create_zip(archive_name, base_folder, is_dir=False):
    with zipfile.ZipFile(archive_name, 'w', zipfile.ZIP_DEFLATED) as z:
        if is_dir:
            for root, dirs, files in os.walk(base_folder):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, base_folder)
                    z.write(file_path, arcname)
        else:
            for file in base_folder:
                if os.path.exists(file):
                    z.write(file, os.path.basename(file))
    print(f"✅ Created {archive_name} ({os.path.getsize(archive_name):,} bytes)")

# 1. Playgama Package (root index.html inside zip from dist)
create_zip("neon-dash-playgama.zip", "dist", is_dir=True)

# 2. Standalone Vanilla Source Package
raw_files = ["index.html", "style.css", "game.js", "rules.js", "playgama-bridge-config.json"]
create_zip("neon-dash-standalone.zip", raw_files, is_dir=False)
`;

try {
  execSync(`python3 -c '${pythonScript.replace(/'/g, "'\\''")}'`, { stdio: 'inherit' });
  console.log('\n🚀 Packaging complete! Ready for Playgama portal submission.');
} catch (err) {
  console.error('Packaging failed:', err.message);
  process.exit(1);
}

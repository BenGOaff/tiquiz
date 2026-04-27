#!/usr/bin/env bash
# ============================================================
#  svg-to-mp4.sh
#  Convertit le SVG animé Tiquiz 60s en vidéo MP4.
#
#  Pré-requis :
#   - chromium ou chrome installé
#   - ffmpeg installé
#   - python3 + pip
#
#  Usage :
#   bash svg-to-mp4.sh
#
#  Sortie : video-tiquiz-60s.mp4 (1920x1080, 30 fps, 60 secondes)
#
#  Pour ajouter ta musique ensuite (musique = music.mp3) :
#   ffmpeg -i video-tiquiz-60s.mp4 -i music.mp3 -c:v copy \
#          -c:a aac -shortest video-tiquiz-final.mp4
# ============================================================

set -e

SVG_FILE="video-tiquiz-60s.svg"
OUTPUT="video-tiquiz-60s.mp4"
FRAMES_DIR="/tmp/tiquiz-frames"
DURATION=60
FPS=30
TOTAL_FRAMES=$((DURATION * FPS))

# Nettoyage
rm -rf "$FRAMES_DIR"
mkdir -p "$FRAMES_DIR"

echo "→ Génération de $TOTAL_FRAMES frames depuis $SVG_FILE"

# Génère un script Python qui :
# 1. Crée une page HTML qui embed le SVG
# 2. Lance Chrome headless pour screenshot chaque frame à la bonne timestamp
# Le SVG utilise SMIL → on doit "scrubber" l'animation à chaque timestamp.

python3 - <<'PYEOF'
import os
import time
import subprocess
from pathlib import Path

svg_path = os.path.abspath("video-tiquiz-60s.svg")
frames_dir = "/tmp/tiquiz-frames"
total_frames = 1800  # 60s × 30fps
fps = 30

# Script HTML qui pause le SVG à un timestamp donné via setCurrentTime()
html_template = """<!DOCTYPE html>
<html><head><style>
  body { margin: 0; padding: 0; background: #0B0F1A; }
  svg { display: block; width: 1920px; height: 1080px; }
</style></head>
<body>
  <object id="svg" type="image/svg+xml" data="file://""" + svg_path + """"></object>
  <script>
    const obj = document.getElementById('svg');
    obj.addEventListener('load', () => {
      const svgDoc = obj.contentDocument;
      const svgEl = svgDoc.documentElement;
      svgEl.pauseAnimations();
      svgEl.setCurrentTime(window.TIMESTAMP || 0);
    });
  </script>
</body></html>
"""

# Crée HTML
html_path = "/tmp/tiquiz-render.html"
with open(html_path, "w") as f:
    f.write(html_template)

# Pour chaque frame, on lance chrome headless avec un timestamp
print(f"→ Démarrage du rendu de {total_frames} frames...")
for i in range(total_frames):
    timestamp = i / fps
    out_path = f"{frames_dir}/frame_{i:05d}.png"

    # Inject timestamp via window.TIMESTAMP
    custom_html = html_template.replace(
        "window.TIMESTAMP || 0",
        f"{timestamp}"
    )
    with open(html_path, "w") as f:
        f.write(custom_html)

    # Chrome headless screenshot
    subprocess.run([
        "chromium",
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        "--window-size=1920,1080",
        f"--screenshot={out_path}",
        f"file://{html_path}"
    ], check=True, capture_output=True)

    if i % 30 == 0:
        print(f"   Frame {i}/{total_frames} ({timestamp:.1f}s)")

print("→ Rendu terminé. Compilation MP4...")
PYEOF

# Compile les frames en MP4
ffmpeg -y -framerate $FPS -i "$FRAMES_DIR/frame_%05d.png" \
  -c:v libx264 -pix_fmt yuv420p -crf 18 \
  "$OUTPUT"

echo ""
echo "✓ Vidéo générée : $OUTPUT"
echo ""
echo "Pour ajouter ta musique (music.mp3) :"
echo "  ffmpeg -i $OUTPUT -i music.mp3 -c:v copy -c:a aac -shortest video-tiquiz-final.mp4"

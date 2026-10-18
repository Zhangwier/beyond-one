#!/bin/sh
# Downloads the OFL fonts used by the film into this folder.
cd "$(dirname "$0")"
for w in Thin Light Regular Bold Black; do curl -sL -o NotoSansSC-$w.otf "https://github.com/notofonts/noto-cjk/raw/main/Sans/SubsetOTF/SC/NotoSansSC-$w.otf"; done
for w in Light Regular Bold; do curl -sL -o NotoSerifSC-$w.otf "https://github.com/notofonts/noto-cjk/raw/main/Serif/SubsetOTF/SC/NotoSerifSC-$w.otf"; done
curl -sL -o PlexMono.ttf "https://github.com/google/fonts/raw/main/ofl/ibmplexmono/IBMPlexMono-Regular.ttf"
curl -sL -o PlexMonoMed.ttf "https://github.com/google/fonts/raw/main/ofl/ibmplexmono/IBMPlexMono-Medium.ttf"

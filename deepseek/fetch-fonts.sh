#!/bin/sh
# 下载本片使用的 OFL 字体到 ./fonts。
# 字体体积大且为第三方资源，不纳入仓库；首次运行前执行一次即可。
set -e
cd "$(dirname "$0")"

mkdir -p fonts

echo "→ Noto Serif SC / Noto Sans SC (OFL)"
curl -sL -o fonts/NotoSerifSC-VF.ttf \
  "https://github.com/notofonts/noto-cjk/raw/main/Serif/Variable/OTF/Subset/NotoSerifSC-VF.otf.ttf" \
  || curl -sL -o fonts/NotoSerifSC-VF.ttf \
  "https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Serif/Variable/OTF/Subset/NotoSerifSC-VF.otf"

curl -sL -o fonts/NotoSansSC-VF.ttf \
  "https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/Variable/OTF/Subset/NotoSansSC-VF.otf"

echo "done. 若下载失败，可从 https://fonts.google.com/noto 获取同名可变字体并放入 fonts/"

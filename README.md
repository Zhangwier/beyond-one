# 超出一人之力 · BEYOND ONE

**同一份提示词，三个模型，三部片子。**

一次受控的横向实测：把同一份创作任务书（[`prompt/PROMPT.md`](prompt/PROMPT.md)）分别交给
Gemini 4 Argon、Opus 5.5、DeepSeek 4.1 Flash，要求各自产出一部 75–90 秒、关于「为什么要使用 AI」的
代码生成动态图形短片。三份交付物全部收录在此，未经修改。

此处不评选优劣。真正值得看的是：**同一句自然语言需求，被三种工程路径落实之后，成品长什么样。**

---

## 三部片子

| 模型 | 目录 | 时长 | 音频 | 实现路径 | 视觉语言 |
|---|---|---|---|---|---|
| Gemini 4 Argon | [`gemini/`](gemini/) | 84 s | 44.1 kHz | 单文件 HTML，Canvas2D 实时计算 | 暗场工程 HUD、张拉穹顶、霓虹青/琥珀 |
| Opus 5.5 | [`opus/`](opus/) | 88 s | 96 kHz | 多文件 TS 工程，Node + Skia 离屏渲染 | 纸本技术图纸、点阵、蓝/朱红语义双色 |
| DeepSeek 4.1 Flash | [`deepseek/`](deepseek/) | 84 s | 48 kHz | 手写 WebGL2 三渲染目标，Playwright 驱动导出 | 纸墨 + 负片，朱红全片仅用两次 |
---

## 共同的约束

提示词对这些点是明确写死的，三家都遵守了：

- 不使用素材库、贴图、采样音乐
- 不使用任何视频生成模型
- 每一帧是时间 `t` 的**确定性函数**——同一个 `t` 必然得到同一帧
- 音乐与视觉共享事件时间，而非后期对波形
- 无旁白，让视觉自己叙述

这条约束是这个对比能成立的前提：素材差异被消除了，剩下的变量只有**模型如何理解并落实一句需求**。

---

## 三种技术路径

### 单文件自包含 —— Gemini

一份 HTML 就包含了全部：几何计算、动态汉字排版、Web Audio 程序化配乐。
页面暴露确定性帧钩子 `window.__renderFrame(i)`，可以从外部逐帧驱动，不依赖播放时钟。
自带录制导出与 1080P↔4K 切换。

优势是零依赖、随开随用；代价是排版在信息密集段落出现了文字重叠（保留原样，未修补）。

### 引擎化工程 —— Opus

引擎 / 场景 / 乐谱严格分层，`src/engine/score.ts` 是**唯一时钟**：合成器从它写音乐，
场景从它读时间，二者共用同一份数据，因此画面与鼓点不可能漂移。

场景用 `samples(t)` 声明式地要求运动模糊子帧数，渲染器做精确的累积平均。
预览（浏览器 Canvas）与导出（Node + Skia）跑同一份 `renderFrame`。

### 底层手写 —— DeepSeek

手写 WebGL2，三个渲染目标分别承载纸、墨、排版，最后一个合成 pass 做正片叠底，
因此字母里能看见纸纹。笔触由折线经弧长重采样、沿法线挤成带，片元着色器计算笔芯 / 枯笔 / 湿边。

配乐由纯 JS 加法合成器直接写 24-bit WAV，同时导出**帧级事件表**供画面读取。
13 格分镜表的每一刀都落在拍点上。

---

## 仓库结构

```
beyond-one/
├─ prompt/
│  └─ PROMPT.md            三个模型共同收到的任务书
├─ gemini/
│  └─ beyond-one.html      完整影片（单文件，浏览器打开即播放）
├─ opus/
│  ├─ src/engine/          时钟、笔触、排版、调色板、工具
│  ├─ src/scenes/          六个场景
│  ├─ scripts/             配乐合成、离屏渲染
│  ├─ preview/             浏览器预览
│  └─ docs/                TREATMENT.md（创作阐述）、ENGINE.md（引擎说明）
├─ deepseek/
│  ├─ src/engine/          WebGL2 核心、纸、笔刷、合成、排版、音频
│  ├─ src/scenes/          13 格分镜
│  ├─ tools/               配乐、预览服务、抓帧导出、字幕
│  └─ out/*.srt            中英字幕
└─ docs/
   └─ COMPARISON.md        三家的技术规格与实现差异对照
```

---

## 运行

三部片子各自独立，互不依赖。

### Gemini

直接用浏览器打开 `gemini/beyond-one.html`。无需服务器、无需构建、无需联网。

### Opus

```bash
cd opus
npm install
sh fonts/fetch-fonts.sh        # 首次：下载 OFL 字体（约 42 MB，未入库）
npm run synth                  # 合成配乐 → out/score.wav + data/audio.json
npm run preview                # 浏览器预览 http://localhost:5173/preview/
npx tsx scripts/render.ts video --out out/film.mp4
```

### DeepSeek

```bash
cd deepseek
npm install                    # 仅依赖 playwright-core
sh fetch-fonts.sh              # 首次：下载 OFL 字体
node tools/score.mjs           # 合成配乐
node tools/serve.mjs 5177      # 预览 http://127.0.0.1:5177/
node tools/capture.mjs film --fps 60 --crf 15 --workers 4 --out out/film.mp4
```

预览快捷键三家一致：`空格` 播放/暂停 · `←/→` ±1 秒 · `,/.` 单帧 · `[/]` 切格 · `h` 隐藏 HUD。

---

## 关于字体

三家都使用 Noto Sans SC / Noto Serif SC（SIL OFL）与 IBM Plex Mono。
可变字体体积大，不纳入仓库；各目录下均有 `fetch-fonts.sh`。
若脚本失效，可从 [Google Fonts](https://fonts.google.com/noto) 获取同名文件放入 `fonts/`。

字体之外，**没有其他外部素材**：没有贴图、没有采样音频、没有第三方视频模型。

---

## 说明

- `_local/` 为本地保留区（投稿用成片与封面），已被 `.gitignore` 排除，不在仓库中。
- 各目录下的 `README.md` / `交付说明.md` 是模型自身产出的工程文档，按原样保留，未做统一改写。
- Opus 与 DeepSeek 的工程引用了 [mexicat/pdoom-video](https://github.com/mexicat/pdoom-video) 的
  **制作方法**（确定性时间轴、音乐锁定剪辑、字体即图像、模块化场景），视觉设计为原创。

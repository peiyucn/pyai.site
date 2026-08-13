// 从 poc_projects/moonshot-effect/pyai-site-hero.html 提取三个产物：
//   1. public/vendor/unicornstudio.js   —— UnicornStudio 引擎 UMD
//   2. src/data/hero-scene.json         —— hero 场景数据（shader 内嵌）
//   3. public/vendor/notosans-latin.css —— 文字带字体 @font-face（NotoSans-Latin woff2）
// 用法：node scripts/extract-hero.cjs
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, '..', 'poc_projects', 'moonshot-effect', 'pyai-site-hero.html');

const html = fs.readFileSync(SRC, 'utf8');

function extractBetween(html, startMarker, endMarker, startOffset = 0) {
  const s = html.indexOf(startMarker);
  if (s === -1) throw new Error(`未找到起始标记: ${startMarker.slice(0, 40)}`);
  const contentStart = s + startMarker.length + startOffset;
  const e = html.indexOf(endMarker, contentStart);
  if (e === -1) throw new Error(`未找到结束标记: ${endMarker.slice(0, 40)}`);
  return html.slice(contentStart, e);
}

// 1. 引擎（紧跟 rAF 兜底脚本之后的大 <script>）
// 注意：必须保留 UMD 包装头 `!function(e,t)`，否则运行时 `t is not defined`
const ENGINE_OPEN = '<script>!function(e,t)';
const engineStart = html.indexOf(ENGINE_OPEN);
if (engineStart === -1) throw new Error('未找到引擎起始标记');
const engineContentStart = engineStart + '<script>'.length; // 从 !function(e,t) 开始
const engineEnd = html.indexOf('</script>', engineContentStart);
if (engineEnd === -1) throw new Error('未找到引擎结束标记');
const engine = html.slice(engineContentStart, engineEnd);

// 2. 场景 JSON
const JSON_OPEN = '<script id="hero-scene-data" type="application/json">';
let sceneJson = extractBetween(html, JSON_OPEN, '</script>');
JSON.parse(sceneJson); // 校验合法性

// 2.1 定制：pyai.site 大标题 + 日全食满圈光弧
//     目标视觉（去 Moonshot 模仿感）：
//       - 金色满圈光弧 = 日全食，居中放大，随鼠标轻微位移（保留 godrays/beam 的 trackMouse）
//       - pyai.site 作为 WebGL 文字横穿日食中心，两端超出光弧边缘产生"灼烧"
//       - 文字固定不滚动（移除 replicate）、去透镜畸变（移除 voronoi）
sceneJson = sceneJson
  // 文字：Record Distill Create → pyai.site
  .replace('"textContent":"Record Distill Create"', '"textContent":"pyai.site"')
  // 字号放大：0.11 → 0.18（整体缩小 25%，pyai.site 约 670px@963 宽）
  .replace('"fontSize":0.11', '"fontSize":0.18')
  // 文字透明度：0.42（滚动背景氛围）→ 1.0（大标题主角）
  .replace('"opacity":0.42', '"opacity":1.0')
  // 配色：光弧保持金色，文字/光芒/格栅质感改灰白（冷暖对比，光弧成为唯一金色焦点）
  .replace('"fill":["#FFD48A"]', '"fill":["#EDEDED"]')
  .replace('vec3(1, 0.9333333333333333, 0.8509803921568627)', 'vec3(1, 1, 1)')
  .replace('vec3(1.10, 0.82, 0.55)', 'vec3(1.0, 1.0, 1.0)')
  // 移除文字两个子效果（replicate 滚动复制 + voronoi 透镜畸变）→ 固定不滚动
  .replace('"effects":["71bb708a-ecd8-48d4-8919-1175e974b5e0","7a55e45c-6061-49ef-a501-c6b0a931022a"]', '"effects":[]')
  // 光弧参数化：弧长 uBeamArc（随鼠标距离动态缩短 = 太阳被遮挡）、粗细 uBeamThickness。
  // ⚠️ 保留 angularFading 峰值衰减（1.04 - smoothstep(0, fade, diff)），其底值 0.04 天然
  //    形成"细圈"——弧段外圆环微弱可见、弧段内亮弧，是原始 Moonshot 的设计。
  //    之前用硬截断 smoothstep 导致弧段外归 0 → 细圈消失，是错误方向。
  //    只需把 fadeAmount 从固定 PI*0.5 改成动态 uBeamArc（弧长随鼠标伸缩）。
  .replace(
    'uniform float uBeamStrength;\\nuniform vec2 uResolution;',
    'uniform float uBeamStrength;\\nuniform float uBeamArc;\\nuniform float uBeamThickness;\\nuniform vec2 uResolution;',
  )
  .replace(
    'float angleFactor = angularFading(pointAngle, peakAngle, PI * 0.5);',
    'float angleFactor = angularFading(pointAngle, peakAngle, uBeamArc);',
  )
  // 光弧放大：scale 0.54 → 0.64（整体缩小 25%，环半径 UV 0.32）
  .replace('getBeam(uv, pos, 0.5400,', 'getBeam(uv, pos, 0.6400,')
  // 取消角度空间旋转 angleVal 0.6345→0（≈228° 旋转让弧段围绕左上角收缩），
  // 改为 0 后角度空间=屏幕空间，uBeamAngle 直接对应屏幕方向（0=右，π/2=上）。
  // 粗细 0.3000 → uBeamThickness（JS 驱动）。
  .replace(
    'getBeam(uv, pos, 0.6400, 0.6345, 0.5000, 0.3000, uTime, 0.7300, uResolution)',
    'getBeam(uv, pos, 0.6400, 0.0000, 0.5000, uBeamThickness, uTime, 0.7300, uResolution)',
  )
  // 日食中心：y 0.4 → 0.5（垂直居中，对齐 pyai.site 文字）
  .replace('vec2 pos = vec2(0.5, 0.4)', 'vec2 pos = vec2(0.5, 0.5)')
  // 增大 beam 环跟随鼠标：0.0600 → 0.5000（黑洞移动幅度加大，能把 pyai.site 含进去）
  .replace('mix(vec2(0), (uMousePos-0.5), 0.0600)', 'mix(vec2(0), (uMousePos-0.5), 0.5000)')
  // 限制光弧圆心不越界：鼠标移到底部时 pos.y 会 >0.5，圆环下移导致下边缘被裁掉
  // （"下半部分看不到，不是完整的圆"的根因）→ clamp 圆心到安全范围，圆环始终完整可见
  .replace(
    'vec2 pos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos-0.5), 0.5000);',
    'vec2 pos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos-0.5), 0.5000); pos = clamp(pos, vec2(0.15, 0.15), vec2(0.85, 0.85));',
  )
  // 色差（灼烧）随黑洞移动：chromab 的畸变中心 mPos 跟随系数与 beam 光弧圆心
  // 完全一致（0.5），使灼烧色差精确绑定到黑洞圆心，而非固定屏幕中心或随鼠标过度偏移
  .replace('mix(vec2(0), (uMousePos-0.5), 0.2500)', 'mix(vec2(0), (uMousePos-0.5), 0.5000)')
  // 透镜畸变（voronoi）随黑洞移动：voronoi 是真正的"黑洞透镜"，把文字吸入中心扭曲。
  // 原中心写死 vec2(0.5, 0.4)（固定不跟随，这就是"畸变写死"的根因）。
  // 改为与 beam 光弧圆心完全一致（(0.5,0.5) + 0.12 跟随 + clamp），
  // 使"文字被吸入黑洞"的透镜精确跟随黑洞移动。
  .replace(
    'vec2 mPos = vec2(0.5, 0.4) + mix(vec2(0), (uMousePos-0.5), 0.8000);',
    'vec2 mPos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos-0.5), 0.5000); mPos = clamp(mPos, vec2(0.15, 0.15), vec2(0.85, 0.85));',
  )
  .replace(
    'vec2 pos = mix(vec2(0.5, 0.4), mPos, floor(0.0000));',
    'vec2 pos = mPos;',
  )
  // ripple（涟漪）畸变随黑洞移动：ripple 也是几何位移层，原中心 vec2(0.5,0.5) + 0 跟随
  // （完全写死），导致"文字在黑洞中有一个写死的畸变"。改为与 beam 光弧圆心一致
  // （0.12 跟随 + clamp），使波纹透镜跟随黑洞移动。
  .replace(
    'vec2 pos = vec2(0.5, 0.5) + mix(vec2(0), uMousePos - 0.5, 0.0000);',
    'vec2 pos = vec2(0.5, 0.5) + mix(vec2(0), uMousePos - 0.5, 0.5000); pos = clamp(pos, vec2(0.15, 0.15), vec2(0.85, 0.85));',
  )
  // 色差方向原点 pos 也跟随黑洞圆心（原本固定屏幕中心，导致畸变方向不随黑洞移动）
  .replace('vec2 pos = vec2(0.5, 0.5);', 'vec2 pos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos-0.5), 0.5000);');
JSON.parse(sceneJson); // 替换后再次校验

// 2.2 删除几何畸变层（文字静止后不需要流动畸变）
//     liquify（液化）与 fbm（噪点蠕动）都是 uTime 驱动的持续几何位移，
//     对静止的 pyai.site 标题会产生"晃动/扭曲"的过头畸变。
//     ⚠️ 引擎只读 plane.visible（默认 true），不读 layer.visible，改 visible 无效 → 直接删层。
//     保留 retro_screen / chromab / ripple / diffuse / progressiveBlur 等
//     只影响颜色与模糊的后期层（不产生几何位移，是安全的"灼烧"质感）。
{
  const scene = JSON.parse(sceneJson);
  scene.history = scene.history.filter(
    (layer) => layer.type !== 'liquify' && layer.type !== 'fbm',
  );
  sceneJson = JSON.stringify(scene);
}
JSON.parse(sceneJson); // 再次校验

// 3. 字体 @font-face（含 base64 woff2）
const fontFace = extractBetween(html, '@font-face', 'font-style: normal; }');
// extractBetween 从 '@font-face' 之后开始，结果已含前导 ' {'，故这里直接拼接无需再加 '{'
const fontCss = `@font-face${fontFace}font-style: normal; }\n`;

// 写入
fs.mkdirSync(path.join(ROOT, 'public', 'vendor'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'src', 'data'), { recursive: true });

fs.writeFileSync(path.join(ROOT, 'public', 'vendor', 'unicornstudio.js'), engine);
fs.writeFileSync(path.join(ROOT, 'src', 'data', 'hero-scene.json'), sceneJson);
fs.writeFileSync(path.join(ROOT, 'public', 'vendor', 'notosans-latin.css'), fontCss);

console.log('✓ 引擎:', (engine.length / 1024).toFixed(1) + ' KB');
console.log('✓ 场景 JSON:', (sceneJson.length / 1024).toFixed(1) + ' KB');
console.log('✓ 字体:', (fontCss.length / 1024).toFixed(1) + ' KB');

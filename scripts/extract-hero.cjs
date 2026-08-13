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
//       - 文字固定不滚动（移除 replicate 滚动复制），保留 voronoi 透镜畸变
//         = 鼠标"搞乱"文字的原版实现（shatter 层 trackMouse 0.8，鼠标靠近时
//           文字被 voronoi 单元格打散错位）。⚠️ 引擎 getChildEffectItems() 依赖
//           text.effects 数组才把 voronoi 作为子效果渲染——清空 effects 会让
//           voronoi 层空挂不渲染，"搞乱"效果消失（曾踩坑）。
sceneJson = sceneJson
  // 文字：Record Distill Create → pyai.site
  .replace('"textContent":"Record Distill Create"', '"textContent":"pyai.site"')
  // 字号：0.11 → 0.15（整体缩小 15%，用户要求 pyai.site 再小一点）
  .replace('"fontSize":0.11', '"fontSize":0.15')
  // 文字透明度：0.42（滚动背景氛围）→ 1.0（大标题主角）
  .replace('"opacity":0.42', '"opacity":1.0')
  // 配色：光弧保持金色，文字/光芒/格栅质感改灰白（冷暖对比，光弧成为唯一金色焦点）
  .replace('"fill":["#FFD48A"]', '"fill":["#EDEDED"]')
  // text 加 trackMouse：引擎 disablePlanes() 会把"静态层"禁用（_canDraw=false）→ 文字消失。
  // trackMouse 非 0 让引擎判定 text 为动态层 → 持续渲染。
  .replace('"textContent":"pyai.site","fill":["#EDEDED"]', '"textContent":"pyai.site","trackMouse":0.3,"fill":["#EDEDED"]')
  .replace('vec3(1, 0.9333333333333333, 0.8509803921568627)', 'vec3(1, 1, 1)')
  .replace('vec3(1.10, 0.82, 0.55)', 'vec3(1.0, 1.0, 1.0)')
  // ⚠️ 鼠标"搞乱"文字：保留 voronoi（shatter）作为 text 子效果（原版实现，
  //    trackMouse 0.8 + mPos 跟随鼠标 → 鼠标扫过时文字被 voronoi 打散错位）。
  //    移除 replicate（滚动复制，用户要求文字固定不滚动）。
  //    effects 数组 = 引擎渲染子效果的开关，清空则 voronoi 空挂不渲染。
  .replace('"effects":["71bb708a-ecd8-48d4-8919-1175e974b5e0","7a55e45c-6061-49ef-a501-c6b0a931022a"]', '"effects":["7a55e45c-6061-49ef-a501-c6b0a931022a"]')
  // 光弧参数化：弧长 uBeamArc（随鼠标距离动态缩短 = 太阳被遮挡）、粗细 uBeamThickness。
  // ⚠️ 保留 angularFading 峰值衰减（1.04 - smoothstep(0, fade, diff)），其底值 0.04 天然
  //    形成"细圈"——弧段外圆环微弱可见、弧段内亮弧，是原始 Moonshot 的设计。
  //    之前用硬截断 smoothstep 导致弧段外归 0 → 细圈消失，是错误方向。
  //    只需把 fadeAmount 从固定 PI*0.5 改成动态 uBeamArc（弧长随鼠标伸缩）。
  .replace(
    'uniform float uBeamStrength;\\nuniform vec2 uResolution;',
    'uniform float uBeamStrength;\\nuniform float uBeamArc;\\nuniform float uBeamThickness;\\nuniform vec2 uBHOffset;\\nuniform vec2 uResolution;',
  )
  .replace(
    'float angleFactor = angularFading(pointAngle, peakAngle, PI * 0.5);',
    'float angleFactor = angularFading(pointAngle, peakAngle, uBeamArc);',
  )
  // 光弧：scale 0.54 → 0.60（整体缩小 15%，环半径 UV 0.30）
  .replace('getBeam(uv, pos, 0.5400,', 'getBeam(uv, pos, 0.6000,')
  // 取消角度空间旋转 angleVal 0.6345→0（≈228° 旋转让弧段围绕左上角收缩），
  // 改为 0 后角度空间=屏幕空间，uBeamAngle 直接对应屏幕方向（0=右，π/2=上）。
  // 粗细 0.3000 → uBeamThickness（JS 驱动）。
  .replace(
    'getBeam(uv, pos, 0.6000, 0.6345, 0.5000, 0.3000, uTime, 0.7300, uResolution)',
    'getBeam(uv, pos, 0.6000, 0.0000, 0.5000, uBeamThickness, uTime, 0.7300, uResolution)',
  )
  // ⚠️ 吸积盘：贯穿黑洞中央的强光横线（短线段 + 两边渐隐）
  //    - y 固定在黑洞圆心 pos.y（跟随黑洞移动）
  //    - x 方向高斯衰减 exp(-dx²·k)：中心最亮、左右逐渐消失（不贯穿屏幕）
  //    - k=25 → 半宽约 ±0.14 UV，约黑洞环半径量级
  //    强度 4.0：× uBeamStrength(0.62) 后 ≈2.5，tanh ≈0.987 —— 接近圆光弧峰值但略柔
  // ⚠️ 硬接处过渡（用户方法：隐形小圆 + 1/4弧，环端点上方外侧）。
  //    实测：之前弧连接的是横线"渐隐区"（横线切点 aDx=-0.39 在 smoothstep
  //    0.36→0.46 段内）→ 弧很暗几乎不可见。修复：横线全亮区延长到 0.42，
  //    渐隐段 0.42→0.50，使弧的横线切点（aDx≈-0.39）落在全亮区，弧清晰可见。
  //    弧：fillet 小圆，圆心在环端点外上方，同时相切横线与环弧。
  .replace(
    'float beam = getBeam(uv, pos, 0.6000, 0.0000, 0.5000, uBeamThickness, uTime, 0.7300, uResolution);',
    'float beam = getBeam(uv, pos, 0.6000, 0.0000, 0.5000, uBeamThickness, uTime, 0.7300, uResolution);\\nfloat AR = uResolution.x / uResolution.y;\\nvec2 aUV = vec2(uv.x * AR, uv.y);\\nvec2 aP = vec2(pos.x * AR, pos.y);\\nfloat aDx = aUV.x - aP.x;\\nfloat lineX = 1.0 - smoothstep(0.42, 0.50, abs(aDx));\\nfloat lineY = exp(-abs(aUV.y - aP.y) * 90.0);\\nfloat horizon = lineX * lineY * 4.0;\\nbeam += horizon;\\nfloat hw2 = uBeamThickness * 0.5;\\nfloat rr = 0.09;\\nvec2 acr = vec2(aP.x + 0.30 + rr, aP.y - rr);\\nfloat dcr = length(aUV - acr);\\nfloat angR = calculateAngle(aUV, acr);\\nbeam += (1.0 - smoothstep(0.0, hw2, abs(dcr - rr))) * (1.0 - smoothstep(0.0, 0.8, angularDifference(angR, 3.9269))) * 4.5;\\nvec2 acl = vec2(aP.x - 0.30 - rr, aP.y - rr);\\nfloat dcl = length(aUV - acl);\\nfloat angL = calculateAngle(aUV, acl);\\nbeam += (1.0 - smoothstep(0.0, hw2, abs(dcl - rr))) * (1.0 - smoothstep(0.0, 0.8, angularDifference(angL, 5.4978))) * 4.5;',
  )
  // 日食中心：y 0.4 → 0.5（垂直居中，对齐 pyai.site 文字）
  .replace('vec2 pos = vec2(0.5, 0.4)', 'vec2 pos = vec2(0.5, 0.5)')
  // ⚠️ 黑洞圆心由 JS 平滑驱动（uBHOffset 延迟跟随鼠标），不再直接读 uMousePos。
  //    用户反馈黑洞移动太快 → JS onRender 每帧对目标偏移做指数平滑（惯性延迟），
  //    写入 uBHOffset；粒子挖洞同步读平滑后的 __pyaiBH。
  //    x 幅度 0.22（左右稍大）、y 0.12（上下不变）——保留幅度，只加延迟。
  .replace(
    'mix(vec2(0), (uMousePos-0.5), 0.0600)',
    'uBHOffset',
  )
  // 限制光弧圆心不越界：鼠标移到底部时 pos.y 会 >0.5，圆环下移导致下边缘被裁掉
  // （"下半部分看不到，不是完整的圆"的根因）→ clamp 圆心到安全范围，圆环始终完整可见
  .replace(
    'vec2 pos = vec2(0.5, 0.5) + vec2((uMousePos.x-0.5)*0.35, (uMousePos.y-0.5)*0.12);',
    'vec2 pos = vec2(0.5, 0.5) + uBHOffset; pos = clamp(pos, vec2(0.12, 0.32), vec2(0.88, 0.68));',
  )
  // 色差（灼烧）随黑洞移动：chromab 的畸变中心 mPos 与 beam 光弧圆心
  // 完全一致（同用平滑的 uBHOffset），使灼烧色差精确绑定到黑洞圆心并同步延迟。
  .replace('mix(vec2(0), (uMousePos-0.5), 0.2500)', 'uBHOffset')
  // chromab 声明 uBHOffset。⚠️ 注意 chromab 的 uniform 区是
  //    `uniform float uTime;uniform vec2 uMousePos;`（uTime 与 uMousePos 同行无换行），
  //    与 shatter（uTime 后带换行）不同——用无换行的精确文本只匹配 chromab，
  //    避免误给 shatter 加声明。
  .replace(
    'uniform float uTime;uniform vec2 uMousePos;\\nuniform vec2 uResolution;',
    'uniform float uTime;uniform vec2 uMousePos;\\nuniform vec2 uBHOffset;\\nuniform vec2 uResolution;',
  )
  // ⚠️ voronoi"搞乱"中心跟随鼠标本身（原版 trackMouse 0.8 的大系数），
  //    鼠标扫到哪、哪里的文字就被打散——这才是"鼠标搞乱文字"的正确跟随。
  //    之前误改成跟随黑洞圆心（0.22/0.12 小系数）导致畸变只在很小的
  //    范围内移动，鼠标移远后效果几乎不动（用户反馈"不完全跟着鼠标"）。
  //    y 中心 0.4 → 0.5（垂直居中，对齐 pyai.site 文字）。
  .replace(
    'vec2 mPos = vec2(0.5, 0.4) + mix(vec2(0), (uMousePos-0.5), 0.8000);',
    'vec2 mPos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos-0.5), 0.8000);',
  )
  .replace(
    'vec2 pos = mix(vec2(0.5, 0.4), mPos, floor(0.0000));',
    'vec2 pos = mPos;',
  )
  // ripple（涟漪）畸变随黑洞移动：ripple 也是几何位移层，原中心 vec2(0.5,0.5) + 0 跟随
  // （完全写死），导致"文字在黑洞中有一个写死的畸变"。改为与 beam 光弧圆心一致
  // （平滑的 uBHOffset + clamp），使波纹透镜跟随黑洞移动并同步延迟。
  .replace(
    'vec2 pos = vec2(0.5, 0.5) + mix(vec2(0), uMousePos - 0.5, 0.0000);',
    'vec2 pos = vec2(0.5, 0.5) + uBHOffset; pos = clamp(pos, vec2(0.12, 0.32), vec2(0.88, 0.68));',
  )
  .replace(
    'uniform float uTime;\\nuniform vec2 uMousePos;\\nuniform vec2 uResolution;\\nfloat ease (int easingFunc, float t) {\\nreturn t;\\n}out vec4 fragColor;\\nconst float PI = 3.14159265359;vec2 distortUV(vec2 uv) {',
    'uniform float uTime;\\nuniform vec2 uMousePos;\\nuniform vec2 uBHOffset;\\nuniform vec2 uResolution;\\nfloat ease (int easingFunc, float t) {\\nreturn t;\\n}out vec4 fragColor;\\nconst float PI = 3.14159265359;vec2 distortUV(vec2 uv) {',
  )
  // 色差方向原点 pos 也跟随黑洞圆心（原本固定屏幕中心，导致畸变方向不随黑洞移动）
  .replace('vec2 pos = vec2(0.5, 0.5);', 'vec2 pos = vec2(0.5, 0.5) + uBHOffset;')
  // ⚠️ 回退文字鼠标"平移/倾斜"（用户明确不要"文字跟着鼠标移动"）：
  //    原版 pyai-site-hero.html 的"搞乱"效果 = voronoi 透镜畸变（子效果已恢复），
  //    而非 vertex 旋转/FS 位移。恢复原版：gl_Position 用未旋转顶点（旋转写进
  //    vVertexPosition，原版 fragment 不使用）、FS 位移系数 0.0000（无平移）。
  .replace(
    'vec4 rotatedPos = rotationMatrix * vec4(aVertexPosition, 1.0);\\ngl_Position = uPMatrix * uMVMatrix * rotatedPos;\\nvVertexPosition = rotatedPos.xyz;',
    'gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\\nvVertexPosition = (rotationMatrix * vec4(aVertexPosition, 1.0)).xyz;',
  )
  .replace('float angleX = uMousePos.y * 0.8 - 0.4;', 'float angleX = uMousePos.y * 0.5 - 0.25;')
  .replace('float angleY = (1.-uMousePos.x) * 0.8 - 0.4;', 'float angleY = (1.-uMousePos.x) * 0.5 - 0.25;')
  .replace('pos = mix(vec2(0), (uMousePos - 0.5), 0.1500);uv -= pos;', 'pos = mix(vec2(0), (uMousePos - 0.5), 0.0000);uv -= pos;');

// 黑洞左右移动幅度：0.35 → 0.22（用户反馈 0.35 仍过大；y 保持 0.12 不变）。
// 作用于所有跟随层（beam/godrays/voronoi/chromab/ripple/diffuse 等 6 处）。
sceneJson = sceneJson.split('(uMousePos.x-0.5)*0.35').join('(uMousePos.x-0.5)*0.22');
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
    (layer) =>
      layer.type !== 'liquify' &&
      layer.type !== 'fbm' &&
      layer.type !== 'replicate', // replicate 滚动复制已从 text.effects 移除，直接删层防残留
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

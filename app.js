import { Hct, TonalPalette, hexFromArgb, argbFromHex } from "./lib/material-color-utilities.js";

const TONES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100];
const DEFAULT_HEX = "#6750A4";

const state = { hue: 265, chroma: 48, tone: 50, hex: DEFAULT_HEX };

const swatchTooltip = Object.assign(document.createElement('div'), { className: 'swatch-tooltip' });
document.body.appendChild(swatchTooltip);
let tooltipRevertTimer = null;

const el = {
  hexInput: document.getElementById("hex-input"),
  hueSlider: document.getElementById("hue-slider"),
  chromaSlider: document.getElementById("chroma-slider"),
  hueValue: document.getElementById("hue-value"),
  chromaValue: document.getElementById("chroma-value"),
  toneSlider: document.getElementById("tone-slider"),
  toneValue: document.getElementById("tone-value"),
  colorPreview: document.getElementById("color-preview"),
  swatches: document.getElementById("swatches"),
  copyCSS: document.getElementById("copy-css"),
  copyJSON: document.getElementById("copy-json"),
};

function toHex(argb) {
  return hexFromArgb(argb).toUpperCase();
}

function fmt(n) {
  return Math.round(n * 10) / 10;
}

// ─── Color space helpers ──────────────────────────────────────────────────────

function hexToHsv(hex) {
  const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g-b)/d + 6) % 6;
    else if (max === g) h = (b-r)/d + 2;
    else h = (r-g)/d + 4;
    h *= 60;
  }
  return { h, s: max === 0 ? 0 : d/max, v: max };
}

function hsvToHex(h, s, v) {
  h = ((h%360)+360)%360;
  const c = v*s, x = c*(1-Math.abs((h/60)%2-1)), m = v-c;
  let r,g,b;
  if      (h<60)  [r,g,b]=[c,x,0];
  else if (h<120) [r,g,b]=[x,c,0];
  else if (h<180) [r,g,b]=[0,c,x];
  else if (h<240) [r,g,b]=[0,x,c];
  else if (h<300) [r,g,b]=[x,0,c];
  else            [r,g,b]=[c,0,x];
  const h2 = n => Math.round((n+m)*255).toString(16).padStart(2,'0');
  return '#' + h2(r) + h2(g) + h2(b);
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1,3), 16),
    g: parseInt(hex.slice(3,5), 16),
    b: parseInt(hex.slice(5,7), 16)
  };
}

function rgbToHex(r, g, b) {
  const h2 = n => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2,'0');
  return '#' + h2(r) + h2(g) + h2(b);
}

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g-b)/d + (g<b ? 6 : 0)) / 6 * 360;
    else if (max === g) h = ((b-r)/d + 2) / 6 * 360;
    else h = ((r-g)/d + 4) / 6 * 360;
  }
  return { h, s, l };
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return '#' + f(0) + f(8) + f(4);
}

// ─── State application ────────────────────────────────────────────────────────

function applyState() {
  const palette = TonalPalette.fromHueAndChroma(state.hue, state.chroma);

  // ─ swatches（縦並び、変更なし）
  el.swatches.innerHTML = '';
  for (const tone of TONES) {
    const hex = toHex(palette.tone(tone));
    const div = document.createElement('div');
    div.className = 'swatch';
    div.style.backgroundColor = hex;
    div.style.color = tone < 50 ? '#FFFFFF' : '#000000';
    div.setAttribute('role', 'listitem');
    div.setAttribute('aria-label', `Tone ${tone}: ${hex}`);
    div.innerHTML =
      `<div class="swatch-info"><span class="tone-label">TONE</span><span class="tone-num">${tone}</span></div>` +
      `<span class="hex-code">${hex}</span>`;

    const hexEl = div.querySelector('.hex-code');
    hexEl.addEventListener('mouseenter', () => {
      clearTimeout(tooltipRevertTimer);
      swatchTooltip.textContent = `Copy ${hex}`;
      swatchTooltip.classList.add('visible');
    });
    hexEl.addEventListener('mousemove', (e) => {
      swatchTooltip.style.left = (e.clientX + 14) + 'px';
      swatchTooltip.style.top = (e.clientY - 38) + 'px';
    });
    hexEl.addEventListener('mouseleave', () => {
      swatchTooltip.classList.remove('visible');
      clearTimeout(tooltipRevertTimer);
    });
    hexEl.addEventListener('click', async () => {
      await copyText(hex);
      swatchTooltip.textContent = 'Copied to clipboard!';
      clearTimeout(tooltipRevertTimer);
      tooltipRevertTimer = setTimeout(() => {
        swatchTooltip.textContent = `Copy ${hex}`;
      }, 1500);
    });

    el.swatches.appendChild(div);
  }

  // ─ 基準色（入力した hex をそのまま使う）
  const refHex = state.hex;

  // ─ hex input & color preview
  el.hexInput.value = refHex;
  el.colorPreview.style.backgroundColor = refHex;

  // ─ HCT sliders & displays
  const h = fmt(state.hue), c = fmt(state.chroma), t = Math.round(state.tone);
  el.hueSlider.value = state.hue;
  el.chromaSlider.value = state.chroma;
  el.toneSlider.value = state.tone;
  el.hueValue.textContent = h + '°';
  el.chromaValue.textContent = String(c);
  el.toneValue.textContent = String(t);

  // ─ RGB sliders & tracks
  const rgb = hexToRgb(refHex);
  _setSlider('rgb-r', 'rgb-r-val', rgb.r, String(rgb.r));
  _setSlider('rgb-g', 'rgb-g-val', rgb.g, String(rgb.g));
  _setSlider('rgb-b', 'rgb-b-val', rgb.b, String(rgb.b));
  // ─ HSV sliders & tracks
  const hsv = hexToHsv(refHex);
  const hsvH = Math.round(hsv.h), hsvS = Math.round(hsv.s * 100), hsvV = Math.round(hsv.v * 100);
  _setSlider('hsv-h', 'hsv-h-val', hsvH, hsvH + '°');
  _setSlider('hsv-s', 'hsv-s-val', hsvS, hsvS + '%');
  _setSlider('hsv-v', 'hsv-v-val', hsvV, hsvV + '%');
  // H track is static rainbow (set in CSS) – only S and V need updating
  _setTrack('hsv-s-track', `linear-gradient(to right, hsl(${hsvH},0%,50%), hsl(${hsvH},100%,50%))`);
  _setTrack('hsv-v-track', `linear-gradient(to right, #000, hsl(${hsvH},100%,50%))`);
  _setSliderColor('hsv-h', `hsl(${hsvH},100%,50%)`);
  _setSliderColor('hsv-s', `hsl(${hsvH},100%,50%)`);
  _setSliderColor('hsv-v', `hsl(${hsvH},100%,50%)`);

  // ─ HSL sliders & tracks
  const hsl = hexToHsl(refHex);
  const hslH = Math.round(hsl.h), hslS = Math.round(hsl.s * 100), hslL = Math.round(hsl.l * 100);
  _setSlider('hsl-h', 'hsl-h-val', hslH, hslH + '°');
  _setSlider('hsl-s', 'hsl-s-val', hslS, hslS + '%');
  _setSlider('hsl-l', 'hsl-l-val', hslL, hslL + '%');
  _setTrack('hsl-s-track', `linear-gradient(to right, hsl(${hslH},0%,50%), hsl(${hslH},100%,50%))`);
  _setTrack('hsl-l-track', `linear-gradient(to right, #000, hsl(${hslH},100%,50%), #fff)`);
  _setSliderColor('hsl-h', `hsl(${hslH},100%,50%)`);
  _setSliderColor('hsl-s', `hsl(${hslH},100%,50%)`);
  _setSliderColor('hsl-l', `hsl(${hslH},100%,50%)`);

  // ─ HCT sliders tracks & focus color
  const hctColor = `hsl(${Math.round(state.hue)},100%,50%)`;
  _setTrack('chroma-track', `linear-gradient(to right, hsl(${Math.round(state.hue)},0%,50%), hsl(${Math.round(state.hue)},100%,50%))`);
  _setTrack('tone-track', `linear-gradient(to right, #000, hsl(${Math.round(state.hue)},100%,50%), #fff)`);
  _setSliderColor('hue-slider', hctColor);
  _setSliderColor('chroma-slider', hctColor);
  _setSliderColor('tone-slider', hctColor);
}

function _setSlider(sliderId, valId, value, label) {
  const slider = document.getElementById(sliderId);
  const output = document.getElementById(valId);
  if (slider) slider.value = value;
  if (output) output.textContent = label;
}

function _setTrack(trackId, gradient) {
  const track = document.getElementById(trackId);
  if (track) track.style.background = gradient;
}

function _setSliderColor(sliderId, color) {
  const slider = document.getElementById(sliderId);
  if (slider) slider.style.setProperty('--track-color', color);
}

// ─── updateFromHex ────────────────────────────────────────────────────────────

function updateFromHex(raw) {
  const hex = raw.startsWith('#') ? raw : '#' + raw;
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  const hct = Hct.fromInt(argbFromHex(hex));
  state.hue = hct.hue;
  state.chroma = hct.chroma;
  state.tone = hct.tone;
  state.hex = hex;
  applyState();
}

// ─── Tab switching ────────────────────────────────────────────────────────────

for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.tab-content').forEach((c) =>
      c.classList.add('hidden')
    );
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.remove('hidden');
  });
}

// ─── HEX text input ───────────────────────────────────────────────────────────

el.hexInput.addEventListener('input', () => {
  const val = el.hexInput.value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(val)) updateFromHex(val);
});

el.hexInput.addEventListener('blur', () => {
  const val = el.hexInput.value.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(val)) applyState();
});

// ─── HCT sliders ─────────────────────────────────────────────────────────────

el.hueSlider.addEventListener('input', () => {
  state.hue = parseFloat(el.hueSlider.value);
  state.hex = toHex(TonalPalette.fromHueAndChroma(state.hue, state.chroma).tone(state.tone));
  applyState();
});
el.chromaSlider.addEventListener('input', () => {
  state.chroma = parseFloat(el.chromaSlider.value);
  state.hex = toHex(TonalPalette.fromHueAndChroma(state.hue, state.chroma).tone(state.tone));
  applyState();
});
el.toneSlider.addEventListener('input', () => {
  state.tone = parseFloat(el.toneSlider.value);
  state.hex = toHex(TonalPalette.fromHueAndChroma(state.hue, state.chroma).tone(state.tone));
  applyState();
});

// ─── RGB sliders ──────────────────────────────────────────────────────────────

function readRgb() {
  return {
    r: parseInt(document.getElementById('rgb-r').value),
    g: parseInt(document.getElementById('rgb-g').value),
    b: parseInt(document.getElementById('rgb-b').value)
  };
}

['rgb-r','rgb-g','rgb-b'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    const { r, g, b } = readRgb();
    updateFromHex(rgbToHex(r, g, b));
  });
});

// ─── HSV sliders ──────────────────────────────────────────────────────────────

function readHsv() {
  return {
    h: parseFloat(document.getElementById('hsv-h').value),
    s: parseFloat(document.getElementById('hsv-s').value) / 100,
    v: parseFloat(document.getElementById('hsv-v').value) / 100
  };
}

['hsv-h','hsv-s','hsv-v'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    const { h, s, v } = readHsv();
    updateFromHex(hsvToHex(h, s, v));
  });
});

// ─── HSL sliders ──────────────────────────────────────────────────────────────

function readHsl() {
  return {
    h: parseFloat(document.getElementById('hsl-h').value),
    s: parseFloat(document.getElementById('hsl-s').value),
    l: parseFloat(document.getElementById('hsl-l').value)
  };
}

['hsl-h','hsl-s','hsl-l'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    const { h, s, l } = readHsl();
    updateFromHex(hslToHex(h, s, l));
  });
});

// ─── Export helpers ───────────────────────────────────────────────────────────

function paletteEntries() {
  const palette = TonalPalette.fromHueAndChroma(state.hue, state.chroma);
  return TONES.map((t) => [t, toHex(palette.tone(t))]);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for file:// protocol where clipboard API may be restricted
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

async function copyWithFeedback(btn, text) {
  const originalHTML = btn.innerHTML;
  await copyText(text);
  btn.textContent = 'Copied!';
  setTimeout(() => {
    btn.innerHTML = originalHTML;
  }, 2000);
}

el.copyCSS.addEventListener('click', () => {
  const lines = paletteEntries()
    .map(([t, hex]) => `  --md-ref-palette-primary${t}: ${hex};`)
    .join('\n');
  copyWithFeedback(el.copyCSS, `:root {\n${lines}\n}`);
});

el.copyJSON.addEventListener('click', () => {
  const primary = Object.fromEntries(paletteEntries());
  copyWithFeedback(el.copyJSON, JSON.stringify({ primary }, null, 2));
});

// ─── Initialize ───────────────────────────────────────────────────────────────

updateFromHex(DEFAULT_HEX);

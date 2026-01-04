import storage from './storage.js';

class ThemeManager {
  constructor() { this.currentColor = 'indigo'; this.currentMode = 'auto'; this.currentFont = 'Pretendard'; this.customFonts = []; }

  init() {
    const settings = storage.getSettings().theme || {};
    this.currentColor = settings.color || 'indigo'; this.currentMode = settings.mode || 'auto';
    this.currentFont = settings.font || 'Pretendard'; this.customFonts = settings.customFonts || [];
    this.applyTheme(); this.injectCustomFontStyles(); this.applyFont(); this.updateUI();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if(this.currentMode==='auto') this.applyTheme(); });
  }

  changeColor(c) { this.currentColor=c; this.save(); this.applyTheme(); this.updateUI(); }
  changeMode(m) { this.currentMode=m; this.save(); this.applyTheme(); this.updateUI(); }
  changeFont() { this.currentFont = document.getElementById('font-select').value; this.save(); this.applyFont(); }

  // FIX 6: @font-face 코드로 폰트 추가
  addCustomFont() {
    const textarea = document.getElementById('custom-font-input');
    const cssCode = textarea.value.trim();
    if (!cssCode.startsWith('@font-face')) {
      window.app.toast.show('올바른 @font-face 코드를 입력하세요.', 'warning'); return;
    }
    const match = cssCode.match(/font-family:\s*['"](.+?)['"]/);
    if (!match || !match[1]) {
      window.app.toast.show('font-family를 찾을 수 없습니다.', 'warning'); return;
    }
    const fontName = match[1];
    if (this.customFonts.some(f => f.name === fontName)) {
      window.app.toast.show('이미 추가된 폰트 이름입니다.', 'warning'); return;
    }

    this.customFonts.push({ name: fontName, css: cssCode });
    this.save();
    this.injectCustomFontStyles();
    this.updateFontSelect();
    textarea.value = '';
    window.app.toast.show(`✅ '${fontName}' 폰트가 추가되었습니다.`, 'success');
  }

  injectCustomFontStyles() {
    const styleEl = document.getElementById('custom-font-styles');
    if(styleEl) styleEl.innerHTML = this.customFonts.map(f => f.css).join('\n');
  }

  applyTheme() {
    const root = document.documentElement;
    root.setAttribute('data-color', this.currentColor);
    this.currentMode === 'auto' ? root.removeAttribute('data-theme') : root.setAttribute('data-theme', this.currentMode);
  }

  applyFont() { document.documentElement.style.setProperty('--font-family', `'${this.currentFont}', sans-serif`); }
  save() { storage.updateSettings({ theme: { color: this.currentColor, mode: this.currentMode, font: this.currentFont, customFonts: this.customFonts } }); }

  updateUI() {
    document.querySelectorAll('.color-btn').forEach(b => b.classList.toggle('active', b.dataset.color === this.currentColor));
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === this.currentMode));
    this.updateFontSelect();
  }

  updateFontSelect() {
    const select = document.getElementById('font-select');
    if (!select) return;
    const defaultFonts = ['Pretendard', 'Noto Sans KR', 'Nanum Gothic'];
    const customFontNames = this.customFonts.map(f => f.name);
    const allFonts = [...new Set([...defaultFonts, ...customFontNames])];
    select.innerHTML = allFonts.map(f => `<option value="${f}" ${f===this.currentFont ? 'selected' : ''}>${f}</option>`).join('');
  }
}
export default new ThemeManager();

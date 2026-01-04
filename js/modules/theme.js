/**
 * Theme Module
 * - 컬러 테마 변경
 * - 다크/라이트 모드
 * - 폰트 변경 및 커스텀 폰트 추가
 */

import { CONFIG } from '../config.js';
import storage from './storage.js';

class ThemeManager {
  constructor() {
    this.currentColor = 'indigo';
    this.currentMode = 'auto';
    this.currentFont = 'Pretendard';
    this.customFonts = [];
  }

  /**
   * 초기화
   */
  init() {
    const settings = storage.getSettings();

    if (settings.theme) {
      this.currentColor = settings.theme.color || 'indigo';
      this.currentMode = settings.theme.mode || 'auto';
      this.currentFont = settings.theme.font || 'Pretendard';
      this.customFonts = settings.theme.customFonts || [];
    }

    // Load custom web fonts
    this.customFonts.forEach(font => {
      if (typeof font === 'object' && font.type === 'webfont') {
        this.injectFontCSS(font.code, font.name);
      }
    });

    // Apply theme and font
    this.applyTheme();
    this.applyFont();
    
    // Update UI only if we're on settings page
    if (document.getElementById('font-select')) {
      this.updateUI();
      this.updateCustomFontsList();
    }

    // 시스템 다크모드 변경 감지
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.currentMode === 'auto') {
          this.applyTheme();
        }
      });
    }
  }

  /**
   * 컬러 테마 변경
   */
  changeColor(color) {
    this.currentColor = color;
    this.saveThemeSettings();
    this.applyTheme();
    this.updateUI();
    window.app.toast.show(`🎨 ${color} 테마가 적용되었어요`, 'success');
  }

  /**
   * 모드 변경 (light/dark/auto)
   */
  changeMode(mode) {
    this.currentMode = mode;
    this.saveThemeSettings();
    this.applyTheme();
    this.updateUI();

    const modeNames = { light: '라이트', dark: '다크', auto: '자동' };
    window.app.toast.show(`${modeNames[mode]} 모드가 적용되었어요`, 'success');
  }

  /**
   * 폰트 변경
   */
  changeFont() {
    const select = document.getElementById('font-select');
    if (!select) return;

    this.currentFont = select.value;
    this.saveThemeSettings();
    this.applyFont();
    
    // Force update the font immediately
    document.documentElement.style.setProperty('--font-family',
      `'${this.currentFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
    );
    
    window.app.toast.show(`✍️ ${this.currentFont} 폰트가 적용되었어요`, 'success');
  }

  /**
   * 커스텀 폰트 추가 (Google Fonts)
   */
  async addCustomFont() {
    const input = document.getElementById('custom-font-input');
    if (!input) return;

    const fontName = input.value.trim();
    if (!fontName) {
      window.app.toast.show('폰트명을 입력해주세요', 'warning');
      return;
    }

    // 이미 추가된 폰트인지 체크
    if (this.customFonts.includes(fontName)) {
      window.app.toast.show('이미 추가된 폰트예요', 'warning');
      return;
    }

    try {
      // Google Fonts에서 로드
      await this.loadGoogleFont(fontName);

      // 커스텀 폰트 리스트에 추가
      this.customFonts.push(fontName);
      this.saveThemeSettings();

      // 폰트 셀렉트에 추가
      this.updateFontSelect();

      input.value = '';
      window.app.toast.show(`✅ ${fontName} 폰트가 추가되었어요!`, 'success');
    } catch (error) {
      console.error('Font load error:', error);
      window.app.toast.show('폰트를 불러올 수 없어요. 폰트명을 확인해주세요', 'error');
    }
  }

  /**
   * Add web font using @font-face code
   */
  addWebFont() {
    const nameInput = document.getElementById('custom-font-name');
    const codeInput = document.getElementById('custom-font-code');
    
    if (!nameInput || !codeInput) return;

    const fontName = nameInput.value.trim();
    const fontCode = codeInput.value.trim();

    if (!fontName || !fontCode) {
      window.app.toast.show('폰트 이름과 CSS 코드를 모두 입력해주세요', 'warning');
      return;
    }

    // Check if font already exists
    const webFonts = this.customFonts.filter(f => typeof f === 'object') || [];
    if (webFonts.some(f => f.name === fontName)) {
      window.app.toast.show('이미 추가된 폰트예요', 'warning');
      return;
    }

    try {
      // Inject the font CSS
      this.injectFontCSS(fontCode, fontName);

      // Add to custom fonts list as object
      this.customFonts.push({
        name: fontName,
        code: fontCode,
        type: 'webfont'
      });

      this.saveThemeSettings();
      this.updateFontSelect();
      this.updateCustomFontsList();

      nameInput.value = '';
      codeInput.value = '';

      window.app.toast.show(`✅ ${fontName} 폰트가 추가되었어요!`, 'success');
    } catch (error) {
      console.error('Web font error:', error);
      window.app.toast.show('폰트 추가에 실패했어요', 'error');
    }
  }

  /**
   * Inject font CSS into document
   */
  injectFontCSS(cssCode, fontId) {
    // Remove existing style if any
    const existingStyle = document.getElementById(`custom-font-${fontId}`);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create and inject new style
    const style = document.createElement('style');
    style.id = `custom-font-${fontId}`;
    style.textContent = cssCode;
    document.head.appendChild(style);
  }

  /**
   * Update custom fonts list display
   */
  updateCustomFontsList() {
    const container = document.getElementById('custom-fonts-container');
    const listSection = document.getElementById('custom-fonts-list');
    
    if (!container || !listSection) return;

    const webFonts = this.customFonts.filter(f => typeof f === 'object');

    if (webFonts.length === 0) {
      listSection.style.display = 'none';
      return;
    }

    listSection.style.display = 'block';
    container.innerHTML = webFonts.map(font => `
      <div style="display: flex; justify-content: space-between; align-items: center; 
                  padding: 12px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 8px;">
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">${font.name}</div>
          <div style="font-size: 12px; color: var(--text-tertiary);">웹폰트</div>
        </div>
        <button class="btn-danger" onclick="app.theme.removeWebFont('${font.name}')" 
                style="padding: 6px 12px; font-size: 12px;">삭제</button>
      </div>
    `).join('');
  }

  /**
   * Remove web font
   */
  removeWebFont(fontName) {
    if (!confirm(`${fontName} 폰트를 삭제하시겠어요?`)) return;

    // Remove from custom fonts
    this.customFonts = this.customFonts.filter(f => {
      if (typeof f === 'object') {
        return f.name !== fontName;
      }
      return true;
    });

    // Remove injected CSS
    const styleEl = document.getElementById(`custom-font-${fontName}`);
    if (styleEl) {
      styleEl.remove();
    }

    // Reset to default if currently using this font
    if (this.currentFont === fontName) {
      this.currentFont = 'Pretendard';
      this.applyFont();
    }

    this.saveThemeSettings();
    this.updateFontSelect();
    this.updateCustomFontsList();

    window.app.toast.show(`${fontName} 폰트가 삭제되었어요`, 'success');
  }

  /**
   * Google Fonts 로드
   */
  loadGoogleFont(fontName) {
    return new Promise((resolve, reject) => {
      // 이미 로드된 폰트인지 체크
      const existingLink = document.querySelector(`link[href*="${fontName.replace(/\s+/g, '+')}"]`);
      if (existingLink) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;500;600;700&display=swap`;

      link.onload = () => resolve();
      link.onerror = () => reject(new Error('Font load failed'));

      document.head.appendChild(link);

      // 타임아웃 (5초)
      setTimeout(() => reject(new Error('Font load timeout')), 5000);
    });
  }

  /**
   * 테마 적용
   */
  applyTheme() {
    const root = document.documentElement;

    // 컬러 테마 적용
    root.setAttribute('data-color', this.currentColor);

    // 다크/라이트 모드 적용
    if (this.currentMode === 'auto') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', this.currentMode);
    }

    // 메타 테마 컬러 업데이트 (모바일)
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      const isDark = this.currentMode === 'dark' ||
        (this.currentMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      metaTheme.content = isDark ? '#1a1a1a' : '#ffffff';
    }
  }

  /**
   * 폰트 적용
   */
  applyFont() {
    document.documentElement.style.setProperty('--font-family',
      `'${this.currentFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
    );
  }

  /**
   * 테마 설정 저장
   */
  saveThemeSettings() {
    storage.updateSettings({
      theme: {
        color: this.currentColor,
        mode: this.currentMode,
        font: this.currentFont,
        customFonts: this.customFonts
      }
    });
  }

  /**
   * UI 업데이트
   */
  updateUI() {
    // 컬러 버튼 활성화 상태
    document.querySelectorAll('.color-btn').forEach(btn => {
      const color = btn.getAttribute('data-color');
      if (color === this.currentColor) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 모드 버튼 활성화 상태
    document.querySelectorAll('.mode-btn').forEach(btn => {
      const mode = btn.getAttribute('data-mode');
      if (mode === this.currentMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 폰트 셀렉트 업데이트
    this.updateFontSelect();
  }

  /**
   * 폰트 셀렉트 업데이트
   */
  updateFontSelect() {
    const select = document.getElementById('font-select');
    if (!select) return;

    // 기본 폰트들
    const defaultFonts = [
      'Pretendard',
      'Noto Sans KR',
      'Nanum Gothic',
      'Nanum Myeongjo'
    ];

    // 커스텀 폰트 이름 추출 (문자열이면 그대로, 객체면 name 속성)
    const customFontNames = this.customFonts.map(font => 
      typeof font === 'object' ? font.name : font
    );

    // 모든 폰트 합치기
    const allFonts = [...defaultFonts, ...customFontNames];

    // 옵션 재생성
    select.innerHTML = allFonts.map(font =>
      `<option value="${font}" ${font === this.currentFont ? 'selected' : ''}>
        ${font}${customFontNames.includes(font) ? ' (커스텀)' : ''}
      </option>`
    ).join('');
  }

  /**
   * 커스텀 폰트 삭제
   */
  removeCustomFont(fontName) {
    if (confirm(`${fontName} 폰트를 삭제하시겠어요?`)) {
      this.customFonts = this.customFonts.filter(f => f !== fontName);

      // 현재 사용 중이면 기본 폰트로 변경
      if (this.currentFont === fontName) {
        this.currentFont = 'Pretendard';
        this.applyFont();
      }

      this.saveThemeSettings();
      this.updateFontSelect();
      window.app.toast.show(`${fontName} 폰트가 삭제되었어요`, 'success');
    }
  }
}

export default new ThemeManager();

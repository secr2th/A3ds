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

    this.applyTheme();
    this.applyFont();
    this.updateUI();

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

    // 모든 폰트 합치기
    const allFonts = [...defaultFonts, ...this.customFonts];

    // 옵션 재생성
    select.innerHTML = allFonts.map(font =>
      `<option value="${font}" ${font === this.currentFont ? 'selected' : ''}>
        ${font}${this.customFonts.includes(font) ? ' (커스텀)' : ''}
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

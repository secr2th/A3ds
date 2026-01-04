/**
 * Timer Module
 * - 포모도로 타이머
 * - 집중/휴식 모드
 * - 타이머 통계
 */

import { CONFIG } from '../config.js';
import storage from './storage.js';

class TimerManager {
  constructor() {
    this.isRunning = false;
    this.isPaused = false;
    this.currentMode = 'focus'; // 'focus' or 'break'
    this.timeRemaining = 0; // 초 단위
    this.totalTime = 0;
    this.interval = null;
    this.settings = {
      focusDuration: CONFIG.TIMER.FOCUS_DURATION,
      breakDuration: CONFIG.TIMER.SHORT_BREAK
    };
  }

  /**
   * 초기화
   */
  init() {
    const userSettings = storage.getSettings();
    if (userSettings.timer) {
      this.settings = userSettings.timer;
    }
    this.updateDisplay();
  }

  /**
   * 타이머 모달 열기
   */
  open() {
    const modal = document.getElementById('timer-modal');
    modal.classList.remove('hidden');

    // 설정값 UI에 반영
    document.getElementById('focus-duration').value = this.settings.focusDuration;
    document.getElementById('break-duration').value = this.settings.breakDuration;

    // 오늘의 뽀모도로 카운트 표시
    this.updatePomodoroCount();

    this.updateDisplay();
  }

  /**
   * 타이머 모달 닫기
   */
  close() {
    // 실행 중이면 확인
    if (this.isRunning && !this.isPaused) {
      if (!confirm('타이머가 실행 중이에요. 정말 닫으시겠어요?')) {
        return;
      }
    }

    document.getElementById('timer-modal').classList.add('hidden');
  }

  /**
   * 타이머 시작
   */
  start() {
    if (this.isRunning && !this.isPaused) return;

    if (!this.isRunning) {
      // 새로 시작
      this.timeRemaining = this.currentMode === 'focus'
        ? this.settings.focusDuration * 60
        : this.settings.breakDuration * 60;
      this.totalTime = this.timeRemaining;
    }

    this.isRunning = true;
    this.isPaused = false;

    // UI 업데이트
    document.getElementById('timer-start-btn').classList.add('hidden');
    document.getElementById('timer-pause-btn').classList.remove('hidden');

    // 인터벌 시작
    this.interval = setInterval(() => {
      this.tick();
    }, 1000);

    this.updateDisplay();
  }

  /**
   * 타이머 일시정지
   */
  pause() {
    if (!this.isRunning) return;

    this.isPaused = true;
    clearInterval(this.interval);

    // UI 업데이트
    document.getElementById('timer-start-btn').classList.remove('hidden');
    document.getElementById('timer-pause-btn').classList.add('hidden');
    document.getElementById('timer-start-btn').textContent = '재개';
  }

  /**
   * 타이머 리셋
   */
  reset() {
    this.isRunning = false;
    this.isPaused = false;
    clearInterval(this.interval);

    this.timeRemaining = this.settings.focusDuration * 60;
    this.totalTime = this.timeRemaining;
    this.currentMode = 'focus';

    // UI 리셋
    document.getElementById('timer-start-btn').classList.remove('hidden');
    document.getElementById('timer-start-btn').textContent = '시작';
    document.getElementById('timer-pause-btn').classList.add('hidden');

    this.updateDisplay();
  }

  /**
   * 타이머 틱
   */
  tick() {
    this.timeRemaining -= 1;

    if (this.timeRemaining <= 0) {
      this.complete();
    }

    this.updateDisplay();
  }

  /**
   * 타이머 완료
   */
  complete() {
    clearInterval(this.interval);
    this.isRunning = false;

    // 알림음 (선택적)
    this.playSound();

    if (this.currentMode === 'focus') {
      // 집중 완료
      window.app.toast.show('🎉 집중 시간 완료! 잘하셨어요!', 'success');

      // 통계 기록
      const analytics = storage.getAnalytics();
      analytics.pomodoroCount = (analytics.pomodoroCount || 0) + 1;
      storage.setAnalytics(analytics);

      // 포인트 추가
      storage.addPoints(CONFIG.GAME.POMODORO_POINTS);

      // 학습 시간 기록
      const userData = storage.getUserData();
      userData.totalStudyTime += this.settings.focusDuration;
      storage.setUserData(userData);

      // 일일 활동 기록
      storage.recordDailyActivity(new Date(), {
        time: this.settings.focusDuration,
        points: CONFIG.GAME.POMODORO_POINTS
      });

      // 알림
      if (window.app.notifications.permission === 'granted') {
        window.app.notifications.sendNotification(
          '⏱ 집중 시간 완료!',
          '휴식 시간을 가지세요 😊'
        );
      }

      // 휴식 모드로 전환
      this.currentMode = 'break';
      this.timeRemaining = this.settings.breakDuration * 60;
      this.totalTime = this.timeRemaining;

      if (confirm('휴식 시간을 시작할까요?')) {
        this.start();
      }
    } else {
      // 휴식 완료
      window.app.toast.show('☕ 휴식 완료! 다시 집중해볼까요?', 'success');

      if (window.app.notifications.permission === 'granted') {
        window.app.notifications.sendNotification(
          '⏱ 휴식 완료!',
          '다시 집중 모드로 돌아가요!'
        );
      }

      // 집중 모드로 전환
      this.currentMode = 'focus';
      this.timeRemaining = this.settings.focusDuration * 60;
      this.totalTime = this.timeRemaining;

      if (confirm('집중 시간을 시작할까요?')) {
        this.start();
      }
    }

    this.updatePomodoroCount();
    this.updateDisplay();
  }

  /**
   * 알림음 재생
   */
  playSound() {
    // 브라우저 기본 비프음
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTUIGWi77eifTRALUKfj8LZjHAU5k9fyz3ksBS15yPDekkIM');
    audio.volume = 0.3;
    audio.play().catch(e => console.log('Sound play failed:', e));
  }

  /**
   * 디스플레이 업데이트
   */
  updateDisplay() {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    const timeText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // 시간 표시
    const displayEl = document.getElementById('timer-display');
    if (displayEl) {
      displayEl.textContent = timeText;
    }

    // 모드 표시
    const modeEl = document.getElementById('timer-mode');
    if (modeEl) {
      modeEl.textContent = this.currentMode === 'focus' ? '집중 시간' : '휴식 시간';
    }

    // 프로그레스 서클
    const progressCircle = document.getElementById('timer-progress-circle');
    if (progressCircle) {
      const progress = this.totalTime > 0 ? (this.timeRemaining / this.totalTime) : 1;
      const circumference = 2 * Math.PI * 90;
      const offset = circumference * (1 - progress);
      progressCircle.style.strokeDasharray = circumference;
      progressCircle.style.strokeDashoffset = offset;
    }
  }

  /**
   * 오늘의 뽀모도로 카운트 업데이트
   */
  updatePomodoroCount() {
    const analytics = storage.getAnalytics();
    const countEl = document.getElementById('today-pomodoros');
    if (countEl) {
      countEl.textContent = analytics.pomodoroCount || 0;
    }
  }

  /**
   * 설정 저장
   */
  saveSettings() {
    const focusDuration = parseInt(document.getElementById('focus-duration').value);
    const breakDuration = parseInt(document.getElementById('break-duration').value);

    if (focusDuration > 0 && focusDuration <= 60) {
      this.settings.focusDuration = focusDuration;
    }

    if (breakDuration > 0 && breakDuration <= 30) {
      this.settings.breakDuration = breakDuration;
    }

    storage.updateSettings({ timer: this.settings });

    // 실행 중이 아니면 시간 리셋
    if (!this.isRunning) {
      this.reset();
    }
  }
}

export default new TimerManager();

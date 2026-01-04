/**
 * Notification Module
 * - 푸시 알림 권한 요청
 * - 알림 스케줄링
 * - 알림 전송
 */

import { CONFIG } from '../config.js';
import storage from './storage.js';

class NotificationManager {
  constructor() {
    this.permission = 'default';
    this.scheduledTime = CONFIG.NOTIFICATION.DEFAULT_TIME;
    this.checkInterval = null;
  }

  /**
   * 초기화
   */
  init() {
    this.permission = Notification.permission;
    const settings = storage.getSettings();

    if (settings.notifications) {
      this.scheduledTime = settings.notificationTime;
      this.startScheduler();
    }

    // UI 업데이트
    this.updateUI();
  }

  /**
   * 권한 요청
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      window.app.toast.show('이 브라우저는 알림을 지원하지 않아요', 'warning');
      return false;
    }

    if (this.permission === 'granted') {
      window.app.toast.show('알림이 이미 허용되어 있어요', 'success');
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;

      if (permission === 'granted') {
        window.app.toast.show('✅ 알림이 허용되었어요!', 'success');

        // 테스트 알림
        this.sendNotification('🎨 ArtQuest', '알림이 정상적으로 설정되었어요!');

        // 설정 저장
        storage.updateSettings({ notifications: true });
        this.startScheduler();

        return true;
      } else {
        window.app.toast.show('알림이 거부되었어요', 'warning');
        return false;
      }
    } catch (error) {
      console.error('Notification permission error:', error);
      window.app.toast.show('알림 설정 실패', 'error');
      return false;
    }
  }

  /**
   * 알림 토글
   */
  async toggle() {
    const settings = storage.getSettings();
    const enabled = !settings.notifications;

    if (enabled) {
      // 알림 활성화
      if (this.permission !== 'granted') {
        const granted = await this.requestPermission();
        if (!granted) {
          document.getElementById('notification-toggle').checked = false;
          return;
        }
      }

      storage.updateSettings({ notifications: true });
      this.startScheduler();
      window.app.toast.show('✅ 알림이 활성화되었어요', 'success');
    } else {
      // 알림 비활성화
      storage.updateSettings({ notifications: false });
      this.stopScheduler();
      window.app.toast.show('알림이 비활성화되었어요', 'success');
    }

    this.updateUI();
  }

  /**
   * 알림 시간 업데이트
   */
  updateTime() {
    const timeInput = document.getElementById('notification-time');
    if (!timeInput) return;

    this.scheduledTime = timeInput.value;
    storage.updateSettings({ notificationTime: this.scheduledTime });

    window.app.toast.show('알림 시간이 변경되었어요', 'success');

    // 스케줄러 재시작
    const settings = storage.getSettings();
    if (settings.notifications) {
      this.stopScheduler();
      this.startScheduler();
    }
  }

  /**
   * 알림 스케줄러 시작
   */
  startScheduler() {
    // 기존 스케줄러 중지
    this.stopScheduler();

    // 1분마다 체크
    this.checkInterval = setInterval(() => {
      this.checkAndSendNotification();
    }, 60000); // 60초

    // 즉시 한 번 체크
    this.checkAndSendNotification();
  }

  /**
   * 알림 스케줄러 중지
   */
  stopScheduler() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * 알림 전송 체크
   */
  checkAndSendNotification() {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (currentTime === this.scheduledTime) {
      // 오늘 이미 알림을 보냈는지 체크
      const lastNotification = localStorage.getItem('last_notification_date');
      const today = UTILS.formatDate(new Date());

      if (lastNotification !== today) {
        this.sendDailyReminder();
        localStorage.setItem('last_notification_date', today);
      }
    }
  }

  /**
   * 일일 리마인더 전송
   */
  sendDailyReminder() {
    const messages = CONFIG.NOTIFICATION.MESSAGES;
    const message = messages[Math.floor(Math.random() * messages.length)];

    this.sendNotification('ArtQuest 📚', message, {
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/badge-72x72.png',
      vibrate: [200, 100, 200],
      tag: 'daily-reminder',
      requireInteraction: false,
      data: {
        url: '/?view=tasks'
      }
    });
  }

  /**
   * 알림 전송 (기본)
   */
  sendNotification(title, body, options = {}) {
    if (this.permission !== 'granted') return;

    const defaultOptions = {
      body: body,
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/badge-72x72.png',
      vibrate: [200, 100, 200],
      tag: 'artquest-notification',
      requireInteraction: false
    };

    const notification = new Notification(title, {
      ...defaultOptions,
      ...options
    });

    notification.onclick = () => {
      window.focus();
      if (options.data && options.data.url) {
        window.location.href = options.data.url;
      }
      notification.close();
    };

    return notification;
  }

  /**
   * 과제 완료 축하 알림
   */
  celebrateTaskCompletion(taskTitle) {
    this.sendNotification(
      '🎉 과제 완료!',
      `"${taskTitle}"을 완료했어요! 대단해요!`,
      {
        tag: 'task-completion',
        requireInteraction: false
      }
    );
  }

  /**
   * 레벨업 알림
   */
  celebrateLevelUp(level) {
    this.sendNotification(
      '🎊 레벨업!',
      `축하합니다! 레벨 ${level}로 올랐어요!`,
      {
        tag: 'level-up',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200]
      }
    );
  }

  /**
   * Streak 달성 알림
   */
  celebrateStreak(days) {
    const milestones = [3, 7, 14, 30, 50, 100];
    if (milestones.includes(days)) {
      this.sendNotification(
        `🔥 ${days}일 연속 학습!`,
        `정말 대단해요! ${days}일 연속 학습을 달성했어요!`,
        {
          tag: 'streak-milestone',
          requireInteraction: true
        }
      );
    }
  }

  /**
   * UI 업데이트
   */
  updateUI() {
    const toggle = document.getElementById('notification-toggle');
    const timeInput = document.getElementById('notification-time');
    const timeSetting = document.getElementById('notification-time-setting');

    const settings = storage.getSettings();

    if (toggle) {
      toggle.checked = settings.notifications;
    }

    if (timeInput) {
      timeInput.value = settings.notificationTime;
    }

    if (timeSetting) {
      timeSetting.style.display = settings.notifications ? 'block' : 'none';
    }
  }
}

export default new NotificationManager();

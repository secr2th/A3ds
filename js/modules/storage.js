/**
 * Storage Module
 * - LocalStorage 관리
 * - 데이터 CRUD 작업
 * - 데이터 Import/Export
 */

import { CONFIG } from '../config.js';

class StorageManager {
  constructor() {
    this.keys = CONFIG.STORAGE_KEYS;
  }

  /**
   * 데이터 가져오기
   */
  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  }

  /**
   * 데이터 저장하기
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      return false;
    }
  }

  /**
   * 데이터 삭제
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      return false;
    }
  }

  /**
   * API 키 관리
   */
  getApiKey() {
    return this.get(this.keys.API_KEY);
  }

  setApiKey(key) {
    return this.set(this.keys.API_KEY, key);
  }

  /**
   * 사용자 데이터 관리
   */
  getUserData() {
    return this.get(this.keys.USER_DATA) || {
      points: 0,
      level: 1,
      streak: 0,
      lastActiveDate: null,
      totalTasksCompleted: 0,
      totalStudyTime: 0, // 분 단위
      joinDate: new Date().toISOString()
    };
  }

  setUserData(data) {
    return this.set(this.keys.USER_DATA, data);
  }

  updateUserData(updates) {
    const current = this.getUserData();
    return this.setUserData({ ...current, ...updates });
  }

  /**
   * 포인트 추가 및 레벨업 체크
   */
  addPoints(points) {
    const userData = this.getUserData();
    userData.points += points;

    // 레벨업 체크
    const pointsPerLevel = CONFIG.GAME.POINTS_PER_LEVEL;
    const newLevel = Math.floor(userData.points / pointsPerLevel) + 1;

    if (newLevel > userData.level) {
      userData.level = newLevel;
      // 레벨업 토스트
      window.app.toast.show(`🎉 레벨 ${newLevel}로 올랐어요!`, 'success');
    }

    this.setUserData(userData);
    return userData;
  }

  /**
   * 연속 일수 업데이트
   */
  updateStreak() {
    const userData = this.getUserData();
    const today = new Date().toDateString();
    const lastActive = userData.lastActiveDate
      ? new Date(userData.lastActiveDate).toDateString()
      : null;

    if (lastActive === today) {
      // 오늘 이미 활동함
      return userData.streak;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (lastActive === yesterdayStr) {
      // 연속 일수 증가
      userData.streak += 1;
      userData.points += CONFIG.GAME.STREAK_BONUS;
    } else if (lastActive !== today) {
      // 연속 끊김
      userData.streak = 1;
    }

    userData.lastActiveDate = new Date().toISOString();
    this.setUserData(userData);
    return userData.streak;
  }

    /**
   * 커스텀 링크 관리
   */
  getCustomLinks() {
    return this.get('custom_links') || [];
  }

  setCustomLinks(links) {
    return this.set('custom_links', links);
  }

  addCustomLink(link) {
    const links = this.getCustomLinks();
    links.push({
      id: UTILS.generateId(),
      ...link,
      createdAt: new Date().toISOString()
    });
    return this.setCustomLinks(links);
  }

  deleteCustomLink(linkId) {
    const links = this.getCustomLinks();
    const filtered = links.filter(l => l.id !== linkId);
    return this.setCustomLinks(filtered);
  }


  /**
   * 과제 데이터 관리
   */
  getTasks() {
    return this.get(this.keys.TASKS) || {
      daily: [],
      weekly: [],
      custom: []
    };
  }

  setTasks(tasks) {
    return this.set(this.keys.TASKS, tasks);
  }

  addTask(type, task) {
    const tasks = this.getTasks();
    tasks[type].push({
      id: CONFIG.UTILS.generateId(),
      ...task,
      createdAt: new Date().toISOString(),
      completed: false
    });
    return this.setTasks(tasks);
  }

  updateTask(type, taskId, updates) {
    const tasks = this.getTasks();
    const index = tasks[type].findIndex(t => t.id === taskId);
    if (index !== -1) {
      tasks[type][index] = { ...tasks[type][index], ...updates };
      return this.setTasks(tasks);
    }
    return false;
  }

  deleteTask(type, taskId) {
    const tasks = this.getTasks();
    tasks[type] = tasks[type].filter(t => t.id !== taskId);
    return this.setTasks(tasks);
  }

  /**
   * 갤러리 데이터 관리
   */
  getGallery() {
    return this.get(this.keys.GALLERY) || [];
  }

  setGallery(gallery) {
    return this.set(this.keys.GALLERY, gallery);
  }

  addArtwork(artwork) {
    const gallery = this.getGallery();
    gallery.unshift({
      id: CONFIG.UTILS.generateId(),
      ...artwork,
      createdAt: new Date().toISOString()
    });
    return this.setGallery(gallery);
  }

  updateArtwork(artworkId, updates) {
    const gallery = this.getGallery();
    const index = gallery.findIndex(a => a.id === artworkId);
    if (index !== -1) {
      gallery[index] = { ...gallery[index], ...updates };
      return this.setGallery(gallery);
    }
    return false;
  }

  deleteArtwork(artworkId) {
    const gallery = this.getGallery();
    const filtered = gallery.filter(a => a.id !== artworkId);
    return this.setGallery(filtered);
  }

  /**
   * 실력 평가 데이터
   */
  getAssessment() {
    return this.get(this.keys.ASSESSMENT);
  }

  setAssessment(assessment) {
    return this.set(this.keys.ASSESSMENT, assessment);
  }

  /**
   * 설정 관리
   */
  getSettings() {
    return this.get(this.keys.SETTINGS) || {
      notifications: false,
      notificationTime: CONFIG.NOTIFICATION.DEFAULT_TIME,
      theme: {
        color: 'indigo',
        mode: 'auto',
        font: 'Pretendard'
      },
      timer: {
        focusDuration: CONFIG.TIMER.FOCUS_DURATION,
        breakDuration: CONFIG.TIMER.SHORT_BREAK
      }
    };
  }

  setSettings(settings) {
    return this.set(this.keys.SETTINGS, settings);
  }

  updateSettings(updates) {
    const current = this.getSettings();
    return this.setSettings({ ...current, ...updates });
  }

  /**
   * 분석 데이터 관리
   */
  getAnalytics() {
    return this.get(this.keys.ANALYTICS) || {
      dailyActivity: {}, // { '2024-01-01': { tasks: 3, time: 75, points: 30 } }
      categoryProgress: {
        basic: 0,
        anatomy: 0,
        perspective: 0,
        shading: 0,
        color: 0,
        composition: 0
      },
      pomodoroCount: 0
    };
  }

  setAnalytics(analytics) {
    return this.set(this.keys.ANALYTICS, analytics);
  }

  updateAnalytics(updates) {
    const current = this.getAnalytics();
    return this.setAnalytics({ ...current, ...updates });
  }

  recordDailyActivity(date, activity) {
    const analytics = this.getAnalytics();
    const dateStr = CONFIG.UTILS.formatDate(date);

    if (!analytics.dailyActivity[dateStr]) {
      analytics.dailyActivity[dateStr] = { tasks: 0, time: 0, points: 0 };
    }

    Object.keys(activity).forEach(key => {
      analytics.dailyActivity[dateStr][key] += activity[key];
    });

    return this.setAnalytics(analytics);
  }

  updateCategoryProgress(category, points) {
    const analytics = this.getAnalytics();
    analytics.categoryProgress[category] =
      (analytics.categoryProgress[category] || 0) + points;
    return this.setAnalytics(analytics);
  }

  /**
   * 전체 데이터 내보내기 (JSON)
   */
  exportData() {
    const allData = {
      userData: this.getUserData(),
      tasks: this.getTasks(),
      gallery: this.getGallery(),
      assessment: this.getAssessment(),
      settings: this.getSettings(),
      analytics: this.getAnalytics(),
      exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `artquest-backup-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);

    window.app.toast.show('✅ 데이터가 내보내기 되었습니다', 'success');
  }

  /**
   * 데이터 가져오기
   */
  async importData() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';

      input.onchange = async (e) => {
        try {
          const file = e.target.files[0];
          const text = await file.text();
          const data = JSON.parse(text);

          // 데이터 복원
          if (data.userData) this.setUserData(data.userData);
          if (data.tasks) this.setTasks(data.tasks);
          if (data.gallery) this.setGallery(data.gallery);
          if (data.assessment) this.setAssessment(data.assessment);
          if (data.settings) this.setSettings(data.settings);
          if (data.analytics) this.setAnalytics(data.analytics);

          window.app.toast.show('✅ 데이터를 복원했습니다', 'success');
          setTimeout(() => window.location.reload(), 1000);
          resolve(true);
        } catch (error) {
          console.error('Import error:', error);
          window.app.toast.show('❌ 데이터 가져오기 실패', 'error');
          reject(error);
        }
      };

      input.click();
    });
  }

  /**
   * 모든 데이터 초기화
   */
  resetAll() {
    const confirmed = confirm(
      '⚠️ 모든 데이터가 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.\n정말 초기화하시겠습니까?'
    );

    if (confirmed) {
      Object.values(this.keys).forEach(key => {
        this.remove(key);
      });

      window.app.toast.show('🔄 데이터가 초기화되었습니다', 'success');
      setTimeout(() => window.location.reload(), 1000);
    }
  }
}

export default new StorageManager();

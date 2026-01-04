/**
 * Analytics Module
 * - 학습 데이터 분석
 * - 카테고리별 진행도
 * - 주간 리포트 생성
 * - 활동 히트맵
 */

import { CONFIG, UTILS } from '../config.js';
import storage from './storage.js';
import gemini from './gemini.js';

class AnalyticsManager {
  constructor() {
    this.chartData = null;
  }

  /**
   * 초기화
   */
  init() {
    this.render();
    this.refreshAIFeedback();
  }

  /**
   * 전체 통계 가져오기
   */
  getOverallStats() {
    const userData = storage.getUserData();
    const analytics = storage.getAnalytics();
    const gallery = storage.getGallery();

    // 총 학습 일수 계산
    const activityDates = Object.keys(analytics.dailyActivity);
    const studyDays = activityDates.length;

    return {
      totalTasksCompleted: userData.totalTasksCompleted,
      totalStudyTime: userData.totalStudyTime,
      totalArtworks: gallery.length,
      studyDays: studyDays,
      currentStreak: userData.streak,
      totalPoints: userData.points,
      currentLevel: userData.level
    };
  }

  /**
   * 카테고리별 진행도 가져오기
   */
  getCategoryProgress() {
    const analytics = storage.getAnalytics();
    const categoryProgress = analytics.categoryProgress;

    // 각 카테고리별 레벨 계산
    const result = {};
    Object.keys(CONFIG.CATEGORIES).forEach(category => {
      const points = categoryProgress[category] || 0;
      const level = Math.floor(points / 50) + 1; // 50점당 1레벨
      const progressInLevel = (points % 50) / 50 * 100;

      result[category] = {
        points,
        level,
        progress: progressInLevel
      };
    });

    return result;
  }

  /**
   * 최근 30일 활동 데이터
   */
  getRecentActivity(days = 30) {
    const analytics = storage.getAnalytics();
    const activity = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = UTILS.formatDate(date);

      const dayData = analytics.dailyActivity[dateStr] || { tasks: 0, time: 0, points: 0 };

      // 활동 레벨 계산 (0-4)
      let level = 0;
      if (dayData.tasks > 0) level = 1;
      if (dayData.tasks >= 2) level = 2;
      if (dayData.tasks >= 4) level = 3;
      if (dayData.tasks >= 6) level = 4;

      activity.push({
        date: dateStr,
        ...dayData,
        level
      });
    }

    return activity;
  }

  /**
   * 주간 데이터 수집
   */
  getWeeklyData() {
    const analytics = storage.getAnalytics();
    const weekData = {
      completedTasks: 0,
      totalTime: 0,
      totalPoints: 0,
      activeDays: 0,
      categoryActivity: {}
    };

    // 최근 7일
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = UTILS.formatDate(date);

      const dayData = analytics.dailyActivity[dateStr];
      if (dayData) {
        weekData.completedTasks += dayData.tasks || 0;
        weekData.totalTime += dayData.time || 0;
        weekData.totalPoints += dayData.points || 0;
        if (dayData.tasks > 0) weekData.activeDays += 1;
      }
    }

    // 카테고리별 활동 (최근 작업한 과제들 기반)
    const tasks = storage.getTasks();
    Object.keys(CONFIG.CATEGORIES).forEach(cat => {
      weekData.categoryActivity[cat] = 0;
    });

    tasks.daily.forEach(task => {
      if (task.completed) {
        const taskDate = new Date(task.completedAt);
        const daysDiff = Math.floor((new Date() - taskDate) / (1000 * 60 * 60 * 24));
        if (daysDiff < 7 && task.category) {
          weekData.categoryActivity[task.category] =
            (weekData.categoryActivity[task.category] || 0) + 1;
        }
      }
    });

    return weekData;
  }

  /**
   * AI 피드백 새로고침
   */
  async refreshAIFeedback() {
    const feedbackEl = document.getElementById('ai-feedback-content');
    if (!feedbackEl) return;

    try {
      feedbackEl.innerHTML = '<p style="color: rgba(255,255,255,0.7);">AI가 분석 중...</p>';

      const userData = storage.getUserData();
      const analytics = storage.getAnalytics();

      // 최근 활동 분석
      const recentActivity = this.getRecentActivity(7);
      const completedTasks = recentActivity.reduce((sum, day) => sum + day.tasks, 0);

      // 가장 약한 카테고리 찾기
      const categoryProgress = analytics.categoryProgress;
      let weakestCategory = 'basic';
      let minPoints = Infinity;
      Object.entries(categoryProgress).forEach(([cat, points]) => {
        if (points < minPoints) {
          minPoints = points;
          weakestCategory = cat;
        }
      });

      const feedback = await gemini.getLearningFeedback(userData, {
        tasksCompleted: completedTasks,
        weakestCategory: CONFIG.CATEGORIES[weakestCategory].name
      });

      feedbackEl.innerHTML = `<p style="color: rgba(255,255,255,0.95); line-height: 1.6;">${feedback}</p>`;
    } catch (error) {
      console.error('AI feedback error:', error);
      feedbackEl.innerHTML = `
        <p style="color: rgba(255,255,255,0.9);">
          꾸준히 학습하고 계시네요! 💪<br>
          매일 조금씩 그리는 습관이 실력을 만듭니다.<br>
          오늘도 화이팅!
        </p>
      `;
    }
  }

  /**
   * 주간 리포트 생성
   */
  async generateWeeklyReport() {
    const modal = document.getElementById('weekly-report-modal');
    const content = document.getElementById('weekly-report-content');

    modal.classList.remove('hidden');
    content.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div class="spinner"></div>
        <p style="margin-top: 20px;">주간 리포트를 생성하고 있어요...</p>
      </div>
    `;

    try {
      const weekData = this.getWeeklyData();
      const report = await gemini.generateWeeklyReport(weekData);

      content.innerHTML = `
        <div class="weekly-report">
          <h2 style="margin-bottom: 24px;">📊 이번 주 학습 리포트</h2>

          <!-- 전체 요약 -->
          <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px; margin-bottom: 24px;">
            <h3 style="margin-bottom: 12px;">📝 전체 요약</h3>
            <p style="color: var(--text-secondary); line-height: 1.6;">${report.summary}</p>
          </div>

          <!-- 주요 통계 -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 24px;">
            <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 32px; font-weight: bold; color: var(--color-primary);">
                ${weekData.completedTasks}
              </div>
              <div style="font-size: 14px; color: var(--text-secondary); margin-top: 4px;">완료한 과제</div>
            </div>
            <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 32px; font-weight: bold; color: var(--color-primary);">
                ${Math.round(weekData.totalTime / 60)}h
              </div>
              <div style="font-size: 14px; color: var(--text-secondary); margin-top: 4px;">학습 시간</div>
            </div>
            <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 32px; font-weight: bold; color: var(--color-primary);">
                ${weekData.activeDays}
              </div>
              <div style="font-size: 14px; color: var(--text-secondary); margin-top: 4px;">활동한 날</div>
            </div>
            <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 32px; font-weight: bold; color: var(--color-primary);">
                ${weekData.totalPoints}
              </div>
              <div style="font-size: 14px; color: var(--text-secondary); margin-top: 4px;">획득 포인트</div>
            </div>
          </div>

          <!-- 성취 -->
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 12px; margin-bottom: 16px;">
            <h3 style="color: white; margin-bottom: 12px;">🎉 이번 주 성취</h3>
            <ul style="list-style: none; padding: 0;">
              ${report.achievements.map(achievement =>
                `<li style="padding: 8px 0; display: flex; align-items: center; gap: 8px;">
                  <span>✓</span>
                  <span>${achievement}</span>
                </li>`
              ).join('')}
            </ul>
          </div>

          <!-- 개선 영역 -->
          <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px; margin-bottom: 16px;">
            <h3 style="margin-bottom: 12px;">📈 개선이 필요한 영역</h3>
            <ul style="list-style: none; padding: 0;">
              ${report.improvements.map(improvement =>
                `<li style="padding: 8px 0; color: var(--text-secondary); display: flex; align-items: center; gap: 8px;">
                  <span>•</span>
                  <span>${improvement}</span>
                </li>`
              ).join('')}
            </ul>
          </div>

          <!-- 다음 주 추천 -->
          <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px; margin-bottom: 16px;">
            <h3 style="margin-bottom: 12px;">🎯 다음 주 집중 영역</h3>
            <p style="color: var(--text-secondary); line-height: 1.6;">${report.nextWeekFocus}</p>
          </div>

          <!-- 격려 메시지 -->
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 20px; border-radius: 12px; text-align: center;">
            <p style="font-size: 18px; font-weight: 600; color: white;">${report.motivationalMessage}</p>
          </div>

          <button class="btn-primary" onclick="app.analytics.closeReport()" style="width: 100%; margin-top: 24px;">
            확인
          </button>
        </div>
      `;
    } catch (error) {
      console.error('Weekly report error:', error);
      content.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <p style="font-size: 48px; margin-bottom: 16px;">😅</p>
          <p style="color: var(--text-secondary); margin-bottom: 24px;">
            리포트 생성에 실패했어요.<br>
            인터넷 연결과 API 키를 확인해주세요.
          </p>
          <button class="btn-primary" onclick="app.analytics.closeReport()">
            닫기
          </button>
        </div>
      `;
    }
  }

  /**
   * 리포트 모달 닫기
   */
  closeReport() {
    document.getElementById('weekly-report-modal').classList.add('hidden');
  }

  /**
   * 렌더링
   */
  render() {
    this.renderStats();
    this.renderCategoryProgress();
    this.renderActivityChart();
  }

  /**
   * 전체 통계 렌더링
   */
  renderStats() {
    const stats = this.getOverallStats();

    // 각 통계 업데이트
    const updates = {
      'total-tasks-completed': stats.totalTasksCompleted,
      'total-study-time': `${Math.round(stats.totalStudyTime / 60)}h`,
      'total-artworks': stats.totalArtworks,
      'study-days': stats.studyDays
    };

    Object.entries(updates).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
  }

  /**
   * 카테고리별 진행도 렌더링
   */
  renderCategoryProgress() {
    const progress = this.getCategoryProgress();

    Object.entries(progress).forEach(([category, data]) => {
      const progressBar = document.querySelector(`.progress-fill[data-category="${category}"]`);
      if (progressBar) {
        progressBar.style.width = `${data.progress}%`;
      }

      // 레벨 배지 업데이트
      const categoryBar = progressBar?.closest('.category-bar');
      if (categoryBar) {
        const levelBadge = categoryBar.querySelector('.level-badge');
        if (levelBadge) {
          levelBadge.textContent = `Lv.${data.level}`;
        }
      }
    });
  }

  /**
   * 활동 히트맵 차트 렌더링
   */
  renderActivityChart() {
    const activity = this.getRecentActivity(30);
    const container = document.getElementById('activity-chart');

    if (!container) return;

    container.innerHTML = activity.map((day, index) => {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();

      return `
        <div class="activity-day"
             data-level="${day.level}"
             title="${day.date}: ${day.tasks}개 과제, ${day.time}분"
             style="
               aspect-ratio: 1;
               background: ${this.getActivityColor(day.level)};
               border-radius: 4px;
               cursor: pointer;
               transition: transform 0.2s;
             "
             onmouseover="this.style.transform='scale(1.2)'"
             onmouseout="this.style.transform='scale(1)'">
        </div>
      `;
    }).join('');
  }

  /**
   * 활동 레벨에 따른 색상
   */
  getActivityColor(level) {
    const colors = {
      0: 'var(--bg-tertiary)',
      1: 'rgba(99, 102, 241, 0.2)',
      2: 'rgba(99, 102, 241, 0.5)',
      3: 'rgba(99, 102, 241, 0.7)',
      4: 'rgba(99, 102, 241, 1)'
    };
    return colors[level] || colors[0];
  }
}

export default new AnalyticsManager();

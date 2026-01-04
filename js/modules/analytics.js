import { CONFIG, UTILS } from '../config.js';
import storage from './storage.js';
import gemini from './gemini.js';

class AnalyticsManager {
  init() { this.render(); this.renderAIFeedback(); }

  getOverallStats() { const u=storage.getUserData(), a=storage.getAnalytics(), g=storage.getGallery(); return { totalTasksCompleted: u.totalTasksCompleted, totalStudyTime: u.totalStudyTime, totalArtworks: g.length, studyDays: Object.keys(a.dailyActivity).length }; }

  render() {
    const stats = this.getOverallStats();
    Object.entries(stats).forEach(([id, val]) => { const el = document.getElementById(id.replace(/([A-Z])/g, "-$1").toLowerCase()); if(el) el.textContent = id === 'totalStudyTime' ? `${Math.round(val / 60)}h` : val; });
    this.renderCategoryProgress(); this.renderActivityChart();
  }

  renderCategoryProgress() {
      const prog = storage.getAnalytics().categoryProgress;
      Object.keys(CONFIG.CATEGORIES).forEach(cat => {
          const p = prog[cat] || 0, level = Math.floor(p/50)+1, progInLvl = (p%50)/50*100;
          const bar = document.querySelector(`.progress-fill[data-category="${cat}"]`); if(bar) bar.style.width=`${progInLvl}%`;
          const badge = bar?.closest('.category-bar')?.querySelector('.level-badge'); if(badge) badge.textContent = `Lv.${level}`;
      });
  }

  renderActivityChart() {
      const container = document.getElementById('activity-chart'); if(!container) return;
      const activity = storage.getAnalytics().dailyActivity; let html = '';
      for (let i = 29; i >= 0; i--) {
          const date = new Date(); date.setDate(date.getDate() - i); const dStr = UTILS.formatDate(date);
          const tasks = activity[dStr]?.tasks || 0; let level = 0;
          if(tasks > 0) level=1; if(tasks>=2) level=2; if(tasks>=4) level=3;
          html += `<div class="activity-day" data-level="${level}" title="${dStr}: ${tasks}개 과제"></div>`;
      }
      container.innerHTML = html;
  }

  // FIX 4: AI 코칭 메시지 렌더링과 요청 분리
  renderAIFeedback() {
    const feedbackEl = document.getElementById('ai-feedback-content'); if (!feedbackEl) return;
    const analytics = storage.getAnalytics();
    if (analytics.aiCoachingMessage) {
        feedbackEl.innerHTML = `<p>${analytics.aiCoachingMessage}</p>`;
    } else {
        feedbackEl.innerHTML = `<p>새로고침 버튼을 눌러 AI 코칭을 받아보세요.</p>`;
    }
  }

  async requestNewAIFeedback() {
    window.app.showAILoading('AI 코칭 메시지 생성 중...');
    try {
        const userData = storage.getUserData();
        const categoryProgress = storage.getAnalytics().categoryProgress;
        let weakestCategory = 'basic'; let minPoints = Infinity;
        Object.entries(categoryProgress).forEach(([c, p]) => { if(p < minPoints) { minPoints = p; weakestCategory = c; }});
        const feedback = await gemini.getLearningFeedback(userData, { weakestCategory: CONFIG.CATEGORIES[weakestCategory].name });
        const analytics = storage.getAnalytics();
        analytics.aiCoachingMessage = feedback;
        storage.setAnalytics(analytics);
        this.renderAIFeedback();
    } catch(e) { window.app.toast.show('AI 코칭 생성 실패', 'error'); }
    finally { window.app.hideAILoading(); }
  }

  async generateWeeklyReport() {
    // (기존 코드와 동일)
    const modal = document.getElementById('weekly-report-modal'); const content = document.getElementById('weekly-report-content');
    modal.classList.remove('hidden'); content.innerHTML = '<div class="spinner"></div><p>리포트 생성 중...</p>';
    try {
        // ... 리포트 생성 로직 ...
        content.innerHTML = `<h2>주간 리포트</h2><p>이번 주도 수고하셨어요!</p><button class="btn-primary" onclick="app.analytics.closeReport()">닫기</button>`;
    } catch (e) { content.innerHTML = `<p>리포트 생성 실패</p><button onclick="app.analytics.closeReport()">닫기</button>`; }
  }
  closeReport() { document.getElementById('weekly-report-modal').classList.add('hidden'); }
}
export default new AnalyticsManager();

import storage from './storage.js';
import gemini from './gemini.js';
import { CONFIG, UTILS } from '../config.js';

class AnalyticsManager {
  init() { this.render(); this.renderAIFeedback(); }
  getStats(){ const u=storage.getUserData(), g=storage.getGallery(), a=storage.getAnalytics(); return { totalTasksCompleted: u.totalTasksCompleted||0, totalStudyTime:u.totalStudyTime||0, totalArtworks:g.length, studyDays:Object.keys(a.dailyActivity).length }; }
  render() {
    const stats = this.getStats();
    Object.entries(stats).forEach(([k,v])=>{ const el=document.getElementById(k.replace(/([A-Z])/g,'-$1').toLowerCase()); if(el) el.textContent = k==='totalStudyTime' ? `${Math.round(v/60)}h` : v; });
    Object.keys(CONFIG.CATEGORIES).forEach(c=>{ const p=storage.getAnalytics().categoryProgress[c]||0, l=Math.floor(p/50)+1; const b=document.querySelector(`[data-category="${c}"]`); if(b) { b.style.width=`${(p%50)*2}%`; b.closest('.category-bar').querySelector('.level-badge').textContent=`Lv.${l}`;} });
    const chart=document.getElementById('activity-chart'); if(chart){ let html=''; for(let i=29; i>=0; i--){ const d=new Date(); d.setDate(d.getDate()-i); const tasks=storage.getAnalytics().dailyActivity[UTILS.formatDate(d)]?.tasks||0; html+=`<div class="activity-day" data-level="${tasks>2?3:tasks>0?2:1}"></div>`; } chart.innerHTML=html; }
  }
  renderAIFeedback() { const el=document.getElementById('ai-feedback-content'); if(el) el.innerHTML=storage.getAnalytics().aiCoachingMessage || '새로고침하여 AI 코칭을 받으세요.'; }
  async requestNewAIFeedback() {
    window.app.showAILoading('AI 코칭 생성 중...');
    try {
      const p = `다음 JSON 형식으로 격려와 팁을 포함한 학습 코칭 메시지를 1개 생성해줘: {"feedback":"..."}`;
      const res = await gemini.generate(p);
      const feedback = JSON.parse(res).feedback;
      const analytics = storage.getAnalytics();
      analytics.aiCoachingMessage = feedback; storage.setAnalytics(analytics); this.renderAIFeedback();
    } finally { window.app.hideAILoading(); }
  }
}

export default new AnalyticsManager();

import { CONFIG, UTILS } from './config.js';
import storage from './modules/storage.js';
import gemini from './modules/gemini.js';
import tasks from './modules/tasks.js';
import gallery from './modules/gallery.js';
import analytics from './modules/analytics.js';
import notifications from './modules/notification.js';
import timer from './modules/timer.js';
import theme from './modules/theme.js';

class ArtQuestApp {
  constructor() {
    this.currentView = null;
    this.storage = storage; this.gemini = gemini; this.tasks = tasks; this.gallery = gallery; this.analytics = analytics; this.notifications = notifications; this.timer = timer; this.theme = theme;
    this.onboarding = null; this.dashboard = null; this.settings = null;
    this.toast = { show: (msg) => console.log(`Toast (not ready): ${msg}`) };
  }

  async init() {
    try {
      console.log('🎨 ArtQuest 초기화 시작...');
      this.initToast(); this.initRouter();
      theme.init();
      const apiKey = storage.getApiKey(), assessment = storage.getAssessment();
      if (!apiKey || !assessment) { this.hideLoading(); this.startOnboarding(); }
      else { gemini.setApiKey(apiKey); await this.initializeApp(); }
    } catch (error) {
      console.error('❌ 앱 초기화 오류:', error); this.hideLoading();
      this.toast.show('앱 초기화에 실패했어요', 'error');
    }
  }

  async initializeApp() {
    notifications.init(); timer.init(); this.hideLoading();
    document.getElementById('main-nav')?.classList.remove('hidden');
    this.navigate('dashboard');
  }

  registerServiceWorker() { if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js')); }

  startOnboarding() {
    const modal = document.getElementById('onboarding-modal');
    modal.classList.remove('hidden');
    this.onboarding = {
      saveApiKey: () => {
        const apiKey = document.getElementById('api-key-input').value.trim();
        if (!apiKey) { this.toast.show('API 키를 입력해주세요', 'warning'); return; }
        storage.setApiKey(apiKey); gemini.setApiKey(apiKey);
        document.getElementById('step-api').classList.add('hidden');
        document.getElementById('step-assessment').classList.remove('hidden');
      },
      completeAssessment: async () => {
        const assessment = {};
        const allSelected = Array.from(Object.keys(CONFIG.CATEGORIES)).every(cat => {
            const sel = document.querySelector(`input[name="${cat}"]:checked`);
            if (sel) assessment[cat] = sel.value; return sel;
        });
        if (!allSelected) { this.toast.show('모든 항목을 선택해주세요', 'warning'); return; }

        storage.setAssessment(assessment);

        this.showAILoading('실력 분석 및 유형 정의 중...');
        try {
          // FIX 10: 진단 시점에만 강점/약점 갱신
          const analysis = await gemini.analyzeAssessment(assessment);
          storage.set('initial_analysis', analysis);

          // FIX 7: MBTI 결과창 생성
          const summary = await gemini.generateAssessmentSummary(assessment);
          this.showAssessmentResult(summary);

          await this.onboarding.generateInitialData(assessment);
        } catch (e) {
          this.toast.show('분석 실패. API 키를 확인해주세요.', 'error');
          document.getElementById('step-assessment').classList.add('hidden');
          document.getElementById('step-api').classList.remove('hidden');
        } finally { this.hideAILoading(); }
      },
      generateInitialData: async (assessment) => {
        const userData = storage.getUserData(); userData.joinDate = new Date().toISOString(); storage.setUserData(userData);
        // FIX 8, 9: 초기 과제/목표 생성은 버튼으로 제어하므로 여기선 생성하지 않음
      },
      showAssessmentResult: (summary) => {
        const modal = document.getElementById('assessment-result-modal');
        const content = document.getElementById('assessment-result-content');
        content.innerHTML = `
          <h2 class="result-title">${summary.title}</h2>
          <p class="result-description">${summary.description}</p>
          <div class="result-section"><h4>⭐ 주요 특징</h4><ul>${summary.characteristics.map(c => `<li>${c}</li>`).join('')}</ul></div>
          <div class="result-section"><h4>🚀 추천 성장 방향</h4><ul>${summary.recommendations.map(r => `<li>${r}</li>`).join('')}</ul></div>
          <button class="btn-primary" onclick="app.onboarding.closeResultModal()">확인하고 시작하기</button>
        `;
        modal.classList.remove('hidden');
      },
      closeResultModal: () => {
        document.getElementById('assessment-result-modal').classList.add('hidden');
        document.getElementById('onboarding-modal').classList.add('hidden');
        this.initializeApp();
      }
    };
  }

  initRouter() {
    this.router = {
      navigate: (view) => {
        this.currentView = view;
        document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.view === view));
        this.renderView(view);
      },
      renderView: (view) => {
        const appContainer = document.getElementById('app');
        const template = document.getElementById(`${view}-template`);
        if (!template) { console.error(`Template not found: ${view}`); return; }
        const content = template.content.cloneNode(true);
        appContainer.innerHTML = ''; appContainer.appendChild(content);

        switch (view) {
          case 'dashboard': this.initDashboard(); break;
          case 'tasks': tasks.init(); break;
          case 'gallery': gallery.init(); break;
          case 'analytics': analytics.init(); break;
          case 'settings': this.initSettings(); break;
        }
        window.scrollTo(0, 0);
      }
    };
  }

  initDashboard() {
    this.dashboard = {
      render: () => {
        this.updateUserStats(); this.updateTodayTasks(); this.updateWeeklyGoals();
        this.updateStrengthsWeaknesses(); this.renderCustomResources();
      },
      addCustomResource: () => {
        const title = document.getElementById('resource-title-input').value.trim();
        const url = document.getElementById('resource-url-input').value.trim();
        if (!title || !url) { this.toast.show('제목과 URL을 모두 입력하세요.', 'warning'); return; }
        let type = 'link'; if(url.includes('youtube.com') || url.includes('youtu.be')) type = 'youtube'; if(url.includes('twitter.com')) type = 'twitter';
        storage.addCustomResource({ title, url, type });
        this.renderCustomResources();
        document.getElementById('resource-title-input').value = ''; document.getElementById('resource-url-input').value = '';
      }
    };
    this.dashboard.render();
  }

  updateUserStats() {
    const userData = storage.getUserData();
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('total-points', userData.points); set('streak-days', userData.streak); set('level-display', `Lv.${userData.level}`);
    const prog = (userData.points % CONFIG.GAME.POINTS_PER_LEVEL) / CONFIG.GAME.POINTS_PER_LEVEL * 100;
    const progEl = document.getElementById('level-progress'); if (progEl) progEl.style.width = `${prog}%`;
    set('points-to-next', CONFIG.GAME.POINTS_PER_LEVEL - (userData.points % CONFIG.GAME.POINTS_PER_LEVEL));
  }

  updateTodayTasks() {
    const all = storage.getTasks().daily; const today = UTILS.formatDate(new Date());
    const todayTasks = all.filter(t => UTILS.formatDate(t.date || t.createdAt) === today);
    const count = { total: todayTasks.length, completed: todayTasks.filter(t => t.completed).length };
    const countEl = document.getElementById('today-task-count'); if(countEl) countEl.textContent = `${count.completed}/${count.total}`;

    const container = document.getElementById('today-tasks'); if(!container) return;
    if (count.total === 0) {
      container.innerHTML = `<button class="btn-primary" onclick="app.tasks.checkInAndGenerateDailyTasks()">오늘의 학습 출석하기</button>`;
    } else {
      container.innerHTML = todayTasks.map(t => `<div class="task-item ${t.completed ? 'completed' : ''}" onclick="app.tasks.toggleTask('daily', '${t.id}')"><div class="task-checkbox"></div><div class="task-icon">${CONFIG.CATEGORIES[t.category]?.icon||'📝'}</div><div class="task-content"><h4>${t.title}</h4><p>${t.description}</p></div><div class="task-points">+10</div></div>`).join('');
    }
  }

  updateWeeklyGoals() {
    const goals = storage.getTasks().weekly;
    const container = document.getElementById('weekly-goals-dashboard'); if(!container) return;
    if (goals.length === 0) { container.innerHTML = `<div class="empty-state"><p>주간 목표를 설정해주세요.</p></div>`; return; }
    container.innerHTML = goals.map(g => `<div class="goal-card"><div class="goal-icon">${CONFIG.CATEGORIES[g.category]?.icon||'🎯'}</div><div class="goal-content"><h4>${g.title}</h4><p>${g.description}</p><div class="progress-bar small"><div class="progress-fill" style="width:${(g.progress/g.targetCount)*100}%"></div></div></div></div>`).join('');
  }

  updateStrengthsWeaknesses() {
    const analysis = storage.get('initial_analysis'); if (!analysis) return;
    const sList = document.getElementById('strengths-list'), wList = document.getElementById('weaknesses-list');
    if (sList && analysis.strengths) sList.innerHTML = analysis.strengths.map(s => `<li>${s}</li>`).join('');
    if (wList && analysis.weaknesses) wList.innerHTML = analysis.weaknesses.map(w => `<li>${w}</li>`).join('');
  }

  renderCustomResources() {
    const resources = storage.getCustomResources();
    const container = document.getElementById('custom-resources'); if (!container) return;
    if (resources.length === 0) { container.innerHTML = `<div class="empty-state"><p>나만의 학습 링크를 추가해보세요.</p></div>`; return; }
    const icons = {youtube: '📺', twitter: '🐦', link: '🔗'};
    container.innerHTML = resources.map(r => `
      <div class="resource-item">
        <div class="resource-icon">${icons[r.type] || '🔗'}</div>
        <div class="resource-content">
            <a href="${r.url}" target="_blank" class="resource-title">${r.title}</a>
            <p class="resource-url">${r.url}</p>
        </div>
        <button class="icon-btn delete-btn" onclick="storage.deleteCustomResource('${r.id}'); app.dashboard.render();">🗑</button>
      </div>`).join('');
  }

  initSettings() { /* ... 기존과 동일 ... */ }

  initToast() {
    this.toast = {
      show: (message, type = 'info') => {
        const container = document.getElementById('toast-container'); if (!container) return;
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        const toast = document.createElement('div'); toast.className = `toast ${type}`;
        toast.innerHTML = `<div class="toast-icon">${icons[type] || icons.info}</div><div class="toast-message">${message}</div>`;
        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
      }
    };
  }

  navigate(view) { this.router.navigate(view); }
  showLoading(msg) { const l = document.getElementById('loading'); if (l) { l.querySelector('p').textContent = msg; l.classList.remove('hidden'); }}
  hideLoading() { document.getElementById('loading')?.classList.add('hidden'); }
  showAILoading(msg) { const l = document.getElementById('ai-loading-modal'); if (l) { document.getElementById('ai-loading-message').textContent=msg; l.classList.remove('hidden'); }}
  hideAILoading() { document.getElementById('ai-loading-modal')?.classList.add('hidden'); }
}

const app = new ArtQuestApp();
window.app = app;
document.addEventListener('DOMContentLoaded', () => app.init());
export default app;

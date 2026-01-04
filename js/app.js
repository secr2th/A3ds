import storage from './modules/storage.js';
import gemini from './modules/gemini.js';
import tasks from './modules/tasks.js';
import gallery from './modules/gallery.js';
import analytics from './modules/analytics.js';
import notifications from './modules/notification.js';
import timer from './modules/timer.js';
import theme from './modules/theme.js';
import { CONFIG } from './config.js';

class ArtQuestApp {
  constructor() {
    this.currentView = 'dashboard';
    this.storage = storage; this.gemini = gemini; this.tasks = tasks; this.gallery = gallery; this.analytics = analytics; this.notifications = notifications; this.timer = timer; this.theme = theme;
    this.toast = { show: msg => console.log(msg) };
  }
  init() {
    this.initToast(); this.initRouter(); theme.init();
    if (storage.getApiKey() && storage.getAssessment()) {
      gemini.setApiKey(storage.getApiKey()); this.initializeApp();
    } else {
      this.hideLoading(); this.startOnboarding();
    }
  }
  initializeApp() {
    notifications.init(); timer.init(); this.hideLoading();
    document.getElementById('main-nav').classList.remove('hidden');
    this.navigate('dashboard');
  }
  startOnboarding() {
    document.getElementById('onboarding-modal').classList.remove('hidden');
    this.onboarding = {
      saveApiKey: () => {
        const key = document.getElementById('api-key-input').value;
        storage.setApiKey(key); gemini.setApiKey(key);
        document.getElementById('step-api').classList.add('hidden');
        document.getElementById('step-assessment').classList.remove('hidden');
      },
      completeAssessment: async () => {
        const assessment = {};
        Object.keys(CONFIG.CATEGORIES).forEach(c => assessment[c] = document.querySelector(`input[name="${c}"]:checked`)?.value);
        storage.setAssessment(assessment);
        this.showAILoading('실력 분석 중...');
        try {
            const p1 = `다음 JSON 형식으로 강점/약점 2개씩 분석: {"strengths":["..."],"weaknesses":["..."]}`;
            const p2 = `다음 JSON 형식으로 아티스트 유형 분석: {"title":"","description":"","characteristics":["..."],"recommendations":["..."]}`;
            const [analysis, summary] = await Promise.all([gemini.generate(p1).then(JSON.parse), gemini.generate(p2).then(JSON.parse)]);
            storage.set('initial_analysis', analysis);
            this.showAssessmentResult(summary);
        } finally { this.hideAILoading(); }
      },
      showAssessmentResult: summary => {
        document.getElementById('assessment-result-content').innerHTML = `<h2 class="result-title">${summary.title}</h2><p class="result-description">${summary.description}</p><div class="result-section"><h4>⭐ 특징</h4><ul>${summary.characteristics.map(c=>`<li>${c}</li>`).join('')}</ul></div><div class="result-section"><h4>🚀 추천 방향</h4><ul>${summary.recommendations.map(r=>`<li>${r}</li>`).join('')}</ul></div><button class="btn-primary" onclick="app.onboarding.closeResultModal()">시작하기</button>`;
        document.getElementById('assessment-result-modal').classList.remove('hidden');
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
      navigate: view => {
        this.currentView = view;
        document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
        const template = document.getElementById(`${view}-template`);
        if(template) document.getElementById('app').innerHTML = ''; document.getElementById('app').appendChild(template.content.cloneNode(true));
        switch(view) {
          case 'dashboard': this.initDashboard(); break;
          case 'tasks': tasks.init(); break;
          case 'gallery': gallery.init(); break;
          case 'analytics': analytics.init(); break;
          case 'settings': this.initSettings(); break;
        }
      }
    };
  }
  initDashboard() {
    this.dashboard = {
      render:()=>{ this.updateUserStats(); this.updateTodayTasks(); this.updateWeeklyGoals(); this.updateStrengthsWeaknesses(); this.renderCustomResources(); },
      addCustomResource:()=>{ const t=document.getElementById('resource-title-input').value, u=document.getElementById('resource-url-input').value; storage.setCustomResources([...storage.getCustomResources(),{id:UTILS.generateId(),title:t,url:u}]);this.dashboard.render(); }
    };
    this.dashboard.render();
  }
  updateUserStats() { const d=storage.getUserData(); document.getElementById('total-points').textContent=d.points; document.getElementById('streak-days').textContent=d.streak; document.getElementById('level-display').textContent=`Lv.${d.level}`; const p=(d.points%100); document.getElementById('level-progress').style.width=`${p}%`; document.getElementById('points-to-next').textContent=100-p; }
  updateTodayTasks() { const tasks=storage.getTasks().daily.filter(t=>UTILS.formatDate(t.date)===UTILS.formatDate(new Date())); document.getElementById('today-task-count').textContent=`${tasks.filter(t=>t.completed).length}/${tasks.length}`; document.getElementById('today-tasks').innerHTML = tasks.length===0?`<button class="btn-primary" onclick="app.tasks.checkInAndGenerateDailyTasks()">출석하기</button>`:tasks.map(t=>`<div class="task-item ${t.completed?'completed':''}" onclick="app.tasks.toggleTask('daily','${t.id}')"><div class="task-checkbox"></div><div class="task-content"><h4>${t.title}</h4></div></div>`).join(''); }
  updateWeeklyGoals() { const goals=storage.getTasks().weekly; document.getElementById('weekly-goals-dashboard').innerHTML = goals.length===0?`<div class="empty-state">주간 목표가 없습니다.</div>`:goals.map(g=>`<div class="goal-card"><div class="goal-icon">${CONFIG.CATEGORIES[g.category]?.icon||'🎯'}</div><div class="goal-content"><h4>${g.title}</h4></div></div>`).join(''); }
  updateStrengthsWeaknesses() { const a=storage.get('initial_analysis'); if(!a)return; document.getElementById('strengths-list').innerHTML=a.strengths.map(s=>`<li>${s}</li>`).join(''); document.getElementById('weaknesses-list').innerHTML=a.weaknesses.map(w=>`<li>${w}</li>`).join(''); }
  renderCustomResources(){ document.getElementById('custom-resources').innerHTML = storage.getCustomResources().map(r=>`<div class="resource-item"><a href="${r.url}" target="_blank" class="resource-title">${r.title}</a><button class="icon-btn" onclick="storage.setCustomResources(storage.getCustomResources().filter(i=>i.id !== '${r.id}')); app.dashboard.render();">🗑</button></div>`).join('') || `<div class="empty-state">링크를 추가하세요.</div>`; }
  initSettings(){ this.settings={ updateApiKey:()=>{ const k=document.getElementById('settings-api-key').value; storage.setApiKey(k); gemini.setApiKey(k); }, testApiConnection: async ()=>{ this.showAILoading('연결 테스트 중...'); try{ await gemini.generate('test'); this.toast.show('✅ 연결 성공'); }catch{ this.toast.show('❌ 연결 실패'); } finally { this.hideAILoading();} }, reopenAssessment:()=>{ if(confirm('다시 진단하시겠습니까?')){ document.getElementById('onboarding-modal').classList.remove('hidden'); document.getElementById('step-api').classList.add('hidden'); document.getElementById('step-assessment').classList.remove('hidden');}}}; }
  initToast() { this.toast = { show: (msg, type='info') => { const c=document.getElementById('toast-container'), t=document.createElement('div'); t.className=`toast ${type}`; t.textContent=msg; c.appendChild(t); setTimeout(()=>t.remove(), 3000); }}; }
  navigate(v) { this.router.navigate(v); }
  showLoading(msg="..."){ document.getElementById('loading').classList.remove('hidden'); }
  hideLoading() { document.getElementById('loading').classList.add('hidden'); }
  showAILoading(msg) { document.getElementById('ai-loading-message').textContent=msg; document.getElementById('ai-loading-modal').classList.remove('hidden'); }
  hideAILoading() { document.getElementById('ai-loading-modal').classList.add('hidden'); }
}
window.app = new ArtQuestApp();
document.addEventListener('DOMContentLoaded', () => window.app.init());

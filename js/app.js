/**
 * Main Application File
 * - 앱 초기화 및 라우팅
 * - 온보딩 프로세스
 * - 뷰 관리
 * - 전역 유틸리티
 */

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
    this.isInitialized = false;

    // 모듈들을 전역으로 접근 가능하게 설정
    this.storage = storage;
    this.gemini = gemini;
    this.tasks = tasks;
    this.gallery = gallery;
    this.analytics = analytics;
    this.notifications = notifications;
    this.timer = timer;
    this.theme = theme;

    // UI 관련 객체 초기화 (null 방지)
    this.onboarding = null;
    this.dashboard = null;
    this.settings = null;
    this.router = null;

    // Toast를 미리 안전한 객체로 초기화 (에러 발생 시 대비)
    this.toast = {
      show: (msg) => console.log('Toast not ready:', msg)
    };
  }

  /**
   * 앱 초기화
   */
  async init() {
    try {
      console.log('🎨 ArtQuest 초기화 시작...');

      // 1. 유틸리티부터 초기화 (Toast 사용 가능하게)
      this.initToast();

      // 2. 라우터 준비
      this.initRouter();

      // 3. Service Worker (에러가 나도 앱은 멈추지 않게 처리)
      try {
        this.registerServiceWorker();
      } catch (swError) {
        console.warn('Service Worker 등록 실패 (무시됨):', swError);
      }

      // 4. 테마 적용
      theme.init();

      // 5. 온보딩 체크
      // 로컬 스토리지 접근이 차단된 경우를 대비해 try-catch
      let apiKey = null;
      let assessment = null;

      try {
        apiKey = storage.getApiKey();
        assessment = storage.getAssessment();
      } catch (e) {
        console.error('Storage access error:', e);
      }

      if (!apiKey || !assessment) {
        // 온보딩 필요
        this.hideLoading();
        this.startOnboarding();
      } else {
        // 정상 초기화
        gemini.setApiKey(apiKey);
        await this.initializeApp();
      }

      this.isInitialized = true;
      console.log('✅ ArtQuest 초기화 완료');

    } catch (error) {
      console.error('❌ 앱 초기화 치명적 오류:', error);
      this.hideLoading();

      // Toast가 작동하지 않을 경우를 대비해 alert 사용
      if (this.toast && typeof this.toast.show === 'function') {
        this.toast.show(`앱 실행 중 문제가 발생했습니다: ${error.message}`, 'error');
      } else {
        alert(`앱 실행 실패: ${error.message}`);
      }
    }
  }

  /**
   * 앱 메인 초기화
   */
  async initializeApp() {
    try {
      // 알림 초기화
      notifications.init();

      // 타이머 초기화
      timer.init();

      // 대시보드로 이동
      this.hideLoading();
      this.navigate('dashboard');

      // 네비게이션 표시
      const nav = document.getElementById('main-nav');
      if (nav) nav.classList.remove('hidden');

      // 일일 과제 체크
      await tasks.checkAndGenerateDailyTasks();
    } catch (error) {
      console.error('initializeApp 내부 오류:', error);
      throw error; // 상위 init의 catch로 전달
    }
  }

  /**
   * Service Worker 등록
   */
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(reg => console.log('✅ Service Worker 등록 완료'))
          .catch(err => console.log('⚠️ Service Worker 등록 실패:', err));
      });
    }
  }

  /**
   * 온보딩 시작
   */
  startOnboarding() {
    const modal = document.getElementById('onboarding-modal');
    if (!modal) {
      console.error('DOM Error: #onboarding-modal not found');
      return;
    }
    modal.classList.remove('hidden');

    this.onboarding = {
      currentStep: 'api',

      saveApiKey: () => {
        const input = document.getElementById('api-key-input');
        const apiKey = input.value.trim();

        if (!apiKey) {
          this.toast.show('API 키를 입력해주세요', 'warning');
          return;
        }

        storage.setApiKey(apiKey);
        gemini.setApiKey(apiKey);

        document.getElementById('step-api')?.classList.add('hidden');
        document.getElementById('step-assessment')?.classList.remove('hidden');
        this.onboarding.currentStep = 'assessment';
      },

      completeAssessment: async () => {
        const categories = ['basic', 'anatomy', 'perspective', 'shading', 'color', 'composition'];
        const assessment = {};
        let allSelected = true;

        categories.forEach(cat => {
          const selected = document.querySelector(`input[name="${cat}"]:checked`);
          if (selected) {
            assessment[cat] = selected.value;
          } else {
            allSelected = false;
          }
        });

        if (!allSelected) {
          this.toast.show('모든 항목을 선택해주세요', 'warning');
          return;
        }

        storage.setAssessment(assessment);

        document.getElementById('step-assessment')?.classList.add('hidden');
        document.getElementById('step-analyzing')?.classList.remove('hidden');

        try {
          const analysis = await gemini.analyzeAssessment(assessment);
          await this.onboarding.generateInitialData(assessment, analysis);

          modal.classList.add('hidden');
          this.toast.show('🎉 환영합니다! 학습을 시작해볼까요?', 'success');
          await this.initializeApp();

        } catch (error) {
          console.error('분석 오류:', error);
          this.toast.show('분석 실패. API 키를 확인해주세요.', 'error');
          document.getElementById('step-analyzing')?.classList.add('hidden');
          document.getElementById('step-api')?.classList.remove('hidden');
        }
      },

      generateInitialData: async (assessment, analysis) => {
        const userData = storage.getUserData();
        userData.joinDate = new Date().toISOString();
        storage.setUserData(userData);
        await tasks.generateDailyTasks();
        await tasks.generateWeeklyGoals();
        const resources = await gemini.recommendResources(assessment);
        storage.set('recommended_resources', resources);
        storage.set('initial_analysis', analysis);
      }
    };
  }

  /**
   * 라우터 초기화
   */
  initRouter() {
    this.router = {
      navigate: (view) => {
        console.log(`📍 Navigation: ${view}`);
        window.app.currentView = view;

        document.querySelectorAll('.nav-item').forEach(item => {
          if (item.getAttribute('data-view') === view) item.classList.add('active');
          else item.classList.remove('active');
        });

        this.router.renderView(view);
      },

      renderView: (view) => {
        const appContainer = document.getElementById('app');
        const template = document.getElementById(`${view}-template`);

        if (!template) {
          console.error(`❌ Template not found: #${view}-template`);
          this.toast.show(`화면을 불러올 수 없습니다 (${view})`, 'error');
          return;
        }

        const content = template.content.cloneNode(true);
        appContainer.innerHTML = '';
        appContainer.appendChild(content);

        // 뷰별 초기화 (안전하게 처리)
        try {
            switch (view) {
              case 'dashboard': this.initDashboard(); break;
              case 'tasks': tasks.init(); break;
              case 'gallery': gallery.init(); break;
              case 'analytics': analytics.init(); break;
              case 'settings': this.initSettings(); break;
            }
        } catch(viewError) {
             console.error(`View Init Error (${view}):`, viewError);
        }

        window.scrollTo(0, 0);
      },

      // 대시보드 로직을 라우터 내부에 연결
      initDashboard: () => {
         this.dashboard = {
            render: () => {
               this.updateUserStats();
               this.updateTodayTasks();
               this.updateWeeklyGoals();
               this.updateStrengthsWeaknesses();
               this.updateRecommendedResources();
            }
         };
         this.dashboard.render();
      }
    };

    // 메서드 직접 연결 (bind 문제 해결)
    this.initDashboard = this.router.initDashboard;
  }

  /**
   * 사용자 통계 업데이트
   */
  updateUserStats() {
    const userData = storage.getUserData();
    if (!userData) return;

    const setContent = (id, text) => {
       const el = document.getElementById(id);
       if(el) el.textContent = text;
    };

    setContent('total-points', userData.points);
    setContent('streak-days', userData.streak);
    setContent('level-display', `Lv.${userData.level}`);

    const pointsPerLevel = CONFIG.GAME.POINTS_PER_LEVEL;
    const currentLevelPoints = userData.points % pointsPerLevel;
    const progressPercent = (currentLevelPoints / pointsPerLevel) * 100;

    const progressEl = document.getElementById('level-progress');
    if (progressEl) progressEl.style.width = `${progressPercent}%`;

    setContent('points-to-next', pointsPerLevel - currentLevelPoints);
  }

  /**
   * 오늘의 과제 업데이트
   */
  updateTodayTasks() {
    const allTasks = storage.getTasks();
    const today = UTILS.formatDate(new Date());
    const todayTasks = allTasks.daily.filter(t => UTILS.formatDate(t.date || t.createdAt) === today);
    const completed = todayTasks.filter(t => t.completed).length;

    const countEl = document.getElementById('today-task-count');
    if (countEl) countEl.textContent = `${completed}/${todayTasks.length}`;

    const container = document.getElementById('today-tasks');
    if (!container) return;

    if (todayTasks.length === 0) {
      container.innerHTML = '<div class="text-center p-4" style="color:var(--text-secondary)">오늘의 과제가 아직 없어요</div>';
      return;
    }

    container.innerHTML = todayTasks.slice(0, 3).map(task => `
      <div class="task-item ${task.completed ? 'completed' : ''}" onclick="app.tasks.toggleTask('daily', '${task.id}')">
        <div class="task-checkbox"></div>
        <div class="task-icon">${CONFIG.CATEGORIES[task.category]?.icon || '📝'}</div>
        <div class="task-content">
          <h4>${task.title}</h4>
          <p>${task.description}</p>
        </div>
        <div class="task-points">+${CONFIG.GAME.POINTS_PER_TASK}</div>
      </div>
    `).join('');
  }

  updateWeeklyGoals() {
    const allTasks = storage.getTasks();
    const weeklyGoals = allTasks.weekly || [];
    if (weeklyGoals.length === 0) return;

    const firstGoal = weeklyGoals[0];
    const goalCard = document.getElementById('weekly-goal-1');

    if (goalCard && firstGoal) {
      const icon = CONFIG.CATEGORIES[firstGoal.category]?.icon || '🎯';
      const progress = (firstGoal.progress / firstGoal.targetCount) * 100;
      goalCard.innerHTML = `
        <div class="goal-icon">${icon}</div>
        <div class="goal-content">
          <h4>${firstGoal.title}</h4>
          <p>${firstGoal.description}</p>
          <div class="progress-bar small"><div class="progress-fill" style="width: ${progress}%"></div></div>
        </div>`;
    }
  }

  updateStrengthsWeaknesses() {
    const analysis = storage.get('initial_analysis');
    if (!analysis) return;

    const fillList = (id, items) => {
        const el = document.getElementById(id);
        if(el && items) el.innerHTML = items.map(i => `<li>${i}</li>`).join('');
    };

    fillList('strengths-list', analysis.strengths);
    fillList('weaknesses-list', analysis.weaknesses);
  }

  updateRecommendedResources() {
    const resources = storage.get('recommended_resources');
    const container = document.getElementById('recommended-resources');
    if (!container) return;

    const list = resources?.resources || [];
    if (list.length === 0) {
      container.innerHTML = '<div class="text-center p-4">추천 자료를 불러오는 중...</div>';
      return;
    }

    // 👇 카테고리별로 그룹화하여 각 1개씩만 선택
    const categoryMap = {};
    list.forEach(res => {
      if (!categoryMap[res.category]) {
        categoryMap[res.category] = res;
      }
    });

    // 최대 3개만 추출
    const uniqueResources = Object.values(categoryMap).slice(0, 3);

    container.innerHTML = list.slice(0, 5).map(res => `
      <a href="${res.url}" target="_blank" class="resource-item">
        <div class="resource-icon">${res.type === 'video' ? '🎥' : '📚'}</div>
        <div class="resource-content">
          <h4>${res.title}</h4>
          <p>${res.description}</p>
        </div>
        <span class="resource-type">${res.type}</span>
      </a>`).join('');
  }

  initSettings() {
    this.settings = {
      updateApiKey: () => {
        const input = document.getElementById('settings-api-key');
        const newKey = input.value.trim();
        if (!newKey) return this.toast.show('API 키를 입력해주세요', 'warning');

        storage.setApiKey(newKey);
        gemini.setApiKey(newKey);
        this.toast.show('✅ API 키가 업데이트되었어요', 'success');
        input.value = '';
      },
      testApiConnection: async () => {
        this.showLoading('연결 테스트 중...');
        try {
          const result = await gemini.testConnection();
          this.hideLoading();
          result ? this.toast.show('✅ 연결 성공!', 'success') : this.toast.show('❌ 연결 실패', 'error');
        } catch {
          this.hideLoading();
          this.toast.show('❌ 연결 실패', 'error');
        }
      },
      reopenAssessment: () => {
        if (!confirm('다시 진단하시겠어요?')) return;
        const modal = document.getElementById('onboarding-modal');
        document.getElementById('step-api')?.classList.add('hidden');
        document.getElementById('step-assessment')?.classList.remove('hidden');
        document.getElementById('step-analyzing')?.classList.add('hidden');
        modal.classList.remove('hidden');
      }
    };

    const keyInput = document.getElementById('settings-api-key');
    const currentKey = storage.getApiKey();
    if(keyInput && currentKey) keyInput.placeholder = `현재 키: ${currentKey.slice(0,10)}...`;
  }

  initToast() {
    this.toast = {
      show: (message, type = 'info') => {
        const container = document.getElementById('toast-container');
        if (!container) {
            console.warn(`Toast container missing. Msg: ${message}`);
            return;
        }

        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<div class="toast-icon">${icons[type] || icons.info}</div><div class="toast-message">${message}</div>`;

        container.appendChild(toast);
        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      }
    };
  }

  navigate(view) {
    if(this.router) this.router.navigate(view);
  }

  showLoading(message = 'Loading...') {
    const loading = document.getElementById('loading');
    if (loading) {
      const p = loading.querySelector('p');
      if(p) p.textContent = message;
      loading.classList.remove('hidden');
    }
  }

  hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('hidden');
  }
  
  closeOnboarding() {
    if (confirm('온보딩을 취소하시겠어요? 나중에 다시 설정할 수 있습니다.')) {
      const modal = document.getElementById('onboarding-modal');
      modal.classList.add('hidden');

      // 만약 API 키가 없다면 설정 페이지로 유도
      const apiKey = storage.getApiKey();
      if (!apiKey) {
        this.toast.show('설정에서 API 키를 등록해주세요', 'info');
      }
    }
  }
}

  /**
   * AI 로딩 표시
   */
  showAILoading() {
    const overlay = document.getElementById('ai-loading-overlay');
    if (overlay) overlay.classList.remove('hidden');
  }

  /**
   * AI 로딩 숨김
   */
  hideAILoading() {
    const overlay = document.getElementById('ai-loading-overlay');
    if (overlay) overlay.classList.add('hidden');
  }


// 앱 인스턴스 생성 및 전역 할당 (DOM 로드 전이라도 안전하게)
const app = new ArtQuestApp();
window.app = app;

// 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

export default app;

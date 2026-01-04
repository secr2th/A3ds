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

    // 모듈들을 전역으로 접근 가능하게
    this.storage = storage;
    this.gemini = gemini;
    this.tasks = tasks;
    this.gallery = gallery;
    this.analytics = analytics;
    this.notifications = notifications;
    this.timer = timer;
    this.theme = theme;
    this.onboarding = null;
    this.dashboard = null;
    this.settings = null;
    this.router = null;
    this.toast = null;
  }

  /**
   * 앱 초기화
   */
  async init() {
    try {
      console.log('🎨 ArtQuest 초기화 시작...');

      // Service Worker 등록
      this.registerServiceWorker();

      // 유틸리티 모듈 초기화
      this.initToast();
      this.initRouter();

      // 테마 먼저 적용
      theme.init();

      // 온보딩 체크
      const apiKey = storage.getApiKey();
      const assessment = storage.getAssessment();

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
      console.error('앱 초기화 오류:', error);
      this.hideLoading();
      this.toast.show('앱 초기화에 실패했어요', 'error');
    }
  }

  /**
   * 앱 메인 초기화
   */
  async initializeApp() {
    // 알림 초기화
    notifications.init();

    // 타이머 초기화
    timer.init();

    // 대시보드로 이동
    this.hideLoading();
    this.navigate('dashboard');

    // 네비게이션 표시
    document.getElementById('main-nav')?.classList.remove('hidden');

    // 일일 과제 체크
    await tasks.checkAndGenerateDailyTasks();
  }

  /**
   * Service Worker 등록
   */
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(reg => console.log('✅ Service Worker 등록 완료:', reg))
          .catch(err => console.log('❌ Service Worker 등록 실패:', err));
      });
    }
  }

  /**
   * 온보딩 시작
   */
  startOnboarding() {
    const modal = document.getElementById('onboarding-modal');
    modal.classList.remove('hidden');

    // 온보딩 모듈 초기화
    this.onboarding = {
      currentStep: 'api',

      /**
       * API 키 저장
       */
      saveApiKey: () => {
        const input = document.getElementById('api-key-input');
        const apiKey = input.value.trim();

        if (!apiKey) {
          window.app.toast.show('API 키를 입력해주세요', 'warning');
          return;
        }

        // API 키 저장 및 설정
        storage.setApiKey(apiKey);
        gemini.setApiKey(apiKey);

        // 다음 단계로
        document.getElementById('step-api').classList.add('hidden');
        document.getElementById('step-assessment').classList.remove('hidden');
        this.currentStep = 'assessment';
      },

      /**
       * 실력 진단 완료
       */
      completeAssessment: async () => {
        // 모든 카테고리 선택 체크
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
          window.app.toast.show('모든 항목을 선택해주세요', 'warning');
          return;
        }

        // 평가 결과 저장
        storage.setAssessment(assessment);

        // 분석 단계로
        document.getElementById('step-assessment').classList.add('hidden');
        document.getElementById('step-analyzing').classList.remove('hidden');

        try {
          // AI 분석
          const analysis = await gemini.analyzeAssessment(assessment);

          // 초기 데이터 생성
          await this.generateInitialData(assessment, analysis);

          // 온보딩 완료
          modal.classList.add('hidden');
          window.app.toast.show('🎉 환영합니다! 학습을 시작해볼까요?', 'success');

          // 앱 초기화
          await window.app.initializeApp();
        } catch (error) {
          console.error('분석 오류:', error);
          window.app.toast.show('분석에 실패했어요. API 키를 확인해주세요', 'error');

          // 첫 단계로 돌아가기
          document.getElementById('step-analyzing').classList.add('hidden');
          document.getElementById('step-api').classList.remove('hidden');
        }
      },

      /**
       * 초기 데이터 생성
       */
      generateInitialData: async (assessment, analysis) => {
        // 사용자 데이터 초기화
        const userData = storage.getUserData();
        userData.joinDate = new Date().toISOString();
        storage.setUserData(userData);

        // 일일 과제 생성
        await tasks.generateDailyTasks();

        // 주간 목표 생성
        await tasks.generateWeeklyGoals();

        // 학습 리소스 추천
        const resources = await gemini.recommendResources(assessment);
        storage.set('recommended_resources', resources);

        // 분석 결과 저장
        storage.set('initial_analysis', analysis);
      }
    };
  }

  /**
   * 라우터 초기화
   */
  initRouter() {
    this.router = {
      /**
       * 뷰 전환
       */
      navigate: (view) => {
        console.log(`📍 Navigation: ${view}`);

        // 현재 뷰 저장
        window.app.currentView = view;

        // 네비게이션 활성화 상태
        document.querySelectorAll('.nav-item').forEach(item => {
          const itemView = item.getAttribute('data-view');
          if (itemView === view) {
            item.classList.add('active');
          } else {
            item.classList.remove('active');
          }
        });

        // 뷰 렌더링
        this.renderView(view);
      },

      /**
       * 뷰 렌더링
       */
      renderView: (view) => {
        const appContainer = document.getElementById('app');
        const template = document.getElementById(`${view}-template`);

        if (!template) {
          console.error(`템플릿을 찾을 수 없음: ${view}`);
          return;
        }

        // 템플릿 복제 및 삽입
        const content = template.content.cloneNode(true);
        appContainer.innerHTML = '';
        appContainer.appendChild(content);

        // 뷰별 초기화
        switch (view) {
          case 'dashboard':
            window.app.initDashboard();
            break;
          case 'tasks':
            tasks.init();
            break;
          case 'gallery':
            gallery.init();
            break;
          case 'analytics':
            analytics.init();
            break;
          case 'settings':
            window.app.initSettings();
            break;
        }

        // 스크롤 맨 위로
        window.scrollTo(0, 0);
      }
    };
  }

  /**
   * 대시보드 초기화
   */
  initDashboard() {
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

  /**
   * 사용자 통계 업데이트
   */
  updateUserStats() {
    const userData = storage.getUserData();

    // 포인트
    const pointsEl = document.getElementById('total-points');
    if (pointsEl) pointsEl.textContent = userData.points;

    // 연속 일수
    const streakEl = document.getElementById('streak-days');
    if (streakEl) streakEl.textContent = userData.streak;

    // 레벨
    const levelEl = document.getElementById('level-display');
    if (levelEl) levelEl.textContent = `Lv.${userData.level}`;

    // 레벨 진행도
    const pointsPerLevel = CONFIG.GAME.POINTS_PER_LEVEL;
    const currentLevelPoints = userData.points % pointsPerLevel;
    const progressPercent = (currentLevelPoints / pointsPerLevel) * 100;

    const progressEl = document.getElementById('level-progress');
    if (progressEl) progressEl.style.width = `${progressPercent}%`;

    const pointsToNextEl = document.getElementById('points-to-next');
    if (pointsToNextEl) {
      pointsToNextEl.textContent = pointsPerLevel - currentLevelPoints;
    }
  }

  /**
   * 오늘의 과제 업데이트
   */
  updateTodayTasks() {
    const allTasks = storage.getTasks();
    const today = UTILS.formatDate(new Date());

    const todayTasks = allTasks.daily.filter(t =>
      UTILS.formatDate(t.date || t.createdAt) === today
    );

    const completed = todayTasks.filter(t => t.completed).length;

    // 카운트 업데이트
    const countEl = document.getElementById('today-task-count');
    if (countEl) countEl.textContent = `${completed}/${todayTasks.length}`;

    // 과제 리스트 렌더링
    const container = document.getElementById('today-tasks');
    if (!container) return;

    if (todayTasks.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
          오늘의 과제가 아직 없어요
        </div>
      `;
      return;
    }

    container.innerHTML = todayTasks.slice(0, 3).map(task => `
      <div class="task-item ${task.completed ? 'completed' : ''}"
           onclick="app.tasks.toggleTask('daily', '${task.id}')">
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

  /**
   * 주간 목표 업데이트
   */
  updateWeeklyGoals() {
    const allTasks = storage.getTasks();
    const weeklyGoals = allTasks.weekly;

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
          <div class="progress-bar small">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
        </div>
      `;
    }
  }

  /**
   * 강점/약점 업데이트
   */
  updateStrengthsWeaknesses() {
    const analysis = storage.get('initial_analysis');

    if (!analysis) return;

    // 강점
    const strengthsList = document.getElementById('strengths-list');
    if (strengthsList && analysis.strengths) {
      strengthsList.innerHTML = analysis.strengths
        .map(s => `<li>${s}</li>`)
        .join('');
    }

    // 약점
    const weaknessesList = document.getElementById('weaknesses-list');
    if (weaknessesList && analysis.weaknesses) {
      weaknessesList.innerHTML = analysis.weaknesses
        .map(w => `<li>${w}</li>`)
        .join('');
    }
  }

  /**
   * 추천 리소스 업데이트
   */
  updateRecommendedResources() {
    const resources = storage.get('recommended_resources');
    const container = document.getElementById('recommended-resources');

    if (!container || !resources) return;

    const resourcesList = resources.resources || [];

    if (resourcesList.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
          추천 자료를 불러오는 중...
        </div>
      `;
      return;
    }

    container.innerHTML = resourcesList.slice(0, 5).map(resource => `
      <a href="${resource.url}" target="_blank" class="resource-item">
        <div class="resource-icon">
          ${resource.type === 'video' ? '🎥' : resource.type === 'article' ? '📄' : '📚'}
        </div>
        <div class="resource-content">
          <h4>${resource.title}</h4>
          <p>${resource.description}</p>
        </div>
        <span class="resource-type">${resource.type}</span>
      </a>
    `).join('');
  }

  /**
   * 설정 초기화
   */
  initSettings() {
    this.settings = {
      /**
       * API 키 업데이트
       */
      updateApiKey: async () => {
        const input = document.getElementById('settings-api-key');
        const newKey = input.value.trim();

        if (!newKey) {
          window.app.toast.show('API 키를 입력해주세요', 'warning');
          return;
        }

        storage.setApiKey(newKey);
        gemini.setApiKey(newKey);
        window.app.toast.show('✅ API 키가 업데이트되었어요', 'success');
        input.value = '';
      },

      /**
       * API 연결 테스트
       */
      testApiConnection: async () => {
        window.app.showLoading('API 연결을 테스트하고 있어요...');

        try {
          const result = await gemini.testConnection();

          window.app.hideLoading();

          if (result) {
            window.app.toast.show('✅ API 연결 성공!', 'success');
          } else {
            window.app.toast.show('❌ API 연결 실패', 'error');
          }
        } catch (error) {
          window.app.hideLoading();
          window.app.toast.show('❌ API 연결 실패', 'error');
        }
      },

      /**
       * 실력 재진단
       */
      reopenAssessment: () => {
        if (confirm('실력을 다시 진단하시겠어요? 기존 데이터는 유지됩니다.')) {
          const modal = document.getElementById('onboarding-modal');

          // API 단계는 건너뛰고 평가 단계로
          document.getElementById('step-api').classList.add('hidden');
          document.getElementById('step-assessment').classList.remove('hidden');
          document.getElementById('step-analyzing').classList.add('hidden');

          // 기존 평가 데이터 불러오기
          const currentAssessment = storage.getAssessment();
          if (currentAssessment) {
            Object.entries(currentAssessment).forEach(([category, level]) => {
              const radio = document.querySelector(`input[name="${category}"][value="${level}"]`);
              if (radio) radio.checked = true;
            });
          }

          modal.classList.remove('hidden');
        }
      }
    };

    // 현재 API 키 상태 표시
    const apiKeyInput = document.getElementById('settings-api-key');
    const currentKey = storage.getApiKey();
    if (apiKeyInput && currentKey) {
      apiKeyInput.placeholder = '현재 API 키: ' + currentKey.substring(0, 10) + '...';
    }
  }

  /**
   * Toast 알림 초기화
   */
  initToast() {
    this.toast = {
      show: (message, type = 'info') => {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const icons = {
          success: '✅',
          error: '❌',
          warning: '⚠️',
          info: 'ℹ️'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
          <div class="toast-icon">${icons[type] || icons.info}</div>
          <div class="toast-message">${message}</div>
        `;

        container.appendChild(toast);

        // 3초 후 제거
        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      }
    };
  }

  /**
   * 네비게이션
   */
  navigate(view) {
    this.router.navigate(view);
  }

  /**
   * 로딩 표시
   */
  showLoading(message = 'Loading...') {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.querySelector('p').textContent = message;
      loading.classList.remove('hidden');
    }
  }

  /**
   * 로딩 숨김
   */
  hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('hidden');
    }
  }
}

// 앱 인스턴스 생성 및 전역 접근
const app = new ArtQuestApp();
window.app = app;

// DOM 로드 후 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

export default app;

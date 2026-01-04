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
      //await tasks.checkAndGenerateDailyTasks();
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

            /**
       * 실력 진단 완료
       */
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
          window.app.toast.show('모든 항목을 선택해주세요', 'warning');
          return;
        }

        assessment.analyzedAt = new Date().toISOString(); 
        storage.setAssessment(assessment);

        document.getElementById('step-assessment')?.classList.add('hidden');
        document.getElementById('step-analyzing')?.classList.remove('hidden');

        try {
          const analysis = await gemini.analyzeAssessment(assessment);

          // 👇 결과 모달 표시 추가
          window.app.showAssessmentResult(assessment, analysis);

          await this.onboarding.generateInitialData(assessment, analysis);

          // 온보딩 모달은 닫기
          const modal = document.getElementById('onboarding-modal');
          modal.classList.add('hidden');

          window.app.toast.show('🎉 환영합니다! 학습을 시작해볼까요?', 'success');
          await window.app.initializeApp();

        } catch (error) {
          console.error('분석 오류:', error);
          window.app.toast.show('분석 실패. API 키를 확인해주세요.', 'error');
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
               this.updateCustomLinks();
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
   * 커스텀 링크 추가
   */
  addCustomLink() {
    const title = prompt('링크 제목을 입력하세요 (예: 김라면 채널):');
    if (!title) return;

    const url = prompt('URL을 입력하세요:');
    if (!url) return;

    // 아이콘 선택
    const iconOptions = ['🎥', '🐦', '📺', '📱', '🌐', '📚', '✏️', '🎨'];
    const iconPrompt = `아이콘을 선택하세요 (번호 입력):\n${iconOptions.map((icon, i) => `${i + 1}. ${icon}`).join('\n')}`;
    const iconIndex = parseInt(prompt(iconPrompt)) - 1;
    const icon = iconOptions[iconIndex] || '🔗';

    storage.addCustomLink({ title, url, icon });
    this.toast.show('✅ 링크가 추가되었어요!', 'success');
    this.updateCustomLinks();
  }

  /**
   * 커스텀 링크 삭제
   */
  deleteCustomLink(linkId) {
    if (confirm('이 링크를 삭제하시겠어요?')) {
      storage.deleteCustomLink(linkId);
      this.toast.show('🗑 링크가 삭제되었어요', 'success');
      this.updateCustomLinks();
    }
  }

  /**
   * 커스텀 링크 렌더링
   */
  updateCustomLinks() {
    const links = storage.getCustomLinks();
    const container = document.getElementById('custom-links');
    if (!container) return;

    if (links.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
          <p style="font-size: 48px; margin-bottom: 16px;">🔗</p>
          <p>자주 가는 유튜브 채널이나 SNS를 추가해보세요</p>
        </div>
      `;
      return;
    }

    container.innerHTML = links.map(link => `
      <a href="${link.url}" target="_blank" class="custom-link-card">
        <div class="custom-link-delete" onclick="event.preventDefault(); event.stopPropagation(); app.deleteCustomLink('${link.id}')">
          ✕
        </div>
        <div class="custom-link-icon">${link.icon}</div>
        <div class="custom-link-title">${link.title}</div>
        <div class="custom-link-url">${link.url}</div>
      </a>
    `).join('');
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
      // 👇 출석 안내 메시지로 변경
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <p style="font-size: 48px; margin-bottom: 16px;">📅</p>
          <p style="margin-bottom: 16px;">출석 버튼을 눌러 오늘의 과제를 받아보세요!</p>
          <button class="btn-primary" onclick="app.tasks.attendToday()">
            ✓ 출석하기
          </button>
        </div>
      `;
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

    // 👇 추가
    this.tasks.updateAttendButton();
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

    /**
   * 강점/약점 업데이트 (진단 결과에서만)
   */
  updateStrengthsWeaknesses() {
    const analysis = storage.get('initial_analysis');

    // 👇 분석 결과가 없으면 안내 메시지
    if (!analysis) {
      const strengthsList = document.getElementById('strengths-list');
      const weaknessesList = document.getElementById('weaknesses-list');

      if (strengthsList) {
        strengthsList.innerHTML = '<li style="color: var(--text-tertiary);">실력 진단을 완료하면 표시됩니다</li>';
      }
      if (weaknessesList) {
        weaknessesList.innerHTML = '<li style="color: var(--text-tertiary);">실력 진단을 완료하면 표시됩니다</li>';
      }
      return;
    }

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

    // 👇 마지막 진단 날짜 표시 추가
    const assessment = storage.getAssessment();
    if (assessment && assessment.analyzedAt) {
      const dateText = UTILS.getRelativeTime(assessment.analyzedAt);
      const container = document.querySelector('.strength-weakness-grid');
      if (container) {
        let dateEl = container.querySelector('.analysis-date');
        if (!dateEl) {
          dateEl = document.createElement('small');
          dateEl.className = 'analysis-date';
          dateEl.style.cssText = 'grid-column: 1/-1; text-align: center; color: var(--text-tertiary); margin-top: 8px;';
          container.appendChild(dateEl);
        }
        dateEl.textContent = `마지막 진단: ${dateText}`;
      }
    }
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

    /**
   * 실력 진단 결과 모달 표시
   */
  showAssessmentResult(assessment, analysis) {
    const modal = document.getElementById('assessment-result-modal');
    const content = document.getElementById('assessment-result-content');

    if (!modal || !content) return;

    // 레벨 한글 변환
    const levelKR = {
      beginner: '초급',
      intermediate: '중급',
      advanced: '상급'
    };

    // 카테고리별 레벨
    const categoryCards = Object.entries(assessment).map(([key, level]) => {
      const cat = CONFIG.CATEGORIES[key];
      return `
        <div class="category-result-card">
          <div class="category-result-icon">${cat.icon}</div>
          <div class="category-result-name">${cat.name}</div>
          <div class="category-result-level">${levelKR[level]}</div>
        </div>
      `;
    }).join('');

    content.innerHTML = `
      <div class="assessment-result">
        <!-- 헤더 -->
        <div class="assessment-result-header">
          <h2>🎨 당신은 이런 아티스트예요</h2>
          <div class="assessment-result-level">
            전체 레벨: ${analysis.overallLevel}
          </div>
        </div>

        <!-- 전체 요약 -->
        <div class="assessment-result-summary">
          <h3>📝 종합 평가</h3>
          <p>
            당신은 <strong>${analysis.overallLevel}</strong> 수준의 실력을 가지고 있어요.
            ${analysis.overallLevel === '초급' ? '이제 막 그림을 시작하셨거나 기초를 다지고 계시는 단계예요. 꾸준한 연습이 가장 중요한 시기입니다!' : ''}
            ${analysis.overallLevel === '중급' ? '기본기가 어느 정도 갖춰진 상태예요. 이제 세부적인 기술을 연마하고 자신만의 스타일을 찾아가는 단계입니다!' : ''}
            ${analysis.overallLevel === '상급' ? '탄탄한 실력을 갖추셨네요! 더욱 전문적인 기법과 창의적 표현에 도전해볼 시기예요!' : ''}
          </p>
        </div>

        <!-- 카테고리별 레벨 -->
        <h3 style="margin-bottom: 16px;">📊 분야별 실력</h3>
        <div class="assessment-categories">
          ${categoryCards}
        </div>

        <!-- 강점/약점 -->
        <div class="assessment-strengths-weaknesses">
          <div class="result-sw-card strength">
            <h4>💪 당신의 강점</h4>
            <ul>
              ${analysis.strengths.map(s => `<li>${s}</li>`).join('')}
            </ul>
          </div>
          <div class="result-sw-card weakness">
            <h4>📈 개선이 필요한 부분</h4>
            <ul>
              ${analysis.weaknesses.map(w => `<li>${w}</li>`).join('')}
            </ul>
          </div>
        </div>

        <!-- 추천 학습 방향 -->
        <div class="assessment-recommendations">
          <h3>🎯 맞춤 학습 가이드</h3>
          <ul>
            ${analysis.recommendations.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>

        <!-- 학습 팁 -->
        ${analysis.learningTips && analysis.learningTips.length > 0 ? `
          <div class="assessment-result-summary">
            <h3>💡 학습 팁</h3>
            <ul style="list-style: none; padding: 0;">
              ${analysis.learningTips.map(tip => `
                <li style="padding: 8px 0; color: var(--text-secondary);">
                  • ${tip}
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        <button class="btn-primary" onclick="document.getElementById('assessment-result-modal').classList.add('hidden')" style="width: 100%; margin-top: 24px;">
          학습 시작하기
        </button>
      </div>
    `;

    modal.classList.remove('hidden');
  }

        /**
       * 실력 재진단
       */
      reopenAssessment: () => {
        if (!confirm('다시 진단하시겠어요?')) return;

        const modal = document.getElementById('onboarding-modal');

        // 평가 단계로 이동
        document.getElementById('step-api')?.classList.add('hidden');
        document.getElementById('step-assessment')?.classList.remove('hidden');
        document.getElementById('step-analyzing')?.classList.add('hidden');

        // 기존 평가 데이터 불러오기
        const currentAssessment = storage.getAssessment();
        if (currentAssessment) {
          Object.entries(currentAssessment).forEach(([category, level]) => {
            const radio = document.querySelector(`input[name="${category}"][value="${level}"]`);
            if (radio) radio.checked = true;
          });
        }

        // 👇 완료 버튼 핸들러 수정
        const completeBtn = document.querySelector('#step-assessment .btn-primary');
        if (completeBtn) {
          completeBtn.onclick = async () => {
            const categories = ['basic', 'anatomy', 'perspective', 'shading', 'color', 'composition'];
            const assessment = {};
            let allSelected = true;

            categories.forEach(cat => {
              const selected = document.querySelector(`input[name="${cat}"]:checked`);
              if (selected) assessment[cat] = selected.value;
              else allSelected = false;
            });

            if (!allSelected) {
              window.app.toast.show('모든 항목을 선택해주세요', 'warning');
              return;
            }

            assessment.analyzedAt = new Date().toISOString();
            storage.setAssessment(assessment);

            document.getElementById('step-assessment')?.classList.add('hidden');
            document.getElementById('step-analyzing')?.classList.remove('hidden');

            try {
              const analysis = await window.app.gemini.analyzeAssessment(assessment);

              // 분석 결과 저장
              storage.set('initial_analysis', analysis);

              modal.classList.add('hidden');

              // 👇 결과 모달 표시
              window.app.showAssessmentResult(assessment, analysis);

              window.app.toast.show('✅ 실력 진단이 완료되었어요!', 'success');

              // 대시보드 업데이트
              if (window.app.dashboard) {
                window.app.dashboard.render();
              }

            } catch (error) {
              console.error('재진단 오류:', error);
              window.app.toast.show('진단 실패', 'error');
              document.getElementById('step-analyzing')?.classList.add('hidden');
              document.getElementById('step-assessment')?.classList.remove('hidden');
            }
          };
        }

        modal.classList.remove('hidden');
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

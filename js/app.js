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
        navigator.serviceWorker.register('./service-worker.js')
          .then(reg => {
            console.log('✅ Service Worker 등록 완료', reg.scope);
          })
          .catch(err => {
            console.log('⚠️ Service Worker 등록 실패:', err);
          });
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

      closeModal: () => {
        const modal = document.getElementById('onboarding-modal');
        // Check if user has already completed onboarding before
        const hasApiKey = storage.getApiKey();
        const hasAssessment = storage.getAssessment();
        
        if (hasApiKey && hasAssessment) {
          // User is re-assessing, can close freely
          modal.classList.add('hidden');
        } else {
          // First time onboarding, show confirmation
          if (confirm('설정을 중단하시겠습니까? 나중에 설정에서 다시 진행할 수 있습니다.')) {
            modal.classList.add('hidden');
          }
        }
      },

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

          // Close the onboarding modal
          const modal = document.getElementById('onboarding-modal');
          modal.classList.add('hidden');
          
          // Show result popup MBTI-style
          this.showAssessmentResult(analysis, assessment);
          
          // Check if this is a re-assessment (not first time)
          const userData = storage.getUserData();
          if (userData.joinDate) {
            // This is re-assessment, refresh dashboard
            if (window.app.dashboard) {
              window.app.dashboard.render();
            }
          } else {
            // First time, flag to init app after modal closes
            window.app._pendingInitAfterAssessment = true;
          }

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
               this.updateSocialLinks();
            },
            checkAttendance: async () => {
               // Check if tasks already generated today
               const lastAttendance = storage.get('last_attendance_date');
               const today = UTILS.formatDate(new Date());
               
               if (lastAttendance === today) {
                 window.app.toast.show('오늘은 이미 출석했어요! 🎉', 'info');
                 return;
               }

               // Generate 1-3 tasks
               const assessment = storage.getAssessment();
               if (!assessment) {
                 window.app.toast.show('실력 진단이 필요합니다', 'warning');
                 return;
               }

               try {
                 window.app.showLoading('출석 체크 중...');
                 
                 const dayOfWeek = new Date().getDay();
                 const result = await gemini.generateDailyTasks(assessment, dayOfWeek);
                 
                 const tasks = storage.getTasks();
                 
                 // Delete all existing tasks for today
                 tasks.daily = tasks.daily.filter(t => 
                   UTILS.formatDate(t.date || t.createdAt) !== today
                 );
                 
                 // Only add 1-3 tasks randomly
                 const numTasks = Math.floor(Math.random() * 3) + 1; // Random 1-3
                 const tasksToAdd = result.tasks.slice(0, numTasks);
                 
                 tasksToAdd.forEach(task => {
                   tasks.daily.push({
                     id: UTILS.generateId(),
                     ...task,
                     date: today,
                     createdAt: new Date().toISOString(),
                     completed: false,
                     completedAt: null
                   });
                 });
                 
                 storage.setTasks(tasks);
                 storage.set('last_attendance_date', today);
                 
                 // Award attendance points once
                 storage.addPoints(CONFIG.GAME.ATTENDANCE_POINTS || 10);
                 
                 window.app.hideLoading();
                 window.app.toast.show(`📅 출석 완료! ${tasksToAdd.length}개의 과제가 생성되었어요`, 'success');
                 
                 this.updateTodayTasks();
               } catch (error) {
                 console.error('Attendance error:', error);
                 window.app.hideLoading();
                 window.app.toast.show('출석 체크 실패', 'error');
               }
            },
            refreshWeeklyGoals: async () => {
               // Check if already refreshed this week
               const lastRefresh = storage.get('last_weekly_refresh');
               const currentWeek = UTILS.getWeekNumber(new Date());
               
               if (lastRefresh === currentWeek) {
                 if (!confirm('이번 주 목표를 다시 생성하시겠어요? 기존 목표는 삭제됩니다.')) {
                   return;
                 }
               }

               try {
                 await tasks.generateWeeklyGoals();
                 storage.set('last_weekly_refresh', currentWeek);
                 this.updateWeeklyGoals();
               } catch (error) {
                 console.error('Weekly goals refresh error:', error);
               }
            },
            addSocialLink: () => {
               const name = prompt('링크 이름 (예: 내 유튜브 채널):');
               if (!name) return;
               
               const url = prompt('링크 URL:');
               if (!url) return;
               
               const icons = {
                 'youtube': '🎥',
                 'twitter': '🐦',
                 'instagram': '📷',
                 'tiktok': '🎵',
                 'blog': '✍️',
                 'github': '💻',
                 'portfolio': '🎨',
                 'other': '🔗'
               };
               
               const iconChoice = prompt(
                 '아이콘을 선택하세요:\n1. YouTube (🎥)\n2. Twitter (🐦)\n3. Instagram (📷)\n4. TikTok (🎵)\n5. Blog (✍️)\n6. GitHub (💻)\n7. Portfolio (🎨)\n8. Other (🔗)'
               );
               
               const iconMap = ['youtube', 'twitter', 'instagram', 'tiktok', 'blog', 'github', 'portfolio', 'other'];
               const selectedIcon = icons[iconMap[parseInt(iconChoice) - 1]] || icons.other;
               
               const socialLinks = storage.get('social_links') || [];
               socialLinks.push({
                 id: UTILS.generateId(),
                 name,
                 url,
                 icon: selectedIcon
               });
               
               storage.set('social_links', socialLinks);
               window.app.toast.show('✅ 링크가 추가되었어요!', 'success');
               this.updateSocialLinks();
            },
            deleteSocialLink: (id) => {
               if (!confirm('이 링크를 삭제하시겠어요?')) return;
               
               let socialLinks = storage.get('social_links') || [];
               socialLinks = socialLinks.filter(link => link.id !== id);
               storage.set('social_links', socialLinks);
               
               window.app.toast.show('🗑 링크가 삭제되었어요', 'success');
               this.updateSocialLinks();
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
    const container = document.getElementById('dashboard-weekly-goals');
    
    if (!container) return;

    if (weeklyGoals.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 32px; color: var(--text-secondary);">
          <p style="margin-bottom: 12px;">주간 목표가 없어요</p>
          <button class="btn-secondary" onclick="app.dashboard.refreshWeeklyGoals()">
            목표 생성하기
          </button>
        </div>
      `;
      return;
    }

    // Show all weekly goals (not just first one)
    container.innerHTML = weeklyGoals.map(goal => {
      const icon = CONFIG.CATEGORIES[goal.category]?.icon || '🎯';
      const progress = goal.targetCount > 0 ? (goal.progress / goal.targetCount) * 100 : 0;
      return `
        <div class="goal-card" style="margin-bottom: 12px;">
          <div class="goal-icon">${icon}</div>
          <div class="goal-content">
            <h4>${goal.title}</h4>
            <p>${goal.description}</p>
            <div class="progress-bar small">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <small style="color: var(--text-tertiary); margin-top: 4px; display: block;">
              ${goal.progress} / ${goal.targetCount} 완료
            </small>
          </div>
        </div>
      `;
    }).join('');
  }

  updateStrengthsWeaknesses() {
    const analysis = storage.get('initial_analysis');
    if (!analysis) {
      // Only show message if no analysis exists
      const strengthsList = document.getElementById('strengths-list');
      const weaknessesList = document.getElementById('weaknesses-list');
      
      if (strengthsList) strengthsList.innerHTML = '<li>실력 진단을 완료하면 표시됩니다</li>';
      if (weaknessesList) weaknessesList.innerHTML = '<li>실력 진단을 완료하면 표시됩니다</li>';
      return;
    }

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

    // Get one resource per category, max 3 total
    const categorizedResources = {};
    list.forEach(res => {
      if (!categorizedResources[res.category]) {
        categorizedResources[res.category] = res;
      }
    });

    const limitedResources = Object.values(categorizedResources).slice(0, 3);

    container.innerHTML = limitedResources.map(res => `
      <a href="${res.url}" target="_blank" class="resource-item">
        <div class="resource-icon">${res.type === 'video' ? '🎥' : '📚'}</div>
        <div class="resource-content">
          <h4>${res.title}</h4>
          <p>${res.description}</p>
        </div>
        <span class="resource-type">${res.type}</span>
      </a>`).join('');
  }

  updateSocialLinks() {
    const socialLinks = storage.get('social_links') || [];
    const container = document.getElementById('social-links');
    if (!container) return;

    if (socialLinks.length === 0) {
      container.innerHTML = `
        <div class="empty-social-links">
          <div class="icon">🔗</div>
          <p>아직 추가된 링크가 없어요</p>
          <p style="font-size: 14px; margin-top: 8px;">유튜브, 트위터 등의 링크를 추가해보세요!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = socialLinks.map(link => `
      <div class="social-link-card">
        <div class="social-link-icon">${link.icon}</div>
        <div class="social-link-content">
          <h4>${link.name}</h4>
          <a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.url}</a>
        </div>
        <div class="social-link-actions">
          <button class="icon-btn" onclick="window.open('${link.url}', '_blank')" title="열기">
            <span class="icon">🔗</span>
          </button>
          <button class="icon-btn" onclick="app.dashboard.deleteSocialLink('${link.id}')" title="삭제">
            <span class="icon">🗑</span>
          </button>
        </div>
      </div>
    `).join('');
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
        if (!confirm('다시 진단하시겠어요? 기존 분석 결과가 업데이트됩니다.')) return;
        const modal = document.getElementById('onboarding-modal');
        document.getElementById('step-api')?.classList.add('hidden');
        document.getElementById('step-assessment')?.classList.remove('hidden');
        document.getElementById('step-analyzing')?.classList.add('hidden');
        modal.classList.remove('hidden');
        
        // Re-initialize onboarding to ensure all handlers work
        window.app.startOnboarding();
        
        // Make sure we're on assessment step
        document.getElementById('step-api')?.classList.add('hidden');
        document.getElementById('step-assessment')?.classList.remove('hidden');
        document.getElementById('step-analyzing')?.classList.add('hidden');
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

  showAILoading() {
    const modal = document.getElementById('ai-loading-modal');
    if (modal) modal.classList.remove('hidden');
  }

  hideAILoading() {
    const modal = document.getElementById('ai-loading-modal');
    if (modal) modal.classList.add('hidden');
  }

  showAssessmentResult(analysis, assessment) {
    const modal = document.getElementById('assessment-result-modal');
    const content = document.getElementById('assessment-result-content');
    
    if (!modal || !content) return;

    // Count beginner/intermediate/advanced levels
    const levels = Object.values(assessment);
    const beginnerCount = levels.filter(l => l === 'beginner').length;
    const intermediateCount = levels.filter(l => l === 'intermediate').length;
    const advancedCount = levels.filter(l => l === 'advanced').length;

    // Generate personality type
    let personalityType = '';
    let typeEmoji = '';
    if (beginnerCount >= 4) {
      personalityType = '새싹 아티스트 🌱';
      typeEmoji = '🌱';
    } else if (advancedCount >= 4) {
      personalityType = '프로 크리에이터 🎨';
      typeEmoji = '🎨';
    } else if (intermediateCount >= 4) {
      personalityType = '성장하는 아티스트 🌟';
      typeEmoji = '🌟';
    } else {
      personalityType = '균형잡힌 학습자 ⚖️';
      typeEmoji = '⚖️';
    }

    content.innerHTML = `
      <div class="assessment-result">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="font-size: 64px; margin-bottom: 16px;">${typeEmoji}</div>
          <h2 style="font-size: 28px; margin-bottom: 8px;">${personalityType}</h2>
          <p style="color: var(--text-secondary); font-size: 16px;">당신의 현재 실력 수준은 <strong>${analysis.overallLevel}</strong>입니다</p>
        </div>

        <div style="background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light)); 
                    color: white; padding: 24px; border-radius: 16px; margin-bottom: 24px;">
          <h3 style="color: white; margin-bottom: 16px; font-size: 18px;">💪 당신의 강점</h3>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${analysis.strengths.map(s => `
              <li style="padding: 8px 0; display: flex; align-items: start; gap: 12px;">
                <span style="flex-shrink: 0;">✓</span>
                <span>${s}</span>
              </li>
            `).join('')}
          </ul>
        </div>

        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 16px; margin-bottom: 24px;">
          <h3 style="margin-bottom: 16px; font-size: 18px;">📈 개선이 필요한 영역</h3>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${analysis.weaknesses.map(w => `
              <li style="padding: 8px 0; display: flex; align-items: start; gap: 12px; color: var(--text-secondary);">
                <span style="flex-shrink: 0;">•</span>
                <span>${w}</span>
              </li>
            `).join('')}
          </ul>
        </div>

        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 16px; margin-bottom: 24px;">
          <h3 style="margin-bottom: 16px; font-size: 18px;">🎯 맞춤 학습 추천</h3>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${analysis.recommendations.map(r => `
              <li style="padding: 8px 0; display: flex; align-items: start; gap: 12px; color: var(--text-secondary);">
                <span style="flex-shrink: 0;">→</span>
                <span>${r}</span>
              </li>
            `).join('')}
          </ul>
        </div>

        <div style="background: linear-gradient(135deg, #10b981, #059669); 
                    color: white; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
          <p style="color: white; font-size: 16px; font-weight: 500; margin: 0;">
            ${analysis.learningTips[0] || '꾸준함이 가장 중요합니다! 매일 조금씩 연습해보세요 🎨'}
          </p>
        </div>

        <button class="btn-primary" onclick="app.closeAssessmentResult()" style="width: 100%;">
          학습 시작하기 🚀
        </button>
      </div>
    `;

    modal.classList.remove('hidden');
  }

  closeAssessmentResult() {
    const modal = document.getElementById('assessment-result-modal');
    if (modal) modal.classList.add('hidden');
    this.toast.show('🎉 환영합니다! 학습을 시작해볼까요?', 'success');
    
    // Initialize app if this was called after assessment
    if (window.app._pendingInitAfterAssessment) {
      window.app._pendingInitAfterAssessment = false;
      this.initializeApp();
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

/**
 * Tasks Module
 * - 일일/주간/커스텀 과제 관리
 * - 과제 완료 처리
 * - 과제 생성 및 업데이트
 */

import { CONFIG, UTILS } from '../config.js';
import storage from './storage.js';
import gemini from './gemini.js';

class TaskManager {
  constructor() {
    this.currentTab = 'daily';
    this.selectedDate = new Date();
  }

  /**
   * 초기화
   */
  async init() {
    await this.checkAndGenerateDailyTasks();
    this.render();
  }

  /**
   * 일일 과제 자동 생성 체크
   */
  async checkAndGenerateDailyTasks() {
    const tasks = storage.getTasks();
    const today = UTILS.formatDate(new Date());

    // 오늘 날짜의 과제가 없으면 생성
    const todayTasks = tasks.daily.filter(t =>
      UTILS.formatDate(t.createdAt) === today
    );

    if (todayTasks.length === 0) {
      await this.generateDailyTasks();
    }
  }

  /**
   * AI로 일일 과제 생성
   */
  async generateDailyTasks() {
    try {
      window.app.showLoading('오늘의 과제를 생성하고 있어요...');

      const assessment = storage.getAssessment();
      if (!assessment) {
        throw new Error('실력 진단이 필요합니다.');
      }

      const dayOfWeek = new Date().getDay();
      const result = await gemini.generateDailyTasks(assessment, dayOfWeek);

      const tasks = storage.getTasks();

      // 생성된 과제들 추가
      result.tasks.forEach(task => {
        tasks.daily.push({
          id: UTILS.generateId(),
          ...task,
          date: UTILS.formatDate(new Date()),
          createdAt: new Date().toISOString(),
          completed: false,
          completedAt: null
        });
      });

      storage.setTasks(tasks);
      window.app.hideLoading();
      window.app.toast.show('✅ 오늘의 과제가 준비되었어요!', 'success');

      this.render();
    } catch (error) {
      console.error('Daily tasks generation error:', error);
      window.app.hideLoading();
      window.app.toast.show('❌ 과제 생성 실패', 'error');
    }
  }

  /**
   * 주간 목표 생성
   */
  async generateWeeklyGoals() {
    try {
      window.app.showLoading('주간 목표를 설정하고 있어요...');

      const assessment = storage.getAssessment();
      const result = await gemini.generateWeeklyGoals(assessment);

      const tasks = storage.getTasks();

      // 기존 주간 목표 클리어
      tasks.weekly = [];

      // 새 목표 추가
      result.goals.forEach(goal => {
        tasks.weekly.push({
          id: UTILS.generateId(),
          ...goal,
          createdAt: new Date().toISOString(),
          progress: 0,
          completed: false
        });
      });

      storage.setTasks(tasks);
      window.app.hideLoading();
      window.app.toast.show('✅ 주간 목표가 설정되었어요!', 'success');

      this.render();
    } catch (error) {
      console.error('Weekly goals generation error:', error);
      window.app.hideLoading();
      window.app.toast.show('❌ 목표 설정 실패', 'error');
    }
  }

  /**
   * 과제 완료 토글
   */
  toggleTask(type, taskId) {
    const tasks = storage.getTasks();
    const task = tasks[type].find(t => t.id === taskId);

    if (!task) return;

    const wasCompleted = task.completed;
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;

    storage.setTasks(tasks);

    if (task.completed && !wasCompleted) {
      // Task is newly completed - award points
      const points = CONFIG.GAME.POINTS_PER_TASK;
      storage.addPoints(points);

      // 연속 일수 업데이트
      storage.updateStreak();

      // 분석 데이터 기록
      storage.recordDailyActivity(new Date(), {
        tasks: 1,
        points: points,
        time: task.duration || 15
      });

      // 카테고리 진행도 업데이트
      if (task.category) {
        storage.updateCategoryProgress(task.category, points);
      }

      // 토스트 알림
      window.app.toast.show(
        `✅ 과제 완료! +${points}점`,
        'success'
      );

      // 사용자 데이터 업데이트
      const userData = storage.getUserData();
      userData.totalTasksCompleted += 1;
      storage.setUserData(userData);
    } else if (!task.completed && wasCompleted) {
      // Task was unchecked - remove points
      const points = CONFIG.GAME.POINTS_PER_TASK;
      const userData = storage.getUserData();
      userData.points = Math.max(0, userData.points - points);
      userData.totalTasksCompleted = Math.max(0, userData.totalTasksCompleted - 1);
      storage.setUserData(userData);

      // Update category progress
      if (task.category) {
        storage.updateCategoryProgress(task.category, -points);
      }

      window.app.toast.show(
        `과제 완료 취소 -${points}점`,
        'info'
      );
    }

    this.render();

    // 대시보드도 업데이트
    if (window.app.dashboard) {
      window.app.dashboard.render();
    }
  }

  /**
   * 커스텀 과제 추가
   */
  addCustomTask() {
    const title = prompt('과제 제목을 입력하세요:');
    if (!title) return;

    const description = prompt('과제 설명을 입력하세요 (선택):') || '';

    const categories = Object.keys(CONFIG.CATEGORIES);
    const categorySelect = prompt(
      `카테고리를 선택하세요:\n${categories.map((c, i) =>
        `${i + 1}. ${CONFIG.CATEGORIES[c].name}`
      ).join('\n')}`
    );

    const categoryIndex = parseInt(categorySelect) - 1;
    const category = categories[categoryIndex] || 'basic';

    const duration = parseInt(prompt('예상 소요 시간(분):') || '20');

    storage.addTask('custom', {
      title,
      description,
      category,
      duration,
      difficulty: 'intermediate'
    });

    window.app.toast.show('✅ 커스텀 과제가 추가되었어요!', 'success');
    this.render();
  }

  /**
   * 과제 삭제
   */
  deleteTask(type, taskId) {
    if (confirm('이 과제를 삭제하시겠어요?')) {
      storage.deleteTask(type, taskId);
      window.app.toast.show('🗑 과제가 삭제되었어요', 'success');
      this.render();
    }
  }

  /**
   * 탭 전환
   */
  switchTab(tab) {
    this.currentTab = tab;

    // 탭 UI 업데이트
    document.querySelectorAll('.tasks-view .tab').forEach(t => {
      t.classList.remove('active');
    });
    document.querySelector(`.tasks-view .tab[data-tab="${tab}"]`)?.classList.add('active');

    // 컨텐츠 표시
    document.querySelectorAll('.tasks-view .tab-content').forEach(c => {
      c.classList.add('hidden');
    });
    document.getElementById(`${tab}-tasks`)?.classList.remove('hidden');

    this.render();
  }

  /**
   * 날짜 변경 (일일 과제)
   */
  changeDate(delta) {
    this.selectedDate.setDate(this.selectedDate.getDate() + delta);
    this.render();
  }

  /**
   * 렌더링
   */
  render() {
    const tasks = storage.getTasks();

    // 일일 과제 렌더링
    this.renderDailyTasks(tasks.daily);

    // 주간 과제 렌더링
    this.renderWeeklyTasks(tasks.weekly);

    // 커스텀 과제 렌더링
    this.renderCustomTasks(tasks.custom);
  }

  /**
   * 일일 과제 렌더링
   */
  renderDailyTasks(tasks) {
    const selectedDateStr = UTILS.formatDate(this.selectedDate);
    const todayStr = UTILS.formatDate(new Date());

    // 날짜 표시
    const dateDisplay = document.getElementById('selected-date');
    if (dateDisplay) {
      if (selectedDateStr === todayStr) {
        dateDisplay.textContent = '오늘';
      } else {
        dateDisplay.textContent = UTILS.formatDateKR(this.selectedDate);
      }
    }

    // 해당 날짜 과제 필터링
    const dateTasks = tasks.filter(t =>
      UTILS.formatDate(t.date || t.createdAt) === selectedDateStr
    );

    const container = document.getElementById('daily-task-list');
    if (!container) return;

    if (dateTasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <p style="font-size: 48px; margin-bottom: 16px;">📝</p>
          <p>이 날짜에 과제가 없어요</p>
          ${selectedDateStr === todayStr ? `
            <button class="btn-primary" onclick="app.tasks.generateDailyTasks()" style="margin-top: 16px;">
              AI로 과제 생성하기
            </button>
          ` : ''}
        </div>
      `;
      return;
    }

    container.innerHTML = dateTasks.map(task => `
      <div class="task-item ${task.completed ? 'completed' : ''}"
           onclick="app.tasks.toggleTask('daily', '${task.id}')">
        <div class="task-checkbox"></div>
        <div class="task-icon">${CONFIG.CATEGORIES[task.category]?.icon || '📝'}</div>
        <div class="task-content">
          <h4>${task.title}</h4>
          <p>${task.description}</p>
          <small style="color: var(--text-tertiary);">
            ${task.duration}분 · ${CONFIG.CATEGORIES[task.category]?.name || '기타'}
          </small>
        </div>
        <div class="task-points">+${CONFIG.GAME.POINTS_PER_TASK}</div>
      </div>
    `).join('');
  }

  /**
   * 주간 과제 렌더링
   */
  renderWeeklyTasks(tasks) {
    const container = document.getElementById('weekly-task-list');
    if (!container) return;

    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 40px;">
          <p style="font-size: 48px; margin-bottom: 16px;">🎯</p>
          <p style="color: var(--text-secondary);">주간 목표가 없어요</p>
          <button class="btn-primary" onclick="app.tasks.generateWeeklyGoals()" style="margin-top: 16px;">
            AI로 주간 목표 설정하기
          </button>
        </div>
      `;
      return;
    }

    // 주간 진행도 계산
    const totalProgress = tasks.reduce((sum, t) => sum + t.progress, 0);
    const avgProgress = tasks.length > 0 ? (totalProgress / (tasks.length * t.targetCount)) * 100 : 0;

    // 진행도 원형 차트 업데이트
    const progressCircle = document.getElementById('week-progress-circle');
    if (progressCircle) {
      const circumference = 2 * Math.PI * 45;
      const offset = circumference - (avgProgress / 100) * circumference;
      progressCircle.style.strokeDasharray = circumference;
      progressCircle.style.strokeDashoffset = offset;
    }

    const progressText = document.getElementById('week-percentage');
    if (progressText) {
      progressText.textContent = `${Math.round(avgProgress)}%`;
    }

    container.innerHTML = tasks.map(task => `
      <div class="goal-card">
        <div class="goal-icon">${CONFIG.CATEGORIES[task.category]?.icon || '🎯'}</div>
        <div class="goal-content">
          <h4>${task.title}</h4>
          <p>${task.description}</p>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${(task.progress / task.targetCount) * 100}%"></div>
          </div>
          <small style="color: var(--text-tertiary); margin-top: 8px; display: block;">
            ${task.progress} / ${task.targetCount} 완료
          </small>
          ${task.tasks && task.tasks.length > 0 ? `
            <ul style="margin-top: 12px; font-size: 14px; color: var(--text-secondary);">
              ${task.tasks.map(t => `<li>• ${t}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  /**
   * 커스텀 과제 렌더링
   */
  renderCustomTasks(tasks) {
    const container = document.getElementById('custom-task-list');
    if (!container) return;

    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 40px;">
          <p style="font-size: 48px; margin-bottom: 16px;">✨</p>
          <p style="color: var(--text-secondary);">나만의 과제를 추가해보세요</p>
        </div>
      `;
      return;
    }

    container.innerHTML = tasks.map(task => `
      <div class="task-item ${task.completed ? 'completed' : ''}">
        <div class="task-checkbox" onclick="app.tasks.toggleTask('custom', '${task.id}')"></div>
        <div class="task-icon">${CONFIG.CATEGORIES[task.category]?.icon || '📝'}</div>
        <div class="task-content" onclick="app.tasks.toggleTask('custom', '${task.id}')">
          <h4>${task.title}</h4>
          <p>${task.description}</p>
          <small style="color: var(--text-tertiary);">
            ${task.duration}분 · ${CONFIG.CATEGORIES[task.category]?.name || '기타'}
          </small>
        </div>
        <button class="icon-btn" onclick="event.stopPropagation(); app.tasks.deleteTask('custom', '${task.id}')"
                style="flex-shrink: 0;">
          <span class="icon">🗑</span>
        </button>
      </div>
    `).join('');
  }
}

export default new TaskManager();

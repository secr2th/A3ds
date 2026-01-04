import { CONFIG, UTILS } from '../config.js';
import storage from './storage.js';
import gemini from './gemini.js';

class TaskManager {
  constructor() { this.currentTab = 'daily'; this.selectedDate = new Date(); }
  init() { this.render(); }

  // FIX 8: '출석' 버튼을 눌렀을 때만 과제 생성
  async checkInAndGenerateDailyTasks() {
    const tasks = storage.getTasks();
    const todayStr = UTILS.formatDate(new Date());
    const hasTodayTask = tasks.daily.some(t => UTILS.formatDate(t.date || t.createdAt) === todayStr);

    if (hasTodayTask) {
        window.app.toast.show('이미 오늘의 과제를 받았습니다!', 'info');
        return;
    }

    window.app.showAILoading('오늘의 과제를 생성 중...');
    try {
      const assessment = storage.getAssessment();
      const result = await gemini.generateDailyTasks(assessment);
      result.tasks.forEach(task => { tasks.daily.push({ id: UTILS.generateId(), ...task, date: todayStr, createdAt: new Date().toISOString(), completed: false, completedAt: null }); });
      storage.setTasks(tasks);
      window.app.toast.show('✅ 오늘의 과제가 준비되었어요!', 'success');
    } catch(e) { window.app.toast.show('❌ 과제 생성 실패', 'error'); }
    finally { window.app.hideAILoading(); window.app.dashboard.render(); }
  }

  // FIX 9: '갱신' 버튼을 눌렀을 때만 주간 목표 생성
  async generateWeeklyGoals(isManual = false) {
    if (isManual && !confirm('기존 주간 목표를 삭제하고 새로 생성하시겠습니까?')) return;

    window.app.showAILoading('주간 목표를 설정 중...');
    try {
      const assessment = storage.getAssessment();
      const analysis = storage.get('initial_analysis');
      assessment.weaknesses = analysis.weaknesses; // 약점 정보 추가

      const result = await gemini.generateWeeklyGoals(assessment);
      const tasks = storage.getTasks();
      tasks.weekly = result.goals.map(goal => ({ id: UTILS.generateId(), ...goal, createdAt: new Date().toISOString(), progress: 0, completed: false }));
      storage.setTasks(tasks);
      window.app.toast.show('✅ 주간 목표가 설정되었어요!', 'success');
    } catch(e) { window.app.toast.show('❌ 목표 설정 실패', 'error'); }
    finally { window.app.hideAILoading(); this.render(); if (window.app.dashboard) window.app.dashboard.render(); }
  }

  toggleTask(type, taskId) {
    const tasks = storage.getTasks();
    const task = tasks[type]?.find(t => t.id === taskId);
    if (!task) return;
    task.completed = !task.completed; task.completedAt = task.completed ? new Date().toISOString() : null;
    storage.setTasks(tasks);
    if (task.completed) {
        const p = CONFIG.GAME.POINTS_PER_TASK; storage.addPoints(p); storage.updateStreak();
        storage.recordDailyActivity(new Date(), { tasks: 1, points: p, time: task.duration || 15 });
        if (task.category) storage.updateCategoryProgress(task.category, p);
        const userData = storage.getUserData(); userData.totalTasksCompleted += 1; storage.setUserData(userData);
        window.app.toast.show(`✅ 과제 완료! +${p}점`, 'success');
    }
    this.render();
    if (window.app.dashboard) window.app.dashboard.render();
  }

  addCustomTask() {
      const title = prompt('과제 제목:'); if(!title) return; const description = prompt('설명:');
      storage.setTasks({ ...storage.getTasks(), custom: [...storage.getTasks().custom, { id: UTILS.generateId(), title, description, category:'basic', completed: false }] });
      this.render();
  }

  deleteTask(type, taskId) { if(confirm('과제를 삭제할까요?')) { const t = storage.getTasks(); t[type] = t[type].filter(i => i.id !== taskId); storage.setTasks(t); this.render(); }}
  switchTab(tab) { this.currentTab = tab; document.querySelectorAll('.tasks-view .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab)); document.querySelectorAll('.tasks-view .tab-content').forEach(c => c.classList.toggle('hidden', c.id !== `${tab}-tasks`)); this.render(); }
  changeDate(delta) { this.selectedDate.setDate(this.selectedDate.getDate() + delta); this.render(); }

  render() {
    const tasks = storage.getTasks();
    this.renderDailyTasks(tasks.daily); this.renderWeeklyTasks(tasks.weekly); this.renderCustomTasks(tasks.custom);
  }

  renderDailyTasks(tasks) {
    const dateStr = UTILS.formatDate(this.selectedDate);
    const dateDisplay = document.getElementById('selected-date'); if (dateDisplay) dateDisplay.textContent = dateStr === UTILS.formatDate(new Date()) ? '오늘' : UTILS.formatDateKR(this.selectedDate);
    const dateTasks = tasks.filter(t => UTILS.formatDate(t.date || t.createdAt) === dateStr);
    const container = document.getElementById('daily-task-list'); if (!container) return;
    if (dateTasks.length === 0) { container.innerHTML = `<div class="empty-state"><p>과제가 없어요</p></div>`; return; }
    container.innerHTML = dateTasks.map(t => `<div class="task-item ${t.completed ? 'completed' : ''}" onclick="app.tasks.toggleTask('daily', '${t.id}')"><div class="task-checkbox"></div><div class="task-icon">${CONFIG.CATEGORIES[t.category]?.icon || '📝'}</div><div class="task-content"><h4>${t.title}</h4><p>${t.description}</p></div><div class="task-points">+${CONFIG.GAME.POINTS_PER_TASK}</div></div>`).join('');
  }

  renderWeeklyTasks(tasks) {
    const container = document.getElementById('weekly-task-list'); if (!container) return;
    if (tasks.length === 0) { container.innerHTML = `<div class="empty-state"><p>설정된 주간 목표가 없습니다.</p></div>`; return; }
    const totalProgress = tasks.reduce((sum, t) => sum + (t.progress / t.targetCount), 0);
    const avgProgress = tasks.length > 0 ? (totalProgress / tasks.length) * 100 : 0;
    const circle = document.getElementById('week-progress-circle'); if (circle) { const r = 45, c = 2 * Math.PI * r; circle.style.strokeDasharray = c; circle.style.strokeDashoffset = c - (avgProgress / 100) * c; }
    const percent = document.getElementById('week-percentage'); if (percent) percent.textContent = `${Math.round(avgProgress)}%`;
    container.innerHTML = tasks.map(t => `<div class="goal-card"><div class="goal-icon">${CONFIG.CATEGORIES[t.category]?.icon || '🎯'}</div><div class="goal-content"><h4>${t.title}</h4><p>${t.description}</p><div class="progress-bar"><div class="progress-fill" style="width: ${(t.progress / t.targetCount) * 100}%"></div></div><small>${t.progress}/${t.targetCount} 완료</small></div></div>`).join('');
  }

  renderCustomTasks(tasks) {
      const container = document.getElementById('custom-task-list'); if (!container) return;
      if (tasks.length === 0) { container.innerHTML = `<div class="empty-state"><p>나만의 과제를 추가해보세요</p></div>`; return; }
      container.innerHTML = tasks.map(t => `<div class="task-item"><div class="task-checkbox" onclick="app.tasks.toggleTask('custom', '${t.id}')"></div><div class="task-content"><h4>${t.title}</h4><p>${t.description}</p></div><button class="icon-btn" onclick="app.tasks.deleteTask('custom', '${t.id}')">🗑</button></div>`).join('');
  }
}
export default new TaskManager();

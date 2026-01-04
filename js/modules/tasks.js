import { CONFIG, UTILS } from '../config.js';
import storage from './storage.js';
import gemini from './gemini.js';

class TaskManager {
  constructor() { this.currentTab = 'daily'; this.selectedDate = new Date(); }
  init() { this.render(); }
  async checkInAndGenerateDailyTasks() {
    const tasks = storage.getTasks(), today = UTILS.formatDate(new Date());
    if (tasks.daily.some(t => UTILS.formatDate(t.date) === today)) return;
    window.app.showAILoading('오늘의 과제 생성 중...');
    try {
      const p = `다음 JSON 형식으로 그림 연습 과제 2개를 생성해줘: {"tasks":[{"title":"","description":"","category":"basic|anatomy|..."}]}`;
      const res = await gemini.generate(p);
      const newTasks = JSON.parse(res).tasks;
      newTasks.forEach(t => tasks.daily.push({ id: UTILS.generateId(), ...t, date: today, completed: false }));
      storage.setTasks(tasks);
    } finally { window.app.hideAILoading(); window.app.dashboard.render(); }
  }
  async generateWeeklyGoals(manual=false) {
    if (manual && !confirm('주간 목표를 새로 생성할까요?')) return;
    window.app.showAILoading('주간 목표 생성 중...');
    try {
      const p = `다음 JSON 형식으로 주간 목표 1개를 생성해줘: {"goals":[{"title":"","description":"","category":"...","targetCount":5}]}`;
      const res = await gemini.generate(p);
      const newGoals = JSON.parse(res).goals;
      const tasks = storage.getTasks(); tasks.weekly = newGoals.map(g => ({...g, id:UTILS.generateId(), progress:0})); storage.setTasks(tasks);
    } finally { window.app.hideAILoading(); this.render(); window.app.dashboard.render(); }
  }
  toggleTask(type, id) {
    const tasks = storage.getTasks(); const task = tasks[type].find(t => t.id === id); if(!task) return;
    task.completed = !task.completed; if(task.completed) { storage.addPoints(CONFIG.GAME.POINTS_PER_TASK); storage.updateStreak(); }
    storage.setTasks(tasks); this.render(); window.app.dashboard.render();
  }
  addCustomTask(){ const title=prompt('과제 제목:'); if(title) { const tasks=storage.getTasks(); tasks.custom.push({id:UTILS.generateId(), title, completed:false}); storage.setTasks(tasks); this.render(); } }
  switchTab(t) { this.currentTab = t; this.render(); }
  changeDate(d) { this.selectedDate.setDate(this.selectedDate.getDate() + d); this.render(); }
  render(){
    const tasks = storage.getTasks();
    document.querySelectorAll('.tasks-view .tab').forEach(el=>el.classList.toggle('active', el.dataset.tab === this.currentTab));
    document.querySelectorAll('.tasks-view .tab-content').forEach(el=>el.classList.toggle('hidden', !el.id.startsWith(this.currentTab)));
    if(this.currentTab === 'daily') this.renderDaily(tasks.daily);
    if(this.currentTab === 'weekly') this.renderWeekly(tasks.weekly);
    if(this.currentTab === 'custom') this.renderCustom(tasks.custom);
  }
  renderDaily(dailyTasks){
    const container = document.getElementById('daily-task-list'), dateEl = document.getElementById('selected-date');
    const today = UTILS.formatDate(new Date()), selDate = UTILS.formatDate(this.selectedDate);
    if(dateEl) dateEl.textContent = selDate === today ? '오늘' : selDate;
    const tasksForDate = dailyTasks.filter(t => UTILS.formatDate(t.date) === selDate);
    if(!container) return;
    if(tasksForDate.length===0) container.innerHTML = `<div class="empty-state">과제가 없습니다.</div>`;
    else container.innerHTML = tasksForDate.map(t=>`<div class="task-item ${t.completed?'completed':''}" onclick="app.tasks.toggleTask('daily','${t.id}')"><div class="task-checkbox"></div><div class="task-icon">${CONFIG.CATEGORIES[t.category]?.icon||'📝'}</div><div class="task-content"><h4>${t.title}</h4><p>${t.description}</p></div></div>`).join('');
  }
  renderWeekly(weeklyGoals){
      const container=document.getElementById('weekly-task-list'), progCircle=document.getElementById('week-progress-circle'), progText=document.getElementById('week-percentage'); if(!container) return;
      if(weeklyGoals.length===0) container.innerHTML = `<div class="empty-state">주간 목표가 없습니다.</div>`;
      else {
          const goal=weeklyGoals[0], progress=(goal.progress/goal.targetCount)*100;
          if(progCircle && progText) { const r=45, c=2*Math.PI*r; progCircle.style.strokeDasharray=c; progCircle.style.strokeDashoffset=c - (progress/100)*c; progText.textContent=`${Math.round(progress)}%`; }
          container.innerHTML = weeklyGoals.map(g=>`<div class="goal-card"><div class="goal-icon">${CONFIG.CATEGORIES[g.category]?.icon||'🎯'}</div><div class="goal-content"><h4>${g.title}</h4><p>${g.description}</p><div class="progress-bar"><div class="progress-fill" style="width:${(g.progress/g.targetCount)*100}%"></div></div></div></div>`).join('');
      }
  }
  renderCustom(customTasks){
      const container=document.getElementById('custom-task-list'); if(!container) return;
      container.innerHTML = customTasks.map(t=>`<div class="task-item ${t.completed?'completed':''}" onclick="app.tasks.toggleTask('custom','${t.id}')"><div class="task-checkbox"></div><div class="task-content"><h4>${t.title}</h4></div></div>`).join('');
  }
}
export default new TaskManager();

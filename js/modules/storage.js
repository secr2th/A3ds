import { CONFIG } from '../config.js';

class StorageManager {
  constructor() { this.keys = CONFIG.STORAGE_KEYS; }
  get(key) { try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : null; } catch (e) { console.error(`Error get ${key}:`, e); return null; } }
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { console.error(`Error set ${key}:`, e); return false; } }
  remove(key) { try { localStorage.removeItem(key); return true; } catch (e) { console.error(`Error remove ${key}:`, e); return false; } }

  getApiKey() { return this.get(this.keys.API_KEY); }
  setApiKey(key) { return this.set(this.keys.API_KEY, key); }

  getUserData() { return this.get(this.keys.USER_DATA) || { points: 0, level: 1, streak: 0, lastActiveDate: null, totalTasksCompleted: 0, totalStudyTime: 0, joinDate: new Date().toISOString() }; }
  setUserData(data) { return this.set(this.keys.USER_DATA, data); }
  updateUserData(updates) { const c = this.getUserData(); return this.setUserData({ ...c, ...updates }); }

  addPoints(points) {
    const d = this.getUserData(); d.points += points;
    const newLvl = Math.floor(d.points / CONFIG.GAME.POINTS_PER_LEVEL) + 1;
    if (newLvl > d.level) { d.level = newLvl; window.app.toast.show(`🎉 레벨 ${newLvl}로 올랐어요!`, 'success'); }
    this.setUserData(d); return d;
  }

  updateStreak() {
    const d = this.getUserData(); const t = new Date().toDateString();
    const l = d.lastActiveDate ? new Date(d.lastActiveDate).toDateString() : null;
    if (l === t) return d.streak;
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (l === y.toDateString()) { d.streak += 1; d.points += CONFIG.GAME.STREAK_BONUS; } else if (l !== t) { d.streak = 1; }
    d.lastActiveDate = new Date().toISOString(); this.setUserData(d); return d.streak;
  }

  getTasks() { return this.get(this.keys.TASKS) || { daily: [], weekly: [], custom: [] }; }
  setTasks(tasks) { return this.set(this.keys.TASKS, tasks); }

  getGallery() { return this.get(this.keys.GALLERY) || []; }
  setGallery(gallery) { return this.set(this.keys.GALLERY, gallery); }
  addArtwork(art) { const g = this.getGallery(); g.unshift({ id: CONFIG.UTILS.generateId(), ...art, createdAt: new Date().toISOString() }); return this.setGallery(g); }
  updateArtwork(id, updates) { const g=this.getGallery(); const i=g.findIndex(a=>a.id===id); if(i!==-1){ g[i]={...g[i],...updates}; return this.setGallery(g); } return false; }
  deleteArtwork(id) { const g=this.getGallery(); return this.setGallery(g.filter(a=>a.id!==id)); }

  getAssessment() { return this.get(this.keys.ASSESSMENT); }
  setAssessment(assessment) { return this.set(this.keys.ASSESSMENT, assessment); }

  getSettings() {
    return this.get(this.keys.SETTINGS) || {
      notifications: false, notificationTime: CONFIG.NOTIFICATION.DEFAULT_TIME,
      theme: { color: 'indigo', mode: 'auto', font: 'Pretendard', customFonts: [] },
      timer: { focusDuration: CONFIG.TIMER.FOCUS_DURATION, breakDuration: CONFIG.TIMER.SHORT_BREAK }
    };
  }
  setSettings(s) { return this.set(this.keys.SETTINGS, s); }
  updateSettings(u) { const c=this.getSettings(); return this.setSettings({...c, ...u}); }

  getAnalytics() {
    return this.get(this.keys.ANALYTICS) || {
      dailyActivity: {}, categoryProgress: { basic: 0, anatomy: 0, perspective: 0, shading: 0, color: 0, composition: 0 },
      pomodoroCount: 0, aiCoachingMessage: "" // FIX 4: AI 코칭 메시지 저장
    };
  }
  setAnalytics(a) { return this.set(this.keys.ANALYTICS, a); }
  updateAnalytics(u) { const c=this.getAnalytics(); return this.setAnalytics({...c, ...u}); }
  recordDailyActivity(d, act) { const a=this.getAnalytics(), s=CONFIG.UTILS.formatDate(d); if(!a.dailyActivity[s]) a.dailyActivity[s]={tasks:0,time:0,points:0}; Object.keys(act).forEach(k => { a.dailyActivity[s][k] += act[k]; }); return this.setAnalytics(a); }
  updateCategoryProgress(cat, p) { const a = this.getAnalytics(); a.categoryProgress[cat] = (a.categoryProgress[cat] || 0) + p; return this.setAnalytics(a); }

  // FIX 3: 커스텀 리소스 관리
  getCustomResources() { return this.get(this.keys.CUSTOM_RESOURCES) || []; }
  setCustomResources(r) { return this.set(this.keys.CUSTOM_RESOURCES, r); }
  addCustomResource(r) { const c = this.getCustomResources(); c.unshift({ id: CONFIG.UTILS.generateId(), ...r }); this.setCustomResources(c); }
  deleteCustomResource(id) { const c = this.getCustomResources(); this.setCustomResources(c.filter(r => r.id !== id)); }

  exportData() {
      const d = { userData: this.getUserData(), tasks: this.getTasks(), gallery: this.getGallery(), assessment: this.getAssessment(), settings: this.getSettings(), analytics: this.getAnalytics(), customResources: this.getCustomResources(), exportDate: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `artquest-backup-${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href);
      window.app.toast.show('✅ 데이터가 내보내기 되었습니다', 'success');
  }
  async importData() {
      const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json';
      input.onchange = async (e) => {
          try {
              const d = JSON.parse(await e.target.files[0].text());
              if(d.userData) this.setUserData(d.userData); if(d.tasks) this.setTasks(d.tasks); if(d.gallery) this.setGallery(d.gallery); if(d.assessment) this.setAssessment(d.assessment); if(d.settings) this.setSettings(d.settings); if(d.analytics) this.setAnalytics(d.analytics); if(d.customResources) this.setCustomResources(d.customResources);
              window.app.toast.show('✅ 데이터를 복원했습니다', 'success');
              setTimeout(() => window.location.reload(), 1000);
          } catch(err) { window.app.toast.show('❌ 데이터 가져오기 실패', 'error'); }
      };
      input.click();
  }
  resetAll() { if (confirm('⚠️ 모든 데이터가 삭제됩니다. 정말 초기화하시겠습니까?')) { Object.values(this.keys).forEach(k => this.remove(k)); window.app.toast.show('🔄 데이터가 초기화되었습니다', 'success'); setTimeout(() => window.location.reload(), 1000); } }
}
export default new StorageManager();

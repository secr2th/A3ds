import { CONFIG } from '../config.js';
class StorageManager {
  get(k) { try { const d=localStorage.getItem(k); return d?JSON.parse(d):null; } catch(e){return null;} }
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
  getApiKey() { return this.get(CONFIG.STORAGE_KEYS.API_KEY); }
  setApiKey(k) { this.set(CONFIG.STORAGE_KEYS.API_KEY, k); }
  getUserData() { return this.get(CONFIG.STORAGE_KEYS.USER_DATA) || { points:0, level:1, streak:0, lastActiveDate:null, totalTasksCompleted:0, totalStudyTime:0 }; }
  setUserData(d) { this.set(CONFIG.STORAGE_KEYS.USER_DATA, d); }
  addPoints(p) { const d=this.getUserData(); d.points+=p; const newLvl=Math.floor(d.points/CONFIG.GAME.POINTS_PER_LEVEL)+1; if(newLvl>d.level)d.level=newLvl; this.setUserData(d); }
  updateStreak() { const d=this.getUserData(), t=new Date().toDateString(), l=d.lastActiveDate?new Date(d.lastActiveDate).toDateString():null; if(l!==t) { const y=new Date(); y.setDate(y.getDate()-1); if(l===y.toDateString()) d.streak++; else d.streak=1; d.lastActiveDate=new Date().toISOString(); this.setUserData(d); } }
  getTasks() { return this.get(CONFIG.STORAGE_KEYS.TASKS) || { daily:[], weekly:[], custom:[] }; }
  setTasks(t) { this.set(CONFIG.STORAGE_KEYS.TASKS, t); }
  getGallery() { return this.get(CONFIG.STORAGE_KEYS.GALLERY) || []; }
  setGallery(g) { this.set(CONFIG.STORAGE_KEYS.GALLERY, g); }
  getAssessment() { return this.get(CONFIG.STORAGE_KEYS.ASSESSMENT); }
  setAssessment(a) { this.set(CONFIG.STORAGE_KEYS.ASSESSMENT, a); }
  getSettings() { return this.get(CONFIG.STORAGE_KEYS.SETTINGS) || { theme:{color:'indigo',mode:'auto',font:'Pretendard',customFonts:[]} }; }
  updateSettings(u) { const c=this.getSettings(); this.set(CONFIG.STORAGE_KEYS.SETTINGS, {...c, ...u}); }
  getAnalytics() { return this.get(CONFIG.STORAGE_KEYS.ANALYTICS) || { dailyActivity:{}, categoryProgress:{}, aiCoachingMessage:"" }; }
  setAnalytics(a) { this.set(CONFIG.STORAGE_KEYS.ANALYTICS, a); }
  recordDailyActivity(d, act) { const a=this.getAnalytics(), s=UTILS.formatDate(d); a.dailyActivity[s]={...a.dailyActivity[s], ...act}; this.setAnalytics(a); }
  getCustomResources() { return this.get(CONFIG.STORAGE_KEYS.CUSTOM_RESOURCES) || []; }
  setCustomResources(r) { this.set(CONFIG.STORAGE_KEYS.CUSTOM_RESOURCES, r); }
  exportData() { const d={}; Object.keys(CONFIG.STORAGE_KEYS).forEach(k=>{ d[k]=this.get(CONFIG.STORAGE_KEYS[k]); }); const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`artquest-backup.json`; a.click(); }
  importData() { const i=document.createElement('input'); i.type='file'; i.accept='application/json'; i.onchange=async e=>{ const d=JSON.parse(await e.target.files[0].text()); Object.keys(d).forEach(k=>{ if(CONFIG.STORAGE_KEYS[k]) this.set(CONFIG.STORAGE_KEYS[k], d[k]); }); location.reload(); }; i.click(); }
  resetAll() { if(confirm('모든 데이터를 초기화합니다.')) { localStorage.clear(); location.reload(); }}
}
export default new StorageManager();

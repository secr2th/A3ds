import storage from './storage.js';
import { CONFIG } from '../config.js';

class TimerManager {
  constructor() {
    this.isRunning = false; this.isPaused = false; this.currentMode = 'focus'; this.timeRemaining = 25 * 60; this.interval = null;
  }
  open() { document.getElementById('timer-modal').classList.remove('hidden'); this.updateDisplay(); }
  close() { document.getElementById('timer-modal').classList.add('hidden'); }
  start() {
    if (this.isRunning && !this.isPaused) return; this.isRunning = true; this.isPaused = false;
    document.getElementById('timer-start-btn').classList.add('hidden'); document.getElementById('timer-pause-btn').classList.remove('hidden');
    this.interval = setInterval(() => this.tick(), 1000);
  }
  pause() { this.isPaused = true; clearInterval(this.interval); document.getElementById('timer-start-btn').classList.remove('hidden'); document.getElementById('timer-pause-btn').classList.add('hidden'); }
  reset() { this.isRunning = false; this.isPaused = false; clearInterval(this.interval); this.timeRemaining = 25 * 60; this.updateDisplay(); this.pause(); }
  tick() {
    this.timeRemaining--;
    if (this.timeRemaining < 0) {
      clearInterval(this.interval); this.isRunning = false;
      if (this.currentMode === 'focus') storage.addPoints(CONFIG.GAME.POMODORO_POINTS);
      this.currentMode = this.currentMode === 'focus' ? 'break' : 'focus';
      this.timeRemaining = (this.currentMode === 'focus' ? 25 : 5) * 60;
      this.pause();
    }
    this.updateDisplay();
  }
  updateDisplay() {
    const minutes = String(Math.floor(this.timeRemaining / 60)).padStart(2, '0');
    const seconds = String(this.timeRemaining % 60).padStart(2, '0');
    document.getElementById('timer-display').textContent = `${minutes}:${seconds}`;
    document.getElementById('timer-mode').textContent = this.currentMode === 'focus' ? '집중' : '휴식';
    const total = (this.currentMode === 'focus' ? 25 : 5) * 60;
    const progress = (total - this.timeRemaining) / total;
    const circle = document.getElementById('timer-progress-circle');
    if (circle) { const r=90, c=2*Math.PI*r; circle.style.strokeDashoffset = c - c * progress; circle.style.strokeDasharray = c; }
  }
}
export default new TimerManager();

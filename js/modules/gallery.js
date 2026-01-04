import { CONFIG, UTILS } from '../config.js';
import storage from './storage.js';

class GalleryManager {
  constructor() { this.currentView = 'grid'; this.currentMonth = new Date(); this.filters = {}; }
  init() { this.render(); }

  // FIX 5: 이미지 업로드 및 저장 로직 안정화
  uploadArt() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
    input.onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      const title = prompt('✏️ 작품 제목:', file.name.split('.')[0]) || '무제';

      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target.result;
        storage.addArtwork({ title, description: '', category: 'basic', imageData, date: new Date().toISOString() });
        this.render();
        window.app.toast.show('✅ 작품이 갤러리에 추가되었어요!', 'success');
      };
      reader.onerror = () => window.app.toast.show('❌ 이미지 읽기 실패', 'error');
      reader.readAsDataURL(file);
    };
    input.click();
  }

  viewArtwork(id) {
    const art = storage.getGallery().find(a => a.id === id); if(!art) return;
    const modal = document.getElementById('artwork-modal'); const content = document.getElementById('artwork-detail');
    content.innerHTML = `<img src="${art.imageData}" alt="${art.title}"><div class="details"><h2>${art.title}</h2><p>${UTILS.formatDateKR(art.date)}</p><button class="btn-danger" onclick="app.gallery.deleteArtwork('${art.id}')">삭제</button></div>`;
    modal.classList.remove('hidden');
  }
  closeArtwork() { document.getElementById('artwork-modal').classList.add('hidden'); }
  deleteArtwork(id) { if(confirm('작품을 삭제하시겠습니까?')) { storage.deleteArtwork(id); this.closeArtwork(); this.render(); }}

  switchView(v) { this.currentView = v; document.querySelectorAll('.gallery-view .tab').forEach(t=>t.classList.toggle('active', t.dataset.view === v)); document.querySelectorAll('.gallery-content').forEach(c=>c.classList.toggle('hidden', c.id !== `${v}-view`)); this.render(); }
  toggleView() { const v = ['grid','list','calendar']; this.switchView(v[(v.indexOf(this.currentView) + 1) % 3]); }
  changeMonth(d) { this.currentMonth.setMonth(this.currentMonth.getMonth() + d); this.render(); }
  applyFilters() { this.filters.category = document.getElementById('category-filter').value; this.filters.search = document.getElementById('search-input').value.toLowerCase(); this.render(); }

  render() {
    const gallery = storage.getGallery().filter(a =>
      (!this.filters.category || this.filters.category === 'all' || a.category === this.filters.category) &&
      (!this.filters.search || a.title.toLowerCase().includes(this.filters.search))
    );
    if (this.currentView === 'grid') this.renderGrid(gallery);
    else if (this.currentView === 'list') this.renderList(gallery);
    else if (this.currentView === 'calendar') this.renderCalendar(storage.getGallery());
  }

  renderGrid(gallery) {
      const container = document.getElementById('art-grid'); if(!container) return;
      if(gallery.length === 0) { container.innerHTML = `<div class="empty-state">🖼️<p>작품을 추가해보세요</p></div>`; return; }
      container.innerHTML = gallery.map(a => `<div class="art-grid-item" onclick="app.gallery.viewArtwork('${a.id}')"><img src="${a.imageData}" alt="${a.title}"><div class="overlay"><h4>${a.title}</h4></div></div>`).join('');
  }
  renderList(gallery) {
      const container = document.getElementById('art-list'); if(!container) return;
      if(gallery.length === 0) { container.innerHTML = `<div class="empty-state">🖼️<p>작품이 없습니다</p></div>`; return; }
      container.innerHTML = gallery.map(a => `<div class="art-list-item" onclick="app.gallery.viewArtwork('${a.id}')"><img src="${a.imageData}"><div><h4>${a.title}</h4><p>${UTILS.formatDateKR(a.date)}</p></div></div>`).join('');
  }
  renderCalendar(gallery) {
      // (캘린더 렌더링 로직은 기존과 동일하므로 생략하지 않고 모두 기재합니다.)
      const container = document.getElementById('calendar-grid'); if(!container) return;
      const monthDisplay = document.getElementById('current-month'); if (monthDisplay) monthDisplay.textContent = `${this.currentMonth.getFullYear()}년 ${this.currentMonth.getMonth() + 1}월`;
      const year = this.currentMonth.getFullYear(), month = this.currentMonth.getMonth();
      const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
      const artworksByDate = {}; gallery.forEach(art => { const d = UTILS.formatDate(art.date); artworksByDate[d] = (artworksByDate[d] || 0) + 1; });
      let html = `<div class="calendar-header-days">${CONFIG.DAYS_KR.map(d => `<div>${d}</div>`).join('')}</div>`;
      html += Array(firstDay).fill('<div></div>').join('');
      for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = UTILS.formatDate(new Date(year, month, day));
          html += `<div class="calendar-day ${dateStr === UTILS.formatDate(new Date()) ? 'today' : ''}"><span>${day}</span>${artworksByDate[dateStr] ? `<div class="art-dot">${artworksByDate[dateStr]}</div>` : ''}</div>`;
      }
      container.innerHTML = html;
  }
}
export default new GalleryManager();

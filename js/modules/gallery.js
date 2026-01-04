import storage from './storage.js';
import { UTILS } from '../config.js';

class GalleryManager {
  constructor() { this.currentView = 'grid'; }
  init() { this.render(); }
  uploadArt() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
    input.onchange = e => {
      const reader = new FileReader();
      reader.onload = event => {
        const title = prompt('작품 제목:', '') || '무제';
        storage.setGallery([...storage.getGallery(), { id: UTILS.generateId(), title, imageData: event.target.result, date: new Date().toISOString() }]);
        this.render();
      };
      reader.readAsDataURL(e.target.files[0]);
    };
    input.click();
  }
  viewArtwork(id) { const art=storage.getGallery().find(a=>a.id===id); if(!art)return; document.getElementById('artwork-detail').innerHTML = `<img src="${art.imageData}"><h2>${art.title}</h2>`; document.getElementById('artwork-modal').classList.remove('hidden'); }
  closeArtwork() { document.getElementById('artwork-modal').classList.add('hidden'); }
  switchView(v) { this.currentView = v; this.render(); }
  render() {
    document.querySelectorAll('.gallery-view .tab').forEach(el=>el.classList.toggle('active', el.dataset.view === this.currentView));
    document.querySelectorAll('.gallery-content').forEach(el=>el.classList.toggle('hidden', !el.id.startsWith(this.currentView)));
    const gallery = storage.getGallery();
    const gridEl = document.getElementById('art-grid'), listEl = document.getElementById('art-list');
    if(gridEl) gridEl.innerHTML = gallery.map(a=>`<div class="art-grid-item" onclick="app.gallery.viewArtwork('${a.id}')"><img src="${a.imageData}" alt="${a.title}"><div class="overlay"><h4>${a.title}</h4></div></div>`).join('');
    if(listEl) listEl.innerHTML = gallery.map(a=>`<div class="art-list-item" onclick="app.gallery.viewArtwork('${a.id}')"><img src="${a.imageData}"><h4>${a.title}</h4></div>`).join('');
  }
}
export default new GalleryManager();

/**
 * Gallery Module
 * - 작품 업로드 및 관리
 * - 캘린더/리스트/그리드 뷰
 * - 작품 검색 및 필터링
 */

import { CONFIG, UTILS } from '../config.js';
import storage from './storage.js';

class GalleryManager {
  constructor() {
    this.currentView = 'calendar';
    this.currentMonth = new Date();
    this.filterCategory = 'all';
    this.searchQuery = '';
    this.currentTags = [];
    this.selectedFilterTags = [];
  }

  /**
   * 초기화
   */
  init() {
    this.render();
  }

  /**
   * 뷰 전환
   */
  switchView(view) {
    this.currentView = view;

    // 뷰 탭 UI 업데이트
    document.querySelectorAll('.gallery-view .tab').forEach(t => {
      t.classList.remove('active');
    });
    document.querySelector(`.gallery-view .tab[data-view="${view}"]`)?.classList.add('active');

    // 컨텐츠 전환
    document.querySelectorAll('.gallery-view .gallery-content').forEach(c => {
      c.classList.add('hidden');
    });
    document.getElementById(`${view}-view`)?.classList.remove('hidden');

    // 아이콘 변경
    const icons = { calendar: '📅', list: '📋', grid: '🔲' };
    const iconEl = document.getElementById('view-toggle-icon');
    if (iconEl) {
      iconEl.textContent = icons[view] || '📅';
    }

    this.render();
  }

  /**
   * 뷰 토글 (버튼용)
   */
  toggleView() {
    const views = ['calendar', 'list', 'grid'];
    const currentIndex = views.indexOf(this.currentView);
    const nextView = views[(currentIndex + 1) % views.length];
    this.switchView(nextView);
  }

  /**
   * 작품 업로드
   */
  async uploadArt() {
    // 파일 선택
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        window.app.showLoading('이미지를 처리하고 있어요...');

        // 이미지를 Base64로 변환
        const reader = new FileReader();
        reader.onload = async (event) => {
          const imageData = event.target.result;

          window.app.hideLoading();

          // Create a modal for metadata input
          this.showUploadModal(imageData);
        };

        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Upload error:', error);
        window.app.hideLoading();
        window.app.toast.show('❌ 업로드 실패', 'error');
      }
    };

    input.click();
  }

  /**
   * Show upload modal with tag selection
   */
  showUploadModal(imageData) {
    const modal = document.getElementById('artwork-modal');
    const content = document.getElementById('artwork-detail');

    content.innerHTML = `
      <div class="upload-form">
        <img src="${imageData}" alt="Preview" 
             style="width: 100%; max-height: 300px; object-fit: contain; border-radius: 12px; margin-bottom: 20px;">
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-weight: 600; margin-bottom: 8px;">작품 제목</label>
          <input type="text" id="artwork-title" placeholder="작품 제목을 입력하세요" 
                 style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); 
                        background: var(--bg-secondary); color: var(--text-primary);">
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; font-weight: 600; margin-bottom: 8px;">작품 설명 (선택)</label>
          <textarea id="artwork-description" placeholder="작품에 대한 설명을 입력하세요" 
                    style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); 
                           background: var(--bg-secondary); color: var(--text-primary); min-height: 80px; resize: vertical;"></textarea>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; font-weight: 600; margin-bottom: 8px;">태그</label>
          <div style="margin-bottom: 8px;">
            <div id="selected-tags" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; min-height: 32px;">
              <!-- Selected tags will appear here -->
            </div>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="tag-input" placeholder="태그 입력 후 Enter" 
                     style="flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); 
                            background: var(--bg-secondary); color: var(--text-primary);"
                     onkeypress="if(event.key==='Enter'){event.preventDefault();app.gallery.addTag();}">
              <button type="button" class="btn-secondary" onclick="app.gallery.addTag()" 
                      style="padding: 8px 16px; white-space: nowrap;">
                추가
              </button>
            </div>
          </div>
          <div style="margin-top: 12px;">
            <small style="color: var(--text-tertiary); display: block; margin-bottom: 8px;">자주 사용하는 태그:</small>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${Object.keys(CONFIG.CATEGORIES).map(cat => `
                <button type="button" class="suggestion-tag" 
                        onclick="app.gallery.addSuggestedTag('${CONFIG.CATEGORIES[cat].name}')"
                        style="padding: 4px 12px; border-radius: 16px; border: 1px solid var(--border-color); 
                               background: var(--bg-secondary); color: var(--text-secondary); cursor: pointer;
                               font-size: 12px; transition: all 0.2s;">
                  ${CONFIG.CATEGORIES[cat].icon} ${CONFIG.CATEGORIES[cat].name}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 12px;">
          <button class="btn-primary" onclick="app.gallery.saveArtwork('${imageData}')" style="flex: 1;">
            💾 저장
          </button>
          <button class="btn-secondary" onclick="app.gallery.closeArtwork()">
            취소
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    
    // Initialize empty tags array
    this.currentTags = [];
  }

  /**
   * Select category tag
   */
  selectCategory(category) {
    document.querySelectorAll('.category-tag').forEach(tag => {
      if (tag.getAttribute('data-category') === category) {
        tag.style.borderColor = 'var(--color-primary)';
        tag.style.background = 'rgba(99, 102, 241, 0.1)';
        tag.style.color = 'var(--color-primary)';
        tag.style.fontWeight = '600';
        tag.setAttribute('data-selected', 'true');
      } else {
        tag.style.borderColor = 'var(--border-color)';
        tag.style.background = 'var(--bg-secondary)';
        tag.style.color = 'var(--text-secondary)';
        tag.style.fontWeight = '400';
        tag.removeAttribute('data-selected');
      }
    });
  }

  /**
   * Add tag from input
   */
  addTag() {
    const input = document.getElementById('tag-input');
    if (!input) return;

    const tagName = input.value.trim();
    if (!tagName) return;

    // Check if tag already exists
    if (this.currentTags.includes(tagName)) {
      window.app.toast.show('이미 추가된 태그예요', 'warning');
      return;
    }

    this.currentTags.push(tagName);
    this.renderSelectedTags();
    input.value = '';
  }

  /**
   * Add suggested tag
   */
  addSuggestedTag(tagName) {
    if (this.currentTags.includes(tagName)) {
      window.app.toast.show('이미 추가된 태그예요', 'warning');
      return;
    }

    this.currentTags.push(tagName);
    this.renderSelectedTags();
  }

  /**
   * Remove tag
   */
  removeTag(tagName) {
    this.currentTags = this.currentTags.filter(t => t !== tagName);
    this.renderSelectedTags();
  }

  /**
   * Render selected tags
   */
  renderSelectedTags() {
    const container = document.getElementById('selected-tags');
    if (!container) return;

    if (this.currentTags.length === 0) {
      container.innerHTML = '<span style="color: var(--text-tertiary); font-size: 14px;">태그를 추가해보세요</span>';
      return;
    }

    container.innerHTML = this.currentTags.map(tag => `
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: rgba(99, 102, 241, 0.1);
        border: 1px solid var(--color-primary);
        border-radius: 16px;
        color: var(--color-primary);
        font-size: 14px;
        font-weight: 500;
      ">
        <span>${tag}</span>
        <button onclick="app.gallery.removeTag('${tag}')" 
                style="
                  background: none;
                  border: none;
                  color: var(--color-primary);
                  cursor: pointer;
                  padding: 0;
                  display: flex;
                  align-items: center;
                  font-size: 16px;
                  line-height: 1;
                ">
          ×
        </button>
      </div>
    `).join('');
  }

  /**
   * Save artwork with metadata
   */
  saveArtwork(imageData) {
    const title = document.getElementById('artwork-title')?.value.trim() || '무제';
    const description = document.getElementById('artwork-description')?.value.trim() || '';

    // Use first tag as category for backward compatibility, or 'basic' as default
    const category = this.currentTags.length > 0 ? 
      Object.keys(CONFIG.CATEGORIES).find(key => 
        CONFIG.CATEGORIES[key].name === this.currentTags[0]
      ) || 'basic' : 'basic';

    // 갤러리에 추가
    storage.addArtwork({
      title,
      description,
      category,
      imageData,
      thumbnail: imageData,
      date: new Date().toISOString(),
      tags: this.currentTags
    });

    window.app.toast.show('✅ 작품이 추가되었어요!', 'success');
    this.closeArtwork();
    this.currentTags = [];
    this.render();
  }

  /**
   * 작품 상세 보기
   */
  viewArtwork(artworkId) {
    const gallery = storage.getGallery();
    const artwork = gallery.find(a => a.id === artworkId);

    if (!artwork) return;

    const modal = document.getElementById('artwork-modal');
    const content = document.getElementById('artwork-detail');

    // Ensure tags array exists
    if (!artwork.tags) {
      artwork.tags = [];
    }

    content.innerHTML = `
      <div class="artwork-detail">
        <img src="${artwork.imageData}" alt="${artwork.title}"
             style="width: 100%; border-radius: 12px; margin-bottom: 20px;">

        <h2>${artwork.title}</h2>
        <p style="color: var(--text-secondary); margin-bottom: 16px;">
          ${UTILS.formatDateKR(artwork.date)}
        </p>

        ${artwork.tags && artwork.tags.length > 0 ? `
          <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;">
            ${artwork.tags.map(tag => `
              <span style="
                padding: 6px 12px;
                background: rgba(99, 102, 241, 0.1);
                border: 1px solid var(--color-primary);
                border-radius: 16px;
                color: var(--color-primary);
                font-size: 14px;
                font-weight: 500;
              ">
                ${tag}
              </span>
            `).join('')}
          </div>
        ` : ''}

        ${artwork.description ? `
          <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="margin-bottom: 8px;">작품 설명</h4>
            <p style="color: var(--text-secondary);">${artwork.description}</p>
          </div>
        ` : ''}

        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary" onclick="app.gallery.editArtwork('${artwork.id}')" style="flex: 1;">
            ✏️ 수정
          </button>
          <button class="btn-danger" onclick="app.gallery.deleteArtwork('${artwork.id}')" style="flex: 1;">
            🗑 삭제
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
  }

  /**
   * 작품 상세 모달 닫기
   */
  closeArtwork() {
    document.getElementById('artwork-modal').classList.add('hidden');
  }

  /**
   * 작품 수정
   */
  editArtwork(artworkId) {
    const gallery = storage.getGallery();
    const artwork = gallery.find(a => a.id === artworkId);

    if (!artwork) return;

    const title = prompt('작품 제목:', artwork.title);
    if (title === null) return; // 취소

    const description = prompt('작품 설명:', artwork.description || '');

    storage.updateArtwork(artworkId, {
      title: title || artwork.title,
      description: description || ''
    });

    window.app.toast.show('✅ 작품 정보가 수정되었어요', 'success');
    this.closeArtwork();
    this.render();
  }

  /**
   * 작품 삭제
   */
  deleteArtwork(artworkId) {
    if (confirm('이 작품을 삭제하시겠어요?')) {
      storage.deleteArtwork(artworkId);
      window.app.toast.show('🗑 작품이 삭제되었어요', 'success');
      this.closeArtwork();
      this.render();
    }
  }

  /**
   * 월 변경
   */
  changeMonth(delta) {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + delta);
    this.render();
  }

  /**
   * 필터 적용
   */
  applyFilters() {
    this.searchQuery = document.getElementById('search-input')?.value.toLowerCase() || '';
    this.render();
  }

  /**
   * Toggle tag filter
   */
  toggleTagFilter(tag) {
    const index = this.selectedFilterTags.indexOf(tag);
    if (index > -1) {
      this.selectedFilterTags.splice(index, 1);
    } else {
      this.selectedFilterTags.push(tag);
    }
    this.render();
  }

  /**
   * Get all unique tags from gallery
   */
  getAllTags() {
    const gallery = storage.getGallery();
    const allTags = new Set();
    
    gallery.forEach(artwork => {
      if (artwork.tags && Array.isArray(artwork.tags)) {
        artwork.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    return Array.from(allTags).sort();
  }

  /**
   * 렌더링
   */
  render() {
    if (this.currentView === 'calendar') {
      this.renderCalendar();
    } else if (this.currentView === 'list') {
      this.renderList();
    } else if (this.currentView === 'grid') {
      this.renderGrid();
    }
  }

  /**
   * 캘린더 뷰 렌더링
   */
  renderCalendar() {
    const gallery = storage.getGallery();

    // 월 표시 업데이트
    const monthDisplay = document.getElementById('current-month');
    if (monthDisplay) {
      monthDisplay.textContent =
        `${this.currentMonth.getFullYear()}년 ${this.currentMonth.getMonth() + 1}월`;
    }

    const container = document.getElementById('calendar-grid');
    if (!container) return;

    // 캘린더 생성
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 작품을 날짜별로 그룹화
    const artworksByDate = {};
    gallery.forEach(art => {
      const dateStr = UTILS.formatDate(art.date);
      if (!artworksByDate[dateStr]) {
        artworksByDate[dateStr] = [];
      }
      artworksByDate[dateStr].push(art);
    });

    let html = `
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 8px;">
        ${CONFIG.DAYS_KR.map(day =>
          `<div style="text-align: center; font-weight: 600; color: var(--text-secondary); padding: 8px;">
            ${day}
          </div>`
        ).join('')}
      </div>
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">
    `;

    // 첫 주 빈 칸
    for (let i = 0; i < firstDay; i++) {
      html += '<div></div>';
    }

    // 날짜들
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = UTILS.formatDate(date);
      const artworks = artworksByDate[dateStr] || [];
      const isToday = dateStr === UTILS.formatDate(new Date());

      html += `
        <div class="calendar-day ${isToday ? 'today' : ''}"
             style="
               aspect-ratio: 1;
               background: var(--bg-secondary);
               border-radius: 8px;
               padding: 8px;
               position: relative;
               cursor: ${artworks.length > 0 ? 'pointer' : 'default'};
               border: ${isToday ? '2px solid var(--color-primary)' : 'none'};
             "
             ${artworks.length > 0 ? `onclick="app.gallery.showDayArtworks('${dateStr}')"` : ''}>
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">
            ${day}
          </div>
          ${artworks.length > 0 ? `
            <div style="
              position: absolute;
              bottom: 4px;
              right: 4px;
              width: 20px;
              height: 20px;
              background: var(--color-primary);
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: bold;
            ">
              ${artworks.length}
            </div>
          ` : ''}
        </div>
      `;
    }

    html += '</div>';
    container.innerHTML = html;
  }

  /**
   * 특정 날짜의 작품들 보기
   */
  showDayArtworks(dateStr) {
    const gallery = storage.getGallery();
    const artworks = gallery.filter(a => UTILS.formatDate(a.date) === dateStr);

    if (artworks.length === 0) return;

    if (artworks.length === 1) {
      this.viewArtwork(artworks[0].id);
    } else {
      // 여러 작품이 있으면 리스트로 전환
      this.switchView('list');
    }
  }

  /**
   * 리스트 뷰 렌더링
   */
  renderList() {
    let gallery = storage.getGallery();

    // Render tag filters
    const allTags = this.getAllTags();
    const tagFilterContainer = document.getElementById('tag-filter-container');
    if (tagFilterContainer) {
      if (allTags.length > 0) {
        tagFilterContainer.innerHTML = `
          <button onclick="app.gallery.selectedFilterTags = []; app.gallery.render();" 
                  style="padding: 6px 12px; border-radius: 16px; border: 1px solid var(--border-color); 
                         background: ${this.selectedFilterTags.length === 0 ? 'var(--color-primary)' : 'var(--bg-secondary)'}; 
                         color: ${this.selectedFilterTags.length === 0 ? 'white' : 'var(--text-secondary)'}; 
                         cursor: pointer; font-size: 14px; transition: all 0.2s;">
            전체
          </button>
          ${allTags.map(tag => `
            <button onclick="app.gallery.toggleTagFilter('${tag}')" 
                    style="padding: 6px 12px; border-radius: 16px; border: 1px solid var(--border-color); 
                           background: ${this.selectedFilterTags.includes(tag) ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-secondary)'}; 
                           color: ${this.selectedFilterTags.includes(tag) ? 'var(--color-primary)' : 'var(--text-secondary)'}; 
                           border-color: ${this.selectedFilterTags.includes(tag) ? 'var(--color-primary)' : 'var(--border-color)'};
                           cursor: pointer; font-size: 14px; font-weight: ${this.selectedFilterTags.includes(tag) ? '600' : '400'};
                           transition: all 0.2s;">
              ${tag}
            </button>
          `).join('')}
        `;
      } else {
        tagFilterContainer.innerHTML = '<span style="color: var(--text-tertiary); font-size: 14px;">태그가 없습니다</span>';
      }
    }

    // Tag filtering
    if (this.selectedFilterTags.length > 0) {
      gallery = gallery.filter(a => {
        if (!a.tags || !Array.isArray(a.tags)) return false;
        return this.selectedFilterTags.some(tag => a.tags.includes(tag));
      });
    }

    // Search filtering
    if (this.searchQuery) {
      gallery = gallery.filter(a =>
        a.title.toLowerCase().includes(this.searchQuery) ||
        (a.description && a.description.toLowerCase().includes(this.searchQuery)) ||
        (a.tags && a.tags.some(tag => tag.toLowerCase().includes(this.searchQuery)))
      );
    }

    const container = document.getElementById('art-list');
    if (!container) return;

    if (gallery.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 40px;">
          <p style="font-size: 48px; margin-bottom: 16px;">🖼</p>
          <p style="color: var(--text-secondary);">
            ${this.searchQuery || this.selectedFilterTags.length > 0
              ? '검색 결과가 없어요'
              : '아직 작품이 없어요'}
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = gallery.map(art => `
      <div class="art-item" onclick="app.gallery.viewArtwork('${art.id}')"
           style="
             display: flex;
             gap: 16px;
             background: var(--bg-secondary);
             padding: 16px;
             border-radius: 12px;
             cursor: pointer;
             transition: all 0.2s;
             margin-bottom: 12px;
           ">
        <img src="${art.thumbnail}" alt="${art.title}"
             style="
               width: 100px;
               height: 100px;
               object-fit: cover;
               border-radius: 8px;
               flex-shrink: 0;
             ">
        <div style="flex: 1;">
          <h4 style="margin-bottom: 8px;">${art.title}</h4>
          <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 8px;">
            ${art.description || '설명 없음'}
          </p>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            ${art.tags && art.tags.length > 0 ? art.tags.map(tag => `
              <span style="
                padding: 4px 8px;
                background: rgba(99, 102, 241, 0.1);
                border: 1px solid var(--color-primary);
                border-radius: 12px;
                color: var(--color-primary);
                font-size: 11px;
                font-weight: 500;
              ">
                ${tag}
              </span>
            `).join('') : ''}
            <span style="color: var(--text-tertiary); font-size: 12px; margin-left: auto;">
              ${UTILS.getRelativeTime(art.date)}
            </span>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * 그리드 뷰 렌더링
   */
  renderGrid() {
    let gallery = storage.getGallery();

    // Tag filtering
    if (this.selectedFilterTags.length > 0) {
      gallery = gallery.filter(a => {
        if (!a.tags || !Array.isArray(a.tags)) return false;
        return this.selectedFilterTags.some(tag => a.tags.includes(tag));
      });
    }

    // Search filtering
    if (this.searchQuery) {
      gallery = gallery.filter(a =>
        a.title.toLowerCase().includes(this.searchQuery) ||
        (a.description && a.description.toLowerCase().includes(this.searchQuery)) ||
        (a.tags && a.tags.some(tag => tag.toLowerCase().includes(this.searchQuery)))
      );
    }

    const container = document.getElementById('art-grid');
    if (!container) return;

    if (gallery.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 40px; grid-column: 1 / -1;">
          <p style="font-size: 48px; margin-bottom: 16px;">🖼</p>
          <p style="color: var(--text-secondary);">작품이 없어요</p>
        </div>
      `;
      return;
    }

    container.innerHTML = gallery.map(art => `
      <div class="art-grid-item" onclick="app.gallery.viewArtwork('${art.id}')"
           style="
             position: relative;
             aspect-ratio: 1;
             border-radius: 12px;
             overflow: hidden;
             cursor: pointer;
             transition: transform 0.2s;
           "
           onmouseover="this.style.transform='scale(1.05)'"
           onmouseout="this.style.transform='scale(1)'">
        <img src="${art.thumbnail}" alt="${art.title}"
             style="
               width: 100%;
               height: 100%;
               object-fit: cover;
             ">
        <div style="
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.7));
          padding: 16px;
          color: white;
        ">
          <h4 style="color: white; font-size: 14px; margin-bottom: 4px;">${art.title}</h4>
          <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 4px;">
            ${art.tags && art.tags.length > 0 ? art.tags.slice(0, 2).map(tag => `
              <span style="
                padding: 2px 6px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                font-size: 10px;
                color: white;
              ">
                ${tag}
              </span>
            `).join('') : ''}
          </div>
          <span style="font-size: 12px; opacity: 0.9;">
            ${UTILS.getRelativeTime(art.date)}
          </span>
        </div>
      </div>
    `).join('');
  }
}

export default new GalleryManager();

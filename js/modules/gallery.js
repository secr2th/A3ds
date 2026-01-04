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
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageData = event.target.result;

          // 👇 모달 방식으로 변경
          this.showUploadModal(imageData);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Upload error:', error);
        window.app.toast.show('❌ 이미지를 불러올 수 없어요', 'error');
      }
    };

    input.click();
  }

  /**
   * 업로드 모달 표시
   */
  showUploadModal(imageData) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'upload-modal';

    const categories = Object.keys(CONFIG.CATEGORIES);
    let selectedCategory = 'basic';

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <button class="close-btn" onclick="this.closest('.modal').remove()">✕</button>

        <h2>🖼 작품 업로드</h2>

        <img src="${imageData}" alt="Preview"
             style="width: 100%; max-height: 300px; object-fit: contain; border-radius: 12px; margin: 20px 0; background: var(--bg-secondary);">

        <div style="margin-bottom: 20px;">
          <label style="display: block; font-weight: 600; margin-bottom: 8px;">작품 제목</label>
          <input type="text" id="upload-title" placeholder="예: 인체 크로키 연습"
                 style="width: 100%;">
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; font-weight: 600; margin-bottom: 8px;">설명 (선택)</label>
          <textarea id="upload-description" placeholder="작품에 대한 설명을 입력하세요"
                    rows="3" style="width: 100%; resize: vertical;"></textarea>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; font-weight: 600; margin-bottom: 12px;">카테고리</label>
          <div class="category-tags" style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${categories.map(cat => {
              const info = CONFIG.CATEGORIES[cat];
              return `
                <button class="category-tag ${cat === 'basic' ? 'active' : ''}"
                        data-category="${cat}"
                        onclick="
                          document.querySelectorAll('.category-tag').forEach(t => t.classList.remove('active'));
                          this.classList.add('active');
                        "
                        style="
                          padding: 8px 16px;
                          border-radius: 20px;
                          border: 2px solid var(--border-color);
                          background: var(--bg-secondary);
                          cursor: pointer;
                          transition: all 0.2s;
                          font-weight: 500;
                        ">
                  ${info.icon} ${info.name}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <button class="btn-primary" onclick="app.gallery.confirmUpload('${imageData}')" style="width: 100%;">
          ✅ 업로드
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    // 카테고리 태그 스타일 (hover 효과)
    const style = document.createElement('style');
    style.textContent = `
      .category-tag:hover {
        border-color: var(--color-primary) !important;
        transform: scale(1.05);
      }
      .category-tag.active {
        background: var(--color-primary) !important;
        color: white !important;
        border-color: var(--color-primary) !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 업로드 확인
   */
  confirmUpload(imageData) {
    const title = document.getElementById('upload-title').value.trim();
    const description = document.getElementById('upload-description').value.trim();
    const selectedTag = document.querySelector('.category-tag.active');
    const category = selectedTag?.getAttribute('data-category') || 'basic';

    if (!title) {
      window.app.toast.show('작품 제목을 입력해주세요', 'warning');
      return;
    }

    // 갤러리에 추가
    storage.addArtwork({
      title,
      description,
      category,
      imageData,
      thumbnail: imageData,
      date: new Date().toISOString(),
      tags: []
    });

    // 모달 닫기
    document.getElementById('upload-modal').remove();

    window.app.toast.show('✅ 작품이 추가되었어요!', 'success');
    this.render();
  };


        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Upload error:', error);
        window.app.toast.show('❌ 업로드 실패', 'error');
      }
    };

    input.click();
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

    content.innerHTML = `
      <div class="artwork-detail">
        <img src="${artwork.imageData}" alt="${artwork.title}"
             style="width: 100%; border-radius: 12px; margin-bottom: 20px;">

        <h2>${artwork.title}</h2>
        <p style="color: var(--text-secondary); margin-bottom: 16px;">
          ${UTILS.formatDateKR(artwork.date)}
        </p>

        <div style="display: flex; gap: 8px; margin-bottom: 20px;">
          <span class="badge" style="background: ${CONFIG.CATEGORIES[artwork.category]?.color};">
            ${CONFIG.CATEGORIES[artwork.category]?.icon}
            ${CONFIG.CATEGORIES[artwork.category]?.name}
          </span>
        </div>

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
    this.filterCategory = document.getElementById('category-filter')?.value || 'all';
    this.searchQuery = document.getElementById('search-input')?.value.toLowerCase() || '';
    this.render();
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

    // 필터링
    if (this.filterCategory !== 'all') {
      gallery = gallery.filter(a => a.category === this.filterCategory);
    }

    if (this.searchQuery) {
      gallery = gallery.filter(a =>
        a.title.toLowerCase().includes(this.searchQuery) ||
        (a.description && a.description.toLowerCase().includes(this.searchQuery))
      );
    }

    const container = document.getElementById('art-list');
    if (!container) return;

    if (gallery.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 40px;">
          <p style="font-size: 48px; margin-bottom: 16px;">🖼</p>
          <p style="color: var(--text-secondary);">
            ${this.searchQuery || this.filterCategory !== 'all'
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
          <div style="display: flex; gap: 8px; align-items: center;">
            <span class="badge" style="background: ${CONFIG.CATEGORIES[art.category]?.color}; font-size: 12px;">
              ${CONFIG.CATEGORIES[art.category]?.icon}
              ${CONFIG.CATEGORIES[art.category]?.name}
            </span>
            <span style="color: var(--text-tertiary); font-size: 12px;">
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

    // 필터링 (리스트와 동일)
    if (this.filterCategory !== 'all') {
      gallery = gallery.filter(a => a.category === this.filterCategory);
    }

    if (this.searchQuery) {
      gallery = gallery.filter(a =>
        a.title.toLowerCase().includes(this.searchQuery) ||
        (a.description && a.description.toLowerCase().includes(this.searchQuery))
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
          <span style="font-size: 12px; opacity: 0.9;">
            ${CONFIG.CATEGORIES[art.category]?.icon}
            ${UTILS.getRelativeTime(art.date)}
          </span>
        </div>
      </div>
    `).join('');
  }
}

export default new GalleryManager();

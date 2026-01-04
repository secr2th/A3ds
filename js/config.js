/**
 * 애플리케이션 설정
 * - API 엔드포인트
 * - 상수
 * - 기본 설정값
 */

export const CONFIG = {
  // Gemini API 설정
  GEMINI_API_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',

  // 로컬 스토리지 키
  STORAGE_KEYS: {
    API_KEY: 'artquest_api_key',
    USER_DATA: 'artquest_user_data',
    TASKS: 'artquest_tasks',
    GALLERY: 'artquest_gallery',
    SETTINGS: 'artquest_settings',
    ASSESSMENT: 'artquest_assessment',
    ANALYTICS: 'artquest_analytics'
  },

  // 게임 설정
  GAME: {
    POINTS_PER_TASK: 10,
    POINTS_PER_LEVEL: 100,
    STREAK_BONUS: 5,
    POMODORO_POINTS: 5
  },

  // 타이머 기본값 (분)
  TIMER: {
    FOCUS_DURATION: 25,
    SHORT_BREAK: 5,
    LONG_BREAK: 15
  },

  // 알림 기본 시간
  NOTIFICATION: {
    DEFAULT_TIME: '20:00',
    MESSAGES: [
      '🎨 오늘의 그림 연습 시간이에요!',
      '✏️ 꾸준한 연습이 실력을 만들어요!',
      '🔥 연속 학습 기록을 이어가세요!',
      '💪 오늘도 한 걸음 성장해봐요!'
    ]
  },

  // 실력 평가 카테고리
  CATEGORIES: {
    basic: { name: '기초 드로잉', icon: '📐', color: '#3b82f6' },
    anatomy: { name: '인체 드로잉', icon: '👤', color: '#ec4899' },
    perspective: { name: '원근법', icon: '🏛', color: '#8b5cf6' },
    shading: { name: '명암/빛', icon: '💡', color: '#f59e0b' },
    color: { name: '색채', icon: '🎨', color: '#10b981' },
    composition: { name: '구도', icon: '📷', color: '#6366f1' }
  },

  // 난이도 레벨
  LEVELS: {
    beginner: { name: '초급', multiplier: 1 },
    intermediate: { name: '중급', multiplier: 1.5 },
    advanced: { name: '상급', multiplier: 2 }
  },

  // 요일 한글
  DAYS_KR: ['일', '월', '화', '수', '목', '금', '토'],

  // 월 한글
  MONTHS_KR: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
};

// 유틸리티 함수들
export const UTILS = {
  // 날짜 포맷팅
  formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  // 한글 날짜
  formatDateKR(date) {
    const d = new Date(date);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  },

  // 상대 시간 (몇 일 전)
  getRelativeTime(date) {
    const now = new Date();
    const target = new Date(date);
    const diffTime = Math.abs(now - target);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    return `${Math.floor(diffDays / 30)}개월 전`;
  },

  // UUID 생성
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // 디바운스
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // 배열 셔플
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  // Get week number of the year
  getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo}`;
  }
};

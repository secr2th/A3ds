export const CONFIG = {
  GEMINI_API_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',

  STORAGE_KEYS: {
    API_KEY: 'artquest_api_key',
    USER_DATA: 'artquest_user_data',
    TASKS: 'artquest_tasks',
    GALLERY: 'artquest_gallery',
    SETTINGS: 'artquest_settings',
    ASSESSMENT: 'artquest_assessment',
    ANALYTICS: 'artquest_analytics',
    CUSTOM_RESOURCES: 'artquest_custom_resources', // FIX 3: 커스텀 리소스 저장 키
  },

  GAME: {
    POINTS_PER_TASK: 10,
    POINTS_PER_LEVEL: 100,
    STREAK_BONUS: 5,
    POMODORO_POINTS: 5
  },

  TIMER: {
    FOCUS_DURATION: 25,
    SHORT_BREAK: 5,
    LONG_BREAK: 15
  },

  NOTIFICATION: {
    DEFAULT_TIME: '20:00',
    MESSAGES: [
      '🎨 오늘의 그림 연습 시간이에요!', '✏️ 꾸준한 연습이 실력을 만들어요!',
      '🔥 연속 학습 기록을 이어가세요!', '💪 오늘도 한 걸음 성장해봐요!'
    ]
  },

  CATEGORIES: {
    basic: { name: '기초 드로잉', icon: '📐', color: '#3b82f6' },
    anatomy: { name: '인체 드로잉', icon: '👤', color: '#ec4899' },
    perspective: { name: '원근법', icon: '🏛', color: '#8b5cf6' },
    shading: { name: '명암/빛', icon: '💡', color: '#f59e0b' },
    color: { name: '색채', icon: '🎨', color: '#10b981' },
    composition: { name: '구도', icon: '📷', color: '#6366f1' }
  },

  LEVELS: {
    beginner: { name: '초급', multiplier: 1 },
    intermediate: { name: '중급', multiplier: 1.5 },
    advanced: { name: '상급', multiplier: 2 }
  },

  DAYS_KR: ['일', '월', '화', '수', '목', '금', '토'],
  MONTHS_KR: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
};

export const UTILS = {
  formatDate(date) { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; },
  formatDateKR(date) { const d = new Date(date); return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`; },
  getRelativeTime(date) { const diff = new Date() - new Date(date); const d = Math.floor(diff / 864e5); if (d < 1) return '오늘'; if (d < 2) return '어제'; return `${d}일 전`; },
  generateId() { return Date.now().toString(36) + Math.random().toString(36).substring(2); },
  debounce(func, wait) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => func(...a), wait); }; },
  shuffle(arr) { let i = arr.length, j; while (i) { j = Math.floor(Math.random() * i--); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
};

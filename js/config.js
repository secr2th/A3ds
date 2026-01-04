export const CONFIG = {
  // FIX: 요청하신 gemini-1.5-flash-latest 모델로 변경. 더 빠르고 효율적입니다.
  GEMINI_API_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-latest:generateContent',
  STORAGE_KEYS: { API_KEY: 'artquest_api_key', USER_DATA: 'artquest_user_data', TASKS: 'artquest_tasks', GALLERY: 'artquest_gallery', SETTINGS: 'artquest_settings', ASSESSMENT: 'artquest_assessment', ANALYTICS: 'artquest_analytics', CUSTOM_RESOURCES: 'artquest_custom_resources', },
  GAME: { POINTS_PER_TASK: 10, POINTS_PER_LEVEL: 100, STREAK_BONUS: 5, POMODORO_POINTS: 5 },
  CATEGORIES: { basic: { name: '기초', icon: '📐'}, anatomy: { name: '인체', icon: '👤'}, perspective: { name: '원근법', icon: '🏛'}, shading: { name: '명암', icon: '💡'}, color: { name: '색채', icon: '🎨'}, composition: { name: '구도', icon: '📷'} },
  DAYS_KR: ['일', '월', '화', '수', '목', '금', '토'],
};
export const UTILS = {
  formatDate(d) { d=new Date(d); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; },
  generateId() { return Date.now().toString(36) + Math.random().toString(36).substring(2); },
};

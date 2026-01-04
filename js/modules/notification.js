import { CONFIG } from '../config.js';
import storage from './storage.js';

class NotificationManager {
  constructor() {
    this.permission = 'default';
  }

  init() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      window.app.toast.show('이 브라우저는 알림을 지원하지 않습니다.', 'warning');
      return;
    }
    const result = await Notification.requestPermission();
    this.permission = result;
    if (result === 'granted') {
      window.app.toast.show('✅ 알림이 허용되었습니다.', 'success');
      new Notification('ArtQuest 알림 테스트', { body: '이제 학습 알림을 받을 수 있습니다!' });
    }
  }
}
export default new NotificationManager();

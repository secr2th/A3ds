import { CONFIG } from '../config.js';
import storage from './storage.js';

class GeminiAPI {
  constructor() { this.apiKey = null; this.endpoint = CONFIG.GEMINI_API_ENDPOINT; }
  setApiKey(key) { this.apiKey = key; storage.setApiKey(key); }
  getApiKey() { if (!this.apiKey) { this.apiKey = storage.getApiKey(); } return this.apiKey; }

  async generateContent(prompt, temperature = 0.7) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.');
    try {
      const res = await fetch(`${this.endpoint}?key=${apiKey}`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature, maxOutputTokens: 2048 } }) });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      const text = data.candidates[0].content.parts[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : text;
    } catch (e) { console.error('Gemini API Error:', e); throw e; }
  }

  async testConnection() { try { const res = await this.generateContent('안녕하세요.'); return !!res; } catch { return false; } }

  async analyzeAssessment(assessment) {
    const prompt = `당신은 전문 미술 교육자입니다. 학생의 자가 평가 결과는 다음과 같습니다:
- 기초: ${assessment.basic}, 인체: ${assessment.anatomy}, 원근법: ${assessment.perspective}, 명암: ${assessment.shading}, 색채: ${assessment.color}, 구도: ${assessment.composition}
이 학생의 강점 2가지와 개선 필요 영역 2가지를 JSON 형식으로 제공해주세요: {"strengths": ["강점1", "강점2"], "weaknesses": ["약점1", "약점2"]}. JSON만 반환하세요.`;
    return this.generateContent(prompt).catch(() => ({ strengths: ['학습 의지'], weaknesses: ['꾸준한 연습 필요'] }));
  }

  // FIX 7: MBTI 결과 같은 진단 요약 생성
  async generateAssessmentSummary(assessment) {
    const prompt = `당신은 창의적인 심리 분석가입니다. 학생의 그림 실력 평가 결과는 다음과 같습니다:
- 기초: ${assessment.basic}, 인체: ${assessment.anatomy}, 원근법: ${assessment.perspective}, 명암: ${assessment.shading}, 색채: ${assessment.color}, 구도: ${assessment.composition}
이 데이터를 바탕으로 이 학생의 아티스트 유형을 MBTI처럼 정의하고, 설명, 특징, 추천 성장 방향을 JSON 형식으로 작성해주세요. 창의적이고 긍정적인 톤으로 작성하세요.
{"title": "아티스트 유형 이름 (예: 꿈꾸는 설계자)", "description": "유형에 대한 1~2문장 요약", "characteristics": ["특징1", "특징2", "특징3"], "recommendations": ["성장 방향1", "성장 방향2"]}. JSON만 반환하세요.`;
    return this.generateContent(prompt, 0.8).catch(() => ({
        title: "성실한 탐험가", description: "기본기를 중시하며 새로운 기술을 배우려는 열정이 넘치는 유형입니다.",
        characteristics: ["체계적인 접근을 선호", "꾸준한 노력을 즐김", "디테일에 강함"],
        recommendations: ["과감한 시도를 통해 자신만의 스타일 찾기", "기초 외 다양한 분야에도 관심 갖기"]
    }));
  }

  async generateDailyTasks(assessment) {
    const prompt = `학생의 실력 수준: 기초(${assessment.basic}), 인체(${assessment.anatomy}), 원근법(${assessment.perspective}). 이 학생을 위한 오늘의 그림 연습 과제 2개를 JSON 형식으로 제공해주세요: {"tasks": [{"title": "과제 제목", "description": "과제 설명", "category": "basic|anatomy|perspective|shading|color|composition", "duration": 15}]}. JSON만 반환하세요.`;
    return this.generateContent(prompt).catch(() => ({
        tasks: [{ title: '직선 긋기', description: 'A4 용지에 흔들림 없는 직선 50개 긋기', category: 'basic', duration: 15 }]
    }));
  }

  async generateWeeklyGoals(assessment) {
    const prompt = `학생의 약점은 ${assessment.weaknesses?.[0] || '인체'}입니다. 이 약점을 보완하기 위한 이번 주 목표 1개와 세부과제 2개를 JSON 형식으로 제공해주세요: {"goals": [{"title": "주간 목표", "description": "목표 설명", "category": "anatomy", "targetCount": 5, "tasks": ["세부과제1", "세부과제2"]}]}. JSON만 반환하세요.`;
    return this.generateContent(prompt).catch(() => ({
        goals: [{ title: '인체 비율 마스터', description: '기본 인체 비율 익히기', category: 'anatomy', targetCount: 5, tasks: ['8등신 비율 암기', '관절 위치 표시 연습'] }]
    }));
  }

  async getLearningFeedback(userData, recentActivity) {
    const prompt = `학생 레벨: ${userData.level}, 연속학습: ${userData.streak}일. 약점 카테고리: ${recentActivity.weakestCategory}. 이 학생을 위한 격려와 팁을 포함한 학습 코칭 메시지를 2문장으로 작성해주세요.`;
    return this.generateContent(prompt, 0.8).catch(() => '꾸준함이 최고의 무기입니다! 오늘도 화이팅!');
  }
}
export default new GeminiAPI();

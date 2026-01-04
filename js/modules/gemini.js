/**
 * Gemini API Module
 * - Google Gemini AI 통신
 * - 실력 분석
 * - 학습 플랜 생성
 * - 피드백 생성
 */

import { CONFIG } from '../config.js';
import storage from './storage.js';

class GeminiAPI {
  constructor() {
    this.apiKey = null;
    this.endpoint = CONFIG.GEMINI_API_ENDPOINT;
  }

  /**
   * API 키 설정
   */
  setApiKey(key) {
    this.apiKey = key;
    storage.setApiKey(key);
  }

  /**
   * API 키 가져오기
   */
  getApiKey() {
    if (!this.apiKey) {
      this.apiKey = storage.getApiKey();
    }
    return this.apiKey;
  }

  /**
   * API 연결 테스트
   */
  async testConnection() {
    try {
      const response = await this.generateContent('안녕하세요. 연결 테스트입니다.');
      return response ? true : false;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Gemini API 호출 (기본)
   */
  async generateContent(prompt, temperature = 0.7) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('API 키가 설정되지 않았습니다.');
    }

    try {
      const response = await fetch(`${this.endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: temperature,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw error;
    }
  }

  /**
   * 실력 평가 분석
   */
  async analyzeAssessment(assessment) {
    const prompt = `
당신은 전문 미술 교육자입니다. 다음은 학생의 그림 실력 자가 평가 결과입니다:

- 기초 드로잉: ${assessment.basic}
- 인체 드로잉: ${assessment.anatomy}
- 원근법: ${assessment.perspective}
- 명암/빛: ${assessment.shading}
- 색채: ${assessment.color}
- 구도: ${assessment.composition}

(각 항목: beginner=초급, intermediate=중급, advanced=상급)

이 학생을 위한 분석을 다음 JSON 형식으로 제공해주세요:

{
  "strengths": ["강점1", "강점2", "강점3"],
  "weaknesses": ["약점1", "약점2", "약점3"],
  "overallLevel": "초급|중급|상급",
  "recommendations": ["추천사항1", "추천사항2", "추천사항3"],
  "learningTips": ["학습팁1", "학습팁2", "학습팁3"]
}

JSON만 반환하고 다른 텍스트는 포함하지 마세요.
`;

    try {
      const response = await this.generateContent(prompt);
      // JSON 파싱 (마크다운 코드 블록 제거)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Invalid JSON response');
    } catch (error) {
      console.error('Assessment analysis error:', error);
      // 폴백 응답
      return {
        strengths: ['기본 도형 이해', '꾸준한 학습 의지', '관찰력'],
        weaknesses: ['세부 표현력', '입체감 표현', '색감 조율'],
        overallLevel: '초급',
        recommendations: [
          '매일 15분씩 기초 선 연습하기',
          '간단한 사물 스케치로 시작하기',
          '유튜브 기초 강의 시청하기'
        ],
        learningTips: [
          '완벽보다는 꾸준함에 집중하세요',
          '매일 조금씩 그리는 습관 만들기',
          '다른 작품 모작으로 배우기'
        ]
      };
    }
  }

  /**
   * 일일 과제 생성
   */
  async generateDailyTasks(assessment, dayOfWeek) {
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const prompt = `
학생의 실력 수준:
${Object.entries(assessment).map(([key, value]) =>
  `- ${CONFIG.CATEGORIES[key].name}: ${value}`
).join('\n')}

오늘은 ${days[dayOfWeek]}입니다.

이 학생을 위한 오늘의 그림 연습 과제 3-5개를 다음 JSON 형식으로 제공해주세요:

{
  "tasks": [
    {
      "title": "과제 제목",
      "description": "과제 설명 (구체적으로)",
      "category": "basic|anatomy|perspective|shading|color|composition",
      "duration": 15,
      "difficulty": "beginner|intermediate|advanced",
      "tips": "과제 수행 팁"
    }
  ]
}

- 실력에 맞는 난이도로 구성
- ADHD를 고려해 15-30분 단위로 분할
- 구체적이고 실행 가능한 과제
- 다양한 카테고리 포함

JSON만 반환하세요.
`;

    try {
      const response = await this.generateContent(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Invalid JSON response');
    } catch (error) {
      console.error('Task generation error:', error);
      // 폴백 과제
      return {
        tasks: [
          {
            title: '직선 연습 - 100개 긋기',
            description: '자를 사용하지 않고 수평/수직 직선을 각각 50개씩 그려보세요.',
            category: 'basic',
            duration: 15,
            difficulty: assessment.basic || 'beginner',
            tips: '손목이 아닌 팔 전체를 사용해 그어보세요.'
          },
          {
            title: '원 그리기 연습',
            description: '다양한 크기의 원을 50개 그려보세요. 컴퍼스 없이!',
            category: 'basic',
            duration: 20,
            difficulty: assessment.basic || 'beginner',
            tips: '천천히 여러 번 겹쳐 그리면서 완성하세요.'
          },
          {
            title: '간단한 사물 스케치',
            description: '주변의 간단한 사물(컵, 책 등) 하나를 선택해 스케치하세요.',
            category: 'basic',
            duration: 25,
            difficulty: assessment.basic || 'beginner',
            tips: '세부보다는 전체 형태에 집중하세요.'
          }
        ]
      };
    }
  }

  /**
   * 주간 목표 생성
   */
  async generateWeeklyGoals(assessment) {
    const prompt = `
학생의 그림 실력 평가:
${Object.entries(assessment).map(([key, value]) =>
  `- ${CONFIG.CATEGORIES[key].name}: ${value}`
).join('\n')}

이 학생을 위한 이번 주 학습 목표 3-4개를 JSON 형식으로 제공해주세요:

{
  "goals": [
    {
      "title": "목표 제목",
      "description": "목표 설명",
      "category": "basic|anatomy|perspective|shading|color|composition",
      "targetCount": 5,
      "tasks": ["세부 과제1", "세부 과제2"]
    }
  ]
}

- 실력 향상에 도움되는 목표
- 일주일 내 달성 가능한 수준
- 약점 보완과 강점 강화 균형

JSON만 반환하세요.
`;

    try {
      const response = await this.generateContent(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Invalid JSON response');
    } catch (error) {
      console.error('Weekly goals generation error:', error);
      return {
        goals: [
          {
            title: '기초 선 연습 강화',
            description: '안정적인 선 긋기 능력 향상',
            category: 'basic',
            targetCount: 5,
            tasks: ['직선 연습', '곡선 연습', '다양한 선 질감']
          }
        ]
      };
    }
  }

  /**
   * 학습 리소스 추천
   */
  async recommendResources(assessment) {
    const prompt = `
학생의 실력 수준:
${Object.entries(assessment).map(([key, value]) =>
  `- ${CONFIG.CATEGORIES[key].name}: ${value}`
).join('\n')}

이 학생에게 적합한 학습 자료 5-8개를 추천해주세요. JSON 형식:

{
  "resources": [
    {
      "title": "자료 제목",
      "type": "video|article|tutorial|book",
      "category": "basic|anatomy|perspective|shading|color|composition",
      "description": "자료 설명",
      "url": "https://...",
      "difficulty": "beginner|intermediate|advanced"
    }
  ]
}

- 유튜브, 블로그, 온라인 강의 등 실제 접근 가능한 자료
- 한국어 자료 우선
- 실력에 맞는 난이도

JSON만 반환하세요.
`;

    try {
      const response = await this.generateContent(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Invalid JSON response');
    } catch (error) {
      console.error('Resource recommendation error:', error);
      // 폴백 리소스
      return {
        resources: [
          {
            title: '기초 드로잉 입문',
            type: 'video',
            category: 'basic',
            description: '선 긋기부터 기본 도형까지',
            url: 'https://youtube.com',
            difficulty: 'beginner'
          },
          {
            title: '인체 비율의 이해',
            type: 'article',
            category: 'anatomy',
            description: '인체의 기본 비율과 구조',
            url: 'https://example.com',
            difficulty: 'beginner'
          }
        ]
      };
    }
  }

  /**
   * 주간 리포트 생성
   */
  async generateWeeklyReport(weekData) {
    const prompt = `
이번 주 학습 데이터:
- 완료한 과제: ${weekData.completedTasks}개
- 총 학습 시간: ${weekData.totalTime}분
- 획득 포인트: ${weekData.totalPoints}점
- 활동한 날: ${weekData.activeDays}일

카테고리별 활동:
${Object.entries(weekData.categoryActivity).map(([cat, count]) =>
  `- ${CONFIG.CATEGORIES[cat].name}: ${count}회`
).join('\n')}

이번 주 성과를 분석하고 다음 주 방향을 제시해주세요. 다음 형식으로:

{
  "summary": "이번 주 전체 평가 (2-3문장)",
  "achievements": ["성취1", "성취2", "성취3"],
  "improvements": ["개선 필요 영역1", "개선 필요 영역2"],
  "nextWeekFocus": "다음 주 집중 영역 추천",
  "motivationalMessage": "격려 메시지"
}

JSON만 반환하세요.
`;

    try {
      const response = await this.generateContent(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Invalid JSON response');
    } catch (error) {
      console.error('Weekly report generation error:', error);
      return {
        summary: '이번 주도 꾸준히 학습하셨네요! 조금씩 성장하고 계십니다.',
        achievements: ['꾸준한 학습 습관', '기초 실력 향상'],
        improvements: ['학습 시간 늘리기', '다양한 카테고리 시도'],
        nextWeekFocus: '기초 드로잉 집중 연습',
        motivationalMessage: '매일 조금씩, 꾸준히가 가장 중요합니다! 화이팅!'
      };
    }
  }

  /**
   * AI 학습 피드백 (실시간)
   */
  async getLearningFeedback(userData, recentActivity) {
    const prompt = `
학생 정보:
- 레벨: ${userData.level}
- 포인트: ${userData.points}
- 연속 학습: ${userData.streak}일

최근 활동:
- 최근 7일 과제 완료: ${recentActivity.tasksCompleted}개
- 약점 카테고리: ${recentActivity.weakestCategory}

간단한 학습 코칭 메시지를 2-3문장으로 작성해주세요.
격려하고 구체적인 팁을 포함하세요.
`;

    try {
      const response = await this.generateContent(prompt, 0.8);
      return response.trim();
    } catch (error) {
      console.error('Feedback generation error:', error);
      return '꾸준히 잘하고 계세요! 매일 조금씩 그리는 습관이 실력을 만듭니다. 💪';
    }
  }
}

export default new GeminiAPI();

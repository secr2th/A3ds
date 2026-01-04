/**
 * Gemini API Module
 * - Google Gemini AI 통신 (Model: Gemini 1.5 Flash)
 * - 실력 분석, 학습 플랜 생성, 피드백 생성
 */

import { CONFIG } from '../config.js';
import storage from './storage.js';

class GeminiAPI {
  constructor() {
    this.apiKey = null;
    // 현재 가장 빠르고 안정적인 최신 모델 설정 (2.5는 존재하지 않아 1.5 Flash로 설정)
    this.model = 'gemini-1.5-flash';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
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
      // 간단한 인사말로 테스트
      const response = await this.generateContent('Hello', 0.1);
      return response && response.length > 0;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Gemini API 호출 (Core Method)
   */
  async generateContent(prompt, temperature = 0.7) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('API 키가 설정되지 않았습니다.');
    }

    const url = `${this.baseUrl}/${this.model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: 2048,
        // 필요 시 JSON 응답을 강제할 수 있으나, 현재는 유연성을 위해 텍스트로 받고 파싱
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API Error Detail:', errorData);
        throw new Error(`API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();

      // 응답 데이터 안전하게 추출
      if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('No content in response');
      }

    } catch (error) {
      console.error('Gemini Request Failed:', error);
      throw error;
    }
  }

  /**
   * 유틸리티: JSON 파싱 (Markdown 제거)
   */
  parseJSON(text) {
    try {
      // 1. 순수 JSON인 경우
      return JSON.parse(text);
    } catch (e) {
      // 2. Markdown 코드 블록이 있는 경우 (```json ... ```)
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match && match[1]) {
        try {
          return JSON.parse(match[1]);
        } catch (e2) {
          console.warn('Failed to parse JSON inside markdown block');
        }
      }

      // 3. 단순히 중괄호만 추출 시도
      const braceMatch = text.match(/\{[\s\S]*\}/);
      if (braceMatch) {
         try {
          return JSON.parse(braceMatch[0]);
        } catch (e3) {
          throw new Error('Failed to parse JSON from response');
        }
      }

      console.error('Raw text:', text);
      throw new Error('Response is not valid JSON');
    }
  }

  /**
   * 실력 평가 분석
   */
  async analyzeAssessment(assessment) {
    const prompt = `
Role: Professional Art Teacher.
Task: Analyze the student's self-assessment data.

Student Data:
- Basic Drawing: ${assessment.basic}
- Anatomy: ${assessment.anatomy}
- Perspective: ${assessment.perspective}
- Shading/Light: ${assessment.shading}
- Color: ${assessment.color}
- Composition: ${assessment.composition}

(Levels: beginner, intermediate, advanced)

Output Format: JSON only. No markdown text.
{
  "strengths": ["String", "String", "String"],
  "weaknesses": ["String", "String", "String"],
  "overallLevel": "초급/중급/상급",
  "recommendations": ["String", "String", "String"],
  "learningTips": ["String", "String", "String"]
}
Keep language: Korean.
`;

    try {
      const response = await this.generateContent(prompt);
      return this.parseJSON(response);
    } catch (error) {
      console.error('Assessment analysis error:', error);
      // Fallback Data
      return {
        strengths: ['관찰하려는 의지', '기본 도형 인식'],
        weaknesses: ['입체감 표현', '선의 강약 조절'],
        overallLevel: '초급',
        recommendations: ['매일 선긋기 10분', '크로키 시작하기'],
        learningTips: ['완벽하지 않아도 괜찮아요', '매일 조금씩 그리는 습관이 중요합니다']
      };
    }
  }

  /**
   * 일일 과제 생성
   */
  async generateDailyTasks(assessment, dayOfWeek) {
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const prompt = `
Role: Art Coach for ADHD students.
Context: Create gamified daily drawing tasks.
Day: ${days[dayOfWeek]}

Student Levels:
${Object.entries(assessment).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Output: JSON only.
{
  "tasks": [
    {
      "title": "Fun Title",
      "description": "Short, clear instructions",
      "category": "basic|anatomy|perspective|shading|color|composition",
      "duration": 15,
      "difficulty": "beginner|intermediate|advanced",
      "tips": "One quick tip"
    }
  ]
}
Create 3-5 tasks. Keep duration short (15-20min). Language: Korean.
`;

    try {
      const response = await this.generateContent(prompt);
      return this.parseJSON(response);
    } catch (error) {
      console.error('Task generation error:', error);
      return {
        tasks: [{
          title: '자유 드로잉',
          description: '좋아하는 사물을 하나 골라 15분간 그려보세요.',
          category: 'basic',
          duration: 15,
          difficulty: 'beginner',
          tips: '잘 그리려 하지 말고 관찰에 집중하세요.'
        }]
      };
    }
  }

  /**
   * 주간 목표 생성
   */
  async generateWeeklyGoals(assessment) {
    const prompt = `
Role: Art Coach.
Task: Create weekly goals based on levels.
Levels: ${JSON.stringify(assessment)}

Output: JSON only.
{
  "goals": [
    {
      "title": "Goal Title",
      "description": "What to achieve",
      "category": "category_key",
      "targetCount": 3,
      "tasks": ["Subtask 1", "Subtask 2"]
    }
  ]
}
Create 2-3 goals. Language: Korean.
`;

    try {
      const response = await this.generateContent(prompt);
      return this.parseJSON(response);
    } catch (error) {
       // Fallback
       return { goals: [] };
    }
  }

  /**
   * 학습 리소스 추천
   */
  async recommendResources(assessment) {
    const prompt = `
Role: Art Teacher.
Task: Recommend 5 free online art tutorials (YouTube/Blogs) for this level.
Levels: ${JSON.stringify(assessment)}

Output: JSON only.
{
  "resources": [
    {
      "title": "Video/Article Title",
      "type": "video|article",
      "category": "category_key",
      "description": "Why this is good",
      "url": "https://www.youtube.com/results?search_query=drawing+basics",
      "difficulty": "beginner"
    }
  ]
}
Note: Use search query URLs if specific URLs are unknown. Language: Korean.
`;

    try {
      const response = await this.generateContent(prompt);
      return this.parseJSON(response);
    } catch (error) {
      return { resources: [] };
    }
  }

  /**
   * 주간 리포트 생성
   */
  async generateWeeklyReport(weekData) {
    const prompt = `
Analyze weekly art progress:
- Tasks Done: ${weekData.completedTasks}
- Time: ${weekData.totalTime} min
- Points: ${weekData.totalPoints}
- Days Active: ${weekData.activeDays}

Output: JSON only.
{
  "summary": "Warm, encouraging summary (Korean)",
  "achievements": ["Achievement 1", "Achievement 2"],
  "improvements": ["Improvement area 1"],
  "nextWeekFocus": "Recommendation",
  "motivationalMessage": "Cheering message"
}
`;

    try {
      const response = await this.generateContent(prompt);
      return this.parseJSON(response);
    } catch (error) {
      return {
        summary: '데이터 분석에 실패했습니다.',
        achievements: [],
        improvements: [],
        nextWeekFocus: '자유 연습',
        motivationalMessage: '꾸준함이 답입니다!'
      };
    }
  }

  /**
   * 학습 피드백
   */
  async getLearningFeedback(userData, recentActivity) {
    const prompt = `
Give a short (1-2 sentences) encouraging feedback for an art student (ADHD friendly).
Stats: Level ${userData.level}, Streak ${userData.streak} days.
Recent Focus: ${recentActivity.weakestCategory || 'General'}.
Language: Korean.
`;
    try {
      const response = await this.generateContent(prompt, 0.8);
      return response.trim();
    } catch (error) {
      return '매일 조금씩 그리는 당신이 멋져요! 🎨';
    }
  }
}

export default new GeminiAPI();

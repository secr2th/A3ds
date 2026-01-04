# 캐시 문제 해결 방법

사이트가 업데이트되었지만 변경사항이 보이지 않는다면, 브라우저 캐시를 지워야 합니다.

## 방법 1: 강력 새로고침 (가장 빠름)

### Windows/Linux:
- **Chrome/Edge**: `Ctrl + Shift + R` 또는 `Ctrl + F5`
- **Firefox**: `Ctrl + Shift + R` 또는 `Ctrl + F5`

### macOS:
- **Chrome/Edge**: `Cmd + Shift + R`
- **Firefox**: `Cmd + Shift + R`
- **Safari**: `Cmd + Option + R`

## 방법 2: 개발자 도구에서 캐시 비우기

1. **F12** 키를 눌러 개발자 도구 열기
2. **Network** 탭 클릭
3. "Disable cache" 체크박스 선택
4. 페이지 새로고침 (`F5`)

## 방법 3: Service Worker 직접 제거

1. **F12** 키를 눌러 개발자 도구 열기
2. **Application** 탭 클릭 (Chrome/Edge) 또는 **Storage** 탭 (Firefox)
3. 좌측 메뉴에서 **Service Workers** 클릭
4. 등록된 Service Worker 옆의 **Unregister** 버튼 클릭
5. 페이지 새로고침

## 방법 4: 브라우저 캐시 완전히 지우기

### Chrome/Edge:
1. `Ctrl + Shift + Delete` (또는 `Cmd + Shift + Delete` on Mac)
2. 시간 범위: "전체 기간"
3. "캐시된 이미지 및 파일" 선택
4. "데이터 삭제" 클릭

### Firefox:
1. `Ctrl + Shift + Delete` (또는 `Cmd + Shift + Delete` on Mac)
2. 시간 범위: "전체"
3. "캐시" 선택
4. "지금 삭제" 클릭

## 업데이트 확인 방법

캐시를 지운 후 다음 항목들이 표시되는지 확인하세요:

✅ 대시보드 홈 화면:
- "📅 출석" 버튼 (오늘의 과제 섹션)
- "🔄 갱신" 버튼 (이번 주 목표 섹션)
- "🔗 나의 링크" 섹션 (추천 학습자료 대신)

✅ 갤러리:
- 이미지 업로드 시 태그 선택 UI

✅ 설정:
- 웹폰트 코드 입력 필드

✅ 과제 탭:
- "🔄 이번 주 목표 갱신" 버튼 (주간 탭)

## Service Worker 버전

현재 Service Worker 버전: **v1.1.0**

이전 버전 (v1.0.0)이 캐시되어 있었다면 위의 방법으로 갱신해야 합니다.

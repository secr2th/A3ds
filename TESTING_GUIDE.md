# Testing Guide for Bug Fixes

This guide outlines how to test the 4 major bug fixes implemented in this PR.

## Prerequisites
- Open the application in a web browser
- Have a valid Gemini API key ready
- Clear browser cache and localStorage if testing from scratch

## Issue 1: Assessment Modal (실력재진단하기)

### Test Case 1.1: First Time Assessment
1. Open the app for the first time (clear localStorage)
2. Enter API key and click "다음"
3. Fill out all 6 assessment categories (basic, anatomy, perspective, shading, color, composition)
4. Click "진단 완료 및 AI 분석 시작"
5. **Expected**: Loading animation appears, then MBTI-style result modal shows with personality type
6. Click "학습 시작하기" button
7. **Expected**: Modal closes, dashboard loads

### Test Case 1.2: Re-assessment
1. Go to Settings (⚙️ tab)
2. Click "실력 재진단하기" button
3. Confirm the dialog
4. **Expected**: Assessment modal opens showing the assessment form (not API key step)
5. Fill out all categories again (can change answers)
6. Click "진단 완료 및 AI 분석 시작"
7. **Expected**: Analysis runs, result modal appears, dashboard refreshes with new analysis

### Test Case 1.3: Close Modal
1. Open re-assessment modal
2. Click the ✕ close button
3. **Expected**: Modal closes without confirmation (since assessment already exists)

## Issue 2: Font Persistence

### Test Case 2.1: Change Font
1. Go to Settings (⚙️ tab)
2. In "✍️ 폰트" section, select a different font from dropdown (e.g., "Noto Sans KR")
3. **Expected**: Toast shows "✍️ Noto Sans KR 폰트가 적용되었어요"
4. **Expected**: Font changes immediately across the entire app

### Test Case 2.2: Persist Across Tabs
1. Change font to "Nanum Gothic"
2. Navigate to Dashboard (🏠 tab)
3. **Expected**: Font remains as "Nanum Gothic"
4. Navigate to Gallery (🖼 tab)
5. **Expected**: Font still "Nanum Gothic"
6. Go back to Settings
7. **Expected**: Font dropdown shows "Nanum Gothic" selected

### Test Case 2.3: Persist After Refresh
1. Change font to "Nanum Myeongjo"
2. Refresh the browser page (F5 or Ctrl+R)
3. **Expected**: Font loads as "Nanum Myeongjo" immediately after page load

### Test Case 2.4: Custom Web Font
1. Go to Settings → 폰트 section
2. Enter font name: "TestFont"
3. Enter valid @font-face CSS code
4. Click "폰트 추가"
5. **Expected**: Toast shows success, font appears in dropdown
6. Select the custom font
7. **Expected**: Font applies (if valid CSS was provided)

## Issue 3: Attendance Button

### Test Case 3.1: First Attendance Today
1. Go to Dashboard
2. In "오늘의 과제" section, ensure there are tasks from previous day or none
3. Click "📅 출석" button
4. **Expected**: Loading message "출석 체크 중..."
5. **Expected**: Toast shows "📅 출석 완료! X개의 과제가 생성되었어요" (X is 1, 2, or 3)
6. **Expected**: +10 attendance points added to total
7. **Expected**: Old tasks deleted, new 1-3 tasks appear

### Test Case 3.2: Already Attended Today
1. Click "📅 출석" button again
2. **Expected**: Toast shows "오늘은 이미 출석했어요! 🎉"
3. **Expected**: No new tasks generated, no additional points

### Test Case 3.3: Complete Task - Points Award
1. Click on a task checkbox to complete it
2. **Expected**: Task marked as completed
3. **Expected**: Toast shows "✅ 과제 완료! +10점"
4. **Expected**: Points increase by 10
5. **Expected**: Task count updates (e.g., "1/3" → "2/3")

### Test Case 3.4: Uncheck Task - Points Removal
1. Click the same task checkbox again to uncheck
2. **Expected**: Task marked as incomplete
3. **Expected**: Toast shows "과제 완료 취소 -10점"
4. **Expected**: Points decrease by 10
5. **Expected**: Task count updates

### Test Case 3.5: No Duplicate Points
1. Complete a task (get +10 points)
2. Note the point total
3. Uncheck and re-check the same task multiple times
4. **Expected**: Points correctly add/subtract, never duplicate
5. **Expected**: Final points = initial + 10 (if ending checked) or initial (if ending unchecked)

## Issue 4: Gallery Tags

### Test Case 4.1: Upload with Tags
1. Go to Gallery (🖼 tab)
2. Click "➕ 작품 추가"
3. Select an image file
4. **Expected**: Modal shows with image preview
5. Enter title: "Test Artwork"
6. Enter description: "Testing tags"
7. Type "기초" in tag input and press Enter (or click 추가)
8. **Expected**: "기초" tag appears as a blue pill with × button
9. Click suggestion tag "👤 인체 드로잉"
10. **Expected**: "인체 드로잉" tag added
11. Click 💾 저장
12. **Expected**: Artwork saved with both tags

### Test Case 4.2: Remove Tag Before Saving
1. Start uploading an artwork
2. Add tags "색채" and "구도"
3. Click × on "색채" tag
4. **Expected**: "색채" tag removed from pills
5. Save the artwork
6. **Expected**: Only "구도" tag saved

### Test Case 4.3: View Artwork with Tags
1. Click on an uploaded artwork from grid or list
2. **Expected**: Modal shows image, title, description
3. **Expected**: Tags displayed as blue pills below the title/date
4. **Expected**: No category badge visible (replaced by tags)

### Test Case 4.4: Tag Filtering in List View
1. Switch to List view (📋 tab)
2. **Expected**: Tag filter buttons appear at top (전체 + all unique tags)
3. Click on a tag (e.g., "기초")
4. **Expected**: Tag button highlighted in blue
5. **Expected**: Only artworks with "기초" tag shown
6. Click another tag
7. **Expected**: Shows artworks with EITHER tag (OR filtering)
8. Click "전체"
9. **Expected**: All tags cleared, all artworks shown

### Test Case 4.5: Tag Filtering in Grid View
1. Switch to Grid view (🔲 tab)
2. Filter by a tag using the search/filter
3. **Expected**: Only artworks with that tag shown in grid
4. **Expected**: Tags visible in the artwork overlay

### Test Case 4.6: Search with Tags
1. In List view, enter a tag name in search box (e.g., "인체")
2. **Expected**: Artworks with "인체" in title, description, OR tags shown
3. Clear search
4. Enter artwork title in search
5. **Expected**: Works by title/description match

### Test Case 4.7: No Tags Case
1. Upload artwork without adding any tags
2. Save
3. View in list/grid
4. **Expected**: No tag pills shown, artwork still displays correctly
5. **Expected**: Tag filter shows "전체" option

## General Testing

### Browser Compatibility
- Test in Chrome/Edge
- Test in Firefox
- Test in Safari (if available)
- Test on mobile browser

### Performance
- Upload 10+ artworks with various tags
- **Expected**: Gallery still loads quickly
- **Expected**: Tag filtering is instant
- **Expected**: No lag when switching views

### Data Persistence
1. Complete all above tests
2. Refresh browser (F5)
3. **Expected**: All data (points, tasks, artworks, tags, settings) persists
4. Close and reopen browser
5. **Expected**: All data still present

## Reporting Issues

If any test fails:
1. Note the test case number
2. Describe expected vs actual behavior
3. Include browser console errors (F12 → Console)
4. Include screenshots if relevant
5. Note browser type and version

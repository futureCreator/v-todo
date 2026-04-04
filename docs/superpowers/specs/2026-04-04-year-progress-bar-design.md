# Year Progress Bar Design Spec

## Overview
현재 연도가 얼마나 진행되었는지를 얇은 프로그레스 바 + 퍼센트로 표시하는 공통 컴포넌트.
모든 섹션/탭에서 동일하게 보인다.

## Display Format
```
2026  ████████░░░░░░░░░░░░░░░░░░░░  25.5%
```
- 왼쪽: 연도 (라벨, `--sys-label-secondary`, 13px)
- 가운데: 프로그레스 바 (높이 4px, 둥근 끝, 배경 `--sys-fill-secondary`, 채움 `--sys-blue`)
- 오른쪽: 퍼센트 (소수점 1자리, `--sys-label-secondary`, 13px)

## Placement
- **Desktop**: 사이드바 최상단, 네비게이션 버튼 위
- **Mobile**: 헤더 타이틀 아래, 탭 위

## Calculation Logic
- 올해 첫날: YYYY-01-01 00:00:00 KST
- 총 일수: 윤년 366 / 평년 365
- 경과 일수: `dayOfYear` (1월 1일 = 1일째)
- 퍼센트: `(경과 일수 / 총 일수) × 100`, 소수점 1자리 반올림
- 날짜 계산: `getFullYear()/getMonth()/getDate()` (로컬 KST 기준, UTC 사용 금지)
- 업데이트: 페이지 로드 시 1회 계산

## Component
- 파일: `components/YearProgress.tsx`
- Props 없음, 내부 자체 계산
- 레이아웃 반응형: 사이드바 너비 / 모바일 풀 너비

## Visual Style
- 바 높이: 4px
- 바 모서리: 둥근 끝 (rounded-full)
- 바 배경: `--sys-fill-secondary`
- 바 채움: `--sys-blue`
- 폰트: Pretendard 13px
- 색상: `--sys-label-secondary`

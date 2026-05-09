@AGENTS.md

## 배포 (빌드 & PM2 재시작)

반드시 아래 순서를 지킬 것. `.next`를 삭제하면 pm2가 크래시 루프에 빠진다.

```bash
pm2 stop v-todo
rm -rf .next
npx next build
pm2 start v-todo
pm2 save
```

- 절대로 pm2가 실행 중인 상태에서 `rm -rf .next`를 하지 말 것
- `pm2 restart`는 빌드 완료 후에만 사용할 것
- 빌드 후 `BUILD_ID`와 `prerender-manifest.json` 존재 여부를 확인할 것

## 코드 규칙

- React hooks (`useState`, `useRef`, `useCallback` 등)는 반드시 컴포넌트 최상위에 선언할 것. `Home` 내부의 `Content`, `Sidebar` 같은 내부 함수 근처가 아닌, state 선언부와 함께 둘 것.
- 날짜를 구할 때 `new Date().toISOString()`은 UTC 기준이므로 KST 환경에서는 `getFullYear()/getMonth()/getDate()`를 사용할 것
- 폰트 사이즈는 Apple HIG Dynamic Type 기준보다 한 단계 크게 설정 (Body 20px, Subheadline 17px, Footnote 15px)

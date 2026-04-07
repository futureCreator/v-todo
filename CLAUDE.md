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

## 텔레그램 링크 봇 설정

링크 아카이브 기능은 텔레그램 봇으로 받은 메시지를 자동 저장한다.

1. 텔레그램에서 `@BotFather`에게 `/newbot` 으로 봇 생성 → 토큰 받기
2. 본인 chat_id 확인: `@userinfobot` 에 아무 메시지나 보내고 응답에서 ID 확인
   - 또는 임시로 `LINK_POLLER_DEBUG=true`로 두고 봇에 메시지 보낸 뒤 서버 로그(`pm2 logs v-todo`)에서 확인
3. `.env.local`에 추가:

   ```
   TELEGRAM_BOT_TOKEN=...
   TELEGRAM_ALLOWED_CHAT_ID=...
   LINK_POLLER_ENABLED=true
   LINK_POLLER_TIMEOUT_SEC=30
   ```

4. 위 "배포" 절차대로 빌드 + 재시작
5. 봇에 URL이 있는 메시지 보내기 → "✅ 저장됨" 응답을 받으면 성공. v-todo "링크" 탭에서 확인.

폴링은 long polling 방식이라 공개 URL이나 webhook이 필요 없다. 다른 사람이 봇을 알아내도 `TELEGRAM_ALLOWED_CHAT_ID`로 잠겨 있어 무시된다.

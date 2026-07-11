# Multi-AI Chat — Chrome Side Panel

[English](./README.md) · [繁體中文](./README.zh-TW.md) · [日本語](./README.ja.md) · [Deutsch](./README.de.md) · **한국어**

로그인된 **ChatGPT, Claude, Gemini, Grok** 탭을 하나의 가벼운 Chrome Side Panel에서 다중 AI workflow로 제어합니다. 모델 API 키나 별도의 대화 서버가 필요하지 않습니다.

**현재 소스: v0.2.0** · Chrome 114+ · Manifest V3 · MIT

> 제3자 웹 UI를 자동화하므로 provider 화면 변경으로 selector가 일시적으로 깨질 수 있습니다. 각 서비스 약관을 확인하고 사용 권한이 있는 계정과 콘텐츠만 이용하세요.

## Desktop 또는 Browser

| 버전 | 선택 기준 |
|---|---|
| **Browser extension (이 repo)** | 평소 사용하는 Chrome 탭을 작은 Side Panel에서 제어 |
| [Desktop app](https://github.com/teddashh/multi-ai-chat-desktop) | 독립 profile, live WebView, replay, snapshot, 로컬 파일이 필요 |

## v0.2.0

- selector 재시도, rich editor 검증, composer 내부 send button, Enter fallback으로 안정적인 전송.
- service worker 재시작 후 탭 재검색과 기존 탭 content script 자동 재주입.
- request ID로 늦은 응답을 격리하고 Stop으로 waiter와 provider 생성을 실제 중단.
- 이미지 전용 ChatGPT 응답 및 Gemini Trusted Types 문제 수정.
- composer가 로그인 상태를 확인한 경우에만 ‘준비됨’ 표시.
- 최대 30개 로컬 대화, 새 대화, workflow 완료 후 이어서 질문.
- 안전한 Markdown, 5개 언어 UI, 간결한 새 Side Panel.

## 모드

| 모드 | 흐름 |
|---|---|
| 자유 전송 | 선택되고 준비된 AI에 병렬 전송 |
| 사자 토론 | 찬성 → 반대 → 판정 → 종합 |
| 다자 자문 | 독립 답변 2개 → 검토 → 최종 답변 |
| Coding | 명세, 검토, 구현, 테스트, 수정, 인수의 8단계 |
| 원탁 토론 | 5라운드 × 4 AI = 20번 발언 |

## 소스에서 설치

Chrome 114+, Node.js 20+, npm이 필요합니다.

```sh
git clone https://github.com/teddashh/multi-ai-chat.git
cd multi-ai-chat
npm ci
npm run verify
```

1. `chrome://extensions`에서 **개발자 모드**를 켭니다.
2. **압축해제된 확장 프로그램을 로드합니다**에서 `dist/`를 선택합니다.
3. Multi-AI Chat을 고정하고 icon으로 Side Panel을 엽니다.
4. 각 provider를 한 번 열고 로그인합니다. 연결 카드가 ‘준비됨’이면 사용할 수 있습니다.

개발 중에는 `npm run dev`를 실행하고 확장 프로그램을 다시 로드한 뒤 Side Panel을 다시 여세요.

## 사용법

1. workflow 모드를 선택합니다.
2. 자유 모드는 기본적으로 네 provider가 모두 선택됩니다.
3. **AI 연결**에서 누락된 provider를 열거나 로그인합니다.
4. 질문을 입력하고 Enter 또는 **전송**을 누릅니다.
5. 진행 상태를 확인하고 언제든 **중지**할 수 있습니다.
6. 완료 후 계속 질문하거나 메뉴에서 **새 대화**를 선택합니다.

직렬 workflow가 실행되는 동안 Side Panel을 열어 두세요.

## 권한과 개인정보

`sidePanel`은 UI, `tabs`는 provider 탭 검색, `scripting`과 host 권한은 기존 탭 재주입, `storage`는 설정·30개 대화·선택적 HackMD Token에 사용됩니다. HackMD 게시는 명시적으로 실행할 때만 동작하며 게시된 노트는 guest-readable입니다.

`chrome.storage.local`은 trusted extension context로 제한되어 provider content script가 HackMD Token을 읽을 수 없습니다. Prompt는 provider 페이지로 직접 전송되며 Multi-AI Chat 서버, telemetry, 모델 API credential은 없습니다.

```sh
npm run typecheck
npm run build
npm run verify
npm audit
```

Sponsored by [AI-Sister.com](https://ai-sister.com). 제작자 Ted Huang ([TED@TED-H.com](mailto:TED@TED-H.com), [ted-h.com](https://ted-h.com)). MIT License.

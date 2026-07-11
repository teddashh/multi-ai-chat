# Multi-AI Chat — Chrome Side Panel

[English](./README.md) · [繁體中文](./README.zh-TW.md) · **日本語** · [Deutsch](./README.de.md) · [한국어](./README.ko.md)

ログイン済みの **ChatGPT、Claude、Gemini、Grok** タブを、1つの軽量な Chrome Side Panel から複数AI workflow として操作します。モデルAPIキーも独自の会話backendも必要ありません。

**現在のソース：v0.2.0** · Chrome 114+ · Manifest V3 · MIT

> 第三者のWeb UIを自動操作するため、providerの変更でselectorが一時的に壊れることがあります。各サービスの利用規約と、利用権限のあるアカウント・コンテンツを使用してください。

## Desktop と Browser

| エディション | 選ぶ基準 |
|---|---|
| **Browser extension（このrepo）** | 普段使っているChromeタブを小さなSide Panelから操作したい |
| [Desktop app](https://github.com/teddashh/multi-ai-chat-desktop) | 独立profile、ライブWebView、replay、snapshot、ローカルファイルが必要 |

## v0.2.0

- Selector再試行、rich editor検証、composer内のsend button、Enter fallbackによる安定送信。
- Service worker再起動後のタブ再検出と、既存タブへのcontent script再注入。
- request IDで遅延回答を分離し、Stopでwaiterとprovider生成を実際に停止。
- 画像のみのChatGPT回答と、Gemini Trusted Types問題を修正。
- composer確認後だけ「準備完了」と表示。
- 最大30件のローカル会話、新しい会話、workflow後の継続質問。
- 安全なMarkdown表示、5言語UI、新しいコンパクトSide Panel。

## モード

| モード | 流れ |
|---|---|
| 自由送信 | 選択済みで準備完了のAIへ並列送信 |
| 四者討論 | 賛成 → 反対 → 判定 → 統合 |
| 多角相談 | 独立回答2件 → Review → 最終回答 |
| Coding | 仕様、Review、実装、Test、修正、受入の8ステップ |
| 円卓討論 | 5ラウンド × 4 AI = 20発言 |

## ソースからインストール

Chrome 114+、Node.js 20+、npm が必要です。

```sh
git clone https://github.com/teddashh/multi-ai-chat.git
cd multi-ai-chat
npm ci
npm run verify
```

1. `chrome://extensions` を開き、**デベロッパーモード**を有効化。
2. **パッケージ化されていない拡張機能を読み込む**で `dist/` を選択。
3. Multi-AI Chat を固定し、iconからSide Panelを開く。
4. 各providerを一度開いてログイン。「準備完了」になれば利用できます。

開発時は `npm run dev` を実行し、拡張機能を再読み込みしてSide Panelを開き直します。

## 使い方

1. workflowモードを選択。
2. 自由モードでは初期状態で4つすべてが選択されます。
3. **AI 接続**で不足するproviderを開く／ログイン。
4. 質問を入力して Enter または **送信**。
5. 状態を確認し、必要ならいつでも **停止**。
6. 完了後も質問を続けるか、メニューから **新しい会話**。

直列workflowの実行中はSide Panelを開いたままにしてください。

## 権限とプライバシー

`sidePanel` はUI、`tabs` はproviderタブ検出、`scripting` とhost権限は既存タブへの再注入、`storage` は設定・30会話・任意のHackMD Tokenに使用します。HackMD公開は明示操作時だけで、ノートはguest-readableです。

`chrome.storage.local` はtrusted extension contextに制限され、provider content scriptはHackMD Tokenを読めません。Promptはproviderページへ直接送信され、Multi-AI Chat server、telemetry、モデルAPI資格情報はありません。

```sh
npm run typecheck
npm run build
npm run verify
npm audit
```

Sponsored by [AI-Sister.com](https://ai-sister.com)。作者 Ted Huang（[TED@TED-H.com](mailto:TED@TED-H.com)、[ted-h.com](https://ted-h.com)）。MIT License。

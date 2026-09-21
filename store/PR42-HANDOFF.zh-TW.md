# PR #42 收斂交接（2026-09-20）

本輪程式已收斂並推送至 `feat/meta-ai-provider`，停在 **`e801019`**。
[PR #42](https://github.com/teddashh/multi-ai-chat/pull/42) 維持 **DRAFT**；本交接文件是其後的文件提交，沒有再改程式。
`READY_FOR_VM_REQC=yes` 表示可以交給 Conductor 重測，尚不代表完整 VM e2e 通過。

## 相較最初交接，又完成了什麼

以接手時可核對的 **`be9c6fc`** 為比較基準：當時已有 Meta 初版、四個 active 席位與 standby 切換、113 項測試。
這些原有成果不算本輪新增；後續至 `e801019` 共 **16 個提交**，完成：

| 範圍 | 接手後完成的成果 |
| --- | --- |
| Meta Ready | 支援實際 hydrated textarea／Lexical composer；可用的已登入或 guest 輸入框可判 Ready，真正登入牆才判 Sign in，避免舊 selector 失效造成誤判。 |
| Meta 輸入與串流 | 改用適合 Lexical 的貼上路徑，修正文字未落入／重複注入；Stop 可見期間持續擷取回覆並等待完成，保留取消隔離，沒有放寬文字比對。 |
| 未就緒提示與捷徑 | Debate／Consult 點名卡住的 AI，Free 點名實際接收與略過者；新增「開啟未就緒 AI」及 Free「只選已就緒 AI」，均排除 standby，文案涵蓋五語。 |
| 保存、版面與輸入 | 修正立即關閉後模式未保存；短視窗、多行草稿與錯誤提示下保持 Send／Stop 可見；IME 選字 Enter 不再誤送。 |
| 鍵盤與無障礙 | 模式／目標群組名稱與選取狀態、鍵盤焦點自動露出、輸入框固定五語輔助標籤；Settings 開啟焦點、Tab 循環、Escape 與關閉後焦點返回。 |
| Settings 收斂 | 修正舊 Save 計時器關掉新視窗、延遲讀取覆蓋草稿、跨次開啟的非同步結果干擾；阻擋重複寫入，讀取失敗可 Retry，寫入失敗保留草稿並顯示五語錯誤。 |
| 可重現驗證 | 補 worker／單元回歸、Meta VM 清單與 Step3 觀測工具，以及 production dist 的五語 DOM 檢查腳本；相關 dist 已重建提交。 |

## 停點與已取得的證據

- 程式 checkpoint：`e801019e81aa12583d0405321d17e4573401687d`。
- `npm run verify`：**157 項測試**（接手後增加 44）、TypeScript、production build、版本一致性全過；此 SHA 的 GitHub Verify／CodeQL 全綠。
- Chromium production-dist DOM 檢查：五語合計 **75 組**、0 page errors。使用模擬 Chrome runtime／storage，不能當成實際安裝 extension 或登入網站的 e2e。
- Conductor 已回報較早 Meta 候選版 **VM Steps 2–3 PASS**（Lexical `3976212`、串流候選 `74f0919`）；Castle 未另行重跑該真實 VM，本輪後續 UX／Settings 仍需實機驗收。
- 最後一刀為 Settings 生命週期及儲存錯誤處理。已按使用者要求停止擴充功能。已送出的 Save／Clear 仍可能在關窗後完成，關窗不等於取消儲存。
- 版本仍 **0.2.3**；預設 ChatGPT／Claude／Gemini／Grok，Meta experimental 且預設 standby。尚未 undraft、merge 或發布 Store；分支版本號不表示 Store 已包含 Meta。

## 還沒完成的重點（依優先順序）

1. **目前候選版的真實 extension／VM 整合驗證。** 先拉最新分支並重載 `dist/` 與 Meta 分頁；沿用 Meta-only Ready 環境，串測三項 readiness UX、真正開分頁、側邊欄關閉重開、短視窗 Send／Stop、Settings 儲存後重開。這部分不需其他家新增登入。
2. **多家工作流與失敗恢復（VM-04／05）。** 先前受其他指定 providers 未 Ready 阻擋；仍需驗證四家 Free、Meta 擔任 Debate／Consult 角色，以及 Roundtable 的 Retry／Skip／Cancel。自動化測試通過尚不能取代這段實測。
3. **重啟與既有功能回歸（VM-06／07）。** Chrome 重啟、舊對話／角色／standby 還原、standby 分頁不受影響、切回原四家、匯出及五語。實際 OS 輸入法與螢幕閱讀器也尚未驗收。
4. **合併與發版決策。** 完成上述 QC 並記錄確切 SHA／證據後，再評估是否轉 ready、merge 與 Store 發布；本次交接停在 draft 候選版。

## 下一位從哪裡接

- [完整 VM 安裝與 VM-01～07 清單](META-AI-SMOKE.md)：含結果模板；依實際結果填寫，勿把模板中的 pending 當成已完成。
- [Meta Step3 串流／final／Stop](META-AI-STEP3.md)：固定 prompt 與可選的 metadata 觀測工具。
- [三項 UX、重開及 Settings QC](META-AI-UX-QC.md)：目前 DOM 證據範圍、bundle hash、重跑指令及真實 Side Panel 驗收清單。
- [DOM 檢查腳本](../scripts/check-readiness-ui.cjs)：需 QA 環境自備 Playwright／Chromium，並非新增的必要 CI phase。

本機詳細紀錄與最後的 `verify.log`／`RESULTS.json` 在 gitignored 的 `.claude-memory/session.md`、
`.claude-memory/qa/settings-consolidation/`，不隨 clone 傳遞；可交接的步驟與證據摘要已放在上述 tracked 文件。
Castle 的一般 Chromium 啟動曾受 SIGTRAP／inotify 資源問題影響，後改用隔離瀏覽器完成 DOM 驗證；
這不影響 Conductor 直接載入已提交的 `dist/` 做真實 VM QC。

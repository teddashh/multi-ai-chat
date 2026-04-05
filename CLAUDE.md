# Workspace: Multi-AI Chat
> å¾ž template è¤‡è£½å¾Œï¼ŒæŠŠ Multi-AI Chat æ›æˆå¯¦éš›çš„å°ˆæ¡ˆåç¨±

---

## Boot Sequenceï¼ˆæ¯æ¬¡å•Ÿå‹•ä¾åºåŸ·è¡Œï¼‰

1. è®€ soul æª”ï¼ˆå·²åœ¨å…¨åŸŸ CLAUDE.md è¼‰å…¥ï¼‰
2. è®€ Layer 1ï¼š@.claude-memory/session.md
3. è®€ Layer 2ï¼šåŸ·è¡Œ `python scripts/db_read.py summary` å–å¾—å°ˆæ¡ˆç‹€æ…‹æ‘˜è¦
4. è®€ Layer 3 ç´¢å¼•ï¼šå·²åœ¨å…¨åŸŸè¼‰å…¥ï¼ŒæŒ‰éœ€æŸ¥è©¢
5. ç°¡çŸ­å‘Šè¨´ç”¨æˆ¶ç›®å‰ç‹€æ…‹ï¼šã€Œç¹¼çºŒ [ä¸»é¡Œ]ï¼Œæœ‰ X å€‹ open questionsã€

---

## This Project

- **å°ˆæ¡ˆåç¨±**ï¼šMulti-AI Chat
- **å°ˆæ¡ˆç›®çš„**ï¼š[å¡«å…¥]
- **ä¸»è¦æŠ€è¡“**ï¼š[å¡«å…¥]
- **ç›®å‰ç‹€æ…‹**ï¼š[å¡«å…¥]
- **é‡è¦è·¯å¾‘**ï¼š[å¡«å…¥ä¸»è¦çš„ src ç›®éŒ„ç­‰]

---

## è¨˜æ†¶æ“ä½œ

**å„ªå…ˆä½¿ç”¨ MCP Memory Server toolsï¼ˆå·²å…¨åŸŸè¨»å†Šï¼‰ï¼š**
- `memory_store` â€” æ™ºæ…§å„²å­˜ï¼ˆè‡ªå‹•åˆ†é¡žï¼‰
- `memory_record_decision` â€” è¨˜éŒ„æ±ºç­–
- `memory_record_knowledge` â€” è¨˜éŒ„çŸ¥è­˜
- `memory_list` â€” åˆ—å‡ºè¨˜æ†¶
- `memory_search` â€” è·¨ workspace æœå°‹
- `memory_audit_search` â€” æœå°‹ç¨½æ ¸è»Œè·¡
- `memory_daily_report` â€” æŸ¥çœ‹æ¯æ—¥å ±å‘Š
- `memory_reinforce` â€” æ‰‹å‹•å¼·åŒ–è¨˜æ†¶é‡è¦æ€§
- å®Œæ•´ 19 å€‹ tools è¦‹å…¨åŸŸ CLAUDE.md

**Fallbackï¼ˆMCP ä¸å¯ç”¨æ™‚ï¼‰ï¼š**
```
python ~/Documents/claude-setup/scripts/db_write.py decision "what" "why" "how" "tag1,tag2"
python ~/Documents/claude-setup/scripts/db_write.py resolved "what" "how" "tag1,tag2"
python ~/Documents/claude-setup/scripts/db_write.py knowledge "title" "content" "tag1,tag2"
python ~/Documents/claude-setup/scripts/db_to_md.py Multi-AI Chat
```

---

## Automatic Behaviors

### æ®µè½å®Œæˆæ™‚ï¼ˆè‡ªå‹•åˆ¤æ–·ï¼‰
å®Œæˆä¸€å€‹ä»»å‹™ã€è§£æ±ºä¸€å€‹å•é¡Œã€æˆ–åšå‡ºä¸€å€‹æ±ºå®šæ™‚ï¼š
1. åœ¨ session.md åŠ ä¸€ç­†è¨˜éŒ„ï¼ˆ5W1H æ ¼å¼ï¼‰
2. ç”¨ MCP tool å¯«é€² memory.dbï¼ˆ`memory_record_decision` / `memory_record_resolved` / `memory_record_knowledge`ï¼‰
3. å‘Šè¨´ç”¨æˆ¶ï¼šã€Œå·²è¨˜éŒ„ï¼š[ä¸€å¥è©±æ‘˜è¦]ã€

### ç”¨æˆ¶èªªã€Œè¨˜ä¸‹ä¾†ï¼šXXXã€ï¼ˆéš¨æ™‚å¯ç”¨ï¼‰
ä¸ç®¡åœ¨åšä»€éº¼ï¼Œç«‹åˆ»æŠŠ XXX append åˆ° INBOXï¼š
```
echo - [YYYY-MM-DD HH:MM] XXX >> ~/Documents/knowledge/INBOX.md
```
å›žå ±ï¼šã€Œå·²ä¸Ÿé€² INBOX âœ“ã€ï¼Œç„¶å¾Œç¹¼çºŒåŽŸæœ¬çš„å·¥ä½œï¼Œä¸æ‰“æ–·æµç¨‹ã€‚

### Compact æ™‚ï¼ˆsession.md > 100 è¡Œï¼Œæˆ–ç”¨æˆ¶èªªã€Œcompactã€ï¼‰
1. èƒå– session.md é‡è¦å…§å®¹ï¼Œåˆ†é¡žå¯«é€² memory.db
2. åŸ·è¡Œ db_to_md.py æŠŠæœªåŒæ­¥çš„ knowledge_items å¯«é€² Obsidian
3. å£“ç¸® session.mdï¼Œåªä¿ç•™ä»Šå¤©é‚„åœ¨é€²è¡Œä¸­çš„äº‹
4. **é †ä¾¿æ•´ç† INBOX**ï¼ˆè¦‹ä¸‹æ–¹ INBOX æ•´ç†è¦å‰‡ï¼‰
5. å›žå ±ï¼šã€Œcompact å®Œæˆï¼ŒX ç­†é€² SQLiteï¼ŒY ç­†é€² Obsidianï¼ŒINBOX æ¸…äº† Z æ¢ã€

### æ¯å¤©ç¬¬ä¸€æ¬¡å°è©±æ™‚ï¼ˆè‡ªå‹•ï¼‰
1. è®€ memory.db çš„ open_questions å’Œ status
2. å¦‚æžœä»Šå¤©çš„ Daily Log ä¸å­˜åœ¨ â†’ å»ºç«‹ï¼Œå¯«å…¥ header
3. å¦‚æžœ INBOX æœ‰è¶…éŽ 5 æ¢æœªæ•´ç† â†’ æé†’ç”¨æˆ¶ï¼šã€ŒINBOX æœ‰ N æ¢ï¼Œè¦ç¾åœ¨æ•´ç†å—Žï¼Ÿã€
4. ç°¡å ±ï¼šã€Œä»Šå¤©ç¹¼çºŒ [ä¸»é¡Œ]ï¼Œæœ‰ X å€‹ open questionsã€

### æ”¶å·¥æ™‚ï¼ˆç”¨æˆ¶èªªã€Œæ”¶å·¥ã€ï¼‰
1. **å…ˆæ•´ç† INBOX**ï¼ˆè¦‹ä¸‹æ–¹ INBOX æ•´ç†è¦å‰‡ï¼‰
2. æŠŠä»Šå¤©çš„ Daily Log summary å¯«é€²ï¼š
   `~/Documents/knowledge/logs/Multi-AI Chat/YYYY-MM-DD-{machine}.md`
   ï¼ˆç­†é›»ç”¨ `laptop`ï¼ŒAVD ç”¨ `avd`ã€‚åˆ¤æ–·æ–¹å¼ï¼šhostname å« FUHQ = laptopï¼Œå« AVD = avdï¼‰
3. åŸ·è¡Œ db_to_md.py åšæœ€å¾ŒåŒæ­¥
4. æ›´æ–° memory.db çš„ daily_logs table
5. ä¸€å¥è©±æ‘˜è¦ä»Šå¤©åšäº†ä»€éº¼
6. æé†’ç”¨æˆ¶ï¼šOracle sync ç”± claude-setup workspace çµ±ä¸€ç®¡ç†ï¼Œä¸éœ€è¦åœ¨é€™è£¡è·‘

### ç”¨æˆ¶èªªã€Œæ•´ç† inboxã€ï¼ˆæ‰‹å‹•è§¸ç™¼ï¼‰
ç«‹åˆ»åŸ·è¡Œ INBOX æ•´ç†ï¼Œä¸åšå…¶ä»–äº‹ã€‚

---

## INBOX æ•´ç†è¦å‰‡

INBOX è·¯å¾‘ï¼š`~/Documents/knowledge/INBOX.md`

æ•´ç†æ™‚ï¼Œå°æ¯ä¸€æ¢ä¾åºåˆ¤æ–·ï¼š

| å…§å®¹é¡žåž‹ | åŽ»å“ªè£¡ |
|----------|--------|
| é—œæ–¼é€™å€‹ project çš„æ±ºå®š | â†’ db_write.py decision |
| é—œæ–¼é€™å€‹ project çš„å•é¡Œ | â†’ db_write.py question |
| é€šç”¨çŸ¥è­˜ã€æŠ€è¡“ç­†è¨˜ | â†’ db_write.py knowledgeï¼Œä¹‹å¾ŒåŒæ­¥åˆ° Obsidian |
| é—œæ–¼æˆ‘è‡ªå·±çš„åå¥½ã€ç¿’æ…£ | â†’ append åˆ° `knowledge/me/preferences.md` |
| æƒ³æ³•ã€éˆæ„Ÿï¼Œè·Ÿç›®å‰ project ç„¡é—œ | â†’ append åˆ° `knowledge/notes/ideas.md` |
| å·²éŽæ™‚æˆ–ç„¡æ„ç¾©çš„ | â†’ ç›´æŽ¥ä¸Ÿæ£„ |

æ•´ç†å®Œå¾Œæ¸…ç©º INBOX.mdï¼Œåªä¿ç•™ headerã€‚
å›žå ±ï¼šã€ŒINBOX æ•´ç†å®Œï¼Œå…± N æ¢ï¼šX é€² SQLiteï¼ŒY é€² knowledgeï¼ŒZ ä¸Ÿæ£„ã€

---

## Daily Log æ ¼å¼

å¯«å…¥è·¯å¾‘ï¼š`~/Documents/knowledge/logs/Multi-AI Chat/YYYY-MM-DD-{machine}.md`
ï¼ˆç­†é›» = `laptop`ï¼ŒAVD = `avd`ï¼‰

```markdown
---
date: YYYY-MM-DD
workspace: Multi-AI Chat
tags: []
---

# Daily Log â€” Multi-AI Chat â€” YYYY-MM-DD

## HH:MM | [ä¸»é¡Œ]

- **What**: 
- **Why**: 
- **How**: 
- **Who**: 
- **Where**: 
- **When**: 
- **Tags**: #tag1 #tag2

---
```

---

## Knowledge Base æŸ¥è©¢è¦å‰‡

éœ€è¦æŸ¥è©¢èƒŒæ™¯çŸ¥è­˜æ™‚ï¼š
1. å…ˆçœ‹å…¨åŸŸè¼‰å…¥çš„ INDEX.md
2. åªè®€éœ€è¦çš„é‚£å€‹æª”æ¡ˆ
3. ä¸è¦è®€å…¶ä»– workspace çš„ logs
4. ä¸è¦ä¸€æ¬¡è¼‰å…¥å¤šå€‹ä¸ç›¸é—œçš„æª”æ¡ˆ


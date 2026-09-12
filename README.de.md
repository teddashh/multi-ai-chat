# Multi-AI Chat — Chrome Side Panel

[English](./README.md) · [繁體中文](./README.zh-TW.md) · [日本語](./README.ja.md) · **Deutsch** · [한국어](./README.ko.md)

[Offizielle Website](https://teddashh.github.io/multi-ai-chat/?lang=de) · [v0.2.2 herunterladen](https://github.com/teddashh/multi-ai-chat/releases/tag/v0.2.2) · [Desktop-Version](https://teddashh.github.io/multi-ai-chat-desktop/?lang=de)

Einmal fragen, vier KIs gemeinsam einsetzen. Multi-AI Chat ist ein leichtes Chrome Side Panel, das deine angemeldeten **ChatGPT-, Claude-, Gemini- und Grok-Tabs** koordiniert. Es verwendet die Provider-Seiten, auf die du bereits Zugriff hast – ohne Modell-API-Schlüssel und ohne separaten Chat-Server.

**Aktuelle Version: v0.2.2** · Chrome 114+ · Manifest V3 · Fünf Oberflächensprachen · MIT

> Multi-AI Chat automatisiert Weboberflächen Dritter. Eine Änderung beim Provider kann Seiten-Selektoren vorübergehend unbrauchbar machen. Automatisierte Nutzung kann außerdem den jeweiligen Nutzungsbedingungen unterliegen. Verwende nur Konten und Inhalte, zu deren Nutzung du berechtigt bist.

![Multi-AI Chat führt in Chrome einen Workflow mit mehreren Providern aus](./store/screenshot-1280x800.png)

## Änderungen in v0.2.2

- **Stabile Provider-Tabs und SPA-Status.** Jeder Provider behält genau einen zuständigen Tab; doppelte Tabs, reine SPA-Routenwechsel und verspätete Statusprüfungen übernehmen die Verbindung nicht mehr und lassen den Status nicht mehr flackern.
- **Robusterer ChatGPT-Composer.** Nach Remounts wird der Composer neu ermittelt, die Anmeldung stabiler erkannt, das Fokussieren verschiebt die Seite nicht mehr, und aktuelle Selektoren für Composer, Senden und Stoppen werden unterstützt.
- **Wiederherstellung eingefrorener oder verworfener Tabs.** Von Chrome eingefrorene oder verworfene Provider-Tabs werden erkannt, reaktiviert und neu verbunden, bevor der Workflow fortgesetzt wird.

## Die passende Version wählen

| Version | Geeignet für |
|---|---|
| **Browser-Erweiterung (dieses Repository)** | Ein kleines Chrome Side Panel für die Provider-Tabs, die du ohnehin verwendest |
| [Multi-AI Chat Desktop](https://teddashh.github.io/multi-ai-chat-desktop/?lang=de) | Getrennte Provider-Profile, fokussierte Live-WebViews, Snapshots, Replay, Checkpoints und Workflows mit lokalen Dateien |

Beide Versionen verwenden die Web-Sitzungen der Provider und benötigen keine Modell-API-Schlüssel.

## Highlights

- Eine Frage an ChatGPT, Claude, Gemini und Grok; der Bereitschaftsstatus jedes Providers ist vor dem Start sichtbar.
- Request-IDs isolieren verspätete Antworten. Stop bricht aktive Wartevorgänge ab und fordert die Provider-Seiten auf, die Generierung zu beenden.
- Bis zu 30 Gespräche werden lokal gespeichert, mit sicherer Markdown-Darstellung, Anschlussfragen und „Neuer Chat“.
- Oberfläche auf Englisch, traditionellem Chinesisch, Japanisch, Deutsch und Koreanisch.
- Helle, dunkle oder systemabhängige Darstellung mit WCAG-geprüftem Kontrast.
- Optionale Veröffentlichung auf HackMD mit dem eigenen Token – nur nach ausdrücklicher Auswahl.

## Modi und Wiederherstellung

| Modus | Ablauf |
|---|---|
| **Frei** | Parallel an alle ausgewählten und bereiten Provider senden |
| **Debatte** | Pro → Contra → Urteil → Synthese |
| **Beratung** | Zwei unabhängige Antworten → Prüfung → Endergebnis |
| **Coding** | Acht Schritte für Spezifikation, Review, Umsetzung, Tests, Überarbeitung und Abnahme |
| **Rundtisch** | Fünf Runden × vier KIs = zwanzig Beiträge |

Fällt ein Provider während des Rundtischs aus, pausiert der Workflow und bietet **Erneut versuchen**, **Beitrag überspringen** oder **Abbrechen** an. Ein Retry erhält eine neue Request-ID. Beim Überspringen wird nur im verbleibenden Rundtisch-Kontext ein sicherer Platzhalter eingesetzt. So gelangen weder Provider-Fehlertexte noch veraltete Antworten ins Transkript oder in spätere Beiträge.

## Installation

### Release-ZIP (empfohlen)

Das Paket aus GitHub Releases kann direkt als entpackte Erweiterung geladen werden; ein Build aus dem Quellcode ist nicht erforderlich.

> v0.2.2 ist die aktuelle Veröffentlichung. Die folgende ZIP-Datei und Prüfsumme sind die offiziellen Dateien aus dem GitHub Release.

1. Lade [`multi-ai-chat-store-v0.2.2.zip`](https://github.com/teddashh/multi-ai-chat/releases/download/v0.2.2/multi-ai-chat-store-v0.2.2.zip) und die zugehörige [Prüfsummendatei](https://github.com/teddashh/multi-ai-chat/releases/download/v0.2.2/multi-ai-chat-store-v0.2.2.zip.sha256) herunter.
2. Prüfe das Archiv. Die erwartete SHA-256-Prüfsumme lautet `425bd80abc4618908ef184e75d7ee57e384364e7ed784924deb624a700361919`.

   ```powershell
   (Get-FileHash .\multi-ai-chat-store-v0.2.2.zip -Algorithm SHA256).Hash.ToLower()
   ```

   ```sh
   shasum -a 256 multi-ai-chat-store-v0.2.2.zip
   ```

3. Entpacke die ZIP-Datei in einen dauerhaften Ordner. Direkt darin befindet sich `manifest.json`.
4. Öffne `chrome://extensions`, aktiviere den **Entwicklermodus**, wähle **Entpackte Erweiterung laden** und gib den entpackten Ordner an.
5. Hefte **Multi-AI Chat** an und öffne über das Symbol das Side Panel. Öffne anschließend jeden Provider einmal und melde dich an. Sobald der Composer erkannt wurde, zeigt der Provider „**Bereit**“ an.

Für ein Update entpackst du das neue Release in einen eigenen dauerhaften Ordner und stellst die geladene Erweiterung auf diesen Ordner um. Entferne den alten Ordner erst, wenn die neue Version funktioniert.

### Aus dem Quellcode bauen

Voraussetzungen: Chrome 114+, Node.js 22.18+, npm und Git.

```sh
git clone https://github.com/teddashh/multi-ai-chat.git
cd multi-ai-chat
npm ci
npm run verify
```

Lade anschließend den erzeugten Ordner `dist/` über `chrome://extensions`. Während der Entwicklung startest du `npm run dev`, lädst die Erweiterung dort neu und öffnest das Side Panel erneut.

## Verwendung

1. Wähle eine Workflow-Karte.
2. Im freien Modus bleiben alle vier Provider ausgewählt; nicht benötigte Provider kannst du abwählen.
3. Klappe **KI-Verbindungen** auf und öffne fehlende Provider oder melde dich an.
4. Gib eine Frage ein und drücke Enter oder **Senden**.
5. Verfolge den Workflow-Status; mit **Stopp** kannst du jederzeit abbrechen.
6. Stelle nach Abschluss weitere Fragen oder starte über das Menü einen **Neuen Chat**.

Lass das Side Panel geöffnet, solange ein serieller Workflow läuft.

## Bekannte Einschränkung

- **Microsoft Edge + Claude:** Edge kann die Ausführung der Erweiterung auf `claude.ai` blockieren. Die Claude-Karte bleibt dann bei „Öffnen“, das Symbol zeigt „Diese Erweiterung ist auf dieser Website nicht zulässig“, und der Websitezugriff lässt sich nicht freigeben. ChatGPT, Gemini und Grok sind nicht betroffen. Derselbe Build funktioniert in Google Chrome; Chrome ist daher die aktuelle Problemumgehung für Claude.

## Berechtigungen und Datenschutz

| Zugriff | Warum er benötigt wird |
|---|---|
| `sidePanel` | Zeigt die gesamte Bedienoberfläche an |
| `tabs` | Findet und fokussiert Provider-Tabs und verfolgt Laden, Navigation, Neuladen und Schließen; Inhalte anderer Tabs werden nicht gelesen |
| `scripting` | Injiziert ausschließlich die mitgelieferten Content Scripts erneut, wenn ein Provider-Tab schon vor dem Neuladen der Erweiterung geöffnet war oder sein Script entfernt wurde; Remote-Code wird nie ausgeführt |
| `storage` | Speichert Oberflächeneinstellungen, bis zu 30 lokale Gespräche und einen optionalen HackMD-Token auf deinem Gerät |
| Provider-Hosts | Gibt auf `chatgpt.com`, `chat.openai.com`, `claude.ai`, `gemini.google.com` und `grok.com` Prompts ein, sendet sie und liest die sichtbaren Antworten für den gewählten Workflow |
| `api.hackmd.io` | Wird nur kontaktiert, nachdem du ausdrücklich **Veröffentlichen** gewählt hast, um mit deinem Token eine für Gäste lesbare Notiz anzulegen |

Prompts gehen direkt an die von dir ausgewählten Provider-Seiten. Es gibt **keinen Multi-AI-Chat-Server, keine Analyse, kein Tracking, keine Werbung, keine Telemetrie und keine Modell-API-Zugangsdaten**. Der optionale HackMD-Token ist auf vertrauenswürdige Erweiterungskontexte beschränkt und kann von Provider-Content-Scripts nicht gelesen werden. Lokale Daten bleiben in Chrome, bis du sie löschst oder die Erweiterung entfernst; beim Entfernen wird ihr lokaler Speicher gelöscht. Für Inhalte, die du selbst versendest, gelten weiterhin die Datenschutzrichtlinien der Provider und von HackMD.

Lies die vollständige [Datenschutzrichtlinie](./store/PRIVACY.md).

## Entwicklung

```sh
npm run typecheck
npm run test
npm run build
npm run verify
npm audit
```

Wichtige Module:

- `src/background/service-worker.ts` — Workflow-Steuerung, Request-Isolation, Abbruch und Tab-Wiederherstellung
- `src/content/base.ts` — geprüfte Eingabe-, Sende- und Antwortlogik
- `src/content/*.ts` — Provider-spezifische Selektoren und Editor-Strategien
- `src/sidepanel/` — React-Oberfläche, lokale Sitzungen, Markdown, Themes und Lokalisierung

Führe vor einem Pull Request `npm run verify` aus. Wenn eine Provider-Seite nicht mehr funktioniert, erstelle ein [Issue](https://github.com/teddashh/multi-ai-chat/issues) mit Provider und Browser-Version. Entferne zuvor Prompts, Antworten, Kontodaten und Tokens aus Screenshots oder Logs.

## Projekt und Danksagung

- [Offizielle Website](https://teddashh.github.io/multi-ai-chat/?lang=de)
- [GitHub Releases](https://github.com/teddashh/multi-ai-chat/releases)
- [Quellcode und Issue-Tracker](https://github.com/teddashh/multi-ai-chat)
- [Multi-AI Chat Desktop](https://teddashh.github.io/multi-ai-chat-desktop/?lang=de)
- [MIT-Lizenz](./LICENSE)

Gesponsert von [AI-Sister.com](https://ai-sister.com). Erstellt von Ted Huang ([TED@TED-H.com](mailto:TED@TED-H.com), [ted-h.com](https://ted-h.com)).

Besonderer Dank gilt [@DaveTseng2019](https://github.com/DaveTseng2019) für umfangreiche Beiträge zu v0.2.x: Zuverlässigkeit beim Senden und Empfangen, Verbindungswiederherstellung, lokalisierte Fehlerbehandlung, Dark Mode, Side-Panel-UX, das transparente Symbol und die Projektlizenz.

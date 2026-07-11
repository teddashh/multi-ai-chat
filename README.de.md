# Multi-AI Chat — Chrome Side Panel

[English](./README.md) · [繁體中文](./README.zh-TW.md) · [日本語](./README.ja.md) · **Deutsch** · [한국어](./README.ko.md)

Steuere deine angemeldeten **ChatGPT-, Claude-, Gemini- und Grok-Tabs** als gemeinsamen Multi-AI-Workflow in einem leichten Chrome Side Panel. Keine Modell-API-Schlüssel und kein separater Gesprächsserver.

**Aktueller Quellstand: v0.2.0** · Chrome 114+ · Manifest V3 · MIT

> Die Erweiterung automatisiert Weboberflächen Dritter. Änderungen eines Providers können Selektoren vorübergehend beschädigen. Beachte die jeweiligen Bedingungen und verwende nur berechtigte Konten und Inhalte.

## Desktop oder Browser

| Edition | Geeignet wenn… |
|---|---|
| **Browser-Erweiterung (dieses Repo)** | vorhandene Chrome-Tabs in einem kleinen Side Panel gesteuert werden sollen |
| [Desktop-App](https://github.com/teddashh/multi-ai-chat-desktop) | getrennte Profile, Live-WebViews, Replay, Snapshots und lokale Dateien benötigt werden |

## v0.2.0

- Zuverlässiges Senden mit Selector-Retry, Editor-Prüfung, composer-lokalem Button und Enter-Fallback.
- Tabs werden nach Service-Worker-Neustart wiedergefunden; Content Scripts werden bei Bedarf erneut injiziert.
- Request-IDs trennen verspätete Antworten; Stop beendet Waiter und laufende Generierung.
- Reine ChatGPT-Bildantworten und Geminis Trusted-Types-Problem sind behoben.
- „Bereit“ erscheint erst nach Bestätigung des Composers.
- Bis zu 30 lokale Gespräche, Neuer Chat und Folgefragen nach Workflows.
- Sicheres Markdown, fünf UI-Sprachen und ein kompaktes neues Side Panel.

## Modi

| Modus | Ablauf |
|---|---|
| Frei | Parallel an ausgewählte, bereite KIs senden |
| Debatte | Pro → Contra → Urteil → Synthese |
| Beratung | Zwei unabhängige Antworten → Prüfung → Ergebnis |
| Coding | Acht Schritte für Spezifikation, Reviews, Umsetzung, Tests und Abnahme |
| Rundtisch | 5 Runden × 4 KIs = 20 Beiträge |

## Aus dem Quellcode installieren

Voraussetzungen: Chrome 114+, Node.js 20+ und npm.

```sh
git clone https://github.com/teddashh/multi-ai-chat.git
cd multi-ai-chat
npm ci
npm run verify
```

1. `chrome://extensions` öffnen und **Entwicklermodus** aktivieren.
2. **Entpackte Erweiterung laden** wählen und `dist/` angeben.
3. Multi-AI Chat anheften und über das Icon das Side Panel öffnen.
4. Jeden Provider einmal öffnen und anmelden. Die Karte wechselt dann zu „Bereit“.

Für Entwicklung `npm run dev` ausführen, die Erweiterung neu laden und das Side Panel erneut öffnen.

## Verwendung

1. Workflow-Modus wählen.
2. Im freien Modus sind standardmäßig alle vier Provider gewählt.
3. Unter **KI-Verbindungen** fehlende Provider öffnen/anmelden.
4. Frage eingeben und Enter oder **Senden** drücken.
5. Status verfolgen und bei Bedarf jederzeit **Stopp** wählen.
6. Danach weiterfragen oder über das Menü **Neuer Chat** starten.

Das Side Panel während eines seriellen Workflows geöffnet lassen.

## Berechtigungen und Datenschutz

`sidePanel` zeigt die UI, `tabs` findet Provider-Tabs, `scripting` plus Hostrechte repariert vorhandene Tabs, und `storage` speichert Einstellungen, 30 Gespräche sowie den optionalen HackMD-Token. HackMD wird nur nach ausdrücklichem Veröffentlichen verwendet; die Notiz ist für Gäste lesbar.

`chrome.storage.local` ist auf vertrauenswürdige Erweiterungskontexte beschränkt, sodass Provider-Content-Scripts den HackMD-Token nicht lesen können. Prompts gehen direkt zu den Provider-Seiten; es gibt keinen Multi-AI-Chat-Server, keine Telemetrie und keine Modell-API-Zugangsdaten.

```sh
npm run typecheck
npm run build
npm run verify
npm audit
```

Sponsored by [AI-Sister.com](https://ai-sister.com). Erstellt von Ted Huang ([TED@TED-H.com](mailto:TED@TED-H.com), [ted-h.com](https://ted-h.com)). MIT License.

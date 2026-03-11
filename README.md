# Threat Intel Dashboard

A cybersecurity threat intelligence dashboard that aggregates RSS feeds from 18 security sources into a searchable, categorized interface. Includes a mobile-friendly dashboard and a TV/NOC display optimized for large screens.

## Features

**Mobile Dashboard** (`/`)
- Category filtering: Threats, CVEs, Ransomware, Hacks, Research, Industry
- Full-text search across titles, snippets, and sources
- Auto-refresh every 5 minutes
- Responsive layout for phones, tablets, and desktops

**TV Display** (`/tv.html`)
- Designed for 48"+ screens at 1920x1080 or higher
- World map with threat attribution (geo-extracts country mentions and APT group origins from feed text)
- Category doughnut chart, 24-hour activity timeline, top sources bar chart, weekly heatmap
- All 6 categories displayed simultaneously as auto-scrolling columns
- Live clock and 60-second auto-refresh

## Feed Sources

| Category | Sources |
|----------|---------|
| Threats | The Hacker News, BleepingComputer, CISA Alerts, Recorded Future |
| CVEs | NVD, CVE.org, CISA KEV, Exploit Database |
| Ransomware | Sophos News, Malwarebytes, SentinelOne |
| Hacks | Krebs on Security |
| Research | Mandiant, Unit 42, Google Project Zero, Schneier on Security |
| Industry | Dark Reading, SecurityWeek |

Feeds are configured in `feeds.json`. Add or remove sources by editing that file.

## Requirements

- Node.js 18+

## Quick Start

```bash
git clone https://github.com/mdnoga/threat-intel-dashboard.git
cd threat-intel-dashboard
npm install
npm start
```

Open http://localhost:3000 for the mobile dashboard or http://localhost:3000/tv.html for the TV display.

## TV Kiosk Mode

To run full-screen on a TV:

```bash
# Linux
chromium --kiosk http://localhost:3000/tv.html

# macOS
open -a "Google Chrome" --args --kiosk http://localhost:3000/tv.html
```

## Development

```bash
npm run dev
```

Starts the server with `--watch` for auto-restart on file changes.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |

### Feed Configuration

Edit `feeds.json` to add or remove RSS/Atom feeds:

```json
{
  "name": "Source Name",
  "url": "https://example.com/feed.xml",
  "category": "threats"
}
```

Valid categories: `threats`, `cves`, `ransomware`, `hacks`, `research`, `industry`.

### Cache

The server caches all feed results for 5 minutes. The TV display polls every 60 seconds to pick up fresh data as soon as the cache expires.

## Architecture

```
server.js          Express backend, RSS aggregation, 5-min cache
feeds.json         Feed source configuration
public/
  index.html       Mobile dashboard
  style.css        Mobile styles
  app.js           Mobile JS (fetch, filter, search, render)
  tv.html          TV/NOC display
  tv.css           TV styles (full-viewport grid layout)
  tv.js            TV JS (Chart.js, TopoJSON map, geo-extraction)
```

No build step. No frameworks. Two dependencies: `express` and `rss-parser`.

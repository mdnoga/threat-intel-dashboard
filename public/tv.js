/* Threat Intel Dashboard - TV Display */

const TV_REFRESH_MS = 60_000;
const CATEGORIES = [
  "threats", "cves", "ransomware", "hacks", "research", "industry",
];
const CAT_COLORS = {
  threats: "#ef4444",
  cves: "#eab308",
  ransomware: "#a855f7",
  hacks: "#06b6d4",
  research: "#22c55e",
  industry: "#3b82f6",
};

const GEO_KEYWORDS = {
  "north korea": "KP", "dprk": "KP", "pyongyang": "KP",
  "south korea": "KR", "seoul": "KR",
  "united states": "US", "washington d.c.": "US",
  "united kingdom": "GB", "british": "GB",
  "saudi arabia": "SA", "saudi": "SA",
  "fancy bear": "RU", "cozy bear": "RU", "sandworm": "RU",
  "mustang panda": "CN", "apt41": "CN", "apt31": "CN",
  "apt10": "CN", "apt40": "CN",
  "charming kitten": "IR", "apt33": "IR", "apt35": "IR",
  "lazarus": "KP", "kimsuky": "KP", "apt38": "KP",
  "apt28": "RU", "apt29": "RU", "turla": "RU",
  "russia": "RU", "russian": "RU", "moscow": "RU",
  "kremlin": "RU",
  "china": "CN", "chinese": "CN", "beijing": "CN",
  "iran": "IR", "iranian": "IR", "tehran": "IR",
  "korean": "KR",
  "ukraine": "UA", "ukrainian": "UA", "kyiv": "UA",
  "israel": "IL", "israeli": "IL",
  "germany": "DE", "german": "DE", "berlin": "DE",
  "france": "FR", "french": "FR", "paris": "FR",
  "india": "IN", "indian": "IN",
  "brazil": "BR", "brazilian": "BR",
  "japan": "JP", "japanese": "JP", "tokyo": "JP",
  "australia": "AU", "australian": "AU",
  "canada": "CA", "canadian": "CA",
  "taiwan": "TW", "taiwanese": "TW", "taipei": "TW",
  "netherlands": "NL", "dutch": "NL",
  "singapore": "SG",
  "pakistan": "PK", "pakistani": "PK",
  "vietnam": "VN", "vietnamese": "VN",
  "turkey": "TR", "turkish": "TR", "ankara": "TR",
  "nigeria": "NG", "nigerian": "NG",
  "indonesia": "ID", "indonesian": "ID",
  "american": "US", "america": "US",
  "european": "EU", "europe": "EU",
  "london": "GB", "england": "GB",
  "philippines": "PH",
  "malaysia": "MY",
  "thailand": "TH",
  "mexico": "MX",
  "colombia": "CO",
  "argentina": "AR",
  "poland": "PL",
  "sweden": "SE",
  "norway": "NO",
  "finland": "FI",
  "denmark": "DK",
  "spain": "ES",
  "italy": "IT",
  "switzerland": "CH",
  "belgium": "BE",
  "austria": "AT",
  "czech": "CZ",
  "romania": "RO",
  "hungary": "HU",
  "portugal": "PT",
  "greece": "GR",
  "egypt": "EG",
  "south africa": "ZA",
  "kenya": "KE",
  "ethiopia": "ET",
  "morocco": "MA",
  "iraq": "IQ",
  "syria": "SY",
  "afghanistan": "AF",
  "myanmar": "MM",
  "bangladesh": "BD",
  "nepal": "NP",
  "cambodia": "KH",
};

let chartCategories = null;
let chartTimeline = null;
let chartSources = null;
let allItems = [];

function init() {
  updateClock();
  setInterval(updateClock, 1000);
  loadMap();
  refreshAll();
  setInterval(refreshAll, TV_REFRESH_MS);
}

function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent =
    now.toLocaleTimeString("en-US", { hour12: false });
}

async function refreshAll() {
  const dot = document.getElementById("status-dot");
  dot.className = "tv-status-dot loading";

  try {
    const [feedsRes, statsRes] = await Promise.all([
      fetch("/api/feeds"),
      fetch("/api/stats"),
    ]);

    if (!feedsRes.ok || !statsRes.ok) {
      throw new Error("API error");
    }

    const feedsData = await feedsRes.json();
    const statsData = await statsRes.json();

    allItems = feedsData.items;

    document.getElementById("total-count").textContent =
      statsData.total;
    document.getElementById("source-count").textContent =
      Object.keys(statsData.sources).length;
    document.getElementById("last-updated").textContent =
      new Date(statsData.fetchedAt).toLocaleTimeString("en-US", {
        hour12: false,
      });

    renderCategoryChart(statsData);
    renderTimelineChart(allItems);
    renderSourcesChart(statsData);
    renderHeatmap(allItems);
    renderFeedColumns(allItems, statsData);
    renderMap(allItems);

    dot.className = "tv-status-dot ok";
  } catch (err) {
    console.error("Refresh failed:", err);
    dot.className = "tv-status-dot error";
  }
}

/* === CHARTS === */

function renderCategoryChart(stats) {
  const ctx = document.getElementById("chart-categories");
  const labels = CATEGORIES.map(
    (c) => c.charAt(0).toUpperCase() + c.slice(1)
  );
  const data = CATEGORIES.map((c) => stats.categories[c] || 0);
  const colors = CATEGORIES.map((c) => CAT_COLORS[c]);

  if (chartCategories) {
    chartCategories.data.datasets[0].data = data;
    chartCategories.update("none");
    return;
  }

  chartCategories = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: "#111827",
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: {
          position: "right",
          labels: {
            color: "#94a3b8",
            font: { size: 11 },
            padding: 8,
            boxWidth: 12,
          },
        },
      },
      animation: { duration: 600 },
    },
  });
}

function renderTimelineChart(items) {
  const ctx = document.getElementById("chart-timeline");
  const now = Date.now();
  const hourLabels = [];
  for (let i = 23; i >= 0; i--) {
    hourLabels.push(`${i}h`);
  }

  const datasets = CATEGORIES.map((cat) => {
    const buckets = new Array(24).fill(0);
    for (const item of items) {
      if (item.category !== cat || !item.pubDate) continue;
      const hoursAgo = Math.floor(
        (now - new Date(item.pubDate).getTime()) / 3_600_000
      );
      if (hoursAgo >= 0 && hoursAgo < 24) {
        buckets[23 - hoursAgo]++;
      }
    }
    return {
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      data: buckets,
      borderColor: CAT_COLORS[cat],
      backgroundColor: CAT_COLORS[cat] + "20",
      fill: true,
      tension: 0.35,
      pointRadius: 0,
      borderWidth: 1.5,
    };
  });

  if (chartTimeline) {
    chartTimeline.data.datasets = datasets;
    chartTimeline.update("none");
    return;
  }

  chartTimeline = new Chart(ctx, {
    type: "line",
    data: { labels: hourLabels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          grid: { color: "#1e293b" },
          ticks: { color: "#64748b", font: { size: 9 } },
        },
        y: {
          grid: { color: "#1e293b" },
          ticks: {
            color: "#64748b",
            font: { size: 9 },
            stepSize: 1,
          },
          beginAtZero: true,
        },
      },
      plugins: {
        legend: { display: false },
      },
      animation: { duration: 400 },
    },
  });
}

function renderSourcesChart(stats) {
  const ctx = document.getElementById("chart-sources");
  const sorted = Object.entries(stats.sources)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  const labels = sorted.map((s) => s[0]);
  const data = sorted.map((s) => s[1]);

  if (chartSources) {
    chartSources.data.labels = labels;
    chartSources.data.datasets[0].data = data;
    chartSources.update("none");
    return;
  }

  chartSources = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: "#3b82f6",
        borderRadius: 3,
        barThickness: 14,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      scales: {
        x: {
          grid: { color: "#1e293b" },
          ticks: {
            color: "#64748b",
            font: { size: 9 },
            stepSize: 5,
          },
          beginAtZero: true,
        },
        y: {
          grid: { display: false },
          ticks: { color: "#94a3b8", font: { size: 10 } },
        },
      },
      plugins: { legend: { display: false } },
      animation: { duration: 400 },
    },
  });
}

function renderHeatmap(items) {
  const canvas = document.getElementById("chart-heatmap");
  const ctx = canvas.getContext("2d");
  const rect = canvas.parentElement.getBoundingClientRect();
  const headerH = 24;
  const w = rect.width - 24;
  const h = rect.height - headerH - 24;

  canvas.width = w * 2;
  canvas.height = h * 2;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.scale(2, 2);

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const grid = Array.from({ length: 7 }, () =>
    new Array(24).fill(0)
  );

  const now = new Date();
  for (const item of items) {
    if (!item.pubDate) continue;
    const d = new Date(item.pubDate);
    const diffH = (now - d) / 3_600_000;
    if (diffH < 168) {
      grid[d.getDay()][d.getHours()]++;
    }
  }

  let maxVal = 1;
  for (const row of grid) {
    for (const v of row) {
      if (v > maxVal) maxVal = v;
    }
  }

  const labelW = 30;
  const labelH = 14;
  const cellW = (w - labelW - 4) / 24;
  const cellH = (h - labelH - 4) / 7;

  ctx.clearRect(0, 0, w, h);

  ctx.font = "9px -apple-system, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.textAlign = "center";
  for (let hr = 0; hr < 24; hr += 3) {
    ctx.fillText(
      `${hr}`,
      labelW + hr * cellW + cellW / 2,
      10
    );
  }

  ctx.textAlign = "right";
  for (let d = 0; d < 7; d++) {
    ctx.fillStyle = "#64748b";
    ctx.fillText(
      days[d],
      labelW - 4,
      labelH + d * cellH + cellH / 2 + 3
    );

    for (let hr = 0; hr < 24; hr++) {
      const val = grid[d][hr];
      const intensity = val / maxVal;
      const x = labelW + hr * cellW;
      const y = labelH + d * cellH;

      if (val === 0) {
        ctx.fillStyle = "#1a2332";
      } else {
        const l = 15 + intensity * 40;
        ctx.fillStyle = `hsl(142, 60%, ${l}%)`;
      }

      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, cellW - 2, cellH - 2, 2);
      ctx.fill();
    }
  }
}

/* === GEO MAP === */

async function loadMap() {
  const container = document.getElementById("map-container");
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
    );
    const topology = await res.json();
    const svg = topoToSvg(topology);
    container.innerHTML = "";
    container.appendChild(svg);
  } catch (err) {
    console.error("Map load failed:", err);
    container.innerHTML =
      '<div class="tv-loading">Map unavailable</div>';
  }
}

function topoToSvg(topo) {
  const svg = document.createElementNS(
    "http://www.w3.org/2000/svg", "svg"
  );
  svg.setAttribute("viewBox", "-180 -90 360 180");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  const objects = topo.objects.countries;
  const arcs = topo.arcs;
  const transform = topo.transform;

  const geometries = objects.geometries;
  const idToAlpha2 = buildIdMap();

  for (const geom of geometries) {
    const alpha2 = idToAlpha2[geom.id] || "";
    const paths = geomToCoords(geom, arcs, transform);
    for (const d of paths) {
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg", "path"
      );
      path.setAttribute("d", d);
      if (alpha2) {
        path.setAttribute("id", alpha2);
        path.setAttribute("data-country", alpha2);
      }
      svg.appendChild(path);
    }
  }

  return svg;
}

function geomToCoords(geom, arcs, transform) {
  const paths = [];

  function decodeArc(arcIdx) {
    const reverse = arcIdx < 0;
    const idx = reverse ? ~arcIdx : arcIdx;
    const arc = arcs[idx];
    const coords = [];
    let x = 0;
    let y = 0;
    for (const [dx, dy] of arc) {
      x += dx;
      y += dy;
      const lon = x * transform.scale[0] + transform.translate[0];
      const lat = y * transform.scale[1] + transform.translate[1];
      coords.push([lon, -lat]);
    }
    if (reverse) coords.reverse();
    return coords;
  }

  function ringToPath(ring) {
    const coords = [];
    for (const arcIdx of ring) {
      const arcCoords = decodeArc(arcIdx);
      if (coords.length > 0) {
        arcCoords.shift();
      }
      coords.push(...arcCoords);
    }
    if (coords.length === 0) return "";
    let d = `M${coords[0][0].toFixed(2)},${coords[0][1].toFixed(2)}`;
    for (let i = 1; i < coords.length; i++) {
      d += `L${coords[i][0].toFixed(2)},${coords[i][1].toFixed(2)}`;
    }
    d += "Z";
    return d;
  }

  if (geom.type === "Polygon") {
    let d = "";
    for (const ring of geom.arcs) {
      d += ringToPath(ring);
    }
    if (d) paths.push(d);
  } else if (geom.type === "MultiPolygon") {
    for (const polygon of geom.arcs) {
      let d = "";
      for (const ring of polygon) {
        d += ringToPath(ring);
      }
      if (d) paths.push(d);
    }
  }

  return paths;
}

function buildIdMap() {
  return {
    "004": "AF", "008": "AL", "012": "DZ", "024": "AO",
    "032": "AR", "036": "AU", "040": "AT", "050": "BD",
    "056": "BE", "064": "BT", "068": "BO", "070": "BA",
    "072": "BW", "076": "BR", "100": "BG", "104": "MM",
    "108": "BI", "116": "KH", "120": "CM", "124": "CA",
    "140": "CF", "144": "LK", "148": "TD", "152": "CL",
    "156": "CN", "170": "CO", "178": "CG", "180": "CD",
    "188": "CR", "191": "HR", "192": "CU", "196": "CY",
    "203": "CZ", "208": "DK", "214": "DO", "218": "EC",
    "818": "EG", "222": "SV", "226": "GQ", "232": "ER",
    "233": "EE", "231": "ET", "238": "FK", "242": "FJ",
    "246": "FI", "250": "FR", "260": "TF", "266": "GA",
    "270": "GM", "268": "GE", "276": "DE", "288": "GH",
    "300": "GR", "304": "GL", "320": "GT", "324": "GN",
    "328": "GY", "332": "HT", "340": "HN", "348": "HU",
    "352": "IS", "356": "IN", "360": "ID", "364": "IR",
    "368": "IQ", "372": "IE", "376": "IL", "380": "IT",
    "384": "CI", "388": "JM", "392": "JP", "400": "JO",
    "398": "KZ", "404": "KE", "408": "KP", "410": "KR",
    "414": "KW", "417": "KG", "418": "LA", "422": "LB",
    "426": "LS", "430": "LR", "434": "LY", "440": "LT",
    "442": "LU", "450": "MG", "454": "MW", "458": "MY",
    "466": "ML", "478": "MR", "484": "MX", "496": "MN",
    "498": "MD", "499": "ME", "504": "MA", "508": "MZ",
    "512": "OM", "516": "NA", "524": "NP", "528": "NL",
    "540": "NC", "554": "NZ", "558": "NI", "562": "NE",
    "566": "NG", "578": "NO", "586": "PK", "591": "PA",
    "598": "PG", "600": "PY", "604": "PE", "608": "PH",
    "616": "PL", "620": "PT", "630": "PR", "634": "QA",
    "642": "RO", "643": "RU", "646": "RW", "682": "SA",
    "686": "SN", "688": "RS", "694": "SL", "702": "SG",
    "703": "SK", "704": "VN", "705": "SI", "706": "SO",
    "710": "ZA", "716": "ZW", "724": "ES", "728": "SS",
    "729": "SD", "740": "SR", "748": "SZ", "752": "SE",
    "756": "CH", "760": "SY", "762": "TJ", "764": "TH",
    "768": "TG", "780": "TT", "784": "AE", "788": "TN",
    "792": "TR", "795": "TM", "800": "UG", "804": "UA",
    "826": "GB", "840": "US", "858": "UY", "860": "UZ",
    "862": "VE", "887": "YE", "894": "ZM",
    "158": "TW", "-99": "CY", "010": "AQ",
  };
}

function renderMap(items) {
  const container = document.getElementById("map-container");
  const svgEl = container.querySelector("svg");
  if (!svgEl) return;

  const counts = extractGeoMentions(items);
  const maxCount = Math.max(...Object.values(counts), 1);

  const now = Date.now();
  const recentItems = items.filter((i) => {
    if (!i.pubDate) return false;
    return (now - new Date(i.pubDate).getTime()) < 3_600_000;
  });
  const recentCounts = extractGeoMentions(recentItems);

  const paths = svgEl.querySelectorAll("path[data-country]");
  for (const path of paths) {
    const code = path.getAttribute("data-country");
    const count = counts[code] || 0;
    path.classList.remove("country-active");

    if (count > 0) {
      const intensity = Math.min(count / maxCount, 1);
      const lightness = 20 + intensity * 40;
      const glowSize = 2 + intensity * 8;
      path.setAttribute("fill", `hsl(0, 80%, ${lightness}%)`);
      path.setAttribute("filter",
        `drop-shadow(0 0 ${glowSize}px hsl(0, 80%, 50%))`);

      if (recentCounts[code]) {
        path.classList.add("country-active");
      }
    } else {
      path.removeAttribute("fill");
      path.removeAttribute("filter");
    }
  }
}

function extractGeoMentions(items) {
  const counts = {};
  const text = items
    .map((i) => `${i.title} ${i.snippet}`)
    .join(" ")
    .toLowerCase();

  const keywords = Object.keys(GEO_KEYWORDS).sort(
    (a, b) => b.length - a.length
  );

  for (const keyword of keywords) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    const matches = text.match(regex);
    if (matches) {
      const code = GEO_KEYWORDS[keyword];
      counts[code] = (counts[code] || 0) + matches.length;
    }
  }

  return counts;
}

/* === FEED COLUMNS === */

function renderFeedColumns(items, stats) {
  for (const cat of CATEGORIES) {
    const countEl = document.getElementById(`feed-count-${cat}`);
    if (countEl) {
      countEl.textContent = stats.categories[cat] || 0;
    }

    const track = document.getElementById(`feed-track-${cat}`);
    if (!track) continue;

    const catItems = items.filter((i) => i.category === cat);
    const html = catItems
      .map((item) => {
        const time = formatTimeAgo(item.pubDate);
        return `
          <div class="tv-feed-item">
            <div class="tv-feed-item-title">
              ${escapeHtml(item.title)}
            </div>
            <div class="tv-feed-item-meta">
              <span class="tv-feed-item-source">
                ${escapeHtml(item.source)}
              </span>
              <span>${time}</span>
            </div>
          </div>
        `;
      })
      .join("");

    track.classList.remove("scrolling");
    track.innerHTML = html + html;

    requestAnimationFrame(() => {
      const scrollH = track.scrollHeight / 2;
      const containerH =
        track.parentElement.getBoundingClientRect().height;
      if (scrollH > containerH) {
        const duration = Math.max(catItems.length * 4, 30);
        track.style.setProperty(
          "--scroll-duration", `${duration}s`
        );
        track.classList.add("scrolling");
      }
    });
  }
}

/* === HELPERS === */

function formatTimeAgo(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60_000);
  const hrs = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (hrs < 24) return `${hrs}h`;
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

init();

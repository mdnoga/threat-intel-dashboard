import express from "express";
import { readFile } from "node:fs/promises";
import Parser from "rss-parser";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const parser = new Parser({
  timeout: 10_000,
  headers: {
    "User-Agent":
      "ThreatIntelDashboard/1.0 (+security-monitoring)",
  },
});

const PORT = process.env.PORT || 3000;
const CACHE_TTL_MS = 5 * 60 * 1000;

let feedCache = { items: [], fetchedAt: 0 };

async function loadFeedConfig() {
  const raw = await readFile(
    join(__dirname, "feeds.json"),
    "utf-8"
  );
  return JSON.parse(raw).feeds;
}

async function fetchSingleFeed(feedConfig) {
  try {
    const feed = await parser.parseURL(feedConfig.url);
    return feed.items.map((item) => ({
      title: item.title || "Untitled",
      link: item.link || "",
      pubDate: item.pubDate || item.isoDate || null,
      source: feedConfig.name,
      category: feedConfig.category,
      snippet:
        stripHtml(item.contentSnippet || item.content || "")
          .slice(0, 280) || "",
    }));
  } catch (err) {
    console.error(
      `Failed to fetch ${feedConfig.name}: ${err.message}`
    );
    return [];
  }
}

function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchAllFeeds() {
  const now = Date.now();
  if (
    feedCache.items.length > 0 &&
    now - feedCache.fetchedAt < CACHE_TTL_MS
  ) {
    return feedCache.items;
  }

  const feeds = await loadFeedConfig();
  const results = await Promise.allSettled(
    feeds.map((f) => fetchSingleFeed(f))
  );

  const items = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .sort((a, b) => {
      const dateA = a.pubDate ? new Date(a.pubDate) : new Date(0);
      const dateB = b.pubDate ? new Date(b.pubDate) : new Date(0);
      return dateB - dateA;
    });

  feedCache = { items, fetchedAt: now };
  console.log(
    `Fetched ${items.length} items from ${feeds.length} feeds`
  );
  return items;
}

app.use(express.static(join(__dirname, "public")));

app.get("/api/feeds", async (req, res) => {
  try {
    const items = await fetchAllFeeds();
    const category = req.query.category;
    const search = req.query.search?.toLowerCase();

    let filtered = items;
    if (category && category !== "all") {
      filtered = filtered.filter((i) => i.category === category);
    }
    if (search) {
      filtered = filtered.filter(
        (i) =>
          i.title.toLowerCase().includes(search) ||
          i.snippet.toLowerCase().includes(search) ||
          i.source.toLowerCase().includes(search)
      );
    }

    res.json({
      count: filtered.length,
      fetchedAt: feedCache.fetchedAt,
      items: filtered,
    });
  } catch (err) {
    console.error(`API error: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch feeds" });
  }
});

app.get("/api/stats", async (req, res) => {
  try {
    const items = await fetchAllFeeds();
    const categories = {};
    for (const item of items) {
      categories[item.category] =
        (categories[item.category] || 0) + 1;
    }

    const sources = {};
    for (const item of items) {
      sources[item.source] = (sources[item.source] || 0) + 1;
    }

    res.json({
      total: items.length,
      categories,
      sources,
      fetchedAt: feedCache.fetchedAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get stats" });
  }
});

fetchAllFeeds().then(() => {
  console.log("Initial feed fetch complete");
});

app.listen(PORT, () => {
  console.log(
    `Threat Intel Dashboard running at http://localhost:${PORT}`
  );
});

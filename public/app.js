const feedList = document.getElementById("feed-list");
const searchInput = document.getElementById("search");
const refreshBtn = document.getElementById("refresh-btn");
const statusDot = document.getElementById("status-dot");
const resultCount = document.getElementById("result-count");
const lastUpdated = document.getElementById("last-updated");

let activeCategory = "all";
let searchQuery = "";
let autoRefreshTimer = null;

const AUTO_REFRESH_MS = 5 * 60 * 1000;

function init() {
  bindCategoryButtons();
  bindSearch();
  bindRefresh();
  fetchFeeds();
  startAutoRefresh();
}

function bindCategoryButtons() {
  const buttons = document.querySelectorAll(".cat-btn");
  for (const btn of buttons) {
    btn.addEventListener("click", () => {
      for (const b of buttons) {
        b.classList.remove("active");
      }
      btn.classList.add("active");
      activeCategory = btn.dataset.category;
      fetchFeeds();
    });
  }
}

function bindSearch() {
  let debounceTimer;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = searchInput.value.trim();
      fetchFeeds();
    }, 300);
  });
}

function bindRefresh() {
  refreshBtn.addEventListener("click", () => {
    fetchFeeds(true);
  });
}

function startAutoRefresh() {
  clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(() => fetchFeeds(), AUTO_REFRESH_MS);
}

async function fetchFeeds(forceRefresh = false) {
  statusDot.className = "status-dot loading";
  refreshBtn.classList.add("spinning");

  const params = new URLSearchParams();
  if (activeCategory !== "all") {
    params.set("category", activeCategory);
  }
  if (searchQuery) {
    params.set("search", searchQuery);
  }
  if (forceRefresh) {
    params.set("_bust", Date.now());
  }

  try {
    const res = await fetch(`/api/feeds?${params}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();

    renderFeedItems(data.items);
    updateInfoBar(data.count, data.fetchedAt);
    await updateCategoryCounts();

    statusDot.className = "status-dot ok";
  } catch (err) {
    console.error("Fetch error:", err);
    statusDot.className = "status-dot error";
    feedList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <p>Failed to load feeds. Retrying...</p>
      </div>
    `;
    setTimeout(() => fetchFeeds(), 10_000);
  } finally {
    refreshBtn.classList.remove("spinning");
  }
}

async function updateCategoryCounts() {
  try {
    const res = await fetch("/api/stats");
    const stats = await res.json();

    const allCount = document.getElementById("count-all");
    if (allCount) {
      allCount.textContent = stats.total;
    }

    const categories = [
      "threats", "cves", "ransomware",
      "hacks", "research", "industry",
    ];
    for (const cat of categories) {
      const el = document.getElementById(`count-${cat}`);
      if (el) {
        el.textContent = stats.categories[cat] || 0;
      }
    }
  } catch {
    // Stats are non-critical
  }
}

function renderFeedItems(items) {
  if (items.length === 0) {
    feedList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <p>No results found. Try a different search or category.</p>
      </div>
    `;
    return;
  }

  feedList.innerHTML = items
    .map((item) => {
      const timeAgo = formatTimeAgo(item.pubDate);
      const tagClass = `tag-${item.category}`;

      return `
        <a class="feed-item"
           href="${escapeAttr(item.link)}"
           target="_blank"
           rel="noopener noreferrer">
          <div class="feed-item-header">
            <span class="category-tag ${tagClass}">
              ${escapeHtml(item.category)}
            </span>
            <span class="feed-item-title">
              ${escapeHtml(item.title)}
            </span>
          </div>
          ${item.snippet ? `<div class="feed-item-snippet">${escapeHtml(item.snippet)}</div>` : ""}
          <div class="feed-item-meta">
            <span class="source-name">
              ${escapeHtml(item.source)}
            </span>
            <span>${timeAgo}</span>
          </div>
        </a>
      `;
    })
    .join("");
}

function updateInfoBar(count, fetchedAt) {
  resultCount.textContent = `${count} item${count !== 1 ? "s" : ""}`;
  if (fetchedAt) {
    const date = new Date(fetchedAt);
    lastUpdated.textContent = `Updated ${date.toLocaleTimeString()}`;
  }
}

function formatTimeAgo(dateStr) {
  if (!dateStr) {
    return "";
  }
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

init();

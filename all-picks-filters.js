function ensureAllPicksFilters() {
  const allPicksTab = document.getElementById("allPicksTab");
  const allPredictions = document.getElementById("allPredictions");
  if (!allPicksTab || !allPredictions) return null;

  let filters = document.getElementById("allPicksFilters");
  if (!filters) {
    filters = document.createElement("form");
    filters.id = "allPicksFilters";
    filters.className = "filter-panel";
    filters.innerHTML = `
      <label>Search
        <input id="allPicksSearch" type="search" placeholder="Player, baker, week..." autocomplete="off">
      </label>
      <label>Week
        <select id="allPicksWeekFilter">
          <option value="">All weeks</option>
        </select>
      </label>
      <label>Player
        <select id="allPicksPlayerFilter">
          <option value="">All players</option>
        </select>
      </label>
      <button id="clearAllPicksFilters" class="secondary" type="button">Clear filters</button>
      <p id="allPicksFilterCount" class="hint span-two"></p>
    `;
    allPredictions.insertAdjacentElement("beforebegin", filters);

    filters.addEventListener("input", applyAllPicksFilters);
    filters.addEventListener("change", applyAllPicksFilters);
    document.getElementById("clearAllPicksFilters")?.addEventListener("click", () => {
      document.getElementById("allPicksSearch").value = "";
      document.getElementById("allPicksWeekFilter").value = "";
      document.getElementById("allPicksPlayerFilter").value = "";
      applyAllPicksFilters();
    });
  }

  return filters;
}

function tableRowsFromAllPicks() {
  return Array.from(document.querySelectorAll("#allPredictions tbody tr"));
}

function normaliseFilterText(value) {
  return String(value || "").trim().toLowerCase();
}

function setSelectOptionsFromRows(selectId, columnIndex, defaultLabel) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const current = select.value;
  const values = Array.from(new Set(tableRowsFromAllPicks()
    .map((row) => row.children[columnIndex]?.textContent?.trim() || "")
    .filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  select.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = defaultLabel;
  select.appendChild(allOption);

  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }

  if (values.includes(current)) select.value = current;
}

function refreshAllPicksFilterOptions() {
  ensureAllPicksFilters();
  setSelectOptionsFromRows("allPicksWeekFilter", 1, "All weeks");
  setSelectOptionsFromRows("allPicksPlayerFilter", 0, "All players");
}

function applyAllPicksFilters() {
  const rows = tableRowsFromAllPicks();
  const search = normaliseFilterText(document.getElementById("allPicksSearch")?.value);
  const week = document.getElementById("allPicksWeekFilter")?.value || "";
  const player = document.getElementById("allPicksPlayerFilter")?.value || "";
  let visibleCount = 0;

  rows.forEach((row) => {
    const cells = Array.from(row.children).map((cell) => cell.textContent.trim());
    const rowText = normaliseFilterText(cells.join(" "));
    const matchesSearch = !search || rowText.includes(search);
    const matchesWeek = !week || cells[1] === week;
    const matchesPlayer = !player || cells[0] === player;
    const visible = matchesSearch && matchesWeek && matchesPlayer;

    row.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  const count = document.getElementById("allPicksFilterCount");
  if (count) {
    count.textContent = rows.length ? `Showing ${visibleCount} of ${rows.length} picks` : "";
  }
}

function setupAllPicksFilters() {
  refreshAllPicksFilterOptions();
  applyAllPicksFilters();
}

const originalRenderLeaderboardForAllPicksFilters = renderLeaderboard;
renderLeaderboard = async function () {
  await originalRenderLeaderboardForAllPicksFilters();
  setupAllPicksFilters();
};

(function addAllPicksFilterStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .filter-panel {
      display: grid;
      grid-template-columns: minmax(180px, 2fr) minmax(150px, 1fr) minmax(150px, 1fr) auto;
      gap: 12px;
      align-items: end;
      margin: 0 0 18px;
      padding: 14px;
      border: 1px solid var(--border);
      border-radius: 18px;
      background: #fffaf5;
    }

    .filter-panel .hint {
      margin: 0;
    }

    @media (max-width: 760px) {
      .filter-panel {
        grid-template-columns: 1fr;
        padding: 12px;
      }

      .filter-panel button {
        width: 100%;
      }
    }
  `;
  document.head.appendChild(style);
})();

document.addEventListener("DOMContentLoaded", setupAllPicksFilters);

const PLAYER_PHOTO_BUCKET = "player-photos";

const state = {
  supabase: null,
  currentUser: null,
  isAdmin: false,
  weeks: [],
  bakers: [],
  activeBakers: [],
  players: [],
};

const $ = (id) => document.getElementById(id);

function setText(id, text, isError = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = text || "";
  el.classList.toggle("error", Boolean(isError));
}

function show(id, visible) {
  const el = $(id);
  if (el) el.classList.toggle("hidden", !visible);
}

function isAdmin() {
  return state.isAdmin;
}

async function loadAdminStatus() {
  state.isAdmin = false;

  const { data, error } = await state.supabase.rpc("is_admin");
  if (error) {
    console.error("Could not check admin status", error);
    return false;
  }

  state.isAdmin = Boolean(data);
  return state.isAdmin;
}

function handleAdminVisibility() {
  const allowed = isAdmin();
  document.querySelectorAll('[data-tab="admin"]').forEach((el) => {
    el.style.display = allowed ? "" : "none";
  });
  show("adminTab", false);
}

function normaliseName(name) {
  return (name || "").trim().replace(/\s+/g, " ");
}

function normaliseNameKey(name) {
  return normaliseName(name).toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'\"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function option(value, label, selected = false) {
  const opt = document.createElement("option");
  opt.value = value || "";
  opt.textContent = label;
  opt.selected = selected;
  return opt;
}

function fillWeekSelect(select, { selectedWeekId = "", includeLocked = true, showLockedLabel = true, emptyLabel = null } = {}) {
  if (!select) return;
  const weeks = includeLocked ? state.weeks : weekLocks.openWeeks(state.weeks);
  select.innerHTML = "";

  if (!weeks.length && emptyLabel) {
    select.appendChild(option("", emptyLabel, true));
    return;
  }

  for (const week of weeks) {
    select.appendChild(option(week.id, weekLocks.label(week, { showLockedLabel }), week.id === selectedWeekId));
  }
}

function fillBakerSelect(select, bakers, { blankLabel = "Choose baker", selectedId = "" } = {}) {
  if (!select) return;
  select.innerHTML = "";
  if (blankLabel !== null) select.appendChild(option("", blankLabel, !selectedId));
  for (const baker of bakers) select.appendChild(option(baker.id, baker.name, baker.id === selectedId));
}

function fillPlayerSelect(select) {
  if (!select) return;
  select.innerHTML = "";
  select.appendChild(option("", "Choose player", true));
  for (const player of state.players) select.appendChild(option(player.id, player.name));
}

function currentWeekId({ includeLocked = true } = {}) {
  const weeks = includeLocked ? state.weeks : weekLocks.openWeeks(state.weeks);
  return weeks.find((w) => w.is_current)?.id || weeks[0]?.id || "";
}

function publicPhotoUrl(avatarPath) {
  if (!avatarPath) return "";
  return state.supabase.storage.from(PLAYER_PHOTO_BUCKET).getPublicUrl(avatarPath).data.publicUrl;
}

function avatarHtml(avatarPath, playerName) {
  const url = publicPhotoUrl(avatarPath);
  if (!url) return "";
  return `<img class="avatar" src="${escapeAttribute(url)}" alt="${escapeAttribute(playerName || "Player photo")}">`;
}

async function loadData() {
  const [weeks, bakers, players] = await Promise.all([
    bakeoffApi.getWeeks(),
    bakeoffApi.getBakers(),
    bakeoffApi.getPlayers(),
  ]);

  state.weeks = weeks;
  state.bakers = bakers;
  state.players = players;
  state.activeBakers = state.bakers.filter((b) => b.is_active);
}

function renderPredictionForm() {
  const selectedWeekId = currentWeekId({ includeLocked: false });
  fillWeekSelect($("weekSelect"), {
    selectedWeekId,
    includeLocked: false,
    showLockedLabel: false,
    emptyLabel: "No open weeks",
  });

  fillBakerSelect($("technicalGuess"), state.activeBakers);
  fillBakerSelect($("starBakerGuess"), state.activeBakers);
  fillBakerSelect($("eliminatedGuess"), state.activeBakers);
  fillBakerSelect($("handshakeGuess"), state.activeBakers, { blankLabel: "No handshake guess" });
  if (typeof loadPlayerNameOptions === "function") loadPlayerNameOptions();
}

function renderAdminForms() {
  if (!isAdmin()) return;

  const selectedWeekId = currentWeekId();
  fillWeekSelect($("resultWeekSelect"), { selectedWeekId });
  fillWeekSelect($("currentWeekSelect"), { selectedWeekId });
  fillWeekSelect($("lockWeekSelect"), { selectedWeekId: $("lockWeekSelect")?.value || selectedWeekId });
  updateWeekLockButton();

  fillBakerSelect($("actualTechnical"), state.bakers, { blankLabel: "Choose baker" });
  fillBakerSelect($("actualStarBaker"), state.bakers, { blankLabel: "Choose baker" });
  fillBakerSelect($("actualEliminated"), state.bakers, { blankLabel: "Choose baker" });
  renderActualHandshakeCheckboxes(state.bakers);
  fillPlayerSelect($("photoPlayerSelect"));
  renderBakerList();
}

function renderForms() {
  renderPredictionForm();
  renderAdminForms();
}

async function refreshAppData() {
  await loadData();
  renderForms();
}

async function requireData() {
  await refreshAppData();
}

function renderBakerList() {
  const el = $("bakerList");
  if (!el) return;
  if (!state.bakers.length) {
    el.innerHTML = `<p class="muted">No bakers added yet.</p>`;
    return;
  }
  el.innerHTML = `<table><thead><tr><th>Baker</th><th>Status</th></tr></thead><tbody>${state.bakers.map((b) => `<tr><td>${escapeHtml(b.name)}</td><td>${b.is_active ? "Active" : "Eliminated"}</td></tr>`).join("")}</tbody></table>`;
}

function selectedActualHandshakeIds() {
  return Array.from($("actualHandshakes")?.querySelectorAll('input[type="checkbox"]:checked') || [])
    .map((input) => input.value)
    .filter(Boolean);
}

function setSelectedActualHandshakeIds(ids) {
  const selected = new Set(ids || []);
  $("actualHandshakes")?.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = selected.has(input.value);
  });
}

function renderActualHandshakeCheckboxes(bakers) {
  const list = $("actualHandshakes");
  if (!list) return;
  const selected = new Set(selectedActualHandshakeIds());
  list.innerHTML = "";

  if (!bakers.length) {
    list.innerHTML = '<p class="muted">No bakers available.</p>';
    return;
  }

  for (const baker of bakers) {
    const id = `actualHandshake-${baker.id}`;
    const label = document.createElement("label");
    label.className = "checkbox-option";
    label.setAttribute("for", id);

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = id;
    input.value = baker.id;
    input.checked = selected.has(baker.id);

    const text = document.createElement("span");
    text.textContent = baker.name;

    label.append(input, text);
    list.appendChild(label);
  }
}

function updateWeekLockButton() {
  const select = $("lockWeekSelect");
  const button = $("toggleWeekLockButton");
  if (!select || !button) return;
  const week = state.weeks.find((item) => item.id === select.value);
  button.textContent = week?.is_locked ? "Unlock week" : "Lock week";
}

async function toggleWeekLock(event) {
  event.preventDefault();
  if (!isAdmin()) return setText("weekLockStatus", "Admin access required.", true);

  const weekId = $("lockWeekSelect").value;
  const week = state.weeks.find((item) => item.id === weekId);
  if (!week) return setText("weekLockStatus", "Choose a week.", true);

  const nextLockedValue = !week.is_locked;
  setText("weekLockStatus", nextLockedValue ? "Locking..." : "Unlocking...");

  try {
    await bakeoffApi.setWeekLocked(weekId, nextLockedValue);
    setText("weekLockStatus", nextLockedValue ? "Week locked." : "Week unlocked.");
    await refreshAppData();
  } catch (err) {
    setText("weekLockStatus", err.message || "Could not update week lock.", true);
  }
}

async function findPlayerByName(name) {
  const cleanName = normaliseName(name);
  if (!cleanName) throw new Error("Enter your player name.");
  const players = state.players.length ? state.players : await bakeoffApi.getPlayers();
  return players.find((player) => normaliseNameKey(player.name) === normaliseNameKey(cleanName)) || null;
}

async function getOrCreatePlayer(name) {
  const cleanName = normaliseName(name);
  const existing = await findPlayerByName(cleanName);
  if (existing) return existing;
  return bakeoffApi.createPlayer(cleanName);
}

async function savePrediction(event) {
  event.preventDefault();

  const weekId = $("weekSelect").value;
  if (!weekId) return setText("predictionStatus", "No open weeks are available for picks.", true);
  if (weekLocks.isLocked(state.weeks, weekId)) {
    return setText("predictionStatus", "This week is locked, so picks can no longer be updated.", true);
  }

  setText("predictionStatus", "Saving...");
  try {
    const player = await getOrCreatePlayer($("playerName").value);
    await bakeoffApi.savePrediction({
      player_id: player.id,
      week_id: weekId,
      technical_winner_baker_id: $("technicalGuess").value,
      star_baker_id: $("starBakerGuess").value,
      eliminated_baker_id: $("eliminatedGuess").value,
      handshake_baker_id: $("handshakeGuess").value || null,
      updated_at: new Date().toISOString(),
    });
    setText("predictionStatus", "Picks saved.");
    await renderLeaderboardPage();
  } catch (err) {
    setText("predictionStatus", err.message || "Could not save picks.", true);
  }
}

async function loadExistingPrediction() {
  const weekId = $("weekSelect").value;
  if (!weekId) return setText("predictionStatus", "No open weeks are available for picks.", true);

  setText("predictionStatus", "Loading...");
  try {
    const player = await findPlayerByName($("playerName").value);
    if (!player) throw new Error("No picks found for that player name yet.");

    const prediction = await bakeoffApi.getPrediction(player.id, weekId);
    if (!prediction) throw new Error("No picks found for this week yet.");

    $("technicalGuess").value = prediction.technical_winner_baker_id || "";
    $("starBakerGuess").value = prediction.star_baker_id || "";
    $("eliminatedGuess").value = prediction.eliminated_baker_id || "";
    $("handshakeGuess").value = prediction.handshake_baker_id || "";
    setText("predictionStatus", "Loaded existing picks.");
  } catch (err) {
    setText("predictionStatus", err.message || "Could not load picks.", true);
  }
}

async function saveResults(event) {
  event.preventDefault();
  if (!isAdmin()) return setText("resultStatus", "Admin access required.", true);
  setText("resultStatus", "Saving...");

  try {
    const weekId = $("resultWeekSelect").value;
    const eliminatedId = $("actualEliminated").value || null;
    const result = await bakeoffApi.saveResult({
      week_id: weekId,
      technical_winner_baker_id: $("actualTechnical").value || null,
      star_baker_id: $("actualStarBaker").value || null,
      eliminated_baker_id: eliminatedId,
      updated_at: new Date().toISOString(),
    });

    await bakeoffApi.replaceResultHandshakes(result.id, selectedActualHandshakeIds());
    if (eliminatedId) await bakeoffApi.markBakerEliminated(eliminatedId, weekId);

    setText("resultStatus", "Results saved. Active baker list updated.");
    await refreshAppData();
    await loadResultForWeek();
    await renderLeaderboardPage();
  } catch (err) {
    setText("resultStatus", err.message || "Could not save results.", true);
  }
}

async function addBaker(event) {
  event.preventDefault();
  if (!isAdmin()) return alert("Admin access required.");
  const name = normaliseName($("newBakerName").value);
  if (!name) return;
  try {
    await bakeoffApi.addBaker(name);
    $("newBakerName").value = "";
    await refreshAppData();
  } catch (err) {
    alert(err.message || "Could not add baker.");
  }
}

async function setCurrentWeek(event) {
  event.preventDefault();
  if (!isAdmin()) return setText("weekStatus", "Admin access required.", true);
  setText("weekStatus", "Updating...");
  try {
    await bakeoffApi.setCurrentWeek($("currentWeekSelect").value);
    setText("weekStatus", "Current week updated.");
    await refreshAppData();
  } catch (err) {
    setText("weekStatus", err.message || "Could not update current week.", true);
  }
}

async function renderLeaderboardTable() {
  const lb = $("leaderboard");
  if (!lb) return;

  lb.innerHTML = `<p class="muted">Loading...</p>`;
  try {
    const rows = await bakeoffApi.getLeaderboard();
    lb.innerHTML = rows.length ? `<table><thead><tr><th>Position</th><th>Player</th><th>Points</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r.position}</td><td>${avatarHtml(r.avatar_path, r.player_name)}${escapeHtml(r.player_name)}</td><td>${r.total_points}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">No scores yet.</p>`;
  } catch (err) {
    lb.innerHTML = `<p class="status error">${escapeHtml(err.message || "Could not load leaderboard.")}</p>`;
  }
}

async function renderLeaderboardPage() {
  await renderLeaderboardTable();
  if (typeof renderActualResults === "function") await renderActualResults();
  if (typeof renderScoreBreakdown === "function") await renderScoreBreakdown();
  if (typeof applyLeaderboardMedals === "function") applyLeaderboardMedals();
}

async function renderLeaderboard() {
  await renderLeaderboardPage();
}

async function renderAllPicksPage() {
  if (typeof renderAllPicksTable === "function") await renderAllPicksTable();
  if (typeof setupAllPicksFilters === "function") setupAllPicksFilters();
}

async function loadResultForWeek() {
  if (!isAdmin()) return;
  try {
    const weekId = $("resultWeekSelect").value;
    const result = await bakeoffApi.getResult(weekId);
    $("actualTechnical").value = result?.technical_winner_baker_id || "";
    $("actualStarBaker").value = result?.star_baker_id || "";
    $("actualEliminated").value = result?.eliminated_baker_id || "";
    setSelectedActualHandshakeIds([]);

    if (result?.id) {
      setSelectedActualHandshakeIds(await bakeoffApi.getResultHandshakeIds(result.id));
    }
  } catch (err) {
    setText("resultStatus", err.message || "Could not load result.", true);
  }
}

function activateTab(tabName) {
  document.querySelectorAll(".tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tabName));
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.add("hidden"));
  $(`${tabName}Tab`)?.classList.remove("hidden");
}

async function switchTab(tabName) {
  if (tabName === "admin" && !isAdmin()) return;
  activateTab(tabName);

  if (tabName === "leaderboard") await renderLeaderboardPage();
  if (tabName === "allPicks") await renderAllPicksPage();
  if (tabName === "bakers" && typeof renderBakersDirectory === "function") renderBakersDirectory();
  if (tabName === "admin") {
    await loadResultForWeek();
    if (typeof loadAdminBakerTools === "function") loadAdminBakerTools();
    if (typeof loadAdminPlayerTools === "function") loadAdminPlayerTools();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  setText("loginStatus", "Logging in...");
  const { error } = await state.supabase.auth.signInWithPassword({ email: $("email").value, password: $("password").value });
  if (error) return setText("loginStatus", error.message, true);
  await startApp();
}

async function logout() {
  await state.supabase.auth.signOut();
  state.currentUser = null;
  state.isAdmin = false;
  show("loginView", true);
  show("appView", false);
  show("logoutButton", false);
}

async function startApp() {
  const { data, error } = await state.supabase.auth.getUser();
  if (error) throw error;
  state.currentUser = data.user;
  await loadAdminStatus();
  show("loginView", false);
  show("appView", true);
  show("logoutButton", true);
  setText("loginStatus", "");
  handleAdminVisibility();
  await switchTab("leaderboard");
  await refreshAppData();
  if (isAdmin()) await loadResultForWeek();
  await renderLeaderboardPage();
}

function bindEvents() {
  $("loginForm").addEventListener("submit", handleLogin);
  $("logoutButton").addEventListener("click", logout);
  $("predictionForm").addEventListener("submit", savePrediction);
  $("loadExistingButton").addEventListener("click", loadExistingPrediction);
  $("resultForm").addEventListener("submit", saveResults);
  $("bakerForm").addEventListener("submit", addBaker);
  $("currentWeekForm").addEventListener("submit", setCurrentWeek);
  $("weekLockForm")?.addEventListener("submit", toggleWeekLock);
  $("lockWeekSelect")?.addEventListener("change", updateWeekLockButton);
  $("refreshButton").addEventListener("click", renderLeaderboardPage);
  $("resultWeekSelect").addEventListener("change", loadResultForWeek);
  document.querySelectorAll(".tab").forEach((btn) => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
}

async function init() {
  if (!window.BAKEOFF_SUPABASE_URL || !window.BAKEOFF_SUPABASE_ANON_KEY) {
    show("setupWarning", true);
    return;
  }
  state.supabase = window.supabase.createClient(window.BAKEOFF_SUPABASE_URL, window.BAKEOFF_SUPABASE_ANON_KEY);
  bindEvents();
  const { data } = await state.supabase.auth.getSession();
  if (data.session) await startApp();
}

document.addEventListener("DOMContentLoaded", init);

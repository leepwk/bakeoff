const ADMIN_EMAIL = "admin@betterworld.com";
const PLAYER_PHOTO_BUCKET = "player-photos";

const state = {
  supabase: null,
  currentUser: null,
  weeks: [],
  bakers: [],
  activeBakers: [],
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
  return state.currentUser?.email?.toLowerCase() === ADMIN_EMAIL;
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

function option(value, label, selected = false) {
  const opt = document.createElement("option");
  opt.value = value || "";
  opt.textContent = label;
  opt.selected = selected;
  return opt;
}

function fillWeekSelect(select, selectedWeekId = "") {
  if (!select) return;
  select.innerHTML = "";
  for (const week of state.weeks) {
    select.appendChild(option(week.id, `Week ${week.week_number} - ${week.title}`, week.id === selectedWeekId));
  }
}

function fillBakerSelect(select, bakers, { blankLabel = "Choose baker", selectedId = "" } = {}) {
  if (!select) return;
  select.innerHTML = "";
  if (blankLabel !== null) select.appendChild(option("", blankLabel, !selectedId));
  for (const baker of bakers) select.appendChild(option(baker.id, baker.name, baker.id === selectedId));
}

function currentWeekId() {
  return state.weeks.find((w) => w.is_current)?.id || state.weeks[0]?.id || "";
}

async function requireData() {
  const [weeksRes, bakersRes] = await Promise.all([
    state.supabase.from("weeks").select("id, week_number, title, is_current, is_locked").order("week_number"),
    state.supabase.from("bakers").select("id, name, is_active, eliminated_week_id").order("name"),
  ]);

  if (weeksRes.error) throw weeksRes.error;
  if (bakersRes.error) throw bakersRes.error;

  state.weeks = weeksRes.data || [];
  state.bakers = bakersRes.data || [];
  state.activeBakers = state.bakers.filter((b) => b.is_active);

  const cw = currentWeekId();
  fillWeekSelect($("weekSelect"), cw);
  fillWeekSelect($("resultWeekSelect"), cw);
  fillWeekSelect($("currentWeekSelect"), cw);

  fillBakerSelect($("technicalGuess"), state.activeBakers);
  fillBakerSelect($("starBakerGuess"), state.activeBakers);
  fillBakerSelect($("eliminatedGuess"), state.activeBakers);
  fillBakerSelect($("handshakeGuess"), state.activeBakers, { blankLabel: "No handshake guess" });

  if (isAdmin()) {
    fillBakerSelect($("actualTechnical"), state.bakers, { blankLabel: "Choose baker" });
    fillBakerSelect($("actualStarBaker"), state.bakers, { blankLabel: "Choose baker" });
    fillBakerSelect($("actualEliminated"), state.bakers, { blankLabel: "Choose baker" });
    fillBakerSelect($("actualHandshakes"), state.bakers, { blankLabel: null });
    renderBakerList();
  }
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

async function getOrCreatePlayer(name) {
  const cleanName = normaliseName(name);
  if (!cleanName) throw new Error("Enter your player name.");
  const existing = await state.supabase.from("players").select("id, name").eq("name", cleanName).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;
  const created = await state.supabase.from("players").insert({ name: cleanName }).select("id, name").single();
  if (created.error) throw created.error;
  return created.data;
}

async function savePrediction(event) {
  event.preventDefault();
  setText("predictionStatus", "Saving...");
  try {
    const player = await getOrCreatePlayer($("playerName").value);
    const payload = {
      player_id: player.id,
      week_id: $("weekSelect").value,
      technical_winner_baker_id: $("technicalGuess").value,
      star_baker_id: $("starBakerGuess").value,
      eliminated_baker_id: $("eliminatedGuess").value,
      handshake_baker_id: $("handshakeGuess").value || null,
      updated_at: new Date().toISOString(),
    };
    const res = await state.supabase.from("predictions").upsert(payload, { onConflict: "player_id,week_id" });
    if (res.error) throw res.error;
    setText("predictionStatus", "Picks saved.");
    await renderLeaderboard();
  } catch (err) {
    setText("predictionStatus", err.message || "Could not save picks.", true);
  }
}

async function loadExistingPrediction() {
  setText("predictionStatus", "Loading...");
  try {
    const playerName = normaliseName($("playerName").value);
    if (!playerName) throw new Error("Enter your player name first.");
    const playerRes = await state.supabase.from("players").select("id").eq("name", playerName).maybeSingle();
    if (playerRes.error) throw playerRes.error;
    if (!playerRes.data) throw new Error("No picks found for that player name yet.");
    const predRes = await state.supabase.from("predictions").select("technical_winner_baker_id, star_baker_id, eliminated_baker_id, handshake_baker_id").eq("player_id", playerRes.data.id).eq("week_id", $("weekSelect").value).maybeSingle();
    if (predRes.error) throw predRes.error;
    if (!predRes.data) throw new Error("No picks found for this week yet.");
    $("technicalGuess").value = predRes.data.technical_winner_baker_id || "";
    $("starBakerGuess").value = predRes.data.star_baker_id || "";
    $("eliminatedGuess").value = predRes.data.eliminated_baker_id || "";
    $("handshakeGuess").value = predRes.data.handshake_baker_id || "";
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
    const payload = {
      week_id: weekId,
      technical_winner_baker_id: $("actualTechnical").value || null,
      star_baker_id: $("actualStarBaker").value || null,
      eliminated_baker_id: eliminatedId,
      updated_at: new Date().toISOString(),
    };
    const resultRes = await state.supabase.from("results").upsert(payload, { onConflict: "week_id" }).select("id").single();
    if (resultRes.error) throw resultRes.error;
    const resultId = resultRes.data.id;
    const delHandshakeRes = await state.supabase.from("result_handshakes").delete().eq("result_id", resultId);
    if (delHandshakeRes.error) throw delHandshakeRes.error;
    const selectedHandshakeIds = Array.from($("actualHandshakes").selectedOptions).map((o) => o.value).filter(Boolean);
    if (selectedHandshakeIds.length) {
      const insertRes = await state.supabase.from("result_handshakes").insert(selectedHandshakeIds.map((baker_id) => ({ result_id: resultId, baker_id })));
      if (insertRes.error) throw insertRes.error;
    }
    if (eliminatedId) {
      const elimRes = await state.supabase.from("bakers").update({ is_active: false, eliminated_week_id: weekId }).eq("id", eliminatedId);
      if (elimRes.error) throw elimRes.error;
    }
    setText("resultStatus", "Results saved. Active baker list updated.");
    await requireData();
    await renderLeaderboard();
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
    const res = await state.supabase.from("bakers").insert({ name, is_active: true });
    if (res.error) throw res.error;
    $("newBakerName").value = "";
    await requireData();
  } catch (err) {
    alert(err.message || "Could not add baker.");
  }
}

async function setCurrentWeek(event) {
  event.preventDefault();
  if (!isAdmin()) return setText("weekStatus", "Admin access required.", true);
  setText("weekStatus", "Updating...");
  try {
    const chosen = $("currentWeekSelect").value;
    const clearRes = await state.supabase.from("weeks").update({ is_current: false }).neq("id", chosen);
    if (clearRes.error) throw clearRes.error;
    const setRes = await state.supabase.from("weeks").update({ is_current: true }).eq("id", chosen);
    if (setRes.error) throw setRes.error;
    setText("weekStatus", "Current week updated.");
    await requireData();
  } catch (err) {
    setText("weekStatus", err.message || "Could not update current week.", true);
  }
}

async function renderLeaderboard() {
  const lb = $("leaderboard");
  const all = $("allPredictions");
  lb.innerHTML = `<p class="muted">Loading...</p>`;
  all.innerHTML = "";
  try {
    const leaderboardRes = await state.supabase.from("leaderboard").select("player_name,total_points");
    if (leaderboardRes.error) throw leaderboardRes.error;
    const rows = leaderboardRes.data || [];
    lb.innerHTML = rows.length ? `<table><thead><tr><th>Position</th><th>Player</th><th>Points</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(r.player_name)}</td><td>${r.total_points}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">No scores yet.</p>`;
    const predictionsRes = await state.supabase.from("predictions").select(`id,players(name),weeks(week_number,title),technical:bakers!predictions_technical_winner_baker_id_fkey(name),star:bakers!predictions_star_baker_id_fkey(name),eliminated:bakers!predictions_eliminated_baker_id_fkey(name),handshake:bakers!predictions_handshake_baker_id_fkey(name)`).order("created_at", { ascending: false });
    if (predictionsRes.error) throw predictionsRes.error;
    const picks = predictionsRes.data || [];
    all.innerHTML = picks.length ? `<table><thead><tr><th>Player</th><th>Week</th><th>Technical</th><th>Star baker</th><th>Eliminated</th><th>Handshake</th></tr></thead><tbody>${picks.map((p) => `<tr><td>${escapeHtml(p.players?.name || "")}</td><td>Week ${p.weeks?.week_number || ""} - ${escapeHtml(p.weeks?.title || "")}</td><td>${escapeHtml(p.technical?.name || "")}</td><td>${escapeHtml(p.star?.name || "")}</td><td>${escapeHtml(p.eliminated?.name || "")}</td><td>${escapeHtml(p.handshake?.name || "No guess")}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">No picks entered yet.</p>`;
  } catch (err) {
    lb.innerHTML = `<p class="status error">${escapeHtml(err.message || "Could not load leaderboard.")}</p>`;
  }
}

async function loadResultForWeek() {
  if (!isAdmin()) return;
  try {
    const weekId = $("resultWeekSelect").value;
    const resultRes = await state.supabase.from("results").select("id, technical_winner_baker_id, star_baker_id, eliminated_baker_id").eq("week_id", weekId).maybeSingle();
    if (resultRes.error) throw resultRes.error;
    $("actualTechnical").value = resultRes.data?.technical_winner_baker_id || "";
    $("actualStarBaker").value = resultRes.data?.star_baker_id || "";
    $("actualEliminated").value = resultRes.data?.eliminated_baker_id || "";
    Array.from($("actualHandshakes").options).forEach((o) => (o.selected = false));
    if (resultRes.data?.id) {
      const hsRes = await state.supabase.from("result_handshakes").select("baker_id").eq("result_id", resultRes.data.id);
      if (hsRes.error) throw hsRes.error;
      const ids = new Set((hsRes.data || []).map((x) => x.baker_id));
      Array.from($("actualHandshakes").options).forEach((o) => (o.selected = ids.has(o.value)));
    }
  } catch (err) {
    setText("resultStatus", err.message || "Could not load result.", true);
  }
}

async function uploadPlayerPhoto(event) {
  event.preventDefault();
  if (!isAdmin()) return setText("playerPhotoStatus", "Admin access required.", true);

  try {
    const playerId = $("photoPlayerSelect").value;
    const file = $("playerPhotoFile").files[0];

    if (!file) throw new Error("Choose a file");

    const ext = file.name.split(".").pop();
    const path = `${playerId}.${ext}`;

    const upload = await state.supabase.storage
      .from(PLAYER_PHOTO_BUCKET)
      .upload(path, file, { upsert: true });

    if (upload.error) throw upload.error;

    const update = await state.supabase
      .from("players")
      .update({ avatar_path: path })
      .eq("id", playerId);

    if (update.error) throw update.error;

    setText("playerPhotoStatus", "Uploaded!");
    await renderLeaderboard();

  } catch (err) {
    setText("playerPhotoStatus", err.message, true);
  }
}

function switchTab(tabName) {
  if (tabName === "admin" && !isAdmin()) return;
  document.querySelectorAll(".tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tabName));
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.add("hidden"));
  $(`${tabName}Tab`).classList.remove("hidden");
  if (tabName === "leaderboard") renderLeaderboard();
  if (tabName === "admin") loadResultForWeek();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'\"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
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
  show("loginView", true);
  show("appView", false);
  show("logoutButton", false);
}

async function startApp() {
  const { data, error } = await state.supabase.auth.getUser();
  if (error) throw error;
  state.currentUser = data.user;
  show("loginView", false);
  show("appView", true);
  show("logoutButton", true);
  setText("loginStatus", "");
  handleAdminVisibility();
  switchTab("entry");
  await requireData();
  if (isAdmin()) await loadResultForWeek();
  await renderLeaderboard();
}

async function init() {
  if (!window.BAKEOFF_SUPABASE_URL || !window.BAKEOFF_SUPABASE_ANON_KEY) {
    show("setupWarning", true);
    return;
  }
  state.supabase = window.supabase.createClient(window.BAKEOFF_SUPABASE_URL, window.BAKEOFF_SUPABASE_ANON_KEY);
  $("loginForm").addEventListener("submit", handleLogin);
  $("logoutButton").addEventListener("click", logout);
  $("predictionForm").addEventListener("submit", savePrediction);
  $("loadExistingButton").addEventListener("click", loadExistingPrediction);
  $("resultForm").addEventListener("submit", saveResults);
  $("bakerForm").addEventListener("submit", addBaker);
  $("currentWeekForm").addEventListener("submit", setCurrentWeek);
  $("refreshButton").addEventListener("click", renderLeaderboard);
  $("resultWeekSelect").addEventListener("change", loadResultForWeek);
  $("playerPhotoForm").addEventListener("submit", uploadPlayerPhoto);
  document.querySelectorAll(".tab").forEach((btn) => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
  const { data } = await state.supabase.auth.getSession();
  if (data.session) await startApp();
}

document.addEventListener("DOMContentLoaded", init);

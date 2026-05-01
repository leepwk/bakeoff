function selectedAdminPlayer() {
  const select = document.getElementById("adminPlayerSelect");
  return state.players.find((player) => player.id === select?.value) || null;
}

function fillAdminPlayerEditor() {
  const select = document.getElementById("adminPlayerSelect");
  const nameInput = document.getElementById("adminPlayerName");
  const photoSelect = document.getElementById("photoPlayerSelect");
  if (!select || !nameInput) return;

  const previous = select.value;
  select.innerHTML = "";
  select.appendChild(option("", "Choose player", true));
  for (const player of state.players) select.appendChild(option(player.id, player.name, player.id === previous));

  const player = selectedAdminPlayer();
  nameInput.value = player?.name || "";
  if (photoSelect && player) photoSelect.value = player.id;
}

async function refreshAdminPlayerData() {
  const playersRes = await state.supabase.from("players").select("id, name, avatar_path").order("name");
  if (playersRes.error) throw playersRes.error;
  state.players = playersRes.data || [];
  fillPlayerSelect(document.getElementById("photoPlayerSelect"));
  fillAdminPlayerEditor();
  if (typeof loadPlayerNameOptions === "function") await loadPlayerNameOptions();
}

async function updateAdminPlayerName(event) {
  event.preventDefault();
  if (!isAdmin()) return setText("adminPlayerStatus", "Admin access required.", true);

  const player = selectedAdminPlayer();
  const newName = normaliseName(document.getElementById("adminPlayerName")?.value);
  if (!player) return setText("adminPlayerStatus", "Choose a player.", true);
  if (!newName) return setText("adminPlayerStatus", "Enter a player name.", true);

  try {
    setText("adminPlayerStatus", "Saving...");
    const update = await state.supabase.from("players").update({ name: newName }).eq("id", player.id);
    if (update.error) throw update.error;
    setText("adminPlayerStatus", "Player name updated.");
    await refreshAdminPlayerData();
    await renderLeaderboard();
  } catch (err) {
    setText("adminPlayerStatus", err.message || "Could not update player.", true);
  }
}

async function uploadAdminPlayerPhoto(event) {
  event.preventDefault();
  if (!isAdmin()) return setText("adminPlayerStatus", "Admin access required.", true);

  const player = selectedAdminPlayer();
  const file = document.getElementById("adminPlayerPhoto")?.files?.[0];
  if (!player) return setText("adminPlayerStatus", "Choose a player.", true);
  if (!file) return setText("adminPlayerStatus", "Choose a photo.", true);

  try {
    setText("adminPlayerStatus", "Uploading...");
    const ext = file.name.split(".").pop();
    const path = `${player.id}.${ext}`;
    const upload = await state.supabase.storage.from(PLAYER_PHOTO_BUCKET).upload(path, file, { upsert: true });
    if (upload.error) throw upload.error;
    const update = await state.supabase.from("players").update({ avatar_path: path }).eq("id", player.id);
    if (update.error) throw update.error;
    document.getElementById("adminPlayerPhoto").value = "";
    setText("adminPlayerStatus", "Player photo updated.");
    await refreshAdminPlayerData();
    await renderLeaderboard();
  } catch (err) {
    setText("adminPlayerStatus", err.message || "Could not upload photo.", true);
  }
}

async function deleteAdminPlayer() {
  if (!isAdmin()) return setText("adminPlayerStatus", "Admin access required.", true);

  const player = selectedAdminPlayer();
  if (!player) return setText("adminPlayerStatus", "Choose a player.", true);

  const ok = window.confirm(`Delete ${player.name}? This will also delete their picks because predictions are linked to players with cascade delete.`);
  if (!ok) return;

  try {
    setText("adminPlayerStatus", "Deleting...");
    if (player.avatar_path) {
      await state.supabase.storage.from(PLAYER_PHOTO_BUCKET).remove([player.avatar_path]);
    }
    const del = await state.supabase.from("players").delete().eq("id", player.id);
    if (del.error) throw del.error;
    setText("adminPlayerStatus", "Player deleted.");
    await refreshAdminPlayerData();
    await renderLeaderboard();
  } catch (err) {
    setText("adminPlayerStatus", err.message || "Could not delete player.", true);
  }
}

function addAdminPlayerSection() {
  const adminTab = document.getElementById("adminTab");
  if (!adminTab || document.getElementById("adminPlayerSection")) return;

  const section = document.createElement("section");
  section.id = "adminPlayerSection";
  section.className = "card";
  section.innerHTML = `
    <h2>Manage players</h2>
    <p class="muted">Edit a player's display name, replace their photo, or delete them.</p>
    <form id="adminPlayerNameForm" class="grid">
      <label>Player
        <select id="adminPlayerSelect" required></select>
      </label>
      <label>Name
        <input id="adminPlayerName" type="text" required>
      </label>
      <button type="submit">Update name</button>
      <button id="deleteAdminPlayerButton" class="secondary" type="button">Delete player</button>
    </form>
    <form id="adminPlayerPhotoForm" class="grid" style="margin-top:16px">
      <label class="span-two">Replace photo
        <input id="adminPlayerPhoto" type="file" accept="image/*" required>
      </label>
      <button type="submit">Update photo</button>
    </form>
    <p id="adminPlayerStatus" class="status"></p>
  `;

  adminTab.appendChild(section);

  document.getElementById("adminPlayerSelect")?.addEventListener("change", fillAdminPlayerEditor);
  document.getElementById("adminPlayerNameForm")?.addEventListener("submit", updateAdminPlayerName);
  document.getElementById("adminPlayerPhotoForm")?.addEventListener("submit", uploadAdminPlayerPhoto);
  document.getElementById("deleteAdminPlayerButton")?.addEventListener("click", deleteAdminPlayer);
}

const adminPlayersSwitchTab = switchTab;
switchTab = function (tabName) {
  adminPlayersSwitchTab(tabName);
  if (tabName === "admin" && isAdmin()) {
    addAdminPlayerSection();
    refreshAdminPlayerData().catch((err) => setText("adminPlayerStatus", err.message || "Could not load players.", true));
  }
};

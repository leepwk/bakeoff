function bakerPhotoUrl(avatarPath) {
  return publicPhotoUrl(avatarPath);
}

function bakerInformationHtml(information) {
  const paragraphs = String(information || "No information added yet.")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`).join("");
}

function bakerAvatarHtml(baker) {
  const url = bakerPhotoUrl(baker.avatar_path);
  if (!url) {
    const initial = escapeHtml((baker.name || "B").trim().charAt(0).toUpperCase() || "B");
    return `<div class="baker-avatar baker-avatar-placeholder" aria-hidden="true">${initial}</div>`;
  }

  return `<img class="baker-avatar" src="${escapeAttribute(url)}" alt="${escapeAttribute(baker.name || "Baker photo")}">`;
}

function renderBakersDirectory() {
  const el = $("bakersDirectory");
  if (!el) return;

  if (!state.bakers.length) {
    el.innerHTML = `<p class="muted">No bakers added yet.</p>`;
    return;
  }

  el.innerHTML = `
    <div class="baker-grid">
      ${state.bakers.map((baker) => `
        <article class="baker-card ${baker.is_active ? "" : "baker-card-eliminated"}">
          <div class="baker-card-header">
            ${bakerAvatarHtml(baker)}
            <div class="baker-card-heading">
              <h3>${escapeHtml(baker.name)}</h3>
              <span class="baker-status ${baker.is_active ? "active" : "eliminated"}">${baker.is_active ? "Active" : "Eliminated"}</span>
            </div>
          </div>
          <div class="baker-information muted">
            ${bakerInformationHtml(baker.information)}
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

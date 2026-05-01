function moveAllPicksNextToEntry() {
  const entryTab = document.getElementById("entryTab");
  const allPredictions = document.getElementById("allPredictions");
  if (!entryTab || !allPredictions || document.getElementById("entryAllPicksCard")) return;

  const style = document.createElement("style");
  style.textContent = `
    .entry-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(320px, 0.9fr);
      gap: 22px;
      align-items: start;
    }
    .entry-layout .card {
      margin-bottom: 0;
    }
    @media (max-width: 980px) {
      .entry-layout {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);

  const oldHeading = Array.from(document.querySelectorAll("#leaderboardTab h3"))
    .find((heading) => heading.textContent.trim().toLowerCase() === "all picks");
  oldHeading?.remove();

  const entryCard = document.createElement("section");
  entryCard.className = "card";
  while (entryTab.firstChild) entryCard.appendChild(entryTab.firstChild);

  const allPicksCard = document.createElement("section");
  allPicksCard.id = "entryAllPicksCard";
  allPicksCard.className = "card";
  allPicksCard.innerHTML = `<h2>All picks</h2>`;
  allPicksCard.appendChild(allPredictions);

  const layout = document.createElement("div");
  layout.className = "entry-layout";
  layout.appendChild(entryCard);
  layout.appendChild(allPicksCard);

  entryTab.classList.remove("card");
  entryTab.appendChild(layout);
}

document.addEventListener("DOMContentLoaded", moveAllPicksNextToEntry);

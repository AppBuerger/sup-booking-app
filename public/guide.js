"use strict";

const searchInput = document.getElementById("guideSearch");
const guideCards = Array.from(
  document.querySelectorAll(".guide-card")
);
const noSearchResults = document.getElementById("noSearchResults");
const searchResultMessage = document.getElementById(
  "searchResultMessage"
);
const currentYear = document.getElementById("currentYear");

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

function normalizeText(value) {
  return value
    .toLocaleLowerCase("de")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function filterGuide() {
  const searchTerm = normalizeText(searchInput.value);

  let visibleCards = 0;

  guideCards.forEach((card) => {
    const searchableText = normalizeText(
      `${card.textContent} ${card.dataset.search || ""}`
    );

    const isVisible =
      searchTerm === "" || searchableText.includes(searchTerm);

    card.hidden = !isVisible;

    if (isVisible) {
      visibleCards += 1;
    }
  });

  noSearchResults.hidden = visibleCards !== 0;

  if (searchTerm === "") {
    searchResultMessage.textContent = "";
    return;
  }

  if (visibleCards === 1) {
    searchResultMessage.textContent =
      "1 passender Bereich wurde gefunden.";
    return;
  }

  searchResultMessage.textContent =
    `${visibleCards} passende Bereiche wurden gefunden.`;
}

if (searchInput) {
  searchInput.addEventListener("input", filterGuide);
}
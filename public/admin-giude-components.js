function createPlaceCard(place) {
  const card = document.createElement("article");
  card.className = "place-card";

  const statusClass = place.is_active
    ? "place-status--active"
    : "place-status--inactive";

  const statusText = place.is_active
    ? "Aktiv"
    : "Inaktiv";

  card.innerHTML = `
    <div class="place-card__header">

      <div>

        <h3>${place.name}</h3>

        <p class="place-card__category">
          ${place.category || ""}
        </p>

      </div>

      <span class="place-status ${statusClass}">
        ${statusText}
      </span>

    </div>

    ${
      place.is_recommended
        ? `
        <div class="place-recommendation">
          ⭐ Gastgeber-Tipp
        </div>
      `
        : ""
    }

    <p class="place-card__description">
      ${place.description || ""}
    </p>

    <div class="place-card__actions">

      <button
        class="secondary-button"
        type="button">

        ✏️ Bearbeiten

      </button>

      <button
        class="secondary-button"
        type="button">

        👁 Aktiv/Inaktiv

      </button>

      <button
        class="secondary-button place-delete"
        type="button">

        🗑 Löschen

      </button>

    </div>
  `;

  return card;
}
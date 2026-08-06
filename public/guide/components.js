function createActionLink({
  href,
  text,
  icon = "",
  external = false,
}) {
  if (!href) {
    return null;
  }

  const link = document.createElement("a");

  link.className = "recommendation-button";
  link.href = href;
  link.textContent = icon
    ? `${icon} ${text}`
    : text;

  if (external) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }

  return link;
}

function createRecommendationCard(item) {
  const card = document.createElement("article");
  card.className = "recommendation-card";

  if (item.featured) {
    card.classList.add(
      "recommendation-card--featured"
    );
  }

  if (item.image) {
    const imageWrapper =
      document.createElement("div");

    imageWrapper.className =
      "recommendation-card__image-wrapper";

    const image = document.createElement("img");

    image.className =
      "recommendation-card__image";

    image.src = item.image;
    image.alt = item.imageAlt || item.name || "";
    image.loading = "lazy";

    imageWrapper.appendChild(image);
    card.appendChild(imageWrapper);
  }

  const content = document.createElement("div");
  content.className =
    "recommendation-card__content";

  const headingRow = document.createElement("div");
  headingRow.className =
    "recommendation-card__heading";

  const title = document.createElement("h2");
  title.textContent = item.name || "";

  headingRow.appendChild(title);

  if (item.hostRecommendation) {
    const badge = document.createElement("span");

    badge.className =
      "recommendation-card__badge";

    badge.textContent =
      guideTranslate("ourRecommendation");

    headingRow.appendChild(badge);
  }

  content.appendChild(headingRow);

  const metaValues = [
    item.category,
    item.priceLevel,
    item.distance,
  ].filter(Boolean);

  if (metaValues.length > 0) {
    const meta = document.createElement("p");

    meta.className =
      "recommendation-card__meta";

    meta.textContent = metaValues.join(" • ");

    content.appendChild(meta);
  }

  if (item.description) {
    const description =
      document.createElement("p");

    description.className =
      "recommendation-card__description";

    description.textContent =
      item.description;

    content.appendChild(description);
  }

  if (item.statusText) {
    const status = document.createElement("p");

    status.className =
      "recommendation-card__status";

    if (item.statusType) {
      status.classList.add(
        `recommendation-card__status--${item.statusType}`
      );
    }

    status.textContent = item.statusText;

    content.appendChild(status);
  }

  const actions = document.createElement("div");

  actions.className =
    "recommendation-card__actions";

  const actionLinks = [
    createActionLink({
      href: item.maps,
      text: guideTranslate("navigation"),
      icon: "📍",
      external: true,
    }),

    createActionLink({
      href: item.website,
      text: guideTranslate("website"),
      icon: "🌐",
      external: true,
    }),

    createActionLink({
      href: item.phone
        ? `tel:${item.phone}`
        : "",
      text: guideTranslate("call"),
      icon: "☎",
    }),
  ].filter(Boolean);

  actionLinks.forEach((link) => {
    actions.appendChild(link);
  });

  if (actionLinks.length > 0) {
    content.appendChild(actions);
  }

  card.appendChild(content);

  return card;
}

function renderRecommendationList(
  targetElement,
  items
) {
  targetElement.innerHTML = "";

  if (!Array.isArray(items) || items.length === 0) {
    const emptyState = document.createElement("div");

    emptyState.className = "empty-state";
    emptyState.textContent =
      guideTranslate("noRecommendations");

    targetElement.appendChild(emptyState);
    return;
  }

  items.forEach((item) => {
    targetElement.appendChild(
      createRecommendationCard(item)
    );
  });
}
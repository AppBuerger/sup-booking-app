function createPlacesSection({
  title,
  description = "",
  icon = "",
  items = [],
}) {
  const section = document.createElement("section");
  section.className = "places-section";

  const heading = document.createElement("div");
  heading.className = "places-section__heading";

  const titleRow = document.createElement("div");
  titleRow.className = "places-section__title-row";

  if (icon) {
    const iconElement = document.createElement("span");
    iconElement.className = "places-section__icon";
    iconElement.textContent = icon;
    titleRow.appendChild(iconElement);
  }

  const titleElement = document.createElement("h2");
  titleElement.textContent = title;
  titleRow.appendChild(titleElement);

  heading.appendChild(titleRow);

  if (description) {
    const descriptionElement = document.createElement("p");
    descriptionElement.textContent = description;
    heading.appendChild(descriptionElement);
  }

  const list = document.createElement("div");
  list.className = "recommendation-list";

  renderRecommendationList(list, items);

  section.appendChild(heading);
  section.appendChild(list);

  return section;
}

function renderPlacesPage(targetElement, sections) {
  targetElement.innerHTML = "";

  if (!Array.isArray(sections) || sections.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent =
      guideTranslate("noRecommendations");

    targetElement.appendChild(emptyState);
    return;
  }

  sections.forEach((sectionData) => {
    targetElement.appendChild(
      createPlacesSection(sectionData)
    );
  });
}
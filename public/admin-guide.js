const categoryButtons =
  document.querySelectorAll("[data-section]");

const selectedSectionTitle =
  document.getElementById(
    "selectedSectionTitle"
  );

const newPlaceButton =
  document.getElementById(
    "newPlaceButton"
  );

const placesAdminList =
  document.getElementById(
    "placesAdminList"
  );

const placesMessage =
  document.getElementById(
    "placesMessage"
  );

const placeSearch =
  document.getElementById(
    "placeSearch"
  );

const activePlaceCount =
  document.getElementById(
    "activePlaceCount"
  );

const inactivePlaceCount =
  document.getElementById(
    "inactivePlaceCount"
  );

const sectionCount =
  document.getElementById(
    "sectionCount"
  );

const sectionTitles = {
  all: "Alle Einträge",
  restaurants: "Restaurants",
  breakfast: "Frühstück",
  cafes: "Cafés",
  shopping: "Einkaufen",
  bakeries: "Bäckereien",
  regional: "Regionale Produkte",
  excursions: "Freizeit & Ausflüge",
  mobility: "Mobilität",
  doctors: "Ärzte",
  pharmacies: "Apotheken",
};

let selectedSection = "all";
let allPlaces = [];

function showAdminMessage(
  text,
  type = "error"
) {
  placesMessage.textContent = text;
  placesMessage.className =
    `admin-message show ${type}`;
}

function clearAdminMessage() {
  placesMessage.textContent = "";
  placesMessage.className =
    "admin-message";
}

function createEmptyAdminState(text) {
  const emptyState =
    document.createElement("div");

  emptyState.className =
    "empty-admin-state";

  emptyState.innerHTML = `
    <span aria-hidden="true">📍</span>
    <h3>${text}</h3>
  `;

  return emptyState;
}

function updateSummary() {
  const activePlaces =
    allPlaces.filter(
      (place) => place.is_active
    );

  const inactivePlaces =
    allPlaces.filter(
      (place) => !place.is_active
    );

  const sections =
    new Set(
      allPlaces.map(
        (place) => place.section
      )
    );

  activePlaceCount.textContent =
    activePlaces.length;

  inactivePlaceCount.textContent =
    inactivePlaces.length;

  sectionCount.textContent =
    sections.size;
}

function getFilteredPlaces() {
  const searchTerm =
    placeSearch.value
      .trim()
      .toLowerCase();

  return allPlaces.filter((place) => {
    const matchesSection =
      selectedSection === "all" ||
      place.section === selectedSection;

    const searchableText = [
      place.name,
      place.category,
      place.description,
      place.section,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !searchTerm ||
      searchableText.includes(
        searchTerm
      );

    return (
      matchesSection &&
      matchesSearch
    );
  });
}

function renderAdminPlaces() {
  placesAdminList.innerHTML = "";

  const filteredPlaces =
    getFilteredPlaces();

  if (filteredPlaces.length === 0) {
    placesAdminList.appendChild(
      createEmptyAdminState(
        "Für diese Auswahl sind noch keine Einträge vorhanden."
      )
    );

    return;
  }

  filteredPlaces.forEach((place) => {
    placesAdminList.appendChild(
      createPlaceCard(place)
    );
  });
}

async function loadAdminPlaces() {
  clearAdminMessage();

  placesAdminList.innerHTML = "";

  placesAdminList.appendChild(
    createEmptyAdminState(
      "Einträge werden geladen …"
    )
  );

  try {
    const response = await fetch(
      "/api/admin/places",
    {
      credentials: "same-origin",
    }
    );

    if (
      response.status === 401 ||
      response.status === 403
  ) {
      throw new Error(
        "Bitte melden Sie sich zuerst im Adminbereich an."
      );
    }

    if (!response.ok) {
      throw new Error(
        "Die Gästeguide-Einträge konnten nicht geladen werden."
      );
    }

    const places = await response.json();

    allPlaces = Array.isArray(places)
  ? places.map((place) => ({
      ...place,

      name:
        place.name_de ||
        place.name_en ||
        "",

      category:
        place.category_de ||
        place.category_en ||
        "",

      description:
        place.description_de ||
        place.description_en ||
        "",
    }))
  : [];

    updateSummary();
    renderAdminPlaces();
  } catch (error) {
    console.error(error);

    placesAdminList.innerHTML = "";

    showAdminMessage(
      error.message ||
      "Beim Laden ist ein Fehler aufgetreten."
    );

    placesAdminList.appendChild(
      createEmptyAdminState(
        "Die Einträge konnten nicht geladen werden."
      )
    );
  }
}

categoryButtons.forEach((button) => {
  button.addEventListener(
    "click",
    () => {
      selectedSection =
        button.dataset.section;

      categoryButtons.forEach(
        (categoryButton) => {
          categoryButton.classList.toggle(
            "active",
            categoryButton === button
          );
        }
      );

      selectedSectionTitle.textContent =
        sectionTitles[selectedSection] ||
        selectedSection;

      renderAdminPlaces();
    }
  );
});

placeSearch.addEventListener(
  "input",
  renderAdminPlaces
);

newPlaceButton.addEventListener(
  "click",
  () => {
    window.alert(
      "Das Formular zum Anlegen eines Eintrags wird im nächsten Schritt ergänzt."
    );
  }
);

loadAdminPlaces();
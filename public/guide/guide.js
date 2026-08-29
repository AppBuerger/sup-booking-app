const guideLanguageListeners = [];

const headerTarget =
  document.getElementById("portalHeader");

let currentGuideLanguage =
  new URLSearchParams(window.location.search)
    .get("lang") === "en"
    ? "en"
    : "de";

function guideTranslate(key) {
  return (
    guideTranslations[currentGuideLanguage]?.[key] ||
    guideTranslations.de[key] ||
    key
  );
}

function applyGuideTranslations() {
  document.documentElement.lang =
    currentGuideLanguage;

  document
    .querySelectorAll("[data-i18n]")
    .forEach((element) => {
      element.textContent =
        guideTranslate(element.dataset.i18n);
    });

  document
    .querySelectorAll("[data-language]")
    .forEach((button) => {
      const active =
        button.dataset.language ===
        currentGuideLanguage;

      button.classList.toggle("active", active);

      button.setAttribute(
        "aria-pressed",
        String(active)
      );
    });

  const url = new URL(window.location.href);

  url.searchParams.set(
    "lang",
    currentGuideLanguage
  );

  window.history.replaceState({}, "", url);
}

function initializeHeaderControls() {
  const menuButton =
    document.getElementById("menuButton");

  const navigation =
    document.getElementById("portalNavigation");

  menuButton.addEventListener("click", () => {
    const expanded =
      menuButton.getAttribute("aria-expanded") ===
      "true";

    menuButton.setAttribute(
      "aria-expanded",
      String(!expanded)
    );

    navigation.hidden = expanded;
  });

  document
    .querySelectorAll("[data-language]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        currentGuideLanguage =
          button.dataset.language;

        applyGuideTranslations();

        guideLanguageListeners.forEach(
            (listener) => listener()
    )});
    });
}

function addGuideLanguageListener(listener) {
  if (typeof listener === "function") {
    guideLanguageListeners.push(listener);
  }
}

async function loadHeader() {
  try {
    const response = await fetch(
      "components/header.html"
    );

    if (!response.ok) {
      throw new Error(
        "Header konnte nicht geladen werden."
      );
    }

    headerTarget.innerHTML =
      await response.text();

    initializeHeaderControls();
    applyGuideTranslations();
  } catch (error) {
    console.error(error);
  }
}

loadHeader();
const foodPlaces =
  document.getElementById("foodPlaces");

function renderFoodPlaces() {
  const languageData =
    placesData[currentGuideLanguage] ||
    placesData.de;

  renderPlacesPage(
    foodPlaces,
    languageData.food
  );
}

addGuideLanguageListener(
  renderFoodPlaces
);

renderFoodPlaces();
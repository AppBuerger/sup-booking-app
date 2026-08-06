const restaurantList =
  document.getElementById("restaurantList");

const restaurantData = {
  de: [
    {
      name: "Beispielrestaurant am See",
      category: "Regionale Küche",
      priceLevel: "€€",
      distance: "ca. 2 km",
      description:
        "Gemütliches Restaurant mit regionaler Küche und Blick auf den Wörthersee.",
      maps:
        "https://www.google.com/maps/search/?api=1&query=Krumpendorf+Restaurant",
      website: "",
      phone: "",
      image: "",
      featured: true,
      hostRecommendation: true,
    },

    {
      name: "Beispielpizzeria",
      category: "Italienisch",
      priceLevel: "€€",
      distance: "ca. 1 km",
      description:
        "Pizza, Pasta und mediterrane Gerichte in entspannter Atmosphäre.",
      maps:
        "https://www.google.com/maps/search/?api=1&query=Krumpendorf+Pizzeria",
      website: "",
      phone: "",
      image: "",
      featured: false,
      hostRecommendation: false,
    },
  ],

  en: [
    {
      name: "Example lakeside restaurant",
      category: "Regional cuisine",
      priceLevel: "€€",
      distance: "approx. 2 km",
      description:
        "A welcoming restaurant serving regional cuisine with views of Lake Wörthersee.",
      maps:
        "https://www.google.com/maps/search/?api=1&query=Krumpendorf+Restaurant",
      website: "",
      phone: "",
      image: "",
      featured: true,
      hostRecommendation: true,
    },

    {
      name: "Example pizzeria",
      category: "Italian",
      priceLevel: "€€",
      distance: "approx. 1 km",
      description:
        "Pizza, pasta and Mediterranean dishes in a relaxed atmosphere.",
      maps:
        "https://www.google.com/maps/search/?api=1&query=Krumpendorf+Pizzeria",
      website: "",
      phone: "",
      image: "",
      featured: false,
      hostRecommendation: false,
    },
  ],
};

function renderRestaurants() {
  const items =
    restaurantData[currentGuideLanguage] ||
    restaurantData.de;

  renderRecommendationList(
    restaurantList,
    items
  );
}

addGuideLanguageListener(
  renderRestaurants
);

renderRestaurants();
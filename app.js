const places = [
  {
    id: "seorak-high",
    name: "설악고등학교",
    category: "교육",
    emoji: "🏫",
    description: "지리 교사",
    address: "(24869) 강원특별자치도 속초시 청대로 219 (조양동)",
    lat: 38.1854316,
    lng: 128.5738129,
  },
];

const map = L.map("map", {
  zoomControl: true,
  scrollWheelZoom: true,
}).setView([places[0].lat, places[0].lng], 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
}).addTo(map);

const markers = new Map();
const placeList = document.getElementById("place-list");

function createEmojiIcon(emoji) {
  return L.divIcon({
    className: "emoji-marker",
    html: `<span class="emoji-marker__icon" aria-hidden="true">${emoji}</span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 36],
    popupAnchor: [0, -32],
  });
}

function createPopupContent(place) {
  return `
    <div class="popup-content">
      <span class="popup-content__emoji" aria-hidden="true">${place.emoji}</span>
      <h3>${place.name}</h3>
      <span class="category">${place.category}</span>
      <p class="popup-content__intro">${place.description}</p>
    </div>
  `;
}

function setActivePlace(placeId) {
  document.querySelectorAll(".place-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.id === placeId);
  });
}

function focusPlace(place) {
  setActivePlace(place.id);
  map.setView([place.lat, place.lng], 16, { animate: true });
  markers.get(place.id).openPopup();
}

places.forEach((place) => {
  const marker = L.marker([place.lat, place.lng], {
    icon: createEmojiIcon(place.emoji),
  }).addTo(map);
  marker.bindPopup(createPopupContent(place), {
    closeButton: true,
    minWidth: 220,
    maxWidth: 280,
  });
  markers.set(place.id, marker);

  const listItem = document.createElement("li");
  listItem.innerHTML = `
    <article class="place-card" data-id="${place.id}" tabindex="0" role="button" aria-label="${place.name} 보기">
      <h3>${place.name}</h3>
      <span class="category">${place.category}</span>
      <p class="description">${place.description}</p>
      <p class="address">${place.address}</p>
    </article>
  `;

  const card = listItem.querySelector(".place-card");
  card.addEventListener("click", () => focusPlace(place));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      focusPlace(place);
    }
  });

  marker.on("click", () => setActivePlace(place.id));

  placeList.appendChild(listItem);
});

if (places.length === 1) {
  focusPlace(places[0]);
} else {
  const bounds = L.latLngBounds(places.map((place) => [place.lat, place.lng]));
  map.fitBounds(bounds, { padding: [48, 48] });
}

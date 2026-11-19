/*
"Talk is cheap. Show me the code."
—Linus Torvalds
*/

// Palabas · WS1 TV Show Search code-along (TVmaze API, no key needed)
// Open DevTools (F12): keep the Console AND the Network tab open.
// Sample or live mode: see config.js.

// ---------- Given: page elements ----------
const form = document.getElementById("searchForm");
const input = document.getElementById("query");
const statusText = document.getElementById("status");
const results = document.getElementById("results");
const dialog = document.getElementById("details");
const detailsBody = document.getElementById("detailsBody");
const closeBtn = document.getElementById("closeDetails");
const modeBadge = document.getElementById("modeBadge");

// ---------- Given: the API's URLs ----------
const API = "https://api.tvmaze.com";

// Turns "Breaking Bad" into "breaking-bad" (used for the sample-data file names)
function slug(text) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// e.g. https://api.tvmaze.com/search/shows?q=breaking%20bad
function searchURL(query) {
  if (USE_SAMPLE_DATA) return `data/search/${slug(query)}.json`;
  return `${API}/search/shows?q=${encodeURIComponent(query)}`;
}

// e.g. https://api.tvmaze.com/shows/169
function showURL(id) {
  return USE_SAMPLE_DATA ? `data/shows/${id}.json` : `${API}/shows/${id}`;
}

// e.g. https://api.tvmaze.com/shows/169/cast
function castURL(id) {
  return USE_SAMPLE_DATA ? `data/cast/${id}.json` : `${API}/shows/${id}/cast`;
}

// e.g. https://api.tvmaze.com/shows/169/seasons
function seasonsURL(id) {
  return USE_SAMPLE_DATA ? `data/seasons/${id}.json` : `${API}/shows/${id}/seasons`;
}

// ---------- Given: helpers (no need to change) ----------

// Shows a message under the search box. type: "info", "loading" or "error"
function setStatus(message, type = "info") {
  statusText.textContent = message;
  statusText.className = "status " + type;
}

// Makes an element with an optional class and text: el("span", "year", "2008")
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// A poster <img>, or a placeholder when the show has no image (image is null)
function createPoster(show, size = "medium") {
  if (!show.image) {
    return el("span", "poster none", "No poster");
  }
  const img = el("img", "poster");
  img.src = show.image[size] || show.image.medium;
  img.alt = `Poster: ${show.name}`;
  img.loading = "lazy";
  img.addEventListener("error", () => img.replaceWith(el("span", "poster none", "No poster")));
  return img;
}

// "2008–2013", or "2016–" for a show that is still running
function yearRange(show) {
  const start = show.premiered ? show.premiered.slice(0, 4) : "?";
  const end = show.ended ? show.ended.slice(0, 4) : "";
  return `${start}–${end}`;
}

// TVmaze summaries contain HTML like "<p><b>Friends</b> follows…</p>".
// This keeps only the text. (Never put text from an API into innerHTML:
// if it contained a <script> or an onerror, it could run on your page.)
function stripTags(html) {
  if (!html) return "No summary yet.";
  return new DOMParser().parseFromString(html, "text/html").body.textContent;
}

// Close the details pop-up (Step 4) with the × button or by clicking outside it
closeBtn.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

// Show which mode we're in
modeBadge.textContent = USE_SAMPLE_DATA ? "Sample data" : "Live · TVmaze";
modeBadge.classList.toggle("live", !USE_SAMPLE_DATA);

// STEP 1 — Your first API request
// TODO: async function testRequest(): fetch searchURL("friends"), log the status and the JSON array

// This function requests Friends data and displays the response in the Console.
async function testRequest() {
  const url = searchURL("friends");

  console.log("Request:", url);

  const response = await fetch(url);

  console.log("Status:", response.status, "ok?", response.ok);

  const data = await response.json();

  console.log(data);
  console.log("How many:", data.length);
  console.log("First show:", data[0].show.name, data[0].show.premiered);
}


// STEP 2 — Search and show the results
// TODO: renderResults(items), searchShows(query), and a submit listener on the form

// This function clears the previous results and creates a poster card for each TV show.
function renderResults(items) {
  results.innerHTML = "";

  items.forEach((item) => {
    const show = item.show;

    const card = el("button", "card");
    card.type = "button";
    card.dataset.id = show.id;

    const rating = show.rating?.average;

    card.append(
      createPoster(show),
      el("span", "title", show.name),
      el("span", "year", yearRange(show)),
      el("span", "genres", show.genres.join(", ")),
      el("span", "rating", rating ? `★ ${rating}` : "Not rated yet")
    );

    results.appendChild(card);
  });
}

// This function fetches TV show search results and displays them as cards.


async function searchShows(query) {
  setStatus(`Searching for "${query}"…`, "loading");
  results.innerHTML = "";

  try {
    const data = await getJSON(searchURL(query));

    if (data.length === 0) {
      setStatus(`No shows found for "${query}".`, "error");
      return;
    }

    renderResults(data);

    const count = data.length;
    const showWord = count === 1 ? "show" : "shows";

    setStatus(
      `${count} ${showWord} found for "${query}".`,
      "success"
    );

  } catch (error) {
    setStatus(error.message, "error");
  }
}


// This listener handles the search form and ignores empty search inputs.
form.addEventListener("submit", (event) => {
  event.preventDefault();

  const query = input.value.trim();

  if (query === "") return;

  searchShows(query);
});
// STEP 3 — getJSON(): one careful helper for every request
// TODO: catch network errors, check 429 and response.ok; rewrite searchShows with try / catch and an empty-array check


async function getJSON(url) {
  let response;

  try {
    response = await fetch(url);
  } catch (networkError) {
    throw new Error(
      "Can't reach TVmaze. Check your internet, or use sample mode."
    );
  }

  if (response.status === 429) {
    throw new Error(
      "Too many requests (429). Wait 10 seconds and try again."
    );
  }

  if (!response.ok) {
    if (response.status === 404 && USE_SAMPLE_DATA) {
      throw new Error(
        "No matching sample file found. Try: friends, the office, breaking bad, stranger things, or sherlock."
      );
    }

    throw new Error(
      `Request failed (HTTP ${response.status}).`
    );
  }

  return response.json();
}



// STEP 4 — Click a show to see its details
// TODO: one click listener on #results, showDetails(id), renderDetails(show)

// This listener detects which show card was clicked.
results.addEventListener("click", (event) => {
  const card = event.target.closest(".card");

  if (!card || !results.contains(card)) return;

  showDetails(card.dataset.id);
});


// This function fetches show details, cast, and seasons at the same time.
async function showDetails(id) {
  detailsBody.textContent = "Loading details…";
  dialog.showModal();

  const startTime = performance.now();

  try {
    const [show, cast, seasons] = await Promise.all([
      getJSON(showURL(id)),
      getJSON(castURL(id)),
      getJSON(seasonsURL(id))
    ]);

    const elapsed = Math.round(performance.now() - startTime);
    console.log(`3 requests in ${elapsed} ms`);

    renderDetails(show, cast, seasons);

  } catch (error) {
    detailsBody.textContent = error.message;
  }
}

// STEP 5 — Promise.all: show + cast + seasons at the same time
// TODO: rewrite showDetails with Promise.all, and renderDetails(show, cast, seasons)

// This function displays show details, seasons, and cast members.
function renderDetails(show, cast, seasons) {
  detailsBody.replaceChildren();

  const poster = createPoster(show, "original");

  const name = el("h2", "detail-title", show.name);

  const network =
    show.network?.name ||
    show.webChannel?.name ||
    "Network unknown";

  const genres = show.genres?.join(", ") || "Genre unknown";

  const runtime = show.runtime ?? show.averageRuntime;
  const runtimeText = runtime ? `${runtime} min` : "Runtime unknown";

  const meta = el(
    "p",
    "detail-meta",
    `${yearRange(show)} · ${network} · ${genres} · ${runtimeText}`
  );

  const ratingValue = show.rating?.average;

  const rating = el(
    "p",
    "detail-rating",
    ratingValue == null ? "Not rated yet" : `★ ${ratingValue}`
  );

  const summary = el("p", "detail-summary");
  summary.textContent = stripTags(show.summary);

  // Display the number of seasons.
  const seasonCount = seasons.length;
  const seasonWord = seasonCount === 1 ? "season" : "seasons";

  const seasonInfo = el(
    "p",
    "detail-seasons",
    `${seasonCount} ${seasonWord}`
  );

  // Display up to 6 cast members.
  const castHeading = el("h3", "detail-heading", "Cast");
  const castList = el("ul", "detail-cast");

  if (cast.length === 0) {
    castList.appendChild(
      el("li", "", "No cast information available.")
    );
  } else {
    cast.slice(0, 6).forEach((member) => {
      const actor = member.person?.name || "Unknown actor";
      const character = member.character?.name || "Unknown character";

      const castItem = el(
        "li",
        "",
        `${actor} as ${character}`
      );

      castList.appendChild(castItem);
    });
  }

  const link = el("a", "tvmaze-link", "View on TVmaze");
  link.href = show.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  const info = el("div", "detail-info");

  info.append(
    name,
    meta,
    rating,
    seasonInfo,
    summary,
    castHeading,
    castList,
    link
  );

  const layout = el("div", "detail-layout");
  layout.append(poster, info);

  detailsBody.appendChild(layout);
}

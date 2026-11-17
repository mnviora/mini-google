/**
 * ============================================================================
 * Mini Google! (1998 Search Engine Prototype)
 * ----------------------------------------------------------------------------
 * An educational web application recreating Google's original 1998 homepage
 * and search results, demonstrating how PageRank revolutionized web search.
 *
 * Architecture:
 * 1. SHARED DATA: Single source of truth (PAGES array)
 * 2. UTILITY FUNCTIONS: Text tokenization, match counting, HTML escaping
 * 3. PURE ALGORITHMS (DOM-free):
 *    - keywordRank(pages, query)
 *    - pageRank(pages, d, maxIter, tol)
 *    - combinedRank(kwResults, prScores)
 *    - compareRankings(before, after)
 *    - surferStep(pageId, rng)
 * 4. DOM RENDERERS & CONTROLLERS:
 *    - Search results view (Mode 1 & Mode 2)
 *    - Comparison dashboard
 *    - Six-page interactive SVG network graph
 *    - Random surfer dice simulation state machine
 * ============================================================================
 */

/* ============================================================================
   1. SHARED DATA (Single Source of Truth)
   ============================================================================ */
/**
 * Six pages representing a miniature 1998 web graph.
 * Topology:
 *   1 -> [2, 3]  (outdegree = 2)
 *   2 -> [3]     (outdegree = 1)
 *   3 -> [1, 4]  (outdegree = 2)
 *   4 -> [3, 5]  (outdegree = 2)
 *   5 -> [6]     (outdegree = 1)
 *   6 -> [1]     (outdegree = 1)
 *
 * Page 6 is a keyword-stuffed spam page that only Page 5 links to.
 * This demonstrates how keyword counting ranks it #1 while PageRank ranks it low.
 */
const PAGES = [
  {
    id: 1,
    url: "http://www-db.stanford.edu/~backrub/",
    title: "The Anatomy of a Large-Scale Hypertextual Web Search Engine",
    content: "We present Google, a prototype of a large-scale search engine which makes heavy use of the structure present in hypertext. Google is designed to crawl and index the Web efficiently, introducing PageRank to produce satisfying search results.",
    links: [2, 3]
  },
  {
    id: 2,
    url: "http://www.stanford.edu/class/cs345/",
    title: "Web Mining, PageRank and Graph Structures",
    content: "Understanding hyperlink structures in modern web graphs. Hyperlinks and incoming links represent implicit endorsements between pages, enabling PageRank authority ranking beyond simple keyword matching.",
    links: [3]
  },
  {
    id: 3,
    url: "http://www.w3.org/History/1992/hypertext/hypermedia.html",
    title: "The World Wide Web Project and Search Systems",
    content: "The WorldWideWeb is a wide-area hypermedia initiative. Universal access to linked documents provides the core graph topology essential for search, where hypertext links interconnect distributed pages.",
    links: [1, 4]
  },
  {
    id: 4,
    url: "http://www.ncsa.uiuc.edu/SDG/Software/Mosaic/",
    title: "NCSA Mosaic Browser and Search Overview",
    content: "Mosaic allows navigation across distributed web servers. Web directories and search indexes catalog documents by analyzing text content, hyperlinks, and metadata across pages.",
    links: [3, 5]
  },
  {
    id: 5,
    url: "http://directory.netscape.com/Computers/Internet/Searching/",
    title: "Directory of Web Search Portals and Links",
    content: "A curated web directory linking to prominent search engines, online catalogs, and informational ranking resources across the Internet.",
    links: [6]
  },
  {
    id: 6,
    url: "http://www.free-web-deals-1998.com/search-ranking.html",
    title: "Search Search Search Deals",
    content: "Search search search ranking ranking ranking best search deals! Find top search ranking bargains ranking search search ranking results here today!",
    links: [1]
  }
];

/* ============================================================================
   2. UTILITY FUNCTIONS
   ============================================================================ */

/**
 * Escapes HTML characters to prevent XSS.
 * @param {string} str - Raw string
 * @returns {string} Escaped string safe for HTML injection
 */
function escapeHTML(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[&<>'"]/g, char => {
    switch (char) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "'": return "&#39;";
      case '"': return "&quot;";
      default: return char;
    }
  });
}

/**
 * Splits text into lowercased alphanumeric word tokens.
 * @param {string} text - Raw input text
 * @returns {string[]} Array of word tokens
 */
function tokenize(text) {
  if (!text || typeof text !== "string") return [];
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(token => token.length > 0);
}

/**
 * Counts whole-word matches in a given text against query tokens.
 * @param {string} text - Text to search within
 * @param {string[]} queryTokens - Unique lowercased query terms
 * @returns {number} Number of whole-word matches
 */
function countMatches(text, queryTokens) {
  const words = tokenize(text);
  let count = 0;
  for (let i = 0; i < words.length; i++) {
    if (queryTokens.includes(words[i])) {
      count++;
    }
  }
  return count;
}

/* ============================================================================
   3. PURE ALGORITHMS (Free of DOM Code)
   ============================================================================ */

/**
 * MODE 1: BEFORE 1998 (KEYWORD SEARCH)
 * Ranks pages based on pure on-page keyword frequency and location heuristics.
 *
 * Algorithm:
 * 1. Tokenize query into unique terms.
 * 2. For each page, count exact whole-word occurrences in title and content.
 * 3. score = 2 * (title matches) + 1 * (content matches).
 * 4. Filter pages with score > 0.
 * 5. Sort descending by score; ties broken by page ID ascending.
 *
 * @param {Array} pages - Dataset of pages
 * @param {string} query - Raw search query string
 * @returns {Array} Ranked array of candidate result objects
 */
function keywordRank(pages, query) {
  const queryTokens = Array.from(new Set(tokenize(query)));
  if (queryTokens.length === 0) return [];

  const results = [];
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const titleHits = countMatches(page.title, queryTokens);
    const contentHits = countMatches(page.content, queryTokens);
    const totalHits = titleHits + contentHits;
    const score = (2 * titleHits) + (1 * contentHits);

    if (score > 0) {
      results.push({
        page,
        titleHits,
        contentHits,
        totalHits,
        score
      });
    }
  }

  // Sort descending by score; tie-break by page id ascending
  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.page.id - b.page.id;
  });

  // Assign 1-based ranks
  return results.map((item, index) => ({
    ...item,
    rank: index + 1
  }));
}

/**
 * MODE 2: PAGERANK ALGORITHM (Power Iteration)
 * Computes the stationary probability distribution of a random surfer
 * on the directed hyperlink graph.
 *
 * Mathematical Formula:
 * PR(j) = (1 - d) / N + d * ( sum_{i -> j} (PR(i) / outdegree(i)) + S_dangling / N )
 *
 * Where:
 * - d is the damping factor (standard 0.85).
 * - N is total pages in the graph.
 * - S_dangling is the sum of PageRanks of pages with outdegree 0.
 *
 * @param {Array} pages - Array of pages with their outgoing links
 * @param {number} d - Damping factor (default 0.85)
 * @param {number} maxIter - Maximum iterations (default 100)
 * @param {number} tol - Convergence tolerance (default 1e-10)
 * @returns {Object} { scores: Object, iterations: number, converged: boolean }
 */
function pageRank(pages, d = 0.85, maxIter = 100, tol = 1e-10) {
  const N = pages.length;
  if (N === 0) return { scores: {}, iterations: 0, converged: true };

  // Initialize uniform distribution: 1 / N for each page
  let pr = {};
  for (let i = 0; i < pages.length; i++) {
    pr[pages[i].id] = 1 / N;
  }

  let iter = 0;
  let converged = false;

  while (iter < maxIter && !converged) {
    iter++;
    const next = {};

    // Identify dangling pages (pages with 0 outgoing links)
    let danglingSum = 0;
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      if (!p.links || p.links.length === 0) {
        danglingSum += pr[p.id];
      }
    }

    // Power iteration step for each page j
    for (let j = 0; j < pages.length; j++) {
      const targetPage = pages[j];
      let incomingRankSum = 0;

      // Sum rank transferred from all pages i that link to j
      for (let i = 0; i < pages.length; i++) {
        const sourcePage = pages[i];
        if (sourcePage.links && sourcePage.links.includes(targetPage.id)) {
          incomingRankSum += pr[sourcePage.id] / sourcePage.links.length;
        }
      }

      // Add random teleportation probability + distributed dangling rank
      next[targetPage.id] = ((1 - d) / N) + d * (incomingRankSum + (danglingSum / N));
    }

    // Normalize iteration scores so they sum strictly to 1
    let sum = 0;
    for (const id in next) {
      sum += next[id];
    }
    if (sum > 0) {
      for (const id in next) {
        next[id] /= sum;
      }
    }

    // Check convergence: total absolute difference < tol
    let totalDelta = 0;
    for (const id in next) {
      totalDelta += Math.abs(next[id] - pr[id]);
    }

    pr = next;
    if (totalDelta < tol) {
      converged = true;
    }
  }

  return {
    scores: pr,
    iterations: iter,
    converged
  };
}

/**
 * MODE 2 COMBINED RANKING:
 * Combines keyword relevance with PageRank authority.
 *
 * Formula:
 * relevance = keyword_score / highest_keyword_score
 * pageRankNorm = PageRank / highest_PageRank
 * final_score = 0.3 * relevance + 0.7 * pageRankNorm
 *
 * @param {Array} kwResults - Output array from keywordRank
 * @param {Object} prScores - Map of pageId -> PageRank score
 * @returns {Array} Sorted array of combined ranked results
 */
function combinedRank(kwResults, prScores) {
  if (!kwResults || kwResults.length === 0) return [];

  // Find maximum values for normalization to [0, 1]
  const maxKw = Math.max(...kwResults.map(r => r.score));
  const maxPr = Math.max(...kwResults.map(r => prScores[r.page.id] || 0));

  const combined = kwResults.map(r => {
    const rawPr = prScores[r.page.id] || 0;
    const relevance = maxKw > 0 ? r.score / maxKw : 0;
    const prNorm = maxPr > 0 ? rawPr / maxPr : 0;
    const finalScore = (0.3 * relevance) + (0.7 * prNorm);

    return {
      ...r,
      relevance,
      pageRank: rawPr,
      pageRankNorm: prNorm,
      finalScore
    };
  });

  // Sort descending by finalScore; tie-break by page id ascending
  combined.sort((a, b) => {
    if (Math.abs(b.finalScore - a.finalScore) > 1e-9) {
      return b.finalScore - a.finalScore;
    }
    return a.page.id - b.page.id;
  });

  return combined.map((item, index) => ({
    ...item,
    rank: index + 1
  }));
}

/**
 * COMPARISON DASHBOARD LOGIC:
 * Compares pre-1998 keyword ranking against post-1998 combined PageRank.
 * Computes position changes (up/down/no-change) and generates explanation.
 *
 * @param {Array} before - Output of keywordRank
 * @param {Array} after - Output of combinedRank
 * @returns {Object} Comparison data and explanation
 */
function compareRankings(before, after) {
  if (!before || before.length === 0 || !after || after.length === 0) {
    return {
      empty: true,
      message: "No search results match the query to compare."
    };
  }

  const beforeMap = new Map();
  before.forEach(r => beforeMap.set(r.page.id, r.rank));

  const rows = after.map(r => {
    const prevRank = beforeMap.get(r.page.id);
    let change = 0;
    let changeText = "— (no change)";
    let changeClass = "change-none";
    let isChanged = false;

    if (prevRank !== undefined) {
      change = prevRank - r.rank; // Positive means moved up in ranking
      if (change > 0) {
        changeText = `↑ +${change}`;
        changeClass = "change-up";
        isChanged = true;
      } else if (change < 0) {
        changeText = `↓ ${change}`;
        changeClass = "change-down";
        isChanged = true;
      }
    }

    return {
      ...r,
      prevRank,
      change,
      changeText,
      changeClass,
      isChanged
    };
  });

  const topBefore = before[0];
  const topAfter = after[0];

  let explanation = "";
  if (topBefore.page.id !== topAfter.page.id) {
    const oldTopNewRank = rows.find(r => r.page.id === topBefore.page.id)?.rank || "N/A";
    explanation = `Before 1998, keyword frequency ranking places Page ${topBefore.page.id} ("${topBefore.page.title}") at #1 with a keyword frequency score of ${topBefore.score}. In contrast, after 1998, PageRank identifies Page ${topAfter.page.id} ("${topAfter.page.title}") as the most authoritative citation on the web graph (Final Score: ${topAfter.finalScore.toFixed(3)}, PageRank: ${topAfter.pageRank.toFixed(3)}), dropping Page ${topBefore.page.id} down to rank #${oldTopNewRank}. This difference demonstrates the critical flaw of pre-1998 search: keyword scoring only examines isolated text inside each document and is easily deceived by "keyword stuffing" (repeating query words without providing real substance). PageRank revolutionized search by treating hyperlinks as objective third-party citations, where links from authoritative, well-cited pages carry significantly more weight.`;
  } else {
    explanation = `Both methods placed Page ${topBefore.page.id} ("${topBefore.page.title}") at #1. However, PageRank reorganized the remaining search results according to global hyperlink citation authority rather than relying on on-page keyword repetition.`;
  }

  return {
    empty: false,
    rows,
    explanation
  };
}

/**
 * RANDOM SURFER SIMULATION STEP:
 * Simulates a single transition of a random web surfer using physical 6-sided dice rules.
 *
 * Rules:
 * 1. Roll a 6-sided die (1-6).
 * 2. If roll is 6 (teleportation):
 *    Surfer gets bored. Roll a second die (1-6) to choose the destination page.
 *    The first roll 6 is NOT counted as a visit to Page 6. Only the destination is visited.
 * 3. Otherwise (rolls 1-5):
 *    - 2 outgoing links: Odd roll (1, 3, 5) -> 1st link; Even roll (2, 4) -> 2nd link.
 *    - 1 outgoing link: Follow that single link directly.
 *    - 3+ outgoing links: Follow link index `(roll - 1) % count`.
 *    - 0 links: Jump to random page uniformly.
 *
 * @param {number} pageId - Current page ID (1-6)
 * @param {Function} [rng] - Optional custom RNG function for testing (returns 1-6 or 0-1)
 * @returns {Object} { d, d2, to, rule }
 */
function surferStep(pageId, rng) {
  const page = PAGES.find(p => p.id === pageId);
  if (!page) {
    throw new Error("Invalid pageId: " + pageId);
  }

  // Roll helper
  function rollDie() {
    if (typeof rng === "function") {
      const val = rng();
      if (Number.isInteger(val) && val >= 1 && val <= 6) {
        return val;
      }
      return Math.floor(val * 6) + 1;
    }
    return Math.floor(Math.random() * 6) + 1;
  }

  const d = rollDie();
  let d2 = null;
  let to = null;
  let rule = "";

  if (d === 6) {
    // Teleportation trigger: roll die a second time for destination page
    d2 = rollDie();
    to = d2;
    rule = `Teleportation (Roll 6 -> ${d2}): Surfer jumps randomly to Page ${d2}`;
  } else {
    const links = page.links || [];
    if (links.length === 0) {
      d2 = rollDie();
      to = d2;
      rule = `No outgoing links (dangling): Random jump to Page ${d2}`;
    } else if (links.length === 1) {
      to = links[0];
      rule = `Single link (Roll ${d}): Followed only outgoing link to Page ${to}`;
    } else if (links.length === 2) {
      if (d % 2 === 1) {
        to = links[0];
        rule = `Odd roll (${d}): Followed 1st outgoing link to Page ${to}`;
      } else {
        to = links[1];
        rule = `Even roll (${d}): Followed 2nd outgoing link to Page ${to}`;
      }
    } else {
      const idx = (d - 1) % links.length;
      to = links[idx];
      rule = `Multi-link (Roll ${d}): Followed link index ${idx} to Page ${to}`;
    }
  }

  return { d, d2, to, rule };
}

/* ============================================================================
   4. APPLICATION STATE & INITIALIZATION
   ============================================================================ */

// Compute theoretical PageRank once for the static graph
const COMPUTED_PAGERANK = pageRank(PAGES);

// Global UI State
const state = {
  query: "search ranking",
  mode: "pagerank", // "keyword" | "pagerank"
  selectedNodeId: null,
  surfer: {
    current: 1,
    step: 0,
    visits: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    log: [],
    running: false,
    intervalId: null
  }
};

/* ============================================================================
   5. DOM RENDERERS
   ============================================================================ */

/**
 * Renders the search results section for the current query and ranking mode.
 */
function renderSearchResults() {
  const container = document.getElementById("results-section");
  const valError = document.getElementById("validation-error");
  if (!container) return;

  const rawQuery = state.query.trim();
  const tokens = tokenize(rawQuery);

  // Validation: Check empty or punctuation-only input
  if (tokens.length === 0) {
    if (rawQuery.length > 0) {
      valError.textContent = "Error: Query contains no alphanumeric search terms. Please enter valid keywords.";
      valError.style.display = "block";
    } else {
      valError.textContent = "Error: Please enter a search query.";
      valError.style.display = "block";
    }
    container.innerHTML = `
      <div class="empty-results">
        <p>No search keywords provided. Please enter search terms in the box above.</p>
      </div>
    `;
    renderComparisonDashboard([], []);
    return;
  }

  // Hide validation error when input is valid
  valError.style.display = "none";
  valError.textContent = "";

  // Compute Keyword Ranking (Candidate Set)
  const kwResults = keywordRank(PAGES, rawQuery);

  // No matches found state
  if (kwResults.length === 0) {
    const escapedQ = escapeHTML(rawQuery);
    container.innerHTML = `
      <div class="empty-results">
        <p>Your search - <b>${escapedQ}</b> - did not match any documents.</p>
        <p>Suggestions:</p>
        <ul class="empty-suggestions">
          <li>Make sure all words are spelled correctly.</li>
          <li>Try different keywords such as: <strong>search</strong>, <strong>links</strong>, or <strong>pagerank</strong>.</li>
          <li>Try more general keywords.</li>
        </ul>
      </div>
    `;
    renderComparisonDashboard([], []);
    return;
  }

  // Compute PageRank Combined Ranking
  const combinedResults = combinedRank(kwResults, COMPUTED_PAGERANK.scores);

  // Update comparison dashboard simultaneously
  renderComparisonDashboard(kwResults, combinedResults);

  // Render according to selected mode
  let html = "";

  if (state.mode === "keyword") {
    // -------------------------------------------------------------
    // MODE 1: BEFORE 1998 (KEYWORD FREQUENCY SEARCH)
    // -------------------------------------------------------------
    html += `
      <div class="results-summary-bar">
        Showing search results for <b>${escapeHTML(rawQuery)}</b> (Mode: <strong>Before 1998 Keyword Matching</strong>). Found ${kwResults.length} matching pages.
      </div>
      <div class="results-list">
    `;

    kwResults.forEach(item => {
      html += `
        <article class="result-item">
          <div>
            <span class="result-rank-num">${item.rank}.</span>
            <a href="#network-graph" class="result-title result-link" data-page-id="${item.page.id}">
              ${escapeHTML(item.page.title)}
            </a>
          </div>
          <div class="result-snippet">${escapeHTML(item.page.content)}</div>
          <div class="result-url">${escapeHTML(item.page.url)}</div>
          <div class="result-meta">
            Matching keywords: <strong>${item.totalHits}</strong> (Title: ${item.titleHits}, Text: ${item.contentHits}) &nbsp;|&nbsp;
            Keyword Relevance Score: <strong>${item.score}</strong> (Formula: 2 &times; Title + 1 &times; Text)
          </div>
        </article>
      `;
    });

    html += `
      </div>
      <div class="algorithm-note">
        Note: This is a simplified educational illustration of early pre-1998 keyword-based ranking heuristics (frequency and location matching), not a claim that every pre-1998 engine used this exact formula.
      </div>
    `;
  } else {
    // -------------------------------------------------------------
    // MODE 2: AFTER 1998 (PAGERANK & COMBINED RANKING)
    // -------------------------------------------------------------
    html += `
      <div class="results-summary-bar">
        Showing search results for <b>${escapeHTML(rawQuery)}</b> (Mode: <strong>After 1998 PageRank Authority</strong>). Found ${combinedResults.length} matching pages.
      </div>
      <div class="results-formula-bar">
        <strong>Ranking Formula:</strong> <code>Final Score = 0.3 &times; Keyword Relevance + 0.7 &times; PageRank</code><br>
        <strong>Graph Analysis:</strong> Power iteration converged in <strong>${COMPUTED_PAGERANK.iterations}</strong> iterations (tolerance: 1e-10, damping factor: 0.85). Scores sum to 1.0.
      </div>
      <div class="results-list">
    `;

    combinedResults.forEach(item => {
      html += `
        <article class="result-item">
          <div>
            <span class="result-rank-num">${item.rank}.</span>
            <a href="#network-graph" class="result-title result-link" data-page-id="${item.page.id}">
              ${escapeHTML(item.page.title)}
            </a>
          </div>
          <div class="result-snippet">${escapeHTML(item.page.content)}</div>
          <div class="result-url">${escapeHTML(item.page.url)}</div>
          <div class="result-meta">
            Keyword Relevance: <strong>${item.relevance.toFixed(3)}</strong> (Score: ${item.score}) &nbsp;|&nbsp;
            PageRank: <strong>${item.pageRank.toFixed(4)}</strong> (Norm: ${item.pageRankNorm.toFixed(3)}) &nbsp;|&nbsp;
            <strong>Final Combined Score: ${item.finalScore.toFixed(3)}</strong>
          </div>
        </article>
      `;
    });

    html += `</div>`;

    // Mode 2 Table: Show PageRank for all six pages in the database
    html += `
      <h3 class="table-subtitle">PageRank Authority Table (All 6 Pages in Database)</h3>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>PR Rank</th>
              <th>Page ID</th>
              <th>Title</th>
              <th>Outgoing Links</th>
              <th>Inbound Citations</th>
              <th>PageRank Score</th>
              <th>Graph Share</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Sort all six pages by computed PageRank descending
    const sortedAllPages = [...PAGES].sort((a, b) => COMPUTED_PAGERANK.scores[b.id] - COMPUTED_PAGERANK.scores[a.id]);

    sortedAllPages.forEach((p, idx) => {
      const score = COMPUTED_PAGERANK.scores[p.id];
      const share = (score * 100).toFixed(1) + "%";
      const inbound = PAGES.filter(src => src.links.includes(p.id)).map(src => `Page ${src.id}`).join(", ") || "None";
      const outbound = p.links.map(dst => `Page ${dst}`).join(", ") || "None";

      html += `
        <tr>
          <td>#${idx + 1}</td>
          <td>Page ${p.id}</td>
          <td><strong>${escapeHTML(p.title)}</strong></td>
          <td>${outbound}</td>
          <td>${inbound}</td>
          <td><code>${score.toFixed(5)}</code></td>
          <td>${share}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
      <div class="algorithm-note">
        Notice how Page 3 and Page 1 command the highest PageRank because they receive high-value citations from authoritative peers, while the spam page (Page 6) receives only one link from Page 5.
      </div>
    `;
  }

  container.innerHTML = html;

  // Bind result title click events to select page in network graph
  const resultLinks = container.querySelectorAll(".result-link");
  resultLinks.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const pageId = parseInt(link.getAttribute("data-page-id"), 10);
      selectGraphNode(pageId);
      const graphSec = document.getElementById("network-graph");
      if (graphSec) {
        graphSec.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}

/**
 * Renders the Comparison Dashboard (side-by-side tables and explanatory text).
 * @param {Array} before - Keyword rank results
 * @param {Array} after - Combined PageRank results
 */
function renderComparisonDashboard(before, after) {
  const explanationBox = document.getElementById("comparison-explanation");
  const beforeBody = document.getElementById("before-table-body");
  const afterBody = document.getElementById("after-table-body");
  if (!explanationBox || !beforeBody || !afterBody) return;

  const comp = compareRankings(before, after);

  if (comp.empty) {
    explanationBox.textContent = comp.message;
    beforeBody.innerHTML = `<tr><td colspan="5" class="empty-cell">No matching pages to display.</td></tr>`;
    afterBody.innerHTML = `<tr><td colspan="6" class="empty-cell">No matching pages to display.</td></tr>`;
    return;
  }

  // Set explanatory narrative
  explanationBox.innerHTML = `<strong>Algorithmic Comparison Analysis:</strong><br>${escapeHTML(comp.explanation)}`;

  // Populate Before 1998 Table
  let beforeHTML = "";
  before.forEach(item => {
    // Check if this page's rank shifted in the combined ranking
    const afterItem = comp.rows.find(r => r.page.id === item.page.id);
    const rowClass = afterItem && afterItem.isChanged ? "row-changed" : "";

    beforeHTML += `
      <tr class="${rowClass}">
        <td>#${item.rank}</td>
        <td><strong>Page ${item.page.id}</strong>: ${escapeHTML(item.page.title.slice(0, 32))}...</td>
        <td>${item.titleHits}</td>
        <td>${item.contentHits}</td>
        <td><strong>${item.score}</strong></td>
      </tr>
    `;
  });
  beforeBody.innerHTML = beforeHTML;

  // Populate After 1998 Table
  let afterHTML = "";
  comp.rows.forEach(item => {
    const rowClass = item.isChanged ? "row-changed" : "";

    afterHTML += `
      <tr class="${rowClass}">
        <td>#${item.rank}</td>
        <td><strong>Page ${item.page.id}</strong>: ${escapeHTML(item.page.title.slice(0, 32))}...</td>
        <td>${item.relevance.toFixed(2)}</td>
        <td><code>${item.pageRank.toFixed(3)}</code></td>
        <td><strong>${item.finalScore.toFixed(3)}</strong></td>
        <td class="${item.changeClass}">${item.changeText}</td>
      </tr>
    `;
  });
  afterBody.innerHTML = afterHTML;
}

/**
 * Computes SVG geometry and renders the interactive six-page network graph.
 */
function renderNetworkGraph() {
  const edgesGroup = document.getElementById("graph-edges-group");
  const nodesGroup = document.getElementById("graph-nodes-group");
  if (!edgesGroup || !nodesGroup) return;

  edgesGroup.innerHTML = "";
  nodesGroup.innerHTML = "";

  // Circle layout configuration
  const cx = 300;
  const cy = 210;
  const radius = 140;
  const N = PAGES.length;

  // Min and Max PageRank for scaling node radius
  const prValues = Object.values(COMPUTED_PAGERANK.scores);
  const minPR = Math.min(...prValues);
  const maxPR = Math.max(...prValues);

  // Calculate coordinates and node radius for each page
  const nodeCoords = {};
  PAGES.forEach((page, i) => {
    // Arrange in a circle with Page 1 at the top (-90 degrees)
    const angle = (i * (2 * Math.PI / N)) - (Math.PI / 2);
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);

    // Scale radius linearly between 20px and 34px based on PageRank
    const pr = COMPUTED_PAGERANK.scores[page.id];
    const nodeR = 20 + ((pr - minPR) / (maxPR - minPR || 1)) * 14;

    nodeCoords[page.id] = { x, y, r: nodeR, page, pr };
  });

  // Render curved directed edges
  PAGES.forEach(source => {
    const src = nodeCoords[source.id];
    source.links.forEach(targetId => {
      const dst = nodeCoords[targetId];
      if (!dst) return;

      // Normal vector to create curve and prevent overlap on reciprocal links (e.g. 1<->3)
      const dx = dst.x - src.x;
      const dy = dst.y - src.y;
      const dist = Math.hypot(dx, dy);
      const nx = -dy / dist;
      const ny = dx / dist;

      // Curve offset perpendicular to straight line
      const curveOffset = 26;
      const qx = ((src.x + dst.x) / 2) + (nx * curveOffset);
      const qy = ((src.y + dst.y) / 2) + (ny * curveOffset);

      // Start point at source node boundary
      const ux = qx - src.x;
      const uy = qy - src.y;
      const uDist = Math.hypot(ux, uy);
      const startX = src.x + (ux / uDist) * (src.r + 2);
      const startY = src.y + (uy / uDist) * (src.r + 2);

      // End point at destination node boundary (leave room for arrowhead marker)
      const vx = dst.x - qx;
      const vy = dst.y - qy;
      const vDist = Math.hypot(vx, vy);
      const endX = dst.x - (vx / vDist) * (dst.r + 6);
      const endY = dst.y - (vy / vDist) * (dst.r + 6);

      // Determine highlight classes based on selection
      let edgeClass = "graph-edge";
      let markerId = "url(#arrow-default)";

      if (state.selectedNodeId !== null) {
        if (source.id === state.selectedNodeId) {
          // Outgoing from selected node
          edgeClass += " edge-outgoing";
          markerId = "url(#arrow-outgoing)";
        } else if (targetId === state.selectedNodeId) {
          // Incoming to selected node
          edgeClass += " edge-incoming";
          markerId = "url(#arrow-incoming)";
        } else {
          // Unrelated edge: dim
          edgeClass += " edge-dimmed";
        }
      }

      const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathElem.setAttribute("d", `M ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${qx.toFixed(1)} ${qy.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`);
      pathElem.setAttribute("class", edgeClass);
      pathElem.setAttribute("marker-end", markerId);
      pathElem.setAttribute("data-src", source.id);
      pathElem.setAttribute("data-dst", targetId);

      edgesGroup.appendChild(pathElem);
    });
  });

  // Render Nodes
  PAGES.forEach(page => {
    const node = nodeCoords[page.id];
    const isSelected = state.selectedNodeId === page.id;
    const isSurferCurrent = state.surfer.current === page.id;

    let nodeGroupClass = "graph-node";
    if (isSelected) nodeGroupClass += " node-selected";
    if (isSurferCurrent) nodeGroupClass += " node-surfer-current";

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", nodeGroupClass);
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    g.setAttribute("aria-label", `Page ${page.id}: ${page.title}. PageRank: ${node.pr.toFixed(3)}`);
    g.setAttribute("data-node-id", page.id);

    // Node Circle
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "node-circle");
    circle.setAttribute("cx", node.x.toFixed(1));
    circle.setAttribute("cy", node.y.toFixed(1));
    circle.setAttribute("r", node.r.toFixed(1));
    g.appendChild(circle);

    // Label: Page ID
    const textId = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textId.setAttribute("class", "node-text-id");
    textId.setAttribute("x", node.x.toFixed(1));
    textId.setAttribute("y", (node.y - 2).toFixed(1));
    textId.setAttribute("text-anchor", "middle");
    textId.textContent = `Page ${page.id}`;
    g.appendChild(textId);

    // Label: PageRank value
    const textPR = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textPR.setAttribute("class", "node-text-pr");
    textPR.setAttribute("x", node.x.toFixed(1));
    textPR.setAttribute("y", (node.y + 12).toFixed(1));
    textPR.setAttribute("text-anchor", "middle");
    textPR.textContent = `PR: ${node.pr.toFixed(2)}`;
    g.appendChild(textPR);

    // Event listeners: click and keyboard activation
    g.addEventListener("click", () => {
      toggleGraphNode(page.id);
    });

    g.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleGraphNode(page.id);
      }
    });

    nodesGroup.appendChild(g);
  });

  // Render detail panel for selected node
  renderPageDetail(state.selectedNodeId);
}

/**
 * Toggles selection of a graph node.
 * @param {number} nodeId - Page ID
 */
function toggleGraphNode(nodeId) {
  if (state.selectedNodeId === nodeId) {
    state.selectedNodeId = null;
  } else {
    state.selectedNodeId = nodeId;
  }
  renderNetworkGraph();
}

/**
 * Explicitly selects a graph node.
 * @param {number} nodeId - Page ID
 */
function selectGraphNode(nodeId) {
  state.selectedNodeId = nodeId;
  renderNetworkGraph();
}

/**
 * Renders the detail box below the network graph for the inspected node.
 * @param {number|null} nodeId - ID of selected page, or null if none selected
 */
function renderPageDetail(nodeId) {
  const box = document.getElementById("node-detail-box");
  if (!box) return;

  if (nodeId === null) {
    box.innerHTML = `
      <p class="detail-placeholder">Click any page node in the graph above (or click a search result title) to inspect its hyperlink citations, URL, content, and PageRank.</p>
    `;
    return;
  }

  const page = PAGES.find(p => p.id === nodeId);
  if (!page) return;

  const pr = COMPUTED_PAGERANK.scores[page.id];
  const sortedByPR = [...PAGES].sort((a, b) => COMPUTED_PAGERANK.scores[b.id] - COMPUTED_PAGERANK.scores[a.id]);
  const prRank = sortedByPR.findIndex(p => p.id === page.id) + 1;

  // Outgoing links
  const outgoingPages = page.links.map(dstId => {
    const dst = PAGES.find(p => p.id === dstId);
    return `Page ${dstId} ("${dst ? dst.title : ""}")`;
  });
  const outgoingText = outgoingPages.length > 0 ? outgoingPages.join("; ") : "None (dangling page)";

  // Incoming citations
  const incomingPages = PAGES.filter(src => src.links.includes(page.id)).map(src => {
    return `Page ${src.id} ("${src.title}")`;
  });
  const incomingText = incomingPages.length > 0 ? incomingPages.join("; ") : "None";

  box.innerHTML = `
    <h4>Page ${page.id}: ${escapeHTML(page.title)}</h4>
    <div class="detail-line"><strong>URL:</strong> <span class="result-url">${escapeHTML(page.url)}</span></div>
    <div class="detail-line"><strong>Content:</strong> ${escapeHTML(page.content)}</div>
    <div class="detail-line"><strong>Links to (Outgoing):</strong> ${escapeHTML(outgoingText)}</div>
    <div class="detail-line"><strong>Linked from (Incoming Citations):</strong> ${escapeHTML(incomingText)}</div>
    <div class="detail-line"><strong>Theoretical PageRank:</strong> <code>${pr.toFixed(5)}</code> (Rank #${prRank} of 6, ${(pr * 100).toFixed(1)}% share)</div>
    <div class="detail-actions">
      <button type="button" id="btn-deselect-node">Clear Selection</button>
    </div>
  `;

  const deselectBtn = document.getElementById("btn-deselect-node");
  if (deselectBtn) {
    deselectBtn.addEventListener("click", () => {
      state.selectedNodeId = null;
      renderNetworkGraph();
    });
  }
}

/* ============================================================================
   6. RANDOM SURFER DICE SIMULATION STATE MACHINE
   ============================================================================ */

/**
 * Updates the Random Surfer UI: counters, step log, status text, and controls.
 */
function updateSurferUI() {
  const statusElem = document.getElementById("surfer-status");
  const countersBody = document.getElementById("surfer-counters-body");
  const logBody = document.getElementById("surfer-log-body");
  const finalWrap = document.getElementById("surfer-final-wrap");

  // Update Status Text
  if (statusElem) {
    let stateLabel = "Ready";
    if (state.surfer.running) stateLabel = "Running auto-play";
    else if (state.surfer.step === 20) stateLabel = "Completed (20 steps reached)";
    else if (state.surfer.step > 0) stateLabel = "Paused";

    statusElem.textContent = `Status: ${stateLabel} (Step ${state.surfer.step} of 20, Current Page: ${state.surfer.current})`;
  }

  // Update Page Visit Counters Table
  if (countersBody) {
    let countersHTML = "";
    PAGES.forEach(page => {
      const isCurrent = state.surfer.current === page.id;
      const count = state.surfer.visits[page.id];
      const share = state.surfer.step > 0 ? ((count / state.surfer.step) * 100).toFixed(1) + "%" : "0.0%";
      const prScore = COMPUTED_PAGERANK.scores[page.id];
      const prShare = (prScore * 100).toFixed(1) + "%";

      countersHTML += `
        <tr class="${isCurrent ? "row-current-surfer" : ""}">
          <td><strong>Page ${page.id}</strong></td>
          <td>${escapeHTML(page.title.slice(0, 36))}...</td>
          <td>${isCurrent ? "<strong>[CURRENT SURFER LOCATION]</strong>" : "Idle"}</td>
          <td><strong>${count}</strong></td>
          <td>${share}</td>
          <td><code>${prShare}</code> (${prScore.toFixed(4)})</td>
        </tr>
      `;
    });
    countersBody.innerHTML = countersHTML;
  }

  // Update Step Log Table
  if (logBody) {
    if (state.surfer.log.length === 0) {
      logBody.innerHTML = `<tr><td colspan="5" class="empty-cell">Simulation not started yet. Click "Start" or "Step Forward".</td></tr>`;
    } else {
      let logHTML = "";
      state.surfer.log.forEach(item => {
        const diceStr = item.d === 6 ? `<strong>6 &rarr; ${item.d2}</strong> (Teleport)` : `<strong>${item.d}</strong>`;
        const destPage = PAGES.find(p => p.id === item.to);
        const destTitle = destPage ? destPage.title.slice(0, 26) : "";

        logHTML += `
          <tr>
            <td>#${item.step}</td>
            <td>Page ${item.from}</td>
            <td>${diceStr}</td>
            <td>${escapeHTML(item.rule)}</td>
            <td><strong>Page ${item.to}</strong> (${escapeHTML(destTitle)}...)</td>
          </tr>
        `;
      });
      logBody.innerHTML = logHTML;

      // Auto-scroll log table to bottom
      const logWrap = document.getElementById("surfer-log-wrap");
      if (logWrap) {
        logWrap.scrollTop = logWrap.scrollHeight;
      }
    }
  }

  // Manage visibility of Final Summary
  if (finalWrap) {
    if (state.surfer.step === 20) {
      finalWrap.style.display = "block";
      renderSurferFinalSummary();
    } else {
      finalWrap.style.display = "none";
    }
  }

  // Update controls state (button enables/disables)
  updateSurferControls();

  // Re-render network graph to keep red surfer outline aligned
  renderNetworkGraph();
}

/**
 * Updates enable/disable state of simulation control buttons.
 */
function updateSurferControls() {
  const startBtn = document.getElementById("surfer-start-btn");
  const pauseBtn = document.getElementById("surfer-pause-btn");
  const stepBtn = document.getElementById("surfer-step-btn");
  const resetBtn = document.getElementById("surfer-reset-btn");

  const isRunning = state.surfer.running;
  const isFinished = state.surfer.step >= 20;

  if (startBtn) startBtn.disabled = isRunning || isFinished;
  if (pauseBtn) pauseBtn.disabled = !isRunning;
  if (stepBtn) stepBtn.disabled = isRunning || isFinished;
  if (resetBtn) resetBtn.disabled = isRunning ? false : (state.surfer.step === 0 && state.surfer.current === 1);
}

/**
 * Performs exactly one transition step of the random surfer.
 */
function executeSurferStep() {
  if (state.surfer.step >= 20) return;

  const currentId = state.surfer.current;
  const stepResult = surferStep(currentId);

  state.surfer.step++;
  state.surfer.visits[stepResult.to]++;
  state.surfer.log.push({
    step: state.surfer.step,
    from: currentId,
    d: stepResult.d,
    d2: stepResult.d2,
    to: stepResult.to,
    rule: stepResult.rule
  });
  state.surfer.current = stepResult.to;

  if (state.surfer.step >= 20) {
    stopSurferAutoPlay();
  }

  updateSurferUI();
}

/**
 * Starts automatic execution of simulation steps every 700ms.
 */
function startSurferAutoPlay() {
  if (state.surfer.step >= 20) {
    resetSurferSimulation();
  }

  state.surfer.running = true;
  updateSurferControls();
  updateSurferUI();

  state.surfer.intervalId = setInterval(() => {
    executeSurferStep();
  }, 700);
}

/**
 * Pauses automatic simulation playback.
 */
function stopSurferAutoPlay() {
  if (state.surfer.intervalId) {
    clearInterval(state.surfer.intervalId);
    state.surfer.intervalId = null;
  }
  state.surfer.running = false;
  updateSurferControls();
}

/**
 * Resets simulation back to initial state (Page 1, 0 visits, 0 steps).
 */
function resetSurferSimulation() {
  stopSurferAutoPlay();
  state.surfer.current = 1;
  state.surfer.step = 0;
  state.surfer.visits = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  state.surfer.log = [];
  updateSurferUI();
}

/**
 * Renders the final 20-step ranking table comparing empirical visits against theoretical PageRank.
 */
function renderSurferFinalSummary() {
  const finalBody = document.getElementById("surfer-final-body");
  if (!finalBody) return;

  // Sort pages by empirical visit count descending, tie-break by theoretical PageRank
  const sortedPages = [...PAGES].sort((a, b) => {
    const visitDiff = state.surfer.visits[b.id] - state.surfer.visits[a.id];
    if (visitDiff !== 0) return visitDiff;
    return COMPUTED_PAGERANK.scores[b.id] - COMPUTED_PAGERANK.scores[a.id];
  });

  let html = "";
  sortedPages.forEach((page, idx) => {
    const visits = state.surfer.visits[page.id];
    const empiricalShare = ((visits / 20) * 100).toFixed(1) + "%";
    const pr = COMPUTED_PAGERANK.scores[page.id];
    const prShare = (pr * 100).toFixed(1) + "%";

    let analysis = "";
    if (page.id === 3 || page.id === 1) {
      analysis = "Authoritative hub/authority page with heavy incoming link traffic.";
    } else if (page.id === 6) {
      analysis = "Spam page: receives minimal random visits because only Page 5 points to it.";
    } else {
      analysis = "Intermediate navigation node.";
    }

    html += `
      <tr>
        <td>#${idx + 1}</td>
        <td><strong>Page ${page.id}</strong>: ${escapeHTML(page.title)}</td>
        <td><strong>${visits} / 20</strong></td>
        <td>${empiricalShare}</td>
        <td><code>${prShare}</code> (${pr.toFixed(4)})</td>
        <td>${analysis}</td>
      </tr>
    `;
  });

  finalBody.innerHTML = html;
}

/* ============================================================================
   7. EVENT BINDINGS & APP BOOTSTRAP
   ============================================================================ */

/**
 * Initializes all DOM event listeners and runs initial search query on load.
 */
function init() {
  const searchForm = document.getElementById("search-form");
  const queryInput = document.getElementById("query-input");
  const luckyBtn = document.getElementById("lucky-btn");
  const radioKeyword = document.getElementById("mode-keyword");
  const radioPageRank = document.getElementById("mode-pagerank");

  const surferStartBtn = document.getElementById("surfer-start-btn");
  const surferPauseBtn = document.getElementById("surfer-pause-btn");
  const surferStepBtn = document.getElementById("surfer-step-btn");
  const surferResetBtn = document.getElementById("surfer-reset-btn");

  // Search submission handler
  if (searchForm) {
    searchForm.addEventListener("submit", e => {
      e.preventDefault();
      state.query = queryInput ? queryInput.value : "";
      renderSearchResults();
    });
  }

  // Radio button mode switch handlers (immediate re-render without re-submitting)
  if (radioKeyword) {
    radioKeyword.addEventListener("change", () => {
      if (radioKeyword.checked) {
        state.mode = "keyword";
        renderSearchResults();
      }
    });
  }

  if (radioPageRank) {
    radioPageRank.addEventListener("change", () => {
      if (radioPageRank.checked) {
        state.mode = "pagerank";
        renderSearchResults();
      }
    });
  }

  // "I'm Feeling Lucky" button handler
  if (luckyBtn) {
    luckyBtn.addEventListener("click", () => {
      state.query = queryInput ? queryInput.value : "";
      const rawQuery = state.query.trim();
      const kw = keywordRank(PAGES, rawQuery);
      if (kw.length > 0) {
        const topResult = state.mode === "keyword" ? kw[0] : combinedRank(kw, COMPUTED_PAGERANK.scores)[0];
        if (topResult) {
          selectGraphNode(topResult.page.id);
          const detailBox = document.getElementById("node-detail-box");
          if (detailBox) {
            detailBox.scrollIntoView({ behavior: "smooth" });
          }
        }
      } else {
        renderSearchResults();
      }
    });
  }

  // Random Surfer button handlers
  if (surferStartBtn) {
    surferStartBtn.addEventListener("click", () => {
      startSurferAutoPlay();
    });
  }

  if (surferPauseBtn) {
    surferPauseBtn.addEventListener("click", () => {
      stopSurferAutoPlay();
    });
  }

  if (surferStepBtn) {
    surferStepBtn.addEventListener("click", () => {
      executeSurferStep();
    });
  }

  if (surferResetBtn) {
    surferResetBtn.addEventListener("click", () => {
      resetSurferSimulation();
    });
  }

  // Initial rendering
  renderNetworkGraph();
  updateSurferUI();
  renderSearchResults();
}

// Bootstrap on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

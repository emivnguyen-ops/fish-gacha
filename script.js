// =============================================
// 🐟 Fish Gacha — Game Logic + Firebase
// =============================================

// --- Firebase SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-analytics.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDv7Wbscgg7SIGcoG5vA_fs3OurZvtcjIY",
  authDomain: "letsgogambling-9acca.firebaseapp.com",
  projectId: "letsgogambling-9acca",
  storageBucket: "letsgogambling-9acca.firebasestorage.app",
  messagingSenderId: "878931539325",
  appId: "1:878931539325:web:552b2d3e7b66a5568fc814",
  measurementId: "G-3KV8KR4JKJ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// =============================================
// 🐠 FISH DATA — 20 fish across 4 rarities
// =============================================
const FISH = [
  // --- Common (55% pull rate) ---
  { id: "bluegill",      name: "Bluegill",      rarity: "common",   stars: 1, emoji: "🐟", value: 5,   desc: "A humble pond dweller. Nothing special, but reliable." },
  { id: "bass",          name: "Bass",           rarity: "common",   stars: 1, emoji: "🐟", value: 5,   desc: "The go-to catch for any angler. Puts up a decent fight!" },
  { id: "anchovy",       name: "Anchovy",        rarity: "common",   stars: 1, emoji: "🐟", value: 5,   desc: "Tiny but travels in enormous schools." },
  { id: "carp",          name: "Carp",           rarity: "common",   stars: 1, emoji: "🐟", value: 5,   desc: "Bottom-feeder with a heart of gold… scales." },
  { id: "crucian_carp",  name: "Crucian Carp",   rarity: "common",   stars: 1, emoji: "🐟", value: 5,   desc: "The most common fish in the pond. Classic." },

  // --- Uncommon (28% pull rate) ---
  { id: "koi",           name: "Koi",            rarity: "uncommon", stars: 2, emoji: "🎏", value: 15,  desc: "Beautiful patterns! Someone's missing their garden fish." },
  { id: "red_snapper",   name: "Red Snapper",    rarity: "uncommon", stars: 2, emoji: "🐠", value: 15,  desc: "A prized catch with striking red scales." },
  { id: "pufferfish",    name: "Pufferfish",     rarity: "uncommon", stars: 2, emoji: "🐡", value: 15,  desc: "Don't eat this one. Seriously." },
  { id: "squid",         name: "Squid",          rarity: "uncommon", stars: 2, emoji: "🦑", value: 15,  desc: "Shoots ink when startled. Very relatable." },
  { id: "catfish",       name: "Catfish",        rarity: "uncommon", stars: 2, emoji: "🐟", value: 15,  desc: "Whiskers for days. A bottom-dwelling legend." },

  // --- Rare (13% pull rate) ---
  { id: "tuna",          name: "Tuna",           rarity: "rare",     stars: 3, emoji: "🐟", value: 40,  desc: "A powerful open-ocean predator. Worth big bucks!" },
  { id: "blue_marlin",   name: "Blue Marlin",    rarity: "rare",     stars: 3, emoji: "🗡️", value: 40,  desc: "The ultimate trophy fish. What a catch!" },
  { id: "shark",         name: "Shark",          rarity: "rare",     stars: 3, emoji: "🦈", value: 40,  desc: "Dun dun… dun dun… dun dun dun dun!" },
  { id: "arapaima",      name: "Arapaima",       rarity: "rare",     stars: 3, emoji: "🐟", value: 40,  desc: "An ancient Amazonian giant. Living fossil vibes." },
  { id: "mahi_mahi",     name: "Mahi-Mahi",      rarity: "rare",     stars: 3, emoji: "🐠", value: 40,  desc: "Dazzling colors that fade fast. Catch the moment!" },

  // --- Legendary (4% pull rate) ---
  { id: "coelacanth",    name: "Coelacanth",     rarity: "legendary", stars: 4, emoji: "🐟", value: 100, desc: "Thought to be extinct! A living legend!" },
  { id: "golden_trout",  name: "Golden Trout",   rarity: "legendary", stars: 4, emoji: "✨", value: 100, desc: "Shimmers like pure gold. Incredibly rare!" },
  { id: "oarfish",       name: "Oarfish",        rarity: "legendary", stars: 4, emoji: "🐉", value: 100, desc: "A deep-sea serpent of myth. Absolutely massive!" },
  { id: "whale_shark",   name: "Whale Shark",    rarity: "legendary", stars: 4, emoji: "🦈", value: 100, desc: "The gentle giant of the sea. Breathtaking!" },
  { id: "barreleye",     name: "Barreleye",      rarity: "legendary", stars: 4, emoji: "👁️", value: 100, desc: "Its see-through head reveals a bizarre brain. Wow!" },
];

// Pull-rate weights (must add to 100)
const RARITY_WEIGHTS = {
  common: 55,
  uncommon: 28,
  rare: 13,
  legendary: 4,
};

const CAST_COST = 10;         // coins per cast
const STARTING_COINS = 100;   // coins for a new player
const MAX_HISTORY = 50;       // keep last N catches

// =============================================
// 🎮 GAME STATE
// =============================================
let player = {
  name: "",
  coins: STARTING_COINS,
  totalCatches: 0,
  collection: {},    // { fishId: { count, firstCaught } }
  catchHistory: [],  // [{ fishId, name, rarity, emoji, time }]
};

// =============================================
// 📌 DOM REFERENCES
// =============================================
const dom = {
  playerName:      document.getElementById("player-name-display"),
  coinDisplay:     document.getElementById("coin-display"),
  castBtn:         document.getElementById("cast-btn"),
  castMessage:     document.getElementById("cast-message"),
  switchBtn:       document.getElementById("switch-btn"),
  // Reveal overlay
  revealOverlay:   document.getElementById("reveal-overlay"),
  revealCard:      document.getElementById("reveal-card"),
  revealStars:     document.getElementById("reveal-stars"),
  revealEmoji:     document.getElementById("reveal-emoji"),
  revealName:      document.getElementById("reveal-name"),
  revealRarity:    document.getElementById("reveal-rarity"),
  revealDesc:      document.getElementById("reveal-desc"),
  revealValue:     document.getElementById("reveal-value"),
  revealDismiss:   document.getElementById("reveal-dismiss"),
  // Sections
  collectionCount: document.getElementById("collection-count"),
  collectionGrid:  document.getElementById("collection-grid"),
  historyList:     document.getElementById("history-list"),
  leaderboardList: document.getElementById("leaderboard-list"),
};

// =============================================
// 🎰 GACHA PULL LOGIC
// =============================================

/** Pick a random rarity based on weighted rates. */
function rollRarity() {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    cumulative += weight;
    if (roll < cumulative) return rarity;
  }
  return "common"; // fallback
}

/** Pick a random fish of the given rarity. */
function pullFish() {
  const rarity = rollRarity();
  const pool = FISH.filter((f) => f.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

// =============================================
// 🔥 FIREBASE — Save & Load
// =============================================

/** Save the current player data to Firestore. */
async function savePlayer() {
  try {
    // Convert player state to a plain JSON object for Firestore
    const data = {
      name: player.name,
      coins: player.coins,
      totalCatches: player.totalCatches,
      collection: player.collection,
      catchHistory: player.catchHistory,
    };
    await setDoc(doc(db, "players", player.name), data);
    console.log("💾 Saved to Firebase:", player.name);
  } catch (err) {
    console.error("Firebase save error:", err);
  }
}

/** Load a player from Firestore. Returns true if found. */
async function loadPlayer(name) {
  try {
    const snap = await getDoc(doc(db, "players", name));
    if (snap.exists()) {
      const data = snap.data();
      player.name = data.name;
      player.coins = data.coins ?? STARTING_COINS;
      player.totalCatches = data.totalCatches ?? 0;
      player.collection = data.collection ?? {};
      player.catchHistory = data.catchHistory ?? [];
      console.log("📂 Loaded from Firebase:", name);
      return true;
    }
    return false;
  } catch (err) {
    console.error("Firebase load error:", err);
    return false;
  }
}

/** Fetch all players for the leaderboard. */
async function fetchLeaderboard() {
  try {
    const snap = await getDocs(collection(db, "players"));
    const players = [];
    snap.forEach((d) => players.push(d.data()));
    // Sort by total catches descending
    players.sort((a, b) => (b.totalCatches ?? 0) - (a.totalCatches ?? 0));
    return players;
  } catch (err) {
    console.error("Firebase leaderboard error:", err);
    return [];
  }
}

// =============================================
// 🖥️ UI RENDERING
// =============================================

/** Update header info (name + coins). */
function updateHeader() {
  dom.playerName.textContent = `🎣 ${player.name}`;
  dom.coinDisplay.textContent = `💰 ${player.coins}`;
}

/** Render the full collection grid (all 20 fish, caught or silhouetted). */
function renderCollection() {
  const uniqueCount = Object.keys(player.collection).length;
  dom.collectionCount.textContent = `(${uniqueCount} / ${FISH.length})`;

  dom.collectionGrid.innerHTML = FISH.map((fish) => {
    const caught = player.collection[fish.id];
    const isCaught = !!caught;
    return `
      <div class="fish-card ${isCaught ? "caught " + fish.rarity : "uncaught"}">
        <div class="fc-emoji">${fish.emoji}</div>
        <div class="fc-name">${isCaught ? fish.name : "???"}</div>
        <div class="fc-count">${isCaught ? `×${caught.count}` : ""}</div>
      </div>`;
  }).join("");
}

/** Render the catch history (most recent first). */
function renderHistory() {
  if (player.catchHistory.length === 0) {
    dom.historyList.innerHTML = `<p class="empty-msg">No catches yet — cast your line!</p>`;
    return;
  }
  // Show newest first
  const items = [...player.catchHistory].reverse();
  dom.historyList.innerHTML = items
    .map((h) => {
      const timeStr = new Date(h.time).toLocaleTimeString();
      return `
        <div class="history-item">
          <span class="hi-emoji">${h.emoji}</span>
          <span class="hi-name">${h.name}</span>
          <span class="hi-time">${timeStr}</span>
        </div>`;
    })
    .join("");
}

/** Render the leaderboard from Firebase data. */
async function renderLeaderboard() {
  const leaders = await fetchLeaderboard();
  if (leaders.length === 0) {
    dom.leaderboardList.innerHTML = `<p class="empty-msg">No players yet!</p>`;
    return;
  }
  dom.leaderboardList.innerHTML = leaders
    .slice(0, 10) // top 10
    .map((p, i) => {
      const unique = p.collection ? Object.keys(p.collection).length : 0;
      return `
        <div class="lb-item">
          <span class="lb-rank">${i + 1}</span>
          <span class="lb-name">${p.name}</span>
          <span class="lb-stat">${p.totalCatches ?? 0} catches · ${unique} unique</span>
        </div>`;
    })
    .join("");
}

/** Show the fish-reveal overlay. */
function showReveal(fish) {
  // Set rarity class on card
  dom.revealCard.className = `rarity-${fish.rarity}`;
  // Stars
  dom.revealStars.textContent = "⭐".repeat(fish.stars);
  // Content
  dom.revealEmoji.textContent = fish.emoji;
  dom.revealName.textContent = fish.name;
  dom.revealRarity.textContent = fish.rarity;
  dom.revealRarity.className = `reveal-rarity ${fish.rarity}`;
  dom.revealDesc.textContent = `"${fish.desc}"`;
  dom.revealValue.textContent = `+${fish.value} coins earned!`;
  // Show
  dom.revealOverlay.classList.remove("hidden");
}

function hideReveal() {
  dom.revealOverlay.classList.add("hidden");
}

// =============================================
// 🎣 GAME ACTIONS
// =============================================

/** Cast the line — the core gacha pull! */
async function onCast() {
  // Check if player can afford it
  if (player.coins < CAST_COST) {
    // Give a small free refill so the player can keep playing
    player.coins += 50;
    dom.castMessage.textContent = "You were broke! Here's 50 coins on the house. 🎁";
    updateHeader();
    await savePlayer();
    return;
  }

  // Deduct cost
  player.coins -= CAST_COST;
  updateHeader();

  // Disable button + show casting state
  dom.castBtn.disabled = true;
  dom.castBtn.classList.add("casting");
  dom.castBtn.textContent = "🎣 Casting…";
  dom.castMessage.textContent = "Something's tugging on the line…";

  // Suspenseful delay
  await new Promise((r) => setTimeout(r, 1500));

  // Pull a fish!
  const fish = pullFish();

  // Add to collection
  if (player.collection[fish.id]) {
    player.collection[fish.id].count += 1;
  } else {
    player.collection[fish.id] = {
      count: 1,
      firstCaught: new Date().toISOString(),
    };
  }

  // Add to catch history (capped)
  player.catchHistory.push({
    fishId: fish.id,
    name: fish.name,
    rarity: fish.rarity,
    emoji: fish.emoji,
    time: new Date().toISOString(),
  });
  if (player.catchHistory.length > MAX_HISTORY) {
    player.catchHistory = player.catchHistory.slice(-MAX_HISTORY);
  }

  // Add coin reward + update stats
  player.coins += fish.value;
  player.totalCatches += 1;

  // Save to Firebase
  await savePlayer();

  // Update all UI
  updateHeader();
  renderCollection();
  renderHistory();
  renderLeaderboard(); // async, fires in background

  // Show the reveal card
  showReveal(fish);

  // Reset button
  dom.castBtn.disabled = false;
  dom.castBtn.classList.remove("casting");
  dom.castBtn.innerHTML = '🎣 Cast Line!<span class="cost"> (10 coins)</span>';
  dom.castMessage.textContent = "Cast your line and see what bites!";
}

// =============================================
// 🔑 PLAYER LOGIN (using prompt)
// =============================================

/** Ask for the player's name and load / create their data. */
async function loginPlayer() {
  let name = null;
  while (!name || !name.trim()) {
    name = prompt("🐟 Welcome to Fish Gacha!\n\nEnter your player name:");
    if (name === null) name = "Angler"; // if they cancel
  }
  name = name.trim();

  // Try to load existing data from Firebase
  const found = await loadPlayer(name);
  if (!found) {
    // Brand new player — set defaults
    player.name = name;
    player.coins = STARTING_COINS;
    player.totalCatches = 0;
    player.collection = {};
    player.catchHistory = [];
    await savePlayer();
    dom.castMessage.textContent = `Welcome, ${name}! You start with ${STARTING_COINS} coins. 🎉`;
  } else {
    dom.castMessage.textContent = `Welcome back, ${name}! Let's keep fishing. 🐟`;
  }

  // Refresh everything
  updateHeader();
  renderCollection();
  renderHistory();
  renderLeaderboard();
}

// =============================================
// 📎 EVENT LISTENERS
// =============================================
dom.castBtn.addEventListener("click", onCast);
dom.revealDismiss.addEventListener("click", hideReveal);
dom.revealOverlay.addEventListener("click", (e) => {
  // Dismiss if clicking outside the card
  if (e.target === dom.revealOverlay) hideReveal();
});
dom.switchBtn.addEventListener("click", loginPlayer);

// =============================================
// 🚀 INIT — Start the game
// =============================================
loginPlayer();

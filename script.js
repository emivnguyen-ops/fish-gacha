// =============================================
// 🐟 Fish Gacha — Game Logic + Minigame + Firebase
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

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// =============================================
// 🐠 FISH DATA — 20 fish across 4 rarities
// =============================================
const FISH = [
  // --- Common (55%) ---
  { id: "bluegill",     name: "Bluegill",    rarity: "common",    stars: 1, emoji: "🐟", value: 5,   desc: "A humble pond dweller. Nothing special, but reliable." },
  { id: "bass",         name: "Bass",        rarity: "common",    stars: 1, emoji: "🐟", value: 5,   desc: "The go-to catch for any angler. Puts up a decent fight!" },
  { id: "anchovy",      name: "Anchovy",     rarity: "common",    stars: 1, emoji: "🐟", value: 5,   desc: "Tiny but travels in enormous schools." },
  { id: "carp",         name: "Carp",        rarity: "common",    stars: 1, emoji: "🐟", value: 5,   desc: "Bottom-feeder with a heart of gold… scales." },
  { id: "crucian_carp", name: "Crucian Carp",rarity: "common",    stars: 1, emoji: "🐟", value: 5,   desc: "The most common fish in the pond. Classic." },
  // --- Uncommon (28%) ---
  { id: "koi",          name: "Koi",         rarity: "uncommon",  stars: 2, emoji: "🎏", value: 15,  desc: "Beautiful patterns! Someone's missing their garden fish." },
  { id: "red_snapper",  name: "Red Snapper", rarity: "uncommon",  stars: 2, emoji: "🐠", value: 15,  desc: "A prized catch with striking red scales." },
  { id: "pufferfish",   name: "Pufferfish",  rarity: "uncommon",  stars: 2, emoji: "🐡", value: 15,  desc: "Don't eat this one. Seriously." },
  { id: "squid",        name: "Squid",       rarity: "uncommon",  stars: 2, emoji: "🦑", value: 15,  desc: "Shoots ink when startled. Very relatable." },
  { id: "catfish",      name: "Catfish",     rarity: "uncommon",  stars: 2, emoji: "🐟", value: 15,  desc: "Whiskers for days. A bottom-dwelling legend." },
  // --- Rare (13%) ---
  { id: "tuna",         name: "Tuna",        rarity: "rare",      stars: 3, emoji: "🐟", value: 40,  desc: "A powerful open-ocean predator. Worth big bucks!" },
  { id: "blue_marlin",  name: "Blue Marlin", rarity: "rare",      stars: 3, emoji: "🗡️", value: 40,  desc: "The ultimate trophy fish. What a catch!" },
  { id: "shark",        name: "Shark",       rarity: "rare",      stars: 3, emoji: "🦈", value: 40,  desc: "Dun dun… dun dun… dun dun dun dun!" },
  { id: "arapaima",     name: "Arapaima",    rarity: "rare",      stars: 3, emoji: "🐟", value: 40,  desc: "An ancient Amazonian giant. Living fossil vibes." },
  { id: "mahi_mahi",    name: "Mahi-Mahi",   rarity: "rare",      stars: 3, emoji: "🐠", value: 40,  desc: "Dazzling colors that fade fast. Catch the moment!" },
  // --- Legendary (4%) ---
  { id: "coelacanth",   name: "Coelacanth",  rarity: "legendary", stars: 4, emoji: "🐟", value: 100, desc: "Thought to be extinct! A living legend!" },
  { id: "golden_trout", name: "Golden Trout",rarity: "legendary", stars: 4, emoji: "✨", value: 100, desc: "Shimmers like pure gold. Incredibly rare!" },
  { id: "oarfish",      name: "Oarfish",     rarity: "legendary", stars: 4, emoji: "🐉", value: 100, desc: "A deep-sea serpent of myth. Absolutely massive!" },
  { id: "whale_shark",  name: "Whale Shark", rarity: "legendary", stars: 4, emoji: "🦈", value: 100, desc: "The gentle giant of the sea. Breathtaking!" },
  { id: "barreleye",    name: "Barreleye",   rarity: "legendary", stars: 4, emoji: "👁️", value: 100, desc: "Its see-through head reveals a bizarre brain. Wow!" },
];

const RARITY_WEIGHTS = { common: 55, uncommon: 28, rare: 13, legendary: 4 };
const CAST_COST = 10;
const STARTING_COINS = 100;
const MAX_HISTORY = 50;

// =============================================
// 🎮 MINIGAME DIFFICULTY SETTINGS
// =============================================
// zoneSize  = catch zone as fraction of bar height
// speed     = max fish px per frame (at 60fps)
// dartRate  = chance per frame that fish picks a new target
// fillRate  = progress % gained per second when fish is in zone
// depleteRate = progress % lost per second when fish is out
const DIFFICULTY = {
  common:    { zoneSize: 0.35, speed: 1.8, dartRate: 0.012, fillRate: 28, depleteRate: 10 },
  uncommon:  { zoneSize: 0.28, speed: 2.8, dartRate: 0.020, fillRate: 24, depleteRate: 15 },
  rare:      { zoneSize: 0.22, speed: 3.8, dartRate: 0.030, fillRate: 20, depleteRate: 19 },
  legendary: { zoneSize: 0.15, speed: 5.0, dartRate: 0.045, fillRate: 17, depleteRate: 23 },
};

// Physics for the catch zone
const GRAVITY    = 0.35;   // px/frame² (pulls zone down)
const REEL_FORCE = -0.75;  // px/frame² (pushes zone up when clicking)
const DRAG       = 0.96;   // velocity multiplier each frame
const BOUNCE     = -0.3;   // velocity reversal at edges

// =============================================
// 🎮 GAME STATE
// =============================================
let player = {
  name: "",
  coins: STARTING_COINS,
  totalCatches: 0,
  collection: {},
  catchHistory: [],
};

// Minigame state
const mg = {
  active: false,
  fish: null,
  barHeight: 0,     // read from DOM
  // Catch zone
  zoneY: 0,
  zoneHeight: 0,
  zoneVelocity: 0,
  // Fish
  fishY: 0,
  fishTarget: 0,
  fishSize: 32,
  // Progress
  progress: 30,
  // Input
  reeling: false,
  // Animation
  animId: null,
  lastTime: 0,
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
  // Minigame
  mgOverlay:       document.getElementById("minigame-overlay"),
  mgContainer:     document.getElementById("mg-container"),
  mgFishEmoji:     document.getElementById("mg-fish-emoji"),
  mgFishName:      document.getElementById("mg-fish-name"),
  mgRarityBadge:   document.getElementById("mg-rarity-badge"),
  mgBar:           document.getElementById("mg-bar"),
  mgCatchZone:     document.getElementById("mg-catch-zone"),
  mgFishIcon:      document.getElementById("mg-fish-icon"),
  mgProgressFill:  document.getElementById("mg-progress-fill"),
  mgHint:          document.getElementById("mg-hint"),
  // Reveal
  revealOverlay:   document.getElementById("reveal-overlay"),
  revealCard:      document.getElementById("reveal-card"),
  revealStars:     document.getElementById("reveal-stars"),
  revealEmoji:     document.getElementById("reveal-emoji"),
  revealName:      document.getElementById("reveal-name"),
  revealRarity:    document.getElementById("reveal-rarity"),
  revealDesc:      document.getElementById("reveal-desc"),
  revealValue:     document.getElementById("reveal-value"),
  revealDismiss:   document.getElementById("reveal-dismiss"),
  // Got-away
  gotawayOverlay:  document.getElementById("gotaway-overlay"),
  gotawayDismiss:  document.getElementById("gotaway-dismiss"),
  // Sections
  collectionCount: document.getElementById("collection-count"),
  collectionGrid:  document.getElementById("collection-grid"),
  historyList:     document.getElementById("history-list"),
  leaderboardList: document.getElementById("leaderboard-list"),
  lbRefresh:       document.getElementById("lb-refresh"),
};

// =============================================
// 🎰 GACHA PULL LOGIC
// =============================================

function rollRarity() {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    cumulative += weight;
    if (roll < cumulative) return rarity;
  }
  return "common";
}

function pullFish() {
  const rarity = rollRarity();
  const pool = FISH.filter((f) => f.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

// =============================================
// 🔥 FIREBASE — Save & Load
// =============================================

async function savePlayer() {
  try {
    await setDoc(doc(db, "players", player.name), {
      name: player.name,
      coins: player.coins,
      totalCatches: player.totalCatches,
      collection: player.collection,
      catchHistory: player.catchHistory,
    });
    console.log("💾 Saved to Firebase:", player.name);
  } catch (err) {
    console.error("Firebase save error:", err);
  }
}

async function loadPlayer(name) {
  try {
    const snap = await getDoc(doc(db, "players", name));
    if (snap.exists()) {
      const data = snap.data();
      player.name         = data.name;
      player.coins        = data.coins ?? STARTING_COINS;
      player.totalCatches = data.totalCatches ?? 0;
      player.collection   = data.collection ?? {};
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

async function fetchLeaderboard() {
  try {
    const snap = await getDocs(collection(db, "players"));
    const players = [];
    snap.forEach((d) => players.push(d.data()));
    players.sort((a, b) => (b.totalCatches ?? 0) - (a.totalCatches ?? 0));
    return { ok: true, players };
  } catch (err) {
    console.error("Firebase leaderboard error:", err);
    return { ok: false, error: err.message || "Could not load leaderboard." };
  }
}

// =============================================
// 🖥️ UI RENDERING
// =============================================

function updateHeader() {
  dom.playerName.textContent = `🎣 ${player.name}`;
  dom.coinDisplay.textContent = `💰 ${player.coins}`;
}

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
        <div class="fc-count">${isCaught ? "×" + caught.count : ""}</div>
      </div>`;
  }).join("");
}

function renderHistory() {
  if (player.catchHistory.length === 0) {
    dom.historyList.innerHTML = `<p class="empty-msg">No catches yet — cast your line!</p>`;
    return;
  }
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

async function renderLeaderboard() {
  dom.leaderboardList.innerHTML = `<p class="empty-msg">Loading…</p>`;
  const result = await fetchLeaderboard();

  if (!result.ok) {
    // Show a helpful error message so the user knows what's wrong
    dom.leaderboardList.innerHTML = `
      <p class="error-msg">⚠️ Could not load leaderboard.</p>
      <p class="error-msg" style="font-size:0.8rem; margin-top:6px;">
        Make sure Firestore is enabled in your Firebase console and
        security rules allow reads. Error: ${result.error}
      </p>`;
    return;
  }

  const leaders = result.players;
  if (leaders.length === 0) {
    dom.leaderboardList.innerHTML = `<p class="empty-msg">No players yet! Be the first.</p>`;
    return;
  }
  dom.leaderboardList.innerHTML = leaders
    .slice(0, 10)
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

// =============================================
// 🐟 FISHING MINIGAME (Stardew Valley style)
// =============================================

/**
 * Start the fishing minigame for a given fish.
 * The player must keep the fish inside the green catch zone
 * by clicking/holding to reel up. Gravity pulls the zone down.
 * Fill the progress bar to 100% to catch the fish!
 */
function startMinigame(fish) {
  mg.fish = fish;
  mg.active = true;
  mg.reeling = false;
  mg.progress = 30; // start at 30%

  // Read bar height from DOM
  mg.barHeight = dom.mgBar.clientHeight;

  // Set catch zone size based on difficulty
  const diff = DIFFICULTY[fish.rarity];
  mg.zoneHeight = Math.round(mg.barHeight * diff.zoneSize);
  mg.zoneY = mg.barHeight / 2 - mg.zoneHeight / 2; // start in middle
  mg.zoneVelocity = 0;

  // Set fish starting position (random)
  mg.fishY = Math.random() * (mg.barHeight - mg.fishSize);
  mg.fishTarget = Math.random() * (mg.barHeight - mg.fishSize);

  // Set up the UI
  dom.mgFishEmoji.textContent = fish.emoji;
  dom.mgFishName.textContent = fish.name;
  dom.mgRarityBadge.textContent = fish.rarity;
  dom.mgRarityBadge.className = fish.rarity;
  dom.mgFishIcon.textContent = fish.emoji;

  // Set catch zone height
  dom.mgCatchZone.style.height = mg.zoneHeight + "px";

  // Show overlay
  dom.mgOverlay.classList.remove("hidden");

  // Start game loop
  mg.lastTime = performance.now();
  mg.animId = requestAnimationFrame(minigameLoop);
}

/** Main game loop — runs every frame via requestAnimationFrame. */
function minigameLoop(timestamp) {
  if (!mg.active) return;

  // Calculate delta time (normalized so 1.0 = one frame at 60fps)
  const rawDt = (timestamp - mg.lastTime) / 16.667;
  const dt = Math.min(rawDt, 3); // cap to prevent huge jumps
  mg.lastTime = timestamp;

  const diff = DIFFICULTY[mg.fish.rarity];
  const maxZoneY = mg.barHeight - mg.zoneHeight;
  const maxFishY = mg.barHeight - mg.fishSize;

  // --- Update catch zone physics ---
  if (mg.reeling) {
    mg.zoneVelocity += REEL_FORCE * dt;
  }
  mg.zoneVelocity += GRAVITY * dt;
  mg.zoneVelocity *= Math.pow(DRAG, dt);
  mg.zoneY += mg.zoneVelocity * dt;

  // Clamp + bounce at edges
  if (mg.zoneY < 0) {
    mg.zoneY = 0;
    mg.zoneVelocity *= BOUNCE;
  }
  if (mg.zoneY > maxZoneY) {
    mg.zoneY = maxZoneY;
    mg.zoneVelocity *= BOUNCE;
  }

  // --- Update fish AI ---
  // Move toward target
  const fishDiff = mg.fishTarget - mg.fishY;
  const step = Math.sign(fishDiff) * Math.min(Math.abs(fishDiff), diff.speed * dt);
  mg.fishY += step;

  // Randomly pick new target (more often for harder fish)
  if (Math.random() < diff.dartRate * dt || Math.abs(fishDiff) < 3) {
    mg.fishTarget = Math.random() * maxFishY;
  }

  // --- Check if fish is inside catch zone ---
  const fishCenter = mg.fishY + mg.fishSize / 2;
  const inZone = fishCenter >= mg.zoneY && fishCenter <= mg.zoneY + mg.zoneHeight;

  // --- Update progress ---
  // dt is in "frames at 60fps", so divide rates by 60 to get per-frame amounts
  if (inZone) {
    mg.progress += (diff.fillRate / 60) * dt;
  } else {
    mg.progress -= (diff.depleteRate / 60) * dt;
  }
  mg.progress = Math.max(0, Math.min(100, mg.progress));

  // --- Render minigame ---
  dom.mgCatchZone.style.top = mg.zoneY + "px";
  dom.mgCatchZone.className = inZone ? "active" : "miss";
  dom.mgFishIcon.style.top = mg.fishY + "px";
  dom.mgProgressFill.style.height = mg.progress + "%";
  dom.mgProgressFill.className = mg.progress < 20 ? "low" : "";

  // --- Check win / lose ---
  if (mg.progress >= 100) {
    endMinigame(true);
    return;
  }
  if (mg.progress <= 0) {
    endMinigame(false);
    return;
  }

  mg.animId = requestAnimationFrame(minigameLoop);
}

/** End the minigame — either caught or escaped. */
async function endMinigame(success) {
  mg.active = false;
  if (mg.animId) cancelAnimationFrame(mg.animId);

  // Hide minigame overlay
  dom.mgOverlay.classList.add("hidden");

  if (success) {
    // --- CAUGHT! ---
    const fish = mg.fish;

    // Add to collection
    if (player.collection[fish.id]) {
      player.collection[fish.id].count += 1;
    } else {
      player.collection[fish.id] = { count: 1, firstCaught: new Date().toISOString() };
    }

    // Add to catch history
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

    // Award coins
    player.coins += fish.value;
    player.totalCatches += 1;

    // Save + update UI
    await savePlayer();
    updateHeader();
    renderCollection();
    renderHistory();
    renderLeaderboard();

    // Show reveal card
    showReveal(fish);
  } else {
    // --- GOT AWAY ---
    // Coins were already deducted before the minigame started.
    await savePlayer();
    updateHeader();
    dom.gotawayOverlay.classList.remove("hidden");
  }

  // Re-enable cast button
  resetCastButton();
}

// --- Minigame input handlers ---
function startReeling(e) {
  e.preventDefault();
  mg.reeling = true;
}
function stopReeling(e) {
  e.preventDefault();
  mg.reeling = false;
}

// =============================================
// 🖥️ REVEAL / GOTAWAY OVERLAYS
// =============================================

function showReveal(fish) {
  dom.revealCard.className = `rarity-${fish.rarity}`;
  dom.revealStars.textContent = "⭐".repeat(fish.stars);
  dom.revealEmoji.textContent = fish.emoji;
  dom.revealName.textContent = fish.name;
  dom.revealRarity.textContent = fish.rarity;
  dom.revealRarity.className = `reveal-rarity ${fish.rarity}`;
  dom.revealDesc.textContent = `"${fish.desc}"`;
  dom.revealValue.textContent = `+${fish.value} coins earned!`;
  dom.revealOverlay.classList.remove("hidden");
}
function hideReveal()  { dom.revealOverlay.classList.add("hidden"); }
function hideGotaway() { dom.gotawayOverlay.classList.add("hidden"); }

// =============================================
// 🎣 CAST — the main action
// =============================================

function resetCastButton() {
  dom.castBtn.disabled = false;
  dom.castBtn.classList.remove("casting");
  dom.castBtn.innerHTML = '🎣 Cast Line!<span class="cost"> (10 coins)</span>';
  dom.castMessage.textContent = "Cast your line and see what bites!";
}

async function onCast() {
  // Check if player can afford it
  if (player.coins < CAST_COST) {
    player.coins += 50;
    dom.castMessage.textContent = "You were broke! Here's 50 free coins. 🎁";
    updateHeader();
    await savePlayer();
    return;
  }

  // Deduct cost immediately
  player.coins -= CAST_COST;
  updateHeader();

  // Disable button + show casting animation
  dom.castBtn.disabled = true;
  dom.castBtn.classList.add("casting");
  dom.castBtn.textContent = "🎣 Casting…";
  dom.castMessage.textContent = "Something's tugging on the line…";

  // Suspenseful delay
  await new Promise((r) => setTimeout(r, 1200));

  // Roll a fish
  const fish = pullFish();
  dom.castMessage.textContent = `A ${fish.rarity} shadow appears!`;

  // Brief pause before minigame
  await new Promise((r) => setTimeout(r, 600));

  // Start the minigame instead of instant reveal!
  startMinigame(fish);
}

// =============================================
// 🔑 PLAYER LOGIN
// =============================================

async function loginPlayer() {
  let name = null;
  while (!name || !name.trim()) {
    name = prompt("🐟 Welcome to Fish Gacha!\n\nEnter your player name:");
    if (name === null) name = "Angler";
  }
  name = name.trim();

  const found = await loadPlayer(name);
  if (!found) {
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

  updateHeader();
  renderCollection();
  renderHistory();
  renderLeaderboard();
}

// =============================================
// 📎 EVENT LISTENERS
// =============================================

// Cast button
dom.castBtn.addEventListener("click", onCast);

// Reveal overlay dismiss
dom.revealDismiss.addEventListener("click", hideReveal);
dom.revealOverlay.addEventListener("click", (e) => {
  if (e.target === dom.revealOverlay) hideReveal();
});

// Got-away overlay dismiss
dom.gotawayDismiss.addEventListener("click", hideGotaway);
dom.gotawayOverlay.addEventListener("click", (e) => {
  if (e.target === dom.gotawayOverlay) hideGotaway();
});

// Switch player
dom.switchBtn.addEventListener("click", loginPlayer);

// Leaderboard refresh
dom.lbRefresh.addEventListener("click", renderLeaderboard);

// Minigame reel input — mouse + touch on the WHOLE overlay so you can click anywhere
dom.mgOverlay.addEventListener("mousedown", startReeling);
dom.mgOverlay.addEventListener("mouseup", stopReeling);
dom.mgOverlay.addEventListener("mouseleave", stopReeling);
dom.mgOverlay.addEventListener("touchstart", startReeling, { passive: false });
dom.mgOverlay.addEventListener("touchend", stopReeling, { passive: false });
dom.mgOverlay.addEventListener("touchcancel", stopReeling);

// =============================================
// 🚀 INIT
// =============================================
loginPlayer();

const LEVELS = [
  { name: "NATURALE", heat: 20, co2: 280, temp: 0.0, description: "È presente l'effetto serra naturale, fondamentale per mantenere la Terra a una temperatura adatta alla vita." },
  { name: "BASSO", heat: 30, co2: 350, temp: 0.5, description: "Nel modello aumenta la quantità di energia infrarossa trattenuta rispetto al livello naturale." },
  { name: "MEDIO", heat: 40, co2: 420, temp: 1.2, description: "Una maggiore concentrazione di gas serra assorbe e riemette più radiazione infrarossa. Il modello rappresenta questo effetto in modo semplificato." },
  { name: "ALTO", heat: 50, co2: 500, temp: 2.0, description: "L'aumento dei gas serra intensifica l'effetto serra e contribuisce al riscaldamento globale." },
  { name: "MOLTO ALTO", heat: 60, co2: 600, temp: 3.0, description: "Il modello mostra una ritenzione ancora maggiore. Nella realtà la risposta del clima dipende da numerosi fattori e non segue una semplice scala lineare." }
];

const $ = (id) => document.getElementById(id);
let currentLevel = 2;
let supabaseClient = null;

function setLevel(level) {
  currentLevel = Math.max(0, Math.min(4, Number(level)));
  const data = LEVELS[currentLevel];
  $("gasSlider").value = currentLevel;
  $("levelValue").textContent = currentLevel;
  $("levelName").textContent = data.name;
  $("heatValue").textContent = data.heat;
  $("heatBar").style.width = `${data.heat}%`;
  $("co2Value").textContent = data.co2;
  $("tempValue").textContent = `+${data.temp.toFixed(1).replace(".", ",")}`;
  $("energyValue").textContent = 100 - data.heat;
  $("explanationText").textContent = data.description;
  $("heatDescription").textContent = currentLevel === 0
    ? "L'effetto serra naturale è indispensabile alla vita sulla Terra."
    : "Indicatore didattico: aumentando i gas serra, cresce la quota di infrarosso trattenuta nel modello.";
  $("decreaseBtn").disabled = currentLevel === 0;
  $("increaseBtn").disabled = currentLevel === 4;
  $("decreaseBtn").style.opacity = currentLevel === 0 ? ".45" : "1";
  $("increaseBtn").style.opacity = currentLevel === 4 ? ".45" : "1";
  renderGasParticles();
}

function renderGasParticles() {
  const container = $("gasParticles");
  container.innerHTML = "";
  const count = 4 + currentLevel * 5;
  const centerX = 53, centerY = 49, radius = 96;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const x = centerX + (Math.cos(angle) * radius / 390) * 100;
    const y = centerY + (Math.sin(angle) * radius / 390) * 100;
    const dot = document.createElement("span");
    dot.className = "gas-dot";
    dot.style.left = `${x}%`;
    dot.style.top = `${y}%`;
    dot.style.animationDelay = `${(i % 6) * -0.3}s`;
    container.appendChild(dot);
  }
}

function isConfigured() {
  const cfg = window.APP_CONFIG || {};
  return Boolean(window.supabase && cfg.supabaseUrl && cfg.supabaseKey &&
    !cfg.supabaseUrl.includes("INSERISCI_") && !cfg.supabaseKey.includes("INSERISCI_"));
}

function initializeSupabase() {
  if (!isConfigured()) {
    $("saveStatus").textContent = "Per salvare i risultati, configura URL e publishable key in assets/config.js.";
    $("dashboardStatus").textContent = "Modalità locale: il simulatore funziona, ma i dati non vengono salvati online.";
    $("saveBtn").disabled = true;
    $("saveBtn").style.opacity = ".55";
    return false;
  }
  supabaseClient = window.supabase.createClient(window.APP_CONFIG.supabaseUrl, window.APP_CONFIG.supabaseKey);
  $("saveBtn").disabled = false;
  $("saveBtn").style.opacity = "1";
  return true;
}

async function saveSimulation() {
  if (!supabaseClient) return;
  $("saveBtn").disabled = true;
  $("saveStatus").textContent = "Salvataggio in corso...";
  const row = { livello: currentLevel, calore_trattenuto: LEVELS[currentLevel].heat };
  const { error } = await supabaseClient.from("simulazioni").insert(row);
  $("saveBtn").disabled = false;
  if (error) {
    $("saveStatus").textContent = `Errore durante il salvataggio: ${error.message}`;
    return;
  }
  $("saveStatus").textContent = "Simulazione salvata correttamente.";
  await loadDashboard();
}

function renderChart(rows) {
  const counts = [0, 0, 0, 0, 0];
  rows.forEach(row => {
    const level = Number(row.livello);
    if (level >= 0 && level <= 4) counts[level]++;
  });
  const max = Math.max(1, ...counts);
  $("levelChart").innerHTML = counts.map((count, level) => `
    <div class="bar-row"><span>Livello ${level}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(count / max) * 100}%"></div></div>
      <span>${count}</span></div>`).join("");
}

function renderRecent(rows) {
  const body = $("recentRows");
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="3" class="empty-state">Ancora nessuna simulazione salvata.</td></tr>';
    return;
  }
  body.innerHTML = rows.slice(0, 8).map(row => {
    const date = row.created_at ? new Date(row.created_at).toLocaleString("it-IT", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
    }) : "—";
    return `<tr><td>Livello ${Number(row.livello)}</td><td>${Number(row.calore_trattenuto)}%</td><td>${date}</td></tr>`;
  }).join("");
}

async function loadDashboard() {
  if (!supabaseClient) return;
  $("dashboardStatus").textContent = "Caricamento dati...";
  const [countResult, rowsResult] = await Promise.all([
    supabaseClient.from("simulazioni").select("*", { count: "exact", head: true }),
    supabaseClient.from("simulazioni").select("livello, calore_trattenuto, created_at")
      .order("created_at", { ascending: false }).limit(500)
  ]);
  if (countResult.error || rowsResult.error) {
    $("dashboardStatus").textContent = `Impossibile caricare i dati: ${(countResult.error || rowsResult.error).message}`;
    return;
  }
  const rows = rowsResult.data || [];
  $("totalCount").textContent = countResult.count ?? rows.length;
  if (rows.length) {
    $("averageLevel").textContent = (rows.reduce((s, r) => s + Number(r.livello), 0) / rows.length).toFixed(1);
    $("averageHeat").textContent = `${(rows.reduce((s, r) => s + Number(r.calore_trattenuto), 0) / rows.length).toFixed(1)}%`;
  } else {
    $("averageLevel").textContent = "—";
    $("averageHeat").textContent = "—";
  }
  renderChart(rows);
  renderRecent(rows);
  $("dashboardStatus").textContent = `Dati aggiornati. Distribuzione basata sulle ${rows.length} simulazioni più recenti (massimo 500).`;
}

$("gasSlider").addEventListener("input", event => setLevel(event.target.value));
$("decreaseBtn").addEventListener("click", () => setLevel(currentLevel - 1));
$("increaseBtn").addEventListener("click", () => setLevel(currentLevel + 1));
$("saveBtn").addEventListener("click", saveSimulation);
$("refreshBtn").addEventListener("click", loadDashboard);

setLevel(2);
if (initializeSupabase()) loadDashboard();

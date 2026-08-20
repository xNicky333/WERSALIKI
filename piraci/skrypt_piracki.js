const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxvd5VOmnGB1pfrH-WqQs8QvyzuL7yB5AZApvunFVoXBn3YfDH2_L_vs_JYOzEpLg4I/exec';

// Ta sama nazwa użytkownika co przy logowaniu na stronie głównej (skrypt.js -> localStorage 'wersaliki_user')
const CURRENT_USER = (localStorage.getItem('wersaliki_user') || '').trim();

let crewStatus = {};
let allReady = false;

function getCrewCheckboxes() {
  return document.querySelectorAll('.crew-checkbox');
}

// Blokuje wszystkie checkboxy poza tym należącym do aktualnie zalogowanej osoby
function applyPermissions() {
  const checkboxes = getCrewCheckboxes();
  checkboxes.forEach(chk => {
    const player = chk.getAttribute('data-player');
    const label = chk.closest('.crew-label');
    const isOwner = CURRENT_USER !== '' && player.toLowerCase() === CURRENT_USER.toLowerCase();

    chk.disabled = !isOwner;
    if (label) label.classList.toggle('locked', !isOwner);
  });

  const hint = document.getElementById('sot-login-hint');
  if (hint) {
    hint.textContent = CURRENT_USER === ''
      ? 'Zaloguj się na stronie głównej, aby odznaczyć swój checkbox.'
      : '';
  }
}

// Ładujemy to z pamięci lokalnej (żeby nie było laga po wejściu)
function loadLocalState() {
  const checkboxes = getCrewCheckboxes();
  checkboxes.forEach(chk => {
    const player = chk.getAttribute('data-player');
    const saved = localStorage.getItem('sot_' + player) === 'true';
    chk.checked = saved;
    crewStatus[player] = saved;
  });
  applyPermissions();
  checkIfAllReady();
  updateSoTDisplay();
}

// Pobieramy "twarde" dane od wszystkich graczy z arkusza
async function loadCrewStatus() {
  try {
    const response = await fetch(SCRIPT_URL);
    const sheetData = await response.json();

    crewStatus = sheetData;
    updateCheckboxesUI();
    checkIfAllReady();
    updateSoTDisplay();
  } catch (err) {
    console.error("Błąd pobierania z Google Sheets:", err);
  }
}

// Aktualizacja UI checkboxów na podstawie danych z arkusza
function updateCheckboxesUI() {
  const checkboxes = getCrewCheckboxes();
  checkboxes.forEach(chk => {
    const player = chk.getAttribute('data-player');
    const isChecked = crewStatus[player] === true;
    chk.checked = isChecked;
    localStorage.setItem('sot_' + player, isChecked);
  });
  applyPermissions();
}

function checkIfAllReady() {
  const checkboxes = getCrewCheckboxes();
  if (checkboxes.length === 0) {
    allReady = false;
    return;
  }
  let checkedCount = 0;
  checkboxes.forEach(chk => {
    const player = chk.getAttribute('data-player');
    if (crewStatus[player] === true) checkedCount++;
  });
  allReady = (checkedCount === checkboxes.length);
}

// Nasłuchiwanie kliknięć - zablokowane checkboxy (disabled) i tak nie wyślą "change",
// ale dodatkowo weryfikujemy to tutaj dla bezpieczeństwa
getCrewCheckboxes().forEach(chk => {
  chk.addEventListener('change', async (e) => {
    const player = e.target.getAttribute('data-player');

    if (CURRENT_USER === '' || player.toLowerCase() !== CURRENT_USER.toLowerCase()) {
      e.target.checked = crewStatus[player] === true;
      return;
    }

    const status = e.target.checked;
    crewStatus[player] = status;
    localStorage.setItem('sot_' + player, status);
    checkIfAllReady();
    updateSoTDisplay();

    try {
      const updateUrl = SCRIPT_URL + `?action=update&player=${encodeURIComponent(player)}&status=${status}&requester=${encodeURIComponent(CURRENT_USER)}`;
      const response = await fetch(updateUrl);
      const result = await response.json();

      if (!result.success) {
        // Serwer odrzucił zmianę - cofamy checkbox
        e.target.checked = !status;
        crewStatus[player] = !status;
        localStorage.setItem('sot_' + player, !status);
        checkIfAllReady();
        updateSoTDisplay();
        console.error('Serwer odrzucił zmianę:', result.error);
      }
    } catch (err) {
      console.error("Błąd zapisu do arkusza:", err);
    }
  });
});

// Zegar + logika "misja wykonana / czekamy na kolejny sezon"
function updateSoTDisplay() {
  const timerEl = document.getElementById('sot-timer');
  const comebackEl = document.getElementById('sot-comeback');
  const crewSection = document.getElementById('crewSection');
  const messageEl = document.getElementById('sot-message');

  const now = new Date();
  const currentYear = now.getFullYear();

  if (allReady) {
    // Cała załoga gotowa na ten rok - chowamy zegar i checkboxy
    timerEl.style.display = 'none';
    crewSection.style.display = 'none';
    comebackEl.style.display = 'block';
    comebackEl.textContent = `Coming back in ${currentYear + 1}`;
    messageEl.innerHTML = "<span style='color: #d946ef; font-weight: bold;'>Misja na ten rok wykonana! Czekamy na kolejny sezon.</span>";
    return;
  }

  // Nie wszyscy gotowi - liczymy do końca TEGO roku
  timerEl.style.display = 'flex';
  crewSection.style.display = 'block';
  comebackEl.style.display = 'none';
  messageEl.textContent = 'Czas wypłynąć na szerokie wody!';

  let targetDate = new Date(currentYear, 11, 31, 20, 0, 0);
  if (now > targetDate) {
    targetDate = new Date(currentYear + 1, 11, 31, 20, 0, 0);
  }

  const diff = targetDate - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  const pad = (num) => String(num).padStart(2, '0');

  document.getElementById('sot-days').textContent = pad(days);
  document.getElementById('sot-hours').textContent = pad(hours);
  document.getElementById('sot-minutes').textContent = pad(minutes);
  document.getElementById('sot-seconds').textContent = pad(seconds);
}

// ODPALENIE
loadLocalState();
loadCrewStatus();
setInterval(updateSoTDisplay, 1000);
setInterval(loadCrewStatus, 15000); // odświeżanie statusu załogi co 15s - synchronizacja między graczami

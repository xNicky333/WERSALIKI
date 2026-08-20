const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwACT1SWpgXtM6wKusYzka8JSGAVYRlrhsVvbR7NOtVhKmvN8mP3gHHHVI3XZdDj7ms/exec';
const PLAYERS = ['Nicky', 'Zreku', 'Północny', 'Michalotse'];

let crewStatus = {};   // dane z serwera { Nicky: true/false, ... }
let statusYear = null; // rok, dla którego serwer zwrócił dane

// Ten sam klucz localStorage, którego używa system logowania na stronie głównej
const loggedInUser = localStorage.getItem('wersaliki_user');
const myIdentity = PLAYERS.find(p => p.toLowerCase() === (loggedInUser || '').toLowerCase()) || null;

/* ---------------- INFORMACJA O STATUSIE LOGOWANIA ---------------- */

function renderLoginNote() {
  const note = document.getElementById('loginNote');
  if (!loggedInUser) {
    note.innerHTML = 'Nie jesteś zalogowany/a — <a href="/">zaloguj się na stronie głównej</a>, żeby móc zaznaczyć swoją gotowość.';
  } else if (!myIdentity) {
    note.textContent = `Zalogowano jako "${loggedInUser}", ale to imię nie pasuje do żadnego gracza z listy.`;
  } else {
    note.textContent = `Zalogowano jako: ${myIdentity}`;
  }
}

/* ---------------- DANE Z SERWERA ---------------- */

async function loadCrewStatus() {
  try {
    const response = await fetch(SCRIPT_URL);
    const data = await response.json();
    crewStatus = data.players || {};
    statusYear = data.year || new Date().getFullYear();
  } catch (err) {
    console.error('Błąd pobierania z Google Sheets:', err);
  }
  renderCrew();
  updateDisplay();
}

function renderCrew() {
  document.querySelectorAll('.crew-checkbox').forEach(chk => {
    const player = chk.getAttribute('data-player');
    chk.checked = crewStatus[player] === true;
    chk.disabled = (player !== myIdentity); // tylko checkbox zalogowanego gracza jest klikalny
  });
}

function allReady() {
  return PLAYERS.every(p => crewStatus[p] === true);
}

/* ---------------- OBSŁUGA KLIKNIĘĆ ---------------- */

document.querySelectorAll('.crew-checkbox').forEach(chk => {
  chk.addEventListener('change', async (e) => {
    const player = e.target.getAttribute('data-player');
    if (player !== myIdentity) return; // dodatkowe zabezpieczenie w JS

    const newStatus = e.target.checked;
    const previous = crewStatus[player];
    crewStatus[player] = newStatus; // optymistyczna aktualizacja UI
    updateDisplay();

    try {
      const url = `${SCRIPT_URL}?action=update&player=${encodeURIComponent(player)}&status=${newStatus}&user=${encodeURIComponent(loggedInUser)}`;
      const response = await fetch(url);
      const result = await response.json();

      if (!result.success) {
        crewStatus[player] = previous;
        e.target.checked = previous;
        alert('Nie udało się zapisać zmiany — spróbuj się zalogować ponownie.');
        updateDisplay();
      }
    } catch (err) {
      console.error('Błąd zapisu do arkusza:', err);
      crewStatus[player] = previous;
      e.target.checked = previous;
      updateDisplay();
    }
  });
});

/* ---------------- LICZNIK / STAN MISJI ---------------- */

function updateDisplay() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const missionDone = allReady() && statusYear === currentYear;

  const timerEl = document.getElementById('sot-timer');
  const crewSection = document.querySelector('.crew-section');
  const comebackEl = document.getElementById('sot-comeback');
  const messageEl = document.getElementById('sot-message');

  if (missionDone) {
    timerEl.style.display = 'none';
    crewSection.style.display = 'none';
    comebackEl.style.display = 'block';
    comebackEl.textContent = `Coming back in ${currentYear + 1}`;
    messageEl.textContent = 'Misja na ten rok wykonana! Czekamy na kolejny sezon.';
    return;
  }

  timerEl.style.display = 'flex';
  crewSection.style.display = 'block';
  comebackEl.style.display = 'none';
  messageEl.textContent = 'Czas wypłynąć na szerokie wody!';

  const targetDate = new Date(currentYear, 11, 31, 23, 59, 59);
  const diff = Math.max(0, targetDate - now);

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

/* ---------------- START ---------------- */

renderLoginNote();
loadCrewStatus();
setInterval(updateDisplay, 1000);
setInterval(loadCrewStatus, 15000);
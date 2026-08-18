const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwACT1SWpgXtM6wKusYzka8JSGAVYRlrhsVvbR7NOtVhKmvN8mP3gHHHVI3XZdDj7ms/exec';

let crewStatus = {};
let allReady = false;

// Ładujemy to z pamięci (żeby nie było laga po wejściu)
function loadLocalState() {
  const checkboxes = document.querySelectorAll('.crew-checkbox');
  checkboxes.forEach(chk => {
    const player = chk.getAttribute('data-player');
    if (localStorage.getItem('sot_' + player) === 'true') {
      chk.checked = true;
      crewStatus[player] = true;
    }
  });
  checkIfAllReady();
  updateSoTTimer();
}

// Pobieramy "twarde" dane od innych graczy
async function loadCrewStatus() {
  try {
    const response = await fetch(SCRIPT_URL);
    const sheetData = await response.json();
    
    crewStatus = sheetData;
    updateCheckboxesUI();
    checkIfAllReady();
  } catch (err) {
    console.error("Błąd pobierania z Google Sheets:", err);
  }
}

// Aktualizacja UI
function updateCheckboxesUI() {
  const checkboxes = document.querySelectorAll('.crew-checkbox');
  checkboxes.forEach(chk => {
    const player = chk.getAttribute('data-player');
    if (crewStatus[player] === true) {
      chk.checked = true;
      localStorage.setItem('sot_' + player, 'true');
    } else {
      chk.checked = false;
      localStorage.setItem('sot_' + player, 'false');
    }
  });
}

function checkIfAllReady() {
  const checkboxes = document.querySelectorAll('.crew-checkbox');
  let checkedCount = 0;
  checkboxes.forEach(chk => {
    if (chk.checked) checkedCount++;
  });
  allReady = (checkedCount === 4);
}

// Nasłuchiwanie kliknięć
document.querySelectorAll('.crew-checkbox').forEach(chk => {
  chk.addEventListener('change', async (e) => {
    const player = e.target.getAttribute('data-player');
    const status = e.target.checked;
    
    // Aktualizujemy własną przeglądarkę
    crewStatus[player] = status;
    localStorage.setItem('sot_' + player, status);
    checkIfAllReady();
    updateSoTTimer();

    // TOTALNIE NOWY SPOSÓB WYSYŁKI - Niezawodny GET, przeglądarka tego nie zablokuje!
    try {
      const updateUrl = SCRIPT_URL + `?action=update&player=${encodeURIComponent(player)}&status=${status}`;
      await fetch(updateUrl);
    } catch (err) {
      console.error("Błąd zapisu do arkusza:", err);
    }
  });
});

function updateSoTTimer() {
  const now = new Date();
  const currentYear = now.getFullYear();

  const targetMonth = 11; // 11 = Grudzień
  const targetDay = 31;   // 31 dzień

  let targetDate = new Date(currentYear, targetMonth, targetDay, 20, 0, 0);

  if (allReady || now > targetDate) {
    targetDate = new Date(currentYear + 1, targetMonth, targetDay, 20, 0, 0);
    if (allReady) {
      document.getElementById('sot-message').innerHTML = "<span style='color: #d946ef; font-weight: bold;'>Misja na ten rok wykonana! Czekamy na kolejny sezon.</span>";
    }
  } else {
    document.getElementById('sot-message').textContent = "Czas wypłynąć na szerokie wody!";
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
setInterval(updateSoTTimer, 1000);
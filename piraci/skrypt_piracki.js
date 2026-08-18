const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwACT1SWpgXtM6wKusYzka8JSGAVYRlrhsVvbR7NOtVhKmvN8mP3gHHHVI3XZdDj7ms/exec';

let crewStatus = {};
let allReady = false;

// Pobieranie danych z arkusza na starcie
async function loadCrewStatus() {
  try {
    const response = await fetch(SCRIPT_URL);
    crewStatus = await response.json();
    updateCheckboxesUI();
    checkIfAllReady();
  } catch (err) {
    console.error("Błąd pobierania statutu załogi z Google Sheets:", err);
    document.getElementById('sot-message').textContent = "Błąd połączenia z dziennikiem pokładowym (Arkuszem).";
  }
}

// Zaznaczanie checkboxów na stronie na podstawie danych z Google Sheets
function updateCheckboxesUI() {
  const checkboxes = document.querySelectorAll('.crew-checkbox');
  checkboxes.forEach(chk => {
    const player = chk.getAttribute('data-player');
    if (crewStatus[player]) {
      chk.checked = true;
    }
  });
}

// Sprawdzanie czy cała 4-ka zaznaczyła
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
    
    // Aktualizujemy stronę od razu (żeby nie było laga)
    crewStatus[player] = status;
    checkIfAllReady();
    updateSoTTimer();

    // Wysyłamy zmianę do Google Sheets w tle
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        // Używamy plain text, bo Apps Script czasem gubi dane wysyłane jako json bez odpowiednich nagłówków
        body: JSON.stringify({ player: player, status: status }) 
      });
    } catch (err) {
      console.error("Błąd zapisu do arkusza:", err);
    }
  });
});

// Zmodyfikowany Timer
function updateSoTTimer() {
  const now = new Date();
  const currentYear = now.getFullYear();

  const targetMonth = 11; // Grudzień
  const targetDay = 31;   // 31 grudnia

  let targetDate = new Date(currentYear, targetMonth, targetDay, 20, 0, 0);

  // Jeśli wszyscy zaznaczyli (albo data minęła), przerzucamy timer na kolejny rok
  if (allReady || now > targetDate) {
    targetDate = new Date(currentYear + 1, targetMonth, targetDay, 20, 0, 0);
    if (allReady) {
      document.getElementById('sot-message').innerHTML = "<span style='color: #d946ef; font-weight: bold;'>Rejs w tym roku odbyty! Czekamy na kolejny sezon.</span>";
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

// Uruchamiamy pobieranie bazy danych i timer
loadCrewStatus();
setInterval(updateSoTTimer, 1000);
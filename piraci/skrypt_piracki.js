const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwACT1SWpgXtM6wKusYzka8JSGAVYRlrhsVvbR7NOtVhKmvN8mP3gHHHVI3XZdDj7ms/exec';

let crewStatus = {};
let allReady = false;

// 1. Ładujemy to, co przeglądarka zapamiętała na Twoim komputerze (żeby nie było opóźnień)
function loadLocalState() {
  const checkboxes = document.querySelectorAll('.crew-checkbox');
  checkboxes.forEach(chk => {
    const player = chk.getAttribute('data-player');
    // Sprawdzamy lokalną pamięć
    if (localStorage.getItem('sot_' + player) === 'true') {
      chk.checked = true;
      crewStatus[player] = true;
    }
  });
  checkIfAllReady();
  updateSoTTimer();
}

// 2. Pobieramy "twarde" dane z Arkusza (aby sprawdzić, co kliknęli inni gracze)
async function loadCrewStatus() {
  try {
    const response = await fetch(SCRIPT_URL);
    const sheetData = await response.json();
    
    // Nadpisujemy stan tym z Arkusza (bo jest ważniejszy)
    crewStatus = sheetData;
    updateCheckboxesUI();
    checkIfAllReady();
  } catch (err) {
    console.error("Błąd pobierania z Google Sheets:", err);
  }
}

// 3. Aktualizacja checkboxów i zapis w pamięci
function updateCheckboxesUI() {
  const checkboxes = document.querySelectorAll('.crew-checkbox');
  checkboxes.forEach(chk => {
    const player = chk.getAttribute('data-player');
    if (crewStatus[player] === true) {
      chk.checked = true;
      localStorage.setItem('sot_' + player, 'true'); // Zapamiętaj u mnie
    } else {
      chk.checked = false;
      localStorage.setItem('sot_' + player, 'false');
    }
  });
}

// 4. Sprawdzanie czy cała 4-ka jest na pokładzie
function checkIfAllReady() {
  const checkboxes = document.querySelectorAll('.crew-checkbox');
  let checkedCount = 0;
  checkboxes.forEach(chk => {
    if (chk.checked) checkedCount++;
  });
  allReady = (checkedCount === 4);
}

// 5. Nasłuchiwanie kliknięć (akcja po zaznaczeniu ptaszka)
document.querySelectorAll('.crew-checkbox').forEach(chk => {
  chk.addEventListener('change', async (e) => {
    const player = e.target.getAttribute('data-player');
    const status = e.target.checked;
    
    // Aktualizujemy od razu i zapisujemy twardo w przeglądarce
    crewStatus[player] = status;
    localStorage.setItem('sot_' + player, status);
    checkIfAllReady();
    updateSoTTimer();

    // WYSYŁKA DO ARKUSZA (dodane zabezpieczenia przed blokadą CORS)
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // <-- To sprawia, że Google nie zablokuje zapisu
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ player: player, status: status }) 
      });
    } catch (err) {
      console.error("Błąd zapisu do arkusza:", err);
    }
  });
});

// 6. Główny silnik odliczania
function updateSoTTimer() {
  const now = new Date();
  const currentYear = now.getFullYear();

  const targetMonth = 11; // 11 = Grudzień
  const targetDay = 31;   // 31 dzień

  let targetDate = new Date(currentYear, targetMonth, targetDay, 20, 0, 0);

  // Zmiana roku, jeśli misja wykonana
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

// ODPALENIE SKRYPTU
loadLocalState(); // Zwraca natychmiast Twoje zaznaczenie z pamięci!
loadCrewStatus(); // W tle dociąga stan reszty załogi z Google
setInterval(updateSoTTimer, 1000);
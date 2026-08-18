const LOGIN_API_URL = 'https://script.google.com/macros/s/AKfycbycGRGh6_t6y6ROPR3Ef3IuhtZ1WIbkb4EsdOvHdO7zasJ0pWIpQQlGWYBAvTVr5rE/exec';

const loginBtn = document.getElementById('loginBtn');
const loginText = document.getElementById('loginText');
const loginModal = document.getElementById('loginModal');
const closeModal = document.getElementById('closeModal');
const submitLogin = document.getElementById('submitLogin');
const loginStatus = document.getElementById('loginStatus');
const hiddenMenu = document.getElementById('hiddenMenu');
const loginUserInput = document.getElementById('loginPass') && document.getElementById('loginUser');
const loginPassInput = document.getElementById('loginPass');

function openModal() {
    loginModal.classList.add('active');
    loginUserInput.focus();
}

function closeModalFn() {
    loginModal.classList.remove('active');
    loginStatus.textContent = '';
    loginUserInput.value = '';
    loginPassInput.value = '';
}

function setLoggedInUI(username) {
    loginText.textContent = username;
    loginBtn.classList.add('logged-in');
}

function setLoggedOutUI() {
    loginText.textContent = 'Zaloguj';
    loginBtn.classList.remove('logged-in');
    hiddenMenu.classList.remove('active');
}

function toggleMenu() {
    hiddenMenu.classList.toggle('active');
}

function checkSavedLogin() {
    const saved = localStorage.getItem('wersaliki_user');
    if (saved) setLoggedInUI(saved);
}

loginBtn.addEventListener('click', () => {
    const saved = localStorage.getItem('wersaliki_user');
    if (saved) {
        toggleMenu();
    } else {
        openModal();
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('wersaliki_user');
    setLoggedOutUI();
});

document.addEventListener('click', (e) => {
    const isMenuOpen = hiddenMenu.classList.contains('active');
    const clickedInsideMenu = hiddenMenu.contains(e.target);
    const clickedLoginBtn = loginBtn.contains(e.target);

    if (isMenuOpen && !clickedInsideMenu && !clickedLoginBtn) {
        hiddenMenu.classList.remove('active');
    }
});

closeModal.addEventListener('click', closeModalFn);
loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) closeModalFn();
});

submitLogin.addEventListener('click', doLogin);
loginPassInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') doLogin();
});
loginUserInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') doLogin();
});

function doLogin() {
    const user = loginUserInput.value.trim();
    const pass = loginPassInput.value.trim();

    if (!user || !pass) {
        loginStatus.textContent = 'Wpisz login i hasło.';
        return;
    }

    submitLogin.disabled = true;
    submitLogin.textContent = 'Sprawdzanie...';
    loginStatus.textContent = '';

    const dataToSend = 'action=login&user=' + encodeURIComponent(user) + '&pass=' + encodeURIComponent(pass);

    fetch(LOGIN_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: dataToSend
    })
        .then((response) => response.json())
        .then((result) => {
            submitLogin.disabled = false;
            submitLogin.textContent = 'Zaloguj się';

            if (result.success) {
                const displayName = result.username || user;
                localStorage.setItem('wersaliki_user', displayName);
                setLoggedInUI(displayName);
                closeModalFn();
            } else {
                loginStatus.textContent = 'Błędny login lub hasło.';
            }
        })
        .catch(() => {
            submitLogin.disabled = false;
            submitLogin.textContent = 'Zaloguj się';
            loginStatus.textContent = 'Błąd połączenia z serwerem.';
        });
}

document.addEventListener('DOMContentLoaded', checkSavedLogin);
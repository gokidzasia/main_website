(function () {
    const ADMIN_EMAIL = 'gokidzasia@gmail.com';
    const ADMIN_PASSWORD = 'w3bs!t3g0kidz@Asia';
    const form = document.getElementById('admin-login-form');
    const message = document.getElementById('login-message');
    const passwordInput = document.getElementById('admin-password');
    const togglePassword = document.getElementById('toggle-password');

    if (sessionStorage.getItem('gokidzAdminAuthed') === 'true') {
        window.location.href = 'admin-portal.html';
        return;
    }

    togglePassword?.addEventListener('click', () => {
        const isHidden = passwordInput.type === 'password';
        passwordInput.type = isHidden ? 'text' : 'password';
        togglePassword.innerHTML = isHidden ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
    });

    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        const email = document.getElementById('admin-email').value.trim();
        const password = passwordInput.value;

        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            sessionStorage.setItem('gokidzAdminAuthed', 'true');
            window.location.href = 'admin-portal.html';
            return;
        }

        message.textContent = 'Incorrect email or password.';
    });
})();

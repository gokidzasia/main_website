(function () {
    const form = document.getElementById('admin-login-form');
    const message = document.getElementById('login-message');
    const passwordInput = document.getElementById('admin-password');
    const togglePassword = document.getElementById('toggle-password');
    const supabaseClient = window.gokidzSupabaseClient?.();

    async function alreadyLoggedIn() {
        if (sessionStorage.getItem('gokidzAdminAuthed') === 'true') return true;
        if (!supabaseClient) return false;
        const { data } = await supabaseClient.auth.getSession();
        return Boolean(data.session);
    }

    alreadyLoggedIn().then((isAuthed) => {
        if (isAuthed) window.location.href = 'admin-portal.html';
    });

    togglePassword?.addEventListener('click', () => {
        const isHidden = passwordInput.type === 'password';
        passwordInput.type = isHidden ? 'text' : 'password';
        togglePassword.innerHTML = isHidden ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
    });

    form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById('admin-email').value.trim();
        const password = passwordInput.value;
        message.textContent = 'Logging in...';

        if (!supabaseClient) {
            message.textContent = 'Supabase is not loaded. Check your internet connection.';
            return;
        }

        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            message.textContent = error.message || 'Incorrect email or password.';
            return;
        }

        if (data.session) {
            sessionStorage.setItem('gokidzAdminAuthed', 'true');
            window.location.href = 'admin-portal.html';
        }
    });
})();

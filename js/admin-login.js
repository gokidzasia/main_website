(function () {
    function setupInteractiveLoginBackground() {
        const scene = document.querySelector('.login-scene');
        if (!scene || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const shapes = Array.from(scene.querySelectorAll('.login-shape'));
        const pushRadius = 220;
        const maxPush = 58;
        let frame = 0;

        function resetShapes() {
            shapes.forEach((shape) => {
                shape.style.setProperty('--move-x', '0px');
                shape.style.setProperty('--move-y', '0px');
            });
        }

        window.addEventListener('pointermove', (event) => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                shapes.forEach((shape) => {
                    const rect = shape.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const deltaX = centerX - event.clientX;
                    const deltaY = centerY - event.clientY;
                    const distance = Math.hypot(deltaX, deltaY) || 1;

                    if (distance > pushRadius) {
                        shape.style.setProperty('--move-x', '0px');
                        shape.style.setProperty('--move-y', '0px');
                        return;
                    }

                    const strength = (1 - distance / pushRadius) * maxPush;
                    const pushX = (deltaX / distance) * strength;
                    const pushY = (deltaY / distance) * strength;
                    shape.style.setProperty('--move-x', pushX.toFixed(1) + 'px');
                    shape.style.setProperty('--move-y', pushY.toFixed(1) + 'px');
                });
            });
        }, { passive: true });

        window.addEventListener('pointerleave', resetShapes);
        window.addEventListener('blur', resetShapes);
    }

    setupInteractiveLoginBackground();
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

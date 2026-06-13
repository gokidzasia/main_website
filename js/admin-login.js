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

    function getDeviceInfo() {
        const userAgent = navigator.userAgent || '';
        const platform = navigator.platform || 'Unknown platform';
        const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
        const browser = userAgent.includes('Edg/') ? 'Microsoft Edge'
            : userAgent.includes('Chrome/') ? 'Chrome'
                : userAgent.includes('Safari/') ? 'Safari'
                    : userAgent.includes('Firefox/') ? 'Firefox'
                        : 'Unknown browser';
        const os = /iPhone|iPad|iPod/i.test(userAgent) ? 'iOS'
            : /Android/i.test(userAgent) ? 'Android'
                : /Windows/i.test(userAgent) ? 'Windows'
                    : /Mac/i.test(userAgent) ? 'macOS'
                        : /Linux/i.test(userAgent) ? 'Linux'
                            : platform;

        return {
            browser,
            os,
            device_type: isMobile ? 'Mobile' : 'Desktop',
            device_label: `${isMobile ? 'Mobile' : 'Desktop'} / ${os} / ${browser}`,
            user_agent: userAgent
        };
    }

    function requestLocation() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve({ permission: 'unavailable' });
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => resolve({
                    permission: 'granted',
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                }),
                (error) => resolve({
                    permission: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'
                }),
                { enableHighAccuracy: false, timeout: 9000, maximumAge: 300000 }
            );
        });
    }

    async function getLocationLabel(location) {
        if (!location.latitude || !location.longitude) return location.permission === 'denied' ? 'Permission denied' : 'Location unavailable';

        try {
            const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(location.latitude)}&longitude=${encodeURIComponent(location.longitude)}&localityLanguage=en`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Location lookup failed');
            const data = await response.json();
            return [data.city || data.locality, data.principalSubdivision, data.countryName].filter(Boolean).join(', ') || 'Location captured';
        } catch (error) {
            return 'Location captured';
        }
    }

    async function saveLoginLog(user) {
        if (!supabaseClient || !user) return;

        message.textContent = 'Allow location to finish admin login...';
        const location = await requestLocation();
        const locationLabel = await getLocationLabel(location);
        const device = getDeviceInfo();

        const { error } = await supabaseClient
            .from('admin_login_logs')
            .insert({
                user_id: user.id,
                email: user.email,
                device_label: device.device_label,
                device_type: device.device_type,
                browser: device.browser,
                os: device.os,
                user_agent: device.user_agent,
                location_permission: location.permission,
                location_label: locationLabel,
                latitude: location.latitude ?? null,
                longitude: location.longitude ?? null,
                accuracy_meters: location.accuracy ?? null
            });

        if (error) console.warn('Admin login log could not be saved:', error.message);
    }

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
            await saveLoginLog(data.user);
            window.location.href = 'admin-portal.html';
        }
    });
})();

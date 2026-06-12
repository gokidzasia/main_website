(function () {
    if (sessionStorage.getItem('gokidzAdminAuthed') !== 'true') {
        window.location.href = 'signup-admin.html';
        return;
    }

    const storageKey = 'gokidzAdminDrafts';
    const defaults = {
        'main.favicon': 'favicon-baby-face-yellow.png',
        'main.animatedLogo': 'animated-logo.gif',
        'main.staticLogo': 'static-logo.png',
        'main.characters': '3d-characters.png',
        'main.footerLogo': 'static-logo.png',
        'main.footerDescription': 'Every Home, Every Child For Christ.',
        'main.copyright': '© 2026 GOKidz Asia. All Rights Reserved.',
        'home.heroVideo': 'main-header-video.mp4',
        'home.welcomeHeader': 'Reaching Every Home, Every Child For Christ.',
        'home.welcomeVideo': 'https://www.youtube.com/embed/zkV75ZGpNZ0',
        'home.discoverBackground': 'discover-section-bg.png',
        'about.director.image': 'about us/director.png',
        'about.director.name': 'Iris Gwyn Abibiason'
    };

    const teamCounts = { staff: 4, editor: 7, producer: 6, performer: 6 };
    const draft = JSON.parse(localStorage.getItem(storageKey) || '{}');

    function getValue(key) {
        return draft[key] ?? defaults[key] ?? '';
    }

    function createTeamRows() {
        Object.entries(teamCounts).forEach(([team, count]) => {
            const target = document.querySelector(`[data-team="${team}"]`);
            if (!target) return;

            for (let index = 1; index <= count; index += 1) {
                const row = document.createElement('div');
                row.className = 'team-row';
                row.innerHTML = `
                    <label>Image ${index}<input data-setting="about.${team}${index}.image" type="text" placeholder="about us/${team}-${index}.png"></label>
                    <label>Name ${index}<input data-setting="about.${team}${index}.name" type="text" placeholder="Name ${index}"></label>
                `;
                target.appendChild(row);
            }
        });
    }

    function loadDrafts() {
        document.querySelectorAll('[data-setting]').forEach((field) => {
            field.value = getValue(field.dataset.setting);
        });
    }

    function saveDrafts() {
        document.querySelectorAll('[data-setting]').forEach((field) => {
            draft[field.dataset.setting] = field.value;
        });
        localStorage.setItem(storageKey, JSON.stringify(draft));
        showToast('Draft saved in this browser.');
    }

    function showToast(text) {
        let toast = document.querySelector('.save-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'save-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = text;
        toast.classList.add('active');
        setTimeout(() => toast.classList.remove('active'), 2200);
    }

    function setupNavState() {
        const navLinks = document.querySelectorAll('.admin-nav a');
        navLinks.forEach((link) => {
            link.addEventListener('click', () => {
                navLinks.forEach((item) => item.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

    createTeamRows();
    loadDrafts();
    setupNavState();

    document.getElementById('save-all')?.addEventListener('click', saveDrafts);
    document.getElementById('admin-logout')?.addEventListener('click', () => {
        sessionStorage.removeItem('gokidzAdminAuthed');
        window.location.href = 'signup-admin.html';
    });
})();

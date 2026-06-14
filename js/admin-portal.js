(function () {
    const fallbackStorageKey = 'gokidzAdminDrafts';
    const teamMinimumCounts = { staff: 4, editor: 7, producer: 6, performer: 6 };
    const assetKeys = ['favicon', 'Logo', 'Images', 'Video', 'Background', 'thumbnail', 'media', 'image', 'characters', 'footerLogo'];
    const supabaseClient = window.gokidzSupabaseClient?.();
    const supabaseConfig = window.GOKIDZ_SUPABASE;
    const adminProfilesByEmail = {
        'gokidzasia@gmail.com': {
            name: 'ADMIN',
            photo: 'https://gjbgabyvdaqvauctfbzk.supabase.co/storage/v1/object/public/gokidz-assets/admin%20profile/gk%20admin.jpg'
        },
        'hopejoshua@gokidzasia.com': {
            name: 'Hope Joshua Supetran',
            photo: 'https://gjbgabyvdaqvauctfbzk.supabase.co/storage/v1/object/public/gokidz-assets/admin%20profile/hope%20admin.jpg'
        },
        'irisgwyn@gokidzasia.com': {
            name: 'Iris Gwyn Abibiason',
            photo: 'https://gjbgabyvdaqvauctfbzk.supabase.co/storage/v1/object/public/gokidz-assets/admin%20profile/iris%20admin.jpg'
        },
        'mayrose@gokidzasia.com': {
            name: 'May Rose Rosarial',
            photo: 'https://gjbgabyvdaqvauctfbzk.supabase.co/storage/v1/object/public/gokidz-assets/admin%20profile/may%20rose%20admin.jpg'
        },
        'johnphilip@gokidzasia.com': {
            name: 'John Philip Ugay',
            photo: 'https://gjbgabyvdaqvauctfbzk.supabase.co/storage/v1/object/public/gokidz-assets/admin%20profile/JP%20Admin.jpg'
        },
        'guest@gokidzasia.com': {
            name: 'Guest',
            photo: 'https://gjbgabyvdaqvauctfbzk.supabase.co/storage/v1/object/public/gokidz-assets/admin%20profile/guest%20admin.jpg'
        }
    };
    let content = {};
    let contentMode = 'browser';

    function isAssetField(key) {
        return assetKeys.some((part) => key.toLowerCase().includes(part.toLowerCase()));
    }

    function getByPath(object, path) {
        return path.split('.').reduce((value, key) => value?.[key], object);
    }

    function setByPath(object, path, value) {
        const keys = path.split('.');
        let target = object;
        keys.slice(0, -1).forEach((key) => {
            if (!target[key] || typeof target[key] !== 'object') target[key] = {};
            target = target[key];
        });
        target[keys[keys.length - 1]] = value;
    }

    function migrateFlatDraft(flat) {
        const migrated = {};
        Object.entries(flat || {}).forEach(([key, value]) => setByPath(migrated, key, value));
        return migrated;
    }

    function getUserDisplayName(user) {
        const metadata = user?.user_metadata || {};
        const profile = adminProfilesByEmail[user?.email?.toLowerCase()];
        if (profile?.name) return profile.name;
        return metadata.full_name
            || metadata.name
            || metadata.display_name
            || user?.email?.split('@')[0]
            || 'Admin';
    }

    function getUserPhoto(user) {
        const metadata = user?.user_metadata || {};
        const profile = adminProfilesByEmail[user?.email?.toLowerCase()];
        return profile?.photo
            || metadata.avatar_url
            || metadata.picture
            || metadata.photo_url
            || metadata.image
            || '';
    }

    function getInitials(name, email) {
        const source = (name && name !== 'Admin' ? name : email || 'Admin').trim();
        const words = source
            .replace(/@.*/, '')
            .split(/[\s._-]+/)
            .filter(Boolean);
        return (words.length > 1 ? words[0][0] + words[1][0] : source.slice(0, 2)).toUpperCase();
    }

    function renderAdminUser(user) {
        const card = document.getElementById('admin-user-card');
        const photo = document.getElementById('admin-user-photo');
        const nameTarget = document.getElementById('admin-user-name');
        const emailTarget = document.getElementById('admin-user-email');
        if (!card || !photo || !nameTarget || !emailTarget) return;

        const email = user?.email || supabaseConfig?.adminEmail || 'Admin email unavailable';
        const name = getUserDisplayName(user);
        const photoUrl = getUserPhoto(user);

        nameTarget.textContent = name;
        emailTarget.textContent = email;
        emailTarget.href = email.includes('@') ? `mailto:${email}` : '#';

        photo.classList.remove('has-image');
        photo.innerHTML = '';

        if (photoUrl) {
            const image = document.createElement('img');
            image.src = photoUrl;
            image.alt = `${name} profile photo`;
            image.addEventListener('error', () => {
                photo.classList.remove('has-image');
                photo.textContent = getInitials(name, email);
            }, { once: true });
            photo.classList.add('has-image');
            photo.appendChild(image);
        } else {
            photo.textContent = getInitials(name, email);
        }

        card.classList.add('is-loaded');
    }

    async function requireAuth() {
        if (supabaseClient) {
            const { data } = await supabaseClient.auth.getSession();
            if (data.session) {
                sessionStorage.setItem('gokidzAdminAuthed', 'true');
                renderAdminUser(data.session.user);
                return true;
            }
        }

        if (!supabaseClient && sessionStorage.getItem('gokidzAdminAuthed') === 'true') {
            renderAdminUser(null);
            return true;
        }
        window.location.href = 'signup-admin.html';
        return false;
    }

    function createTeamRow(team, index) {
        const number = index + 1;
        const row = document.createElement('div');
        row.className = 'team-row';
        row.innerHTML = `
            <label>Image ${number}<input data-setting="about.${team}.${index}.image" type="text" placeholder="about us/${team}-${number}.png"></label>
            <label>Name ${number}<input data-setting="about.${team}.${index}.name" type="text" placeholder="Name ${number}"></label>
            <button type="button" class="remove-person-btn" aria-label="Remove person ${number}"><i class="fa-solid fa-trash"></i><span>Remove</span></button>
        `;
        row.querySelector('.remove-person-btn')?.addEventListener('click', () => removeTeamMember(team, index));
        return row;
    }

    function createTeamAddButton(team) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'add-person-btn';
        button.innerHTML = '<i class="fa-solid fa-user-plus"></i><span>Add person</span>';
        button.addEventListener('click', () => addTeamMember(team));
        return button;
    }

    function createTeamRows() {
        Object.entries(teamMinimumCounts).forEach(([team, minimumCount]) => {
            const target = document.querySelector(`[data-team="${team}"]`);
            if (!target) return;
            const savedMembers = getByPath(content, `about.${team}`);
            const count = Array.isArray(savedMembers) ? savedMembers.length : minimumCount;
            target.innerHTML = '';

            for (let index = 0; index < count; index += 1) {
                target.appendChild(createTeamRow(team, index));
            }
            target.appendChild(createTeamAddButton(team));
        });
    }

    function addTeamMember(team) {
        collectFields();
        const target = document.querySelector(`[data-team="${team}"]`);
        const addButton = target?.querySelector('.add-person-btn');
        if (!target || !addButton) return;

        const index = target.querySelectorAll('.team-row').length;
        addButton.insertAdjacentElement('beforebegin', createTeamRow(team, index));
        addUploadZones();
        addAssetPreviews();
        updateTeamStats();
        showToast('Added a new person row.');
    }

    function removeTeamMember(team, index) {
        collectFields();
        const members = getByPath(content, `about.${team}`);
        if (Array.isArray(members)) {
            members.splice(index, 1);
        }
        createTeamRows();
        addUploadZones();
        addAssetPreviews();
        loadFields();
        updateTeamStats();
        showToast('Removed person row. Click Save Draft to keep the change.');
    }

    function normalizeGridSettings() {
        document.querySelectorAll('[data-setting^="home.grid"]').forEach((field) => {
            field.dataset.setting = field.dataset.setting.replace(/^home\.grid(\d+)\./, (_, number) => `home.grids.${Number(number) - 1}.`);
        });
    }

    async function loadContent() {
        if (supabaseClient && supabaseConfig) {
            try {
                const { data, error } = await supabaseClient
                    .from('site_content')
                    .select('content')
                    .eq('id', supabaseConfig.contentId)
                    .maybeSingle();
                if (error) throw error;
                if (data?.content) {
                    content = data.content;
                    contentMode = 'supabase';
                    showToast('Loaded online content from Supabase.');
                    return;
                }
                contentMode = 'supabase';
            } catch (error) {
                showToast(`Supabase load failed: ${error.message}`);
            }
        }

        try {
            const response = await fetch('/api/content', { cache: 'no-store' });
            if (!response.ok) throw new Error('Server content unavailable');
            content = await response.json();
            contentMode = 'local-server';
            showToast('Loaded local admin server content.');
            return;
        } catch (error) {
            // Continue to static fallback.
        }

        try {
            const staticResponse = await fetch('data/site-content.json', { cache: 'no-store' });
            if (!staticResponse.ok) throw new Error('Static content unavailable');
            content = await staticResponse.json();
            showToast(contentMode === 'supabase' ? 'No online content yet. Click Save Draft once to seed Supabase.' : 'Preview mode only.');
        } catch (error) {
            content = migrateFlatDraft(JSON.parse(localStorage.getItem(fallbackStorageKey) || '{}'));
            showToast('No saved content found yet.');
        }
    }

    function loadFields() {
        document.querySelectorAll('[data-setting]').forEach((field) => {
            const value = getByPath(content, field.dataset.setting);
            field.value = value ?? '';
            updatePreview(field);
        });
    }

    function collectFields() {
        document.querySelectorAll('[data-setting]').forEach((field) => {
            setByPath(content, field.dataset.setting, field.value);
        });
    }

    async function saveContent() {
        collectFields();

        if (contentMode === 'supabase' && supabaseClient && supabaseConfig) {
            const { error } = await supabaseClient
                .from('site_content')
                .upsert({
                    id: supabaseConfig.contentId,
                    content,
                    updated_at: new Date().toISOString()
                });
            if (error) throw error;
            showToast('Saved online to Supabase.');
            return;
        }

        if (contentMode === 'local-server') {
            const response = await fetch('/api/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(content)
            });
            if (!response.ok) throw new Error('Save failed');
            showToast('Saved to local data/site-content.json.');
            return;
        }

        localStorage.setItem(fallbackStorageKey, JSON.stringify(content));
        showToast('Draft saved in browser only. Supabase is not connected yet.');
    }

    function formatNumber(value) {
        return new Intl.NumberFormat().format(Number(value) || 0);
    }

    function animateNumber(target, value) {
        if (!target) return;
        const finalValue = Math.max(0, Number(value) || 0);
        const currentText = target.textContent.replace(/,/g, '');
        const startValue = Number(currentText) || (finalValue > 0 ? 1 : 0);
        const duration = 900;
        const startedAt = performance.now();

        function tick(now) {
            const progress = Math.min((now - startedAt) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.round(startValue + (finalValue - startValue) * eased);
            target.textContent = formatNumber(currentValue);
            if (progress < 1) requestAnimationFrame(tick);
        }

        target.textContent = formatNumber(startValue);
        requestAnimationFrame(tick);
    }

    function setStat(selector, value) {
        animateNumber(document.querySelector(selector), value);
    }

    function hasPerson(member) {
        return Boolean(member?.name?.trim?.() || member?.image?.trim?.());
    }

    function updateTeamStats() {
        const about = content.about || {};
        const directorCount = hasPerson(about.director) ? 1 : 0;
        const teamCount = Object.keys(teamMinimumCounts).reduce((total, team) => {
            const members = about[team];
            return total + (Array.isArray(members) ? members.filter(hasPerson).length : 0);
        }, 0);
        setStat('#stat-prod-team', directorCount + teamCount);
    }

    function renderContentOverview(rows) {
        const target = document.getElementById('content-overview');
        if (!target) return;

        const labels = {
            home: 'Home',
            about_us: 'About Us',
            be_one_of_us: 'Be One of Us',
            thank_you: 'Thank You'
        };
        const totals = Object.fromEntries((rows || []).map((row) => [row.page_key, Number(row.total_visits) || 0]));

        target.innerHTML = Object.entries(labels).map(([key, label]) => `
            <article>
                <span>${label}</span>
                <strong data-stat-value="${totals[key] || 0}">0</strong>
            </article>
        `).join('');
        target.querySelectorAll('[data-stat-value]').forEach((item) => {
            animateNumber(item, item.dataset.statValue);
        });
    }

    async function loadSiteStats() {
        updateTeamStats();

        if (!supabaseClient) {
            renderContentOverview([]);
            return;
        }

        const { data, error } = await supabaseClient
            .from('site_page_visits')
            .select('page_key,total_visits')
            .order('page_key', { ascending: true });

        if (error) {
            renderContentOverview([]);
            return;
        }

        const totalVisits = (data || []).reduce((sum, row) => sum + (Number(row.total_visits) || 0), 0);
        setStat('#stat-total-visits', totalVisits);
        renderContentOverview(data || []);
    }

    function setupLiveStats() {
        if (!supabaseClient) return;

        window.setInterval(() => {
            loadSiteStats().catch(() => {});
        }, 15000);

        supabaseClient
            .channel('admin-site-stats')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'site_page_visits' }, () => {
                loadSiteStats().catch(() => {});
            })
            .subscribe();
    }

    function addUploadZones() {
        document.querySelectorAll('input[data-setting]').forEach((input) => {
            if (input.dataset.noUpload === 'true' || !isAssetField(input.dataset.setting) || input.closest('label').querySelector('.upload-zone')) return;

            const zone = document.createElement('button');
            zone.type = 'button';
            zone.className = 'upload-zone';
            zone.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i><span>Drop file or click upload</span>';
            input.insertAdjacentElement('afterend', zone);

            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.hidden = true;
            fileInput.accept = 'image/*,video/*,.svg,.gif,.ico';
            zone.insertAdjacentElement('afterend', fileInput);

            zone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', () => {
                uploadFile(fileInput.files[0], input, zone)
                    .catch((error) => showToast(error.message))
                    .finally(() => { fileInput.value = ''; });
            });
            ['dragenter', 'dragover'].forEach((eventName) => {
                zone.addEventListener(eventName, (event) => {
                    event.preventDefault();
                    zone.classList.add('drag-over');
                });
            });
            ['dragleave', 'drop'].forEach((eventName) => {
                zone.addEventListener(eventName, (event) => {
                    event.preventDefault();
                    zone.classList.remove('drag-over');
                });
            });
            zone.addEventListener('drop', (event) => {
                uploadFile(event.dataTransfer.files[0], input, zone).catch((error) => showToast(error.message));
            });
        });
    }

    function addAssetPreviews() {
        document.querySelectorAll('input[data-setting]').forEach((input) => {
            if (!isAssetField(input.dataset.setting) || input.closest('label').querySelector('.asset-preview')) return;
            const preview = document.createElement('div');
            preview.className = 'asset-preview';
            preview.innerHTML = '<span>No preview yet</span>';
            const fileInput = input.closest('label').querySelector('input[type="file"]');
            (fileInput || input).insertAdjacentElement('afterend', preview);
            input.addEventListener('input', () => updatePreview(input));
        });
    }

    function makePreviewPath(value) {
        const trimmed = value.trim();
        if (!trimmed) return '';
        if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed;
        return trimmed.split('/').map((part) => encodeURIComponent(part)).join('/');
    }

    function youtubeEmbedUrl(value) {
        try {
            const url = new URL(value);
            if (url.hostname.includes('youtu.be')) return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
            if (url.hostname.includes('youtube.com')) {
                if (url.pathname.startsWith('/embed/')) return value;
                const id = url.searchParams.get('v');
                if (id) return `https://www.youtube.com/embed/${id}`;
            }
        } catch (error) {
            return '';
        }
        return '';
    }

    function updatePreview(input) {
        const preview = input.closest('label')?.querySelector('.asset-preview');
        if (!preview) return;
        const value = input.value.trim();
        if (!value) {
            preview.innerHTML = '<span>No preview yet</span>';
            preview.classList.remove('has-media');
            return;
        }

        const path = makePreviewPath(value);
        const lower = value.toLowerCase();
        preview.classList.add('has-media');

        const embed = youtubeEmbedUrl(value);
        if (embed) {
            preview.innerHTML = `<iframe src="${embed}" title="Current video preview" allowfullscreen loading="lazy"></iframe>`;
            return;
        }

        if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(lower)) {
            preview.innerHTML = `<video src="${path}" controls muted playsinline preload="metadata"></video><small class="preview-caption">Current video preview</small>`;
            return;
        }

        if (/\.(png|jpe?g|gif|webp|svg|ico)(\?.*)?$/i.test(lower)) {
            preview.innerHTML = `<img src="${path}" alt="Current asset preview" onerror="this.closest('.asset-preview').innerHTML='<span>Preview file not found</span>'"><small class="preview-caption">Current image preview</small>`;
            return;
        }

        preview.innerHTML = `<span>${value}</span>`;
    }

    function safeFileName(fileName) {
        const dot = fileName.lastIndexOf('.');
        const ext = dot >= 0 ? fileName.slice(dot).toLowerCase() : '';
        const base = (dot >= 0 ? fileName.slice(0, dot) : fileName)
            .replace(/[^a-z0-9_-]+/gi, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 50) || 'upload';
        return `${base}-${Date.now()}${ext}`;
    }

    async function uploadFile(file, input, zone) {
        if (!file) return;
        const originalZoneHtml = zone?.innerHTML;
        if (zone) {
            zone.disabled = true;
            zone.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Uploading...</span>';
        }

        try {
            if (contentMode === 'supabase' && supabaseClient && supabaseConfig) {
                const filePath = `admin/${safeFileName(file.name)}`;
                const { error } = await supabaseClient.storage
                    .from(supabaseConfig.bucket)
                    .upload(filePath, file, { upsert: true, cacheControl: '3600' });
                if (error) throw error;

                const { data } = supabaseClient.storage.from(supabaseConfig.bucket).getPublicUrl(filePath);
                input.value = data.publicUrl;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                await saveContent();
                showToast('Uploaded and saved online.');
                return;
            }

            if (contentMode === 'local-server') {
                const formData = new FormData();
                formData.append('file', file);
                const response = await fetch('/api/upload', { method: 'POST', body: formData });
                const result = await response.json();
                if (!response.ok || !result.ok) throw new Error(result.error || 'Upload failed');
                input.value = result.path;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                await saveContent();
                showToast('Uploaded and saved locally.');
                return;
            }

            throw new Error('Uploads need Supabase login or the local admin server.');
        } finally {
            if (zone) {
                zone.disabled = false;
                zone.innerHTML = originalZoneHtml || '<i class="fa-solid fa-cloud-arrow-up"></i><span>Drop file or click upload</span>';
            }
        }
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
        setTimeout(() => toast.classList.remove('active'), 3200);
    }

    function setupNavState() {
        const navLinks = Array.from(document.querySelectorAll('.admin-nav a[href^="#"]'));
        const navItems = navLinks
            .map((link) => {
                const section = document.querySelector(link.getAttribute('href'));
                return section ? { link, section } : null;
            })
            .filter(Boolean);

        if (!navItems.length) return;

        const setActiveLink = (activeLink) => {
            navLinks.forEach((item) => item.classList.toggle('active', item === activeLink));
        };

        navItems.forEach(({ link, section }) => {
            const accent = getComputedStyle(section).getPropertyValue('--panel-accent').trim();
            if (accent) link.style.setProperty('--admin-nav-active-color', accent);
        });

        const updateActiveLink = () => {
            const scrollPosition = window.scrollY + Math.min(window.innerHeight * 0.35, 260);
            let activeItem = navItems[0];

            navItems.forEach((item) => {
                if (item.section.offsetTop <= scrollPosition) activeItem = item;
            });

            setActiveLink(activeItem.link);
        };

        navLinks.forEach((link) => {
            link.addEventListener('click', (event) => {
                const target = document.querySelector(link.getAttribute('href'));
                if (!target) return;

                event.preventDefault();
                setActiveLink(link);
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });

                if (history.pushState) {
                    history.pushState(null, '', link.getAttribute('href'));
                }
            });
        });

        window.addEventListener('scroll', updateActiveLink, { passive: true });
        window.addEventListener('resize', updateActiveLink);
        updateActiveLink();
    }

    function setupCreditsModal() {
        const trigger = document.getElementById('credits-trigger');
        const modal = document.getElementById('credits-modal');
        if (!trigger || !modal) return;

        const closeButtons = modal.querySelectorAll('[data-credits-close]');
        const openModal = () => {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('credits-modal-open');
            modal.querySelector('.credits-modal__close')?.focus();
        };
        const closeModal = () => {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('credits-modal-open');
            trigger.focus();
        };

        trigger.addEventListener('click', openModal);
        closeButtons.forEach((button) => button.addEventListener('click', closeModal));
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal.classList.contains('active')) closeModal();
        });
    }

    function setupScrollTop() {
        const button = document.getElementById('admin-scroll-top');
        if (!button) return;

        const updateButton = () => {
            button.classList.toggle('visible', window.scrollY > 420);
        };

        button.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        window.addEventListener('scroll', updateButton, { passive: true });
        updateButton();
    }

    function setupStatsAutoUpdate() {
        const aboutSection = document.getElementById('about-settings');
        if (!aboutSection) return;

        aboutSection.addEventListener('input', (event) => {
            if (!event.target.matches('[data-setting^="about."]')) return;
            collectFields();
            updateTeamStats();
        });
    }

    async function init() {
        normalizeGridSettings();
        setupNavState();
        setupCreditsModal();
        setupScrollTop();
        setupStatsAutoUpdate();
        if (!await requireAuth()) return;
        await loadContent();
        await loadSiteStats();
        setupLiveStats();
        createTeamRows();
        addUploadZones();
        addAssetPreviews();
        loadFields();
        updateTeamStats();
    }

    document.getElementById('save-all')?.addEventListener('click', () => {
        saveContent().catch((error) => showToast(error.message));
    });
    document.getElementById('admin-logout')?.addEventListener('click', async () => {
        sessionStorage.removeItem('gokidzAdminAuthed');
        await supabaseClient?.auth.signOut();
        window.location.href = 'signup-admin.html';
    });

    init().catch((error) => showToast(error.message));
})();

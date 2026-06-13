(function () {
    const fallbackStorageKey = 'gokidzAdminDrafts';
    const teamMinimumCounts = { staff: 4, editor: 7, producer: 6, performer: 6 };
    const assetKeys = ['favicon', 'Logo', 'Images', 'Video', 'Background', 'media', 'image', 'characters', 'footerLogo'];
    const supabaseClient = window.gokidzSupabaseClient?.();
    const supabaseConfig = window.GOKIDZ_SUPABASE;
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

    async function requireAuth() {
        if (supabaseClient) {
            const { data } = await supabaseClient.auth.getSession();
            if (data.session) {
                sessionStorage.setItem('gokidzAdminAuthed', 'true');
                return true;
            }
        }

        if (!supabaseClient && sessionStorage.getItem('gokidzAdminAuthed') === 'true') return true;
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

    function formatLoginTime(value) {
        if (!value) return 'Unknown time';
        return new Intl.DateTimeFormat(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        }).format(new Date(value));
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[char]));
    }

    function renderAdminLogs(logs, message = '') {
        const target = document.getElementById('admin-login-logs');
        if (!target) return;

        if (message) {
            target.innerHTML = `<tr><td colspan="4">${escapeHtml(message)}</td></tr>`;
            return;
        }

        if (!logs.length) {
            target.innerHTML = '<tr><td colspan="4">No admin logins recorded yet.</td></tr>';
            return;
        }

        target.innerHTML = logs.map((log) => `
            <tr>
                <td><strong>${escapeHtml(log.email || 'Unknown admin')}</strong></td>
                <td>${escapeHtml(log.device_label || [log.device_type, log.os, log.browser].filter(Boolean).join(' / ') || 'Unknown device')}</td>
                <td>
                    ${escapeHtml(log.location_label || 'Location unavailable')}
                    ${log.location_permission === 'denied' ? '<small>Permission denied</small>' : ''}
                </td>
                <td>${formatLoginTime(log.created_at)}</td>
            </tr>
        `).join('');
    }

    async function loadAdminLogs() {
        if (!supabaseClient) {
            renderAdminLogs([], 'Admin logs need Supabase login.');
            return;
        }

        const { data, error } = await supabaseClient
            .from('admin_login_logs')
            .select('email, device_label, device_type, browser, os, location_label, location_permission, created_at')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            renderAdminLogs([], 'Admin logs table is not ready yet. Create it in Supabase first.');
            return;
        }

        renderAdminLogs(data || []);
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
        const navLinks = document.querySelectorAll('.admin-nav a');
        navLinks.forEach((link) => {
            link.addEventListener('click', () => {
                navLinks.forEach((item) => item.classList.remove('active'));
                link.classList.add('active');
            });
        });
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

    async function init() {
        normalizeGridSettings();
        setupNavState();
        setupCreditsModal();
        setupScrollTop();
        if (!await requireAuth()) return;
        await loadContent();
        await loadAdminLogs();
        createTeamRows();
        addUploadZones();
        addAssetPreviews();
        loadFields();
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

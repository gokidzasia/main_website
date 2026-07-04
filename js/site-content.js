(function () {
    async function loadContent() {
        const supabaseClient = window.gokidzSupabaseClient?.();
        const config = window.GOKIDZ_SUPABASE;

        if (supabaseClient && config) {
            try {
                const { data, error } = await supabaseClient
                    .from('site_content')
                    .select('content')
                    .eq('id', config.contentId)
                    .maybeSingle();
                if (error) throw error;
                if (data?.content) return data.content;
            } catch (error) {
                console.warn('Supabase content could not be loaded:', error.message);
            }
        }

        try {
            const response = await fetch('data/site-content.json', { cache: 'no-store' });
            if (!response.ok) throw new Error('Content file not found');
            return await response.json();
        } catch (error) {
            console.warn('GOKidz content could not be loaded:', error.message);
            return null;
        }
    }

    function setText(selector, text) {
        const element = document.querySelector(selector);
        if (element && text !== undefined) element.textContent = text;
    }

    function setImage(selector, src) {
        const element = document.querySelector(selector);
        if (element && src) {
            element.hidden = false;
            element.src = mediaPath(src);
        }
    }

    function getByPath(object, path) {
        return path.split('.').reduce((value, key) => value?.[key], object);
    }

    function setMetaContent(selector, content) {
        const element = document.querySelector(selector);
        if (element && content) element.setAttribute('content', content);
    }

    function mediaPath(src) {
        if (!src) return '';
        if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:')) return src;
        const optimizedLocalAssets = {
            'static-logo.png': 'static-logo-header.png',
            '3d-characters.png': '3d-characters-small.png'
        };
        const mappedSrc = optimizedLocalAssets[src] || src;
        return mappedSrc.split('/').map((part) => encodeURIComponent(part)).join('/');
    }

    function setVideo(selector, src) {
        const video = document.querySelector(selector);
        if (!video || !src) return;
        const finalSrc = mediaPath(src);
        video.preload = 'none';
        video.muted = true;
        video.playsInline = true;
        video.controls = false;
        video.disablePictureInPicture = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');
        video.removeAttribute('controls');
        video.dataset.src = finalSrc;
        video.querySelectorAll('source').forEach((source) => source.remove());
        video.dataset.loaded = 'false';
        window.gokidzObserveLazyVideos?.();
    }

    function isVideo(src) {
        return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(src || '');
    }

    function videoType(src) {
        if (/\.webm(\?.*)?$/i.test(src || '')) return 'video/webm';
        if (/\.ogg(\?.*)?$/i.test(src || '')) return 'video/ogg';
        return 'video/mp4';
    }

    function applyMain(content) {
        if (!content?.main) return;
        const main = content.main;
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon && main.favicon) favicon.href = main.favicon;

        if (main.thumbnail) {
            setMetaContent('meta[property="og:image"]', main.thumbnail);
            setMetaContent('meta[name="twitter:image"]', main.thumbnail);
        }

        const headerLogo = document.getElementById('header-logo');
        if (headerLogo) {
            if (main.animatedLogo) headerLogo.dataset.animated = mediaPath(main.animatedLogo);
            if (main.staticLogo) {
                const staticLogo = mediaPath(main.staticLogo);
                headerLogo.dataset.static = staticLogo;
                headerLogo.src = staticLogo;
            }
        }

        setImage('.footer-brand img', main.footerLogo || main.staticLogo);
        setText('.footer-brand p', main.footerDescription);
        setImage('.footer-character img', main.characters);
        setText('.copyright', main.copyright);
    }

    function applyHome(content) {
        if (!content?.home || !document.querySelector('.hero-video-section')) return;
        const home = content.home;
        setVideo('#hero-video', home.heroVideo);

        const heading = document.querySelector('.welcome-text h1');
        if (heading && home.welcomeHeader) heading.innerHTML = home.welcomeHeader.replace(/\n/g, '<br>');

        const welcomeText = document.querySelector('.welcome-text');
        if (welcomeText && home.welcomeSubtitle) {
            welcomeText.querySelectorAll('p').forEach((p) => p.remove());
            home.welcomeSubtitle.split(/\n\s*\n/).filter(Boolean).forEach((paragraph) => {
                const p = document.createElement('p');
                p.textContent = paragraph.trim();
                welcomeText.appendChild(p);
            });
        }

        const welcomeIframe = document.querySelector('.welcome-video iframe');
        if (welcomeIframe && home.welcomeVideo) welcomeIframe.src = home.welcomeVideo;

        const highlights = document.querySelector('.highlights-section');
        if (highlights && home.discoverBackground) highlights.style.backgroundImage = `url('${home.discoverBackground}')`;

        const items = document.querySelectorAll('.grid-container .square-item');
        (home.grids || []).forEach((grid, index) => {
            const item = items[index];
            if (!item) return;
            setTextIn(item, '.square-title-default', grid.title);
            setTextIn(item, '.square-overlay h3', grid.hoverTitle);
            setTextIn(item, '.square-overlay p', grid.description);
            updateMedia(item, grid.media);
        });

        applyPartners(home.partners);
    }

    function applyPartners(partners) {
        const section = document.querySelector('.partners-section');
        if (!section || !partners) return;

        setTextIn(section, 'h2', partners.title);

        const track = section.querySelector('.partners-track');
        const logos = (partners.logos || []).filter((logo) => logo?.image);
        if (!track || !logos.length) return;

        track.innerHTML = '';
        [...logos, ...logos].forEach((logo, index) => {
            const image = document.createElement('img');
            image.src = mediaPath(logo.image);
            image.alt = logo.alt || '';
            image.width = 240;
            image.height = 150;
            image.loading = 'lazy';
            image.decoding = 'async';
            image.fetchPriority = 'low';
            if (index >= logos.length) image.setAttribute('aria-hidden', 'true');
            track.appendChild(image);
        });
    }

    function setTextIn(root, selector, text) {
        const element = root.querySelector(selector);
        if (element && text !== undefined) element.textContent = text;
    }

    function updateMedia(item, src) {
        if (!src) return;
        const oldMedia = item.querySelector('.square-media');
        if (!oldMedia) return;

        if (isVideo(src)) {
            let video = oldMedia.tagName.toLowerCase() === 'video' ? oldMedia : null;
            if (!video) {
                video = document.createElement('video');
                video.className = 'square-media lazy-video';
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                video.controls = false;
                oldMedia.replaceWith(video);
            }
            video.classList.add('lazy-video');
            video.preload = 'none';
            video.muted = true;
            video.playsInline = true;
            video.controls = false;
            video.disablePictureInPicture = true;
            video.setAttribute('playsinline', '');
            video.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');
            video.removeAttribute('controls');
            video.dataset.src = mediaPath(src);
            video.dataset.loaded = 'false';
            video.querySelectorAll('source').forEach((source) => source.remove());
            window.gokidzObserveLazyVideos?.();
        } else {
            let image = oldMedia.tagName.toLowerCase() === 'img' ? oldMedia : null;
            if (!image) {
                image = document.createElement('img');
                image.className = 'square-media';
                oldMedia.replaceWith(image);
            }
            image.src = mediaPath(src);
            image.alt = item.querySelector('.square-title-default')?.textContent || 'GOKidz media';
        }
    }

    function applyAbout(content) {
        if (!content?.about || !document.querySelector('.hill-container')) return;
        const about = content.about;
        applyAboutPageContent(about.content);
        setImage('.director-card img', about.director?.image);
        setText('.director-card h3', about.director?.name);
        applyTeam('Our Staff', about.staff);
        applyTeam('Video Editors', about.editor);
        applyTeam('Music Production', about.producer);
        applyTeam('Studio Performers', about.performer);
        applyTeam('Scriptwriters', about.scriptwriter);
    }

    function applyAboutPageContent(aboutContent) {
        if (!aboutContent) return;

        document.querySelectorAll('[data-about-field]').forEach((element) => {
            const value = getByPath(aboutContent, element.dataset.aboutField);
            if (value !== undefined) element.textContent = value;
        });

        document.querySelectorAll('[data-about-image]').forEach((image) => {
            const value = getByPath(aboutContent, image.dataset.aboutImage);
            if (value) {
                image.hidden = false;
                image.src = mediaPath(value);
            }
        });
    }

    function applyTeam(title, members) {
        if (!Array.isArray(members)) return;
        const heading = Array.from(document.querySelectorAll('.team-container h2')).find((h2) => h2.textContent.trim() === title);
        const grid = heading?.nextElementSibling;
        if (!grid || !grid.classList.contains('grid-container')) return;

        grid.innerHTML = '';
        members.forEach((member, index) => {
            const card = document.createElement('div');
            const delayClass = index % 4 === 1 ? ' delay-100' : index % 4 === 2 ? ' delay-200' : index % 4 === 3 ? ' delay-300' : '';
            card.className = `member-card reveal${delayClass}`;
            card.innerHTML = `<img src="${member.image || ''}" alt="${member.name || 'Team member'}"><h3>${member.name || ''}</h3>`;
            grid.appendChild(card);
        });
    }

    document.addEventListener('DOMContentLoaded', async () => {
        const content = await loadContent();
        if (!content) return;
        applyMain(content);
        applyHome(content);
        applyAbout(content);
        window.gokidzObserveRevealElements?.();
    });
})();





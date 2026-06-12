(function () {
    function setupLogoSwap() {
        const logo = document.getElementById('header-logo');
        if (!logo) return;

        const staticSrc = logo.getAttribute('data-static');
        if (!staticSrc) return;

        setTimeout(() => {
            logo.src = staticSrc;
        }, 2000);
    }

    function setupMobileNav() {
        const toggleBtn = document.getElementById('mobile-toggle');
        const navMenu = document.getElementById('nav-menu');
        const vbsDropdown = document.getElementById('vbs-dropdown');

        if (toggleBtn && navMenu) {
            toggleBtn.addEventListener('click', () => {
                toggleBtn.classList.toggle('active');
                navMenu.classList.toggle('active');
            });
        }

        if (vbsDropdown) {
            vbsDropdown.addEventListener('click', (event) => {
                if (window.innerWidth > 768) return;

                const dropdownLink = vbsDropdown.querySelector('a');
                if (event.target === dropdownLink) {
                    event.preventDefault();
                    vbsDropdown.classList.toggle('active');
                }
            });
        }
    }

    function setupRevealAnimations() {
        const revealElements = document.querySelectorAll('.reveal');
        if (!revealElements.length) return;

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            root: null,
            threshold: 0.1,
            rootMargin: '0px 0px -20px 0px'
        });

        revealElements.forEach((element) => revealObserver.observe(element));
    }

    function loadChatbase() {
        if (!window.chatbase || window.chatbase('getState') !== 'initialized') {
            window.chatbase = (...args) => {
                if (!window.chatbase.q) window.chatbase.q = [];
                window.chatbase.q.push(args);
            };
            window.chatbase = new Proxy(window.chatbase, {
                get(target, prop) {
                    if (prop === 'q') return target.q;
                    return (...args) => target(prop, ...args);
                }
            });
        }

        const onLoad = function () {
            if (document.getElementById('M0i9aCRNBG4AEd4qevHBk')) return;

            const script = document.createElement('script');
            script.src = 'https://www.chatbase.co/embed.min.js';
            script.id = 'M0i9aCRNBG4AEd4qevHBk';
            script.domain = 'www.chatbase.co';
            document.body.appendChild(script);
        };

        if (document.readyState === 'complete') {
            onLoad();
        } else {
            window.addEventListener('load', onLoad);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        setupLogoSwap();
        setupMobileNav();
        setupRevealAnimations();
        loadChatbase();
    });
})();

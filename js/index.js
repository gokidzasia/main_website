(function () {
    const heroVideo = document.getElementById('hero-video');
    const heroSection = document.querySelector('.hero-video-section');

    if (!heroVideo || !heroSection) return;

    window.addEventListener('scroll', () => {
        const scrollPosition = window.scrollY;
        const sectionHeight = heroSection.offsetHeight;
        const opacity = Math.max(0, Math.min(1, 1 - (scrollPosition / sectionHeight)));

        heroVideo.style.opacity = opacity;
    });
})();

(function () {
    let observer = null;

    const loadVideo = (video) => {
        if (video.dataset.loaded === 'true') return;
        if (!video.dataset.src) return;

        video.querySelectorAll('source').forEach((existingSource) => existingSource.remove());
        const source = document.createElement('source');
        source.src = video.dataset.src;
        source.type = 'video/mp4';
        video.appendChild(source);
        video.dataset.loaded = 'true';
        video.load();

        const playPromise = video.play();
        if (playPromise) {
            playPromise.catch(() => {
                video.controls = true;
            });
        }
    };

    const observeLazyVideos = () => {
        const lazyVideos = document.querySelectorAll('video.lazy-video[data-src], video#hero-video[data-src]');

        if (!('IntersectionObserver' in window)) {
            lazyVideos.forEach(loadVideo);
            return;
        }

        if (!observer) {
            observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;

                    loadVideo(entry.target);
                    observer.unobserve(entry.target);
                });
            }, { rootMargin: '300px 0px' });
        }

        lazyVideos.forEach((video) => {
            if (video.dataset.loaded === 'true') return;
            observer.observe(video);
        });
    };

    window.gokidzLoadVideo = loadVideo;
    window.gokidzObserveLazyVideos = observeLazyVideos;

    window.addEventListener('load', observeLazyVideos, { once: true });
})();

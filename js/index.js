(function () {
    const heroVideo = document.getElementById('hero-video');
    const heroSection = document.querySelector('.hero-video-section');

    if (!heroVideo || !heroSection) return;

    window.addEventListener('scroll', () => {
        const scrollPosition = window.scrollY;
        const sectionHeight = heroSection.offsetHeight;
        const opacity = Math.max(0, Math.min(1, 1 - (scrollPosition / sectionHeight)));

        heroVideo.style.opacity = opacity;

        if (scrollPosition <= sectionHeight) {
            heroVideo.style.transform = `translateY(${scrollPosition * 0.3}px)`;
        }
    });
})();

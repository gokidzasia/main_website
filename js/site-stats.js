(function () {
    const pageNames = {
        '/': 'home',
        '/index.html': 'home',
        '/about_us.html': 'about_us',
        '/be_one_of_us.html': 'be_one_of_us',
        '/thank_you.html': 'thank_you'
    };

    function pageKey() {
        const path = window.location.pathname.replace(/\/+$/, '') || '/';
        return pageNames[path] || path.replace(/^\/+/, '').replace(/\.html$/i, '').replace(/[^a-z0-9_]+/gi, '_').toLowerCase() || 'home';
    }

    async function trackVisit() {
        const supabaseClient = window.gokidzSupabaseClient?.();
        if (!supabaseClient) return;
        await supabaseClient.rpc('increment_site_visit', { page_name: pageKey() });
    }

    trackVisit().catch(() => {});
})();

(function () {
    window.GOKIDZ_SUPABASE = {
        url: 'https://gjbgabyvdaqvauctfbzk.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqYmdhYnl2ZGFxdmF1Y3RmYnprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNjc1MDcsImV4cCI6MjA5Njg0MzUwN30.p43qXy5XYs8fzWoSWDu0elSYw5seSIDHOZIThvoyp5Y',
        contentId: 'main',
        bucket: 'gokidz-assets',
        adminEmail: 'gokidzasia@gmail.com'
    };

    window.gokidzSupabaseClient = function () {
        if (!window.supabase || !window.GOKIDZ_SUPABASE) return null;
        if (!window.gokidzSupabaseInstance) {
            window.gokidzSupabaseInstance = window.supabase.createClient(
                window.GOKIDZ_SUPABASE.url,
                window.GOKIDZ_SUPABASE.anonKey
            );
        }
        return window.gokidzSupabaseInstance;
    };
})();

function normalizeYouTubeHandle(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '@GOKidzAsia';
  if (/^UC[\w-]{20,}$/i.test(trimmed)) return trimmed;
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

function youtubeStatsUrl(handle, apiKey) {
  const params = new URLSearchParams({
    part: 'snippet,statistics',
    key: apiKey
  });

  if (/^UC[\w-]{20,}$/i.test(handle)) {
    params.set('id', handle);
  } else {
    params.set('forHandle', handle);
  }

  return `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`;
}

function parseYouTubeStats(payload) {
  const channel = payload?.items?.[0];
  if (!channel) throw new Error('YouTube channel was not found');

  const statistics = channel.statistics || {};
  return {
    title: channel.snippet?.title || '',
    subscriberCount: statistics.hiddenSubscriberCount ? 0 : Number(statistics.subscriberCount) || 0,
    viewCount: Number(statistics.viewCount) || 0,
    videoCount: Number(statistics.videoCount) || 0
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ ok: false, error: 'Set YOUTUBE_API_KEY in Vercel Environment Variables.' });
  }

  try {
    const handle = normalizeYouTubeHandle(req.query.handle);
    const response = await fetch(youtubeStatsUrl(handle, apiKey));
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: payload?.error?.message || 'YouTube stats unavailable'
      });
    }

    return res.status(200).json({ ok: true, stats: parseYouTubeStats(payload) });
  } catch (error) {
    return res.status(502).json({ ok: false, error: error.message });
  }
};

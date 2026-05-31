const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export const resolveChannelId = async (input, apiKey) => {
  if (!apiKey) throw new Error("YouTube API key is missing. Add it in Settings.");
  
  let query = input.trim();
  
  // 1. Direct Channel ID check
  if (query.startsWith('UC') && query.length === 24 && !query.includes('/')) {
    return query; 
  }

  // 2. Parse URL
  if (query.includes('youtube.com') || query.includes('youtu.be')) {
    try {
      const url = new URL(query.startsWith('http') ? query : `https://${query}`);
      const pathParts = url.pathname.split('/').filter(Boolean);
      
      if (pathParts[0] === 'channel' && pathParts[1]) {
        return pathParts[1];
      }
      
      if (pathParts[0] && pathParts[0].startsWith('@')) {
        query = pathParts[0]; // will be handled by handle search
      } else if (pathParts[0] === 'c' || pathParts[0] === 'user') {
        query = pathParts[1]; // handle custom urls via search
      }
    } catch(e) {
      // ignore url parse error, fallback to search
    }
  }

  // 3. Search to resolve handle/name to Channel ID
  // If it starts with @, remove it for a cleaner search if needed, but keeping it usually works too.
  const searchRes = await fetch(
    `${YOUTUBE_API_BASE}/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&key=${apiKey}`
  );
  
  if (!searchRes.ok) throw new Error('Failed to search for channel.');
  const searchData = await searchRes.json();
  
  if (searchData.items && searchData.items.length > 0) {
    return searchData.items[0].snippet.channelId;
  }
  
  throw new Error('Could not find a channel matching that handle or link.');
};

export const fetchChannelStats = async (input, apiKey) => {
  if (!apiKey) throw new Error("YouTube API key is missing. Add it in Settings.");

  const channelId = await resolveChannelId(input, apiKey);

  const response = await fetch(
    `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch YouTube channel data');
  }

  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    throw new Error('Channel not found');
  }

  const channel = data.items[0];
  return {
    channelId: channel.id,
    channelName: channel.snippet.title,
    subscribers: parseInt(channel.statistics.subscriberCount, 10),
    totalViews: parseInt(channel.statistics.viewCount, 10),
    videoCount: parseInt(channel.statistics.videoCount, 10),
    thumbnailUrl: channel.snippet.thumbnails.default.url
  };
};

export const fetchRecentVideos = async (channelId, apiKey, maxResults = 10) => {
  if (!apiKey) throw new Error("YouTube API key is missing. Add it in Settings.");

  // 1. Get recent video IDs
  const searchResponse = await fetch(
    `${YOUTUBE_API_BASE}/search?part=id,snippet&channelId=${channelId}&maxResults=${maxResults}&order=date&type=video&key=${apiKey}`
  );
  
  if (!searchResponse.ok) {
    throw new Error('Failed to fetch recent videos list');
  }

  const searchData = await searchResponse.json();
  if (!searchData.items || searchData.items.length === 0) {
    return []; // No videos
  }

  const videoIds = searchData.items.map(item => item.id.videoId).join(',');

  // 2. Get video statistics for those IDs
  const statsResponse = await fetch(
    `${YOUTUBE_API_BASE}/videos?part=snippet,statistics&id=${videoIds}&key=${apiKey}`
  );

  if (!statsResponse.ok) {
    throw new Error('Failed to fetch video statistics');
  }

  const statsData = await statsResponse.json();
  
  return statsData.items.map(video => ({
    videoId: video.id,
    title: video.snippet.title,
    views: parseInt(video.statistics.viewCount || 0, 10),
    likes: parseInt(video.statistics.likeCount || 0, 10),
    comments: parseInt(video.statistics.commentCount || 0, 10),
    publishedAt: video.snippet.publishedAt,
    thumbnailUrl: video.snippet.thumbnails.medium.url
  }));
};

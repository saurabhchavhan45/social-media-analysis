export const fetchInstagramStats = async (input, apiKey) => {
  if (!apiKey) throw new Error("RapidAPI key is missing. Add VITE_RAPIDAPI_KEY to your .env file.");
  
  let url = input.trim();
  
  // If they typed just a username, format it as an Instagram URL
  if (!url.includes('instagram.com')) {
    const username = url.startsWith('@') ? url.substring(1) : url;
    url = `https://www.instagram.com/${username}/`;
  } else if (!url.endsWith('/')) {
    url = url + '/';
  }

  const response = await fetch(`https://instagram-statistics-api.p.rapidapi.com/community?url=${encodeURIComponent(url)}`, {
    method: 'GET',
    headers: {
      'x-rapidapi-host': 'instagram-statistics-api.p.rapidapi.com',
      'x-rapidapi-key': apiKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Instagram data. Check your API key or username.');
  }

  const result = await response.json();
  
  if (!result || !result.data) {
    throw new Error('No data returned. Make sure the username is correct and the profile is public.');
  }
  
  const d = result.data;

  // Engagement rate: raw decimal -> percentage
  const engagementRate = d.avgER ? parseFloat((d.avgER * 100).toFixed(2)) : 0;

  // Parse gender summary
  let genderSummary = null;
  try {
    const genderAges = typeof d.membersGendersAges === 'string' ? JSON.parse(d.membersGendersAges) : d.membersGendersAges;
    if (genderAges && genderAges.summary) {
      genderSummary = {
        male: parseFloat((genderAges.summary.m * 100).toFixed(1)),
        female: parseFloat((genderAges.summary.f * 100).toFixed(1)),
        avgAge: genderAges.summary.avgAges
      };
    }
  } catch (e) {
    // ignore parse error
  }

  // Parse audience quality (member types)
  let audienceQuality = null;
  if (d.membersTypes && d.membersTypes.length > 0) {
    audienceQuality = {};
    d.membersTypes.forEach(t => {
      audienceQuality[t.name] = parseFloat((t.percent * 100).toFixed(1));
    });
  }

  return {
    // Core profile info
    username: d.screenName,
    name: d.name,
    avatar: d.image,
    description: d.description,
    verified: d.verified,
    country: d.country,
    countryCode: d.countryCode,
    type: d.type, // influencer, etc.

    // Key metrics
    followers: parseInt(d.usersCount || 0, 10),
    engagement_rate: engagementRate,
    avg_likes: parseInt(d.avgLikes || 0, 10),
    avg_comments: parseInt(d.avgComments || 0, 10),
    avg_interactions: parseInt(d.avgInteractions || 0, 10),
    quality_score: d.qualityScore ? parseFloat((d.qualityScore * 100).toFixed(1)) : 0,
    fake_followers_pct: d.pctFakeFollowers ? parseFloat((d.pctFakeFollowers * 100).toFixed(1)) : 0,

    // Growth
    growth_180d_pct: d.pctUsersCount180d ? parseFloat((d.pctUsersCount180d * 100).toFixed(2)) : 0,

    // Audience demographics
    gender_summary: genderSummary,
    audience_quality: audienceQuality,
    top_countries: d.countries || [],
    age_distribution: d.ages || [],
    
    // Categories
    categories: d.categories || [],

    // Recent posts
    recent_posts: (d.lastPosts || []).map(p => ({
      url: p.url,
      date: p.date,
      type: p.type,
      likes: p.likes,
      comments: p.comments,
      text: p.text
    }))
  };
};

import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import axios from "axios";
import querystring from "querystring";
import { Buffer } from "buffer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const FRONTEND_URI = process.env.FRONTEND_URI || "http://localhost:3000";
const PORT = process.env.PORT || 3002;

const app = express();

// CORS Configuration
app.use(
    cors({
        origin: FRONTEND_URI,
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    })
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// Serve main page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/main_page.html"));
});

// Spotify Login Route
app.get("/login", (req, res) => {
    const scope = [
        "user-read-private",
        "user-read-email",
        "playlist-modify-public",
        "playlist-modify-private",
    ].join(" ");

    const authUrl = new URL("https://accounts.spotify.com/authorize");
    authUrl.search = new URLSearchParams({
        response_type: "code",
        client_id: CLIENT_ID,
        scope: scope,
        redirect_uri: REDIRECT_URI,
        show_dialog: true,
    }).toString();

    res.redirect(authUrl.toString());
});

// Callback Route - Get Access Token
app.get("/callback", async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect(`${FRONTEND_URI}/?error=no_code`);

    try {
        const tokenResponse = await axios.post(
            "https://accounts.spotify.com/api/token",
            querystring.stringify({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: REDIRECT_URI,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
            }),
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
        );

        const accessToken = tokenResponse.data.access_token;
        const refreshToken = tokenResponse.data.refresh_token;

        // Redirect to frontend with token stored in URL fragment
        res.redirect(
            `${FRONTEND_URI}/gen2.html#access_token=${accessToken}&refresh_token=${refreshToken}`
        );
    } catch (error) {
        res.redirect(`${FRONTEND_URI}/?error=auth_failed`);
    }
});

// Playlist Generation Endpoint
app.post("/generate-playlist", async (req, res) => {
  try {
    const { vibe, token } = req.body;
    
    if (!token) {
      return res.status(400).json({ success: false, error: "Missing access token" });
    }

    // 1. Get user ID
    const userResponse = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const userId = userResponse.data.id;
    console.log("User ID:", userId);

    // 2. Create playlist
    const playlistResponse = await axios.post(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        name: `Cadence: ${vibe} Vibe`,
        public: false,
        description: `Generated based on "${vibe}" mood`
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const playlistId = playlistResponse.data.id;
    console.log("Playlist ID:", playlistId);

    // 3. Get song recommendations
//     const recommendationsResponse = await axios.get(
//       "https://api.spotify.com/v1/recommendations",
//       {
//         headers: { Authorization: `Bearer ${token}` },
//         params: {
//           seed_genres: "pop",
//           limit: 10,
//           target_valence: vibe.includes("happy") ? 0.8 : 0.5
//         }
//       }
//     );

//     /*
// */

//     const trackUris = recommendationsResponse.data.tracks.map(t => t.uri);
//     console.log("Track URIs:", trackUris);

//     // 4. Add tracks to the playlist
//     await axios.post(
//       `https://api.spotify.com/v1/playlists/${playlist.data.id}/tracks`,
//       { uris: recommendations.data.tracks.map(t => t.uri) },
//       { headers: { 'Authorization': `Bearer ${token}` } }
//     );
// console.log("Fetching recommended tracks...");

// console.log("🎵 Recommended Tracks Response:", recommendations.data);

// const recommendations = await axios.get('https://api.spotify.com/v1/recommendations', {
//   headers: { 'Authorization': `Bearer ${token}` },
//   params: {
//     seed_genres: 'pop',
//     limit: 20,
//     target_valence: vibe.includes('happy') ? 0.8 : 0.5
//   }
// });
console.log("Fetching recommended tracks...");
let recommendations;  // Declare before assigning

try {
  recommendations = await axios.get('https://api.spotify.com/v1/recommendations', {
    headers: { 'Authorization': `Bearer ${token}` },
    params: {
      seed_genres: 'rock',
      limit: 20,
      target_valence: vibe.includes('happy') ? 0.8 : 0.5
    }
  });

  console.log("🎵 Recommended Tracks Response:", JSON.stringify(recommendations.data, null, 2));

} catch (error) {
  console.error("❌ Error fetching recommendations:", error.response?.data || error.message);
  return res.status(500).json({ success: false, error: "Failed to fetch recommended tracks" });
}



const trackUris = recommendations.data.tracks.map(t => t.uri);
console.log("Track URIs:", trackUris);

if (trackUris.length === 0) {
  console.log("❌ No tracks found! Check recommendation API.");
  return res.status(500).json({ success: false, error: "No recommended tracks found." });
}

console.log("Adding tracks to playlist...");
const addTracksResponse = await axios.post(
  `https://api.spotify.com/v1/playlists/${playlist.data.id}/tracks`,
  { uris: trackUris },
  { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
);
console.log("✅ Tracks added successfully!", addTracksResponse.data);


    res.json({
      success: true,
      playlistUrl: playlistResponse.data.external_urls.spotify,
      tracks: recommendationsResponse.data.tracks
    });

  } catch (error) {
    console.error("Error generating playlist:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
});



app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/main_page.html"));
});
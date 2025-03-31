import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import axios from "axios";
import querystring from "querystring";

dotenv.config();
console.log("Client ID:", process.env.SPOTIFY_CLIENT_ID);
console.log("Client Secret:", process.env.SPOTIFY_CLIENT_SECRET);
console.log("Redirect URI:", process.env.SPOTIFY_REDIRECT_URI);
 // Should print your actual client ID

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 1️⃣ Spotify Authentication - Redirect User to Login
app.get("/login", (req, res) => {
  const scope = "user-read-private user-read-email playlist-modify-public playlist-modify-private";
  const authUrl =
    "https://accounts.spotify.com/authorize?" +
    querystring.stringify({
      response_type: "code",
      client_id: process.env.SPOTIFY_CLIENT_ID,
      scope: scope,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    });
  res.redirect(authUrl);
});

// 🔹 2️⃣ Spotify Callback - Exchange Code for Access Token
app.get("/callback", async (req, res) => {
  const code = req.query.code || null;

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      querystring.stringify({
        code: code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    res.json(response.data); // Returns access & refresh tokens to the frontend
  } catch (error) {
    console.error("Token Exchange Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// 🔹 3️⃣ Get Song Recommendations
app.get("/recommendations", async (req, res) => {
  const { seed_tracks, seed_artists, seed_genres, token } = req.query;

  try {
    const response = await axios.get("https://api.spotify.com/v1/recommendations", {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        limit: 10,
        seed_tracks: seed_tracks || "",
        seed_artists: seed_artists || "",
        seed_genres: seed_genres || "",
      },
    });
    res.json(response.data.tracks);
  } catch (error) {
    console.error("Recommendations Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

// 🔹 4️⃣ Create Playlist & Add Songs
app.post("/create-playlist", async (req, res) => {
  const { user_id, playlist_name, track_uris, token } = req.body;

  try {
    const createPlaylist = await axios.post(
      `https://api.spotify.com/v1/users/${user_id}/playlists`,
      { name: playlist_name, public: false },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const playlistId = createPlaylist.data.id;

    await axios.post(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      { uris: track_uris },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json({ message: "Playlist created successfully", playlistId });
  } catch (error) {
    console.error("Create Playlist Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to create playlist" });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

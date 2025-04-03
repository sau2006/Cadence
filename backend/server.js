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

dotenv.config();
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const FRONTEND_URI = process.env.FRONTEND_URI || "http://localhost:3000";
const PORT = process.env.PORT || 3002;

const app = express();

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

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/main_page.html"));
});

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

async function refreshAccessToken(refreshToken) {
    try {
        const response = await axios.post(
            "https://accounts.spotify.com/api/token",
            querystring.stringify({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
        return response.data.access_token;
    } catch (error) {
        console.error("Failed to refresh token:", error.response?.data || error.message);
        return null;
    }
}

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

        res.redirect(
            `${FRONTEND_URI}/gen2.html#access_token=${accessToken}&refresh_token=${refreshToken}`
        );
    } catch (error) {
        console.error("Auth failed:", error.response?.data || error.message);
        res.redirect(`${FRONTEND_URI}/?error=auth_failed`);
    }
});

app.post("/generate-playlist", async (req, res) => {
    try {
        const { vibe, token } = req.body;
        if (!token) return res.status(400).json({ success: false, error: "Missing access token" });

        const userResponse = await axios.get("https://api.spotify.com/v1/me", {
            headers: { Authorization: `Bearer ${token}` }
        });

        const userId = userResponse.data.id;

        const playlistResponse = await axios.post(
            `https://api.spotify.com/v1/users/${userId}/playlists`,
            {
                name: `Cadence: ${vibe} Vibe`,
                public: false,
                description: `Generated based on "${vibe}" mood`
            },
            { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );

        const playlistId = playlistResponse.data.id;

        const searchResponse = await axios.get("https://api.spotify.com/v1/search", {
            headers: { Authorization: `Bearer ${token}` },
            params: {
                q: vibe,
                type: "playlist",
                limit: 1
            }
        });

        if (!searchResponse.data.playlists.items.length) {
            return res.status(500).json({ success: false, error: "No matching playlists found." });
        }

        const foundPlaylistId = searchResponse.data.playlists.items[0].id;

        const tracksResponse = await axios.get(
            `https://api.spotify.com/v1/playlists/${foundPlaylistId}/tracks`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const trackUris = tracksResponse.data.items
            .map((t) => t.track?.uri)
            .filter((uri) => uri !== null);

        if (trackUris.length === 0) {
            return res.status(500).json({ success: false, error: "No tracks found in playlist." });
        }

        await axios.post(
            `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
            { uris: trackUris.slice(0, 20) },
            { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );

        res.json({
            success: true,
            playlistUrl: playlistResponse.data.external_urls.spotify,
            tracks: trackUris
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.response?.data?.error?.message || error.message
        });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

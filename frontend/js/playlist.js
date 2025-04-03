async function generatePlaylist() {
    // 1. Get input values
    const vibeInput = document.getElementById('vibeInput');
    const resultsDiv = document.getElementById('results');
    const vibe = vibeInput.value.trim();
    const token = localStorage.getItem('spotify_access_token');
    
    // 2. Validate input
    if (!vibe) {
        alert('Please enter a vibe!');
        vibeInput.focus();
        return;
    }
    
    if (!token) {
        const shouldLogin = confirm('Please login with Spotify first. Click OK to login.');
        if (shouldLogin) loginWithSpotify();
        return;
    }
    
    try {
        // 3. Show loading state
        resultsDiv.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Creating your "${vibe}" playlist...</p>
        `;
        
        // 4. Call backend API
        const response = await fetch('http://localhost:3002/generate-playlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ vibe })
        });
        
        // 5. Handle response
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Request failed');
        }
        
        const data = await response.json();
        
        // 6. Display results
        resultsDiv.innerHTML = `
            <div class="success-message">
                <h3>Your "${vibe}" Playlist is Ready!</h3>
                <a href="${data.playlistUrl}" target="_blank" class="playlist-link">
                    Open in Spotify
                </a>
                <p class="track-count">${data.tracks?.length || 10} songs added</p>
                <button onclick="window.open('${data.playlistUrl}')" class="spotify-button">
                    <i class="fab fa-spotify"></i> Play Now
                </button>
            </div>
        `;
        
    } catch (error) {
        console.error('Playlist generation failed:', error);
        resultsDiv.innerHTML = `
            <div class="error-message">
                <p>⚠️ Failed to create playlist</p>
                <p class="error-detail">${error.message}</p>
                <button onclick="generatePlaylist()" class="retry-button">Try Again</button>
            </div>
        `;
    }
}

// Add this to your gen2.css:
/*
.loading-spinner {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #1DB954;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    animation: spin 1s linear infinite;
    margin: 0 auto;
}
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
.success-message {
    background: #f8fff8;
    padding: 15px;
    border-radius: 8px;
}
.error-message {
    background: #fff8f8;
    padding: 15px;
    border-radius: 8px;
}
*/
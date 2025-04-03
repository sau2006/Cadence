// Handle Spotify login
function loginWithSpotify() {
    window.location.href = 'http://localhost:3001/login';
  }
  
  // Handle callback (in callback.html)
  function handleCallback() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');
  
    if (accessToken) {
      localStorage.setItem('spotify_access_token', accessToken);
      localStorage.setItem('spotify_token_expiry', 
        Date.now() + expiresIn * 1000);
      window.location.href = 'gen2.html';
    } else {
      window.location.href = 'main_page.html?error=auth_failed';
    }
  }
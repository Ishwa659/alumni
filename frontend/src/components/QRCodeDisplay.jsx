import React, { useState, useEffect } from 'react';

export default function QRCodeDisplay({ roomCode, playerId, size = 'small' }) {
  const [networkHost, setNetworkHost] = useState(window.location.host);

  useEffect(() => {
    // If running on localhost or 127.0.0.1, fetch machine's actual LAN IP from server
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const serverUrl = 'http://localhost:5000';
      fetch(`${serverUrl}/api/info`)
        ? fetch(`${serverUrl}/api/info`)
            .then(res => res.json())
            .then(data => {
              if (data && data.localIp && data.localIp !== 'localhost') {
                const port = window.location.port ? `:${window.location.port}` : '';
                setNetworkHost(`${data.localIp}${port}`);
              }
            })
            .catch(err => console.warn('Could not fetch local IP:', err.message))
        : null;
    }
  }, []);

  if (!roomCode) return null;

  // Construct URL for scanning on mobile phones
  const protocol = window.location.protocol;
  const pathname = window.location.pathname;
  const baseUrl = `${protocol}//${networkHost}${pathname}`;
  
  const rejoinUrl = playerId 
    ? `${baseUrl}?room=${roomCode}&player=${playerId}` 
    : `${baseUrl}?room=${roomCode}`;

  // Request higher resolution image for the large variant
  const qrPixels = size === 'large' ? 280 : 140;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrPixels}x${qrPixels}&data=${encodeURIComponent(rejoinUrl)}&color=0-0-0&bgcolor=255-255-255`;

  const isLarge = size === 'large';

  return (
    <div className={`qr-overlay ${isLarge ? 'qr-overlay--large' : 'qr-overlay--small'}`}>
      <div className="qr-overlay__card">
        <div className="qr-overlay__image-wrap">
          <img 
            src={qrImageUrl} 
            alt={`Scan to Join Room ${roomCode}`} 
            className="qr-overlay__image"
            loading="lazy"
          />
        </div>
        <div className="qr-overlay__label">
          <span className="qr-overlay__icon">📱</span>
          <span>SCAN TO JOIN</span>
        </div>
        <div className="qr-overlay__room">ROOM: {roomCode}</div>
      </div>
    </div>
  );
}

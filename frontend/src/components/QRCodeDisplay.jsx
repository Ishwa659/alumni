import React, { useState, useEffect } from 'react';
import { getServerUrl } from '../context/GameContext';

export default function QRCodeDisplay({ roomCode, size = 'small' }) {
  const [networkHost, setNetworkHost] = useState(window.location.host);

  useEffect(() => {
    // If running on localhost or 127.0.0.1, fetch machine's actual LAN IP from server
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const serverUrl = getServerUrl();
      fetch(`${serverUrl}/api/info`)
        .then(res => res.json())
        .then(data => {
          if (data && data.localIp && data.localIp !== 'localhost') {
            const port = window.location.port ? `:${window.location.port}` : '';
            setNetworkHost(`${data.localIp}${port}`);
          }
        })
        .catch(err => console.warn('Could not fetch local IP:', err.message));
    }
  }, []);

  if (!roomCode) return null;

  // Construct clean room URL for joining on mobile phones (NEVER include host playerId)
  const protocol = window.location.protocol;
  const pathname = window.location.pathname;
  const baseUrl = `${protocol}//${networkHost}${pathname}`;
  const joinUrl = `${baseUrl}?room=${encodeURIComponent(roomCode)}`;

  // Request higher resolution image for the large variant
  const qrPixels = size === 'large' ? 240 : 120;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrPixels}x${qrPixels}&data=${encodeURIComponent(joinUrl)}&color=0-0-0&bgcolor=255-255-255`;

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

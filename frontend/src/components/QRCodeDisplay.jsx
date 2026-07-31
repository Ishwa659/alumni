import React from 'react';

export default function QRCodeDisplay({ roomCode, playerId, size = 'small' }) {
  if (!roomCode) return null;

  // Construct URL for rejoining
  const baseUrl = window.location.origin + window.location.pathname;
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

import React from 'react';

const PermissionModals = ({
  showLocationModal,
  showCameraModal,
  onLocationGranted,
  onCameraGranted,
  onCameraSkipped
}) => {
  if (!showLocationModal && !showCameraModal) return null;

  const overlayStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: '20px'
  };

  const modalStyle = {
    background: 'rgba(30, 41, 59, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '32px 24px',
    maxWidth: '400px',
    width: '100%',
    color: '#fff',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
  };

  const titleStyle = {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    marginBottom: '12px',
    color: '#F8FAFC'
  };

  const textStyle = {
    fontSize: '0.95rem',
    color: '#94A3B8',
    marginBottom: '24px',
    lineHeight: '1.5'
  };

  const primaryBtnStyle = {
    background: '#3B82F6',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.2s'
  };

  const secondaryBtnStyle = {
    background: 'transparent',
    color: '#94A3B8',
    border: '1px solid #475569',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    marginTop: '12px',
    transition: 'all 0.2s'
  };

  const smallTextStyle = {
    display: 'block',
    fontSize: '0.75rem',
    color: '#64748B',
    marginTop: '16px'
  };

  const handleLocationRequest = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => onLocationGranted(),
        (err) => console.log('Location denied', err),
        { enableHighAccuracy: true }
      );
    }
  };

  const handleCameraRequest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop tracks immediately just to get permission
      stream.getTracks().forEach(track => track.stop());
      onCameraGranted();
    } catch (err) {
      console.log('Camera denied', err);
      onCameraSkipped();
    }
  };

  return (
    <div style={overlayStyle}>
      {showLocationModal && (
        <div style={modalStyle}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📍</div>
          <h2 style={titleStyle}>Location Access Required</h2>
          <p style={textStyle}>
            GuardianSOS needs your location to alert your guardians during emergencies.
          </p>
          <button style={primaryBtnStyle} onClick={handleLocationRequest}>
            Enable Location
          </button>
        </div>
      )}

      {showCameraModal && !showLocationModal && (
        <div style={modalStyle}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📸</div>
          <h2 style={titleStyle}>Emergency Evidence (Optional)</h2>
          <p style={textStyle}>
            During SOS, we'll capture a photo to help your guardians respond. This is optional but recommended.
          </p>
          <button style={primaryBtnStyle} onClick={handleCameraRequest}>
            Enable Camera
          </button>
          <button style={secondaryBtnStyle} onClick={onCameraSkipped}>
            Skip for Now
          </button>
          <span style={smallTextStyle}>Your SOS works without this</span>
        </div>
      )}
    </div>
  );
};

export default PermissionModals;

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Share2,
  Clock,
  Camera,
  User,
  AlertTriangle
} from 'lucide-react';

const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

const EvidenceModal = ({ isOpen, onClose, evidenceList, onDownload, onShare }) => {
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const overlayStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
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
    width: '100%',
    maxWidth: '800px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
  };

  const openLightbox = (evidence) => setSelectedEvidence(evidence);
  const closeLightbox = () => setSelectedEvidence(null);

  return (
    <>
      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={e => e.stopPropagation()}>
          {/* Modal Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'white' }}>
              Evidence ({evidenceList?.length || 0})
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              <X size={24} />
            </button>
          </div>

          {/* Evidence Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: windowWidth < 768
              ? 'repeat(2, 1fr)'  // 2 columns on mobile
              : windowWidth < 1024
                ? 'repeat(3, 1fr)'  // 3 columns on tablet
                : 'repeat(4, 1fr)', // 4 columns on desktop
            gap: windowWidth < 768 ? '12px' : '16px',
            padding: windowWidth < 768 ? '12px' : '20px',
            maxHeight: '70vh',
            overflowY: 'auto'
          }}>
            {evidenceList && evidenceList.length > 0 ? (
              [...evidenceList]
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                .map(evidence => (
                  <div
                    key={evidence._id}
                    onClick={() => openLightbox(evidence)}
                    style={{
                      position: 'relative',
                      aspectRatio: '1 / 1',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Thumbnail Image */}
                    <img
                      src={evidence.thumbnailUrl || evidence.url}
                      alt="Evidence"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      loading="lazy"
                    />

                    {/* Top-left: Event Type Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      background: evidence.eventType === 'SOS_TRIGGER' ? '#EF4444' :
                        evidence.eventType === 'GUARDIAN_REQUEST' ? '#8B5CF6' : '#3B82F6',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}>
                      <AlertTriangle size={10} />
                      {evidence.eventType === 'SOS_TRIGGER' ? 'SOS' :
                        evidence.eventType === 'GUARDIAN_REQUEST' ? 'REQ' : 'MANUAL'}
                    </div>

                    {/* Bottom Overlay: Date/Time + Camera Type */}
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
                      padding: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end'
                    }}>
                      {/* Date/Time - Left */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}>
                        <div style={{
                          fontSize: '10px',
                          color: 'rgba(255,255,255,0.9)',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Clock size={10} />
                          {new Date(evidence.timestamp).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                        <div style={{
                          fontSize: '9px',
                          color: 'rgba(255,255,255,0.7)',
                          fontWeight: '500'
                        }}>
                          {new Date(evidence.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </div>

                      {/* Camera Type - Right */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '9px',
                        color: 'rgba(255,255,255,0.8)',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '3px 6px',
                        borderRadius: '4px'
                      }}>
                        {evidence.cameraType === 'user' ? (
                          <User size={10} />
                        ) : (
                          <Camera size={10} />
                        )}
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748B' }}>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                  <Camera size={48} color="#64748B" />
                </div>
                <div style={{ fontSize: '1.1rem' }}>No evidence captured yet</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Overlay */}
      {selectedEvidence && (
        <div
          onClick={closeLightbox}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '12px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <X size={24} />
          </button>

          {/* Full-size Image */}
          <img
            src={selectedEvidence.url}
            alt="Evidence Full Size"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90%',
              maxHeight: '70vh',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
          />

          {/* Metadata Panel */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: '20px',
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxWidth: '500px',
              width: '100%'
            }}
          >
            {/* Timestamp */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
              <Clock size={16} />
              <span style={{ fontSize: '14px' }}>
                {new Date(selectedEvidence.timestamp).toLocaleString()}
              </span>
            </div>

            {/* Camera Type */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.8)' }}>
              {selectedEvidence.cameraType === 'user' ? (
                <>
                  <User size={16} />
                  <span style={{ fontSize: '14px' }}>Front Camera</span>
                </>
              ) : (
                <>
                  <Camera size={16} />
                  <span style={{ fontSize: '14px' }}>Back Camera</span>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(selectedEvidence);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '2px solid #22C55E',
                  borderRadius: '8px',
                  color: '#22C55E',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)'}
              >
                <Download size={16} />
                Download
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(selectedEvidence);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '2px solid #3B82F6',
                  borderRadius: '8px',
                  color: '#3B82F6',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
              >
                <Share2 size={16} />
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EvidenceModal;

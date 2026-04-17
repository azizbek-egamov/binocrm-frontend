'use client';

import React from 'react';

const ImageModal = ({ isOpen, imageSrc, onClose }) => {
    if (!isOpen || !imageSrc) return null;

    return (
        <div className="modal-overlay" onClick={onClose} role="presentation">
            <div
                className="modal-content modal-xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '500px' }}>
                    <button
                        className="modal-close"
                        onClick={onClose}
                        aria-label="Close modal"
                        type="button"
                        style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                    <img
                        src={imageSrc || "/placeholder.svg"}
                        alt="Preview"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            borderRadius: '12px',
                            display: 'block'
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default ImageModal;

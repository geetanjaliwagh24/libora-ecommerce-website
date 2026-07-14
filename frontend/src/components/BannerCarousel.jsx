import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { API_URL } from '../config';

export const BannerCarousel = () => {
  const [banners, setBanners] = useState([
    {
      id: 'default',
      image_url: '/default_fashion_banner.jpg',
      is_default: true,
    }
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await fetch(`${API_URL}/products/banner-ads`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setBanners(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch banners", err);
      }
    };
    fetchBanners();
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === banners.length - 1 ? 0 : prevIndex + 1));
  }, [banners.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? banners.length - 1 : prevIndex - 1));
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [banners.length, nextSlide]);

  if (banners.length === 0) return null;

  return (
    <div style={{
      position: 'relative',
      width: '95%',
      maxWidth: '800px', // Further minimized length
      margin: '0 auto',
      height: '350px',
      overflow: 'hidden',
      borderRadius: '12px',
      marginBottom: '32px',
      backgroundColor: 'var(--bg-surface-elevated)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      border: '1px solid var(--border-color)'
    }}>
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transition: 'opacity 0.7s ease-in-out',
            opacity: index === currentIndex ? 1 : 0,
            zIndex: index === currentIndex ? 10 : 0
          }}
        >
          <img
            src={banner.image_url}
            alt={banner.is_default ? "Discover Fashion" : banner.brand_name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }}
          />
          
          {/* Overlay for sponsored banners */}
          {!banner.is_default && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '30px'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{
                  display: 'inline-block',
                  backgroundColor: '#facc15', // yellow-400
                  color: '#713f12', // yellow-900
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Sponsored
                </span>
              </div>
              <h2 style={{
                color: 'var(--text-light)',
                fontSize: '2.5rem',
                fontWeight: 'bold',
                margin: '0 0 8px 0',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
              }}>
                {banner.brand_name}
              </h2>
              {banner.tagline && (
                <p style={{
                  color: 'var(--text-light)',
                  fontSize: '1.1rem',
                  maxWidth: '600px',
                  margin: '0 0 16px 0',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }}>
                  {banner.tagline}
                </p>
              )}
              {/* Always link to the brand's products page */}
              <a
                href={`/?seller_id=${banner.seller_id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--text-light)',
                  color: 'var(--text-primary)',
                  padding: '8px 20px',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  width: 'fit-content',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(92, 77, 177, 0.15)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'var(--text-light)'}
              >
                Shop Brand <ExternalLink size={16} />
              </a>
            </div>
          )}
        </div>
      ))}

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 20,
              backgroundColor: 'rgba(92, 77, 177, 0.2)',
              color: 'var(--text-primary)',
              border: 'none',
              padding: '8px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(92, 77, 177, 0.4)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(92, 77, 177, 0.2)'}
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={nextSlide}
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 20,
              backgroundColor: 'rgba(92, 77, 177, 0.2)',
              color: 'var(--text-primary)',
              border: 'none',
              padding: '8px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(92, 77, 177, 0.4)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(92, 77, 177, 0.2)'}
          >
            <ChevronRight size={24} />
          </button>

          {/* Dots */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            display: 'flex',
            gap: '8px'
          }}>
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  backgroundColor: index === currentIndex ? 'var(--text-light)' : 'rgba(248, 246, 252, 0.5)',
                  transition: 'background-color 0.2s'
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

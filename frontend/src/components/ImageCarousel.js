import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Thumbs } from 'swiper/modules';
import { Upload, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/thumbs';

const ImageCarousel = ({ images = [], dealId, userId, onImagesUpdate, uploading, setUploading }) => {
  const [activeThumbsSwiper, setActiveThumbsSwiper] = useState(null);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (!userId) {
      toast.error('You must be logged in to upload files');
      return;
    }

    setUploading(true);
    const uploadedUrls = [];

    try {
      const { supabase } = await import('../supabaseClient');
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${dealId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      // Update deal with all image URLs
      const allImages = [...images, ...uploadedUrls];
      const { error: updateError } = await supabase
        .from('deals')
        .update({ 
          image_url: allImages[0], // Keep first image as primary
          image_urls: allImages // Store all images in new field
        })
        .eq('id', dealId);

      if (updateError) throw updateError;

      toast.success(`${files.length} image${files.length > 1 ? 's' : ''} uploaded successfully`);
      onImagesUpdate(allImages);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error(error.message || 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageUrl, index) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;

    try {
      const { supabase } = await import('../supabaseClient');
      
      // Extract file path from URL
      const urlParts = imageUrl.split('/property-images/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1].split('?')[0];
        
        // Delete from storage
        await supabase.storage
          .from('property-images')
          .remove([filePath]);
      }

      // Update deal with remaining images
      const remainingImages = images.filter((_, i) => i !== index);
      const { error: updateError } = await supabase
        .from('deals')
        .update({ 
          image_url: remainingImages[0] || null,
          image_urls: remainingImages.length > 0 ? remainingImages : null
        })
        .eq('id', dealId);

      if (updateError) throw updateError;

      toast.success('Image deleted successfully');
      onImagesUpdate(remainingImages);
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  };

  return (
    <div style={{ 
      background: 'rgba(255,255,255,0.03)', 
      border: '1px solid rgba(255, 0, 0, 0.3)', 
      borderRadius: '12px', 
      padding: '24px',
      marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ color: '#ff0000', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
          Property Images ({images.length})
        </h3>
        <label htmlFor="multiple-image-upload" style={{ cursor: 'pointer' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: uploading ? 'rgba(255,255,255,0.05)' : 'rgba(255, 0, 0, 0.1)',
            border: '1px solid rgba(255, 0, 0, 0.3)',
            borderRadius: '8px',
            color: uploading ? 'rgba(255,255,255,0.4)' : '#ff0000',
            fontSize: '13px',
            fontWeight: '500',
            transition: 'all 0.2s',
            pointerEvents: uploading ? 'none' : 'auto'
          }}
          onMouseEnter={(e) => {
            if (!uploading) {
              e.currentTarget.style.background = 'rgba(255, 0, 0, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!uploading) {
              e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}>
            <Upload size={16} />
            <span>{uploading ? 'Uploading...' : 'Upload Images'}</span>
          </div>
          <input
            id="multiple-image-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            style={{ display: 'none' }}
            disabled={uploading}
          />
        </label>
      </div>

      {images.length > 0 ? (
        <div>
          {/* Main Carousel */}
          <Swiper
            modules={[Navigation, Pagination, Thumbs]}
            spaceBetween={10}
            navigation={{
              prevEl: '.swiper-button-prev-custom',
              nextEl: '.swiper-button-next-custom',
            }}
            pagination={{
              clickable: true,
              dynamicBullets: true,
            }}
            thumbs={{ swiper: activeThumbsSwiper && !activeThumbsSwiper.destroyed ? activeThumbsSwiper : null }}
            style={{ 
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: images.length > 1 ? '12px' : '0'
            }}
            className="property-main-carousel"
          >
            {images.map((image, index) => (
              <SwiperSlide key={image}>
                <div style={{ position: 'relative', width: '100%', height: '400px' }}>
                  <img
                    src={image}
                    alt={`Property ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '8px'
                    }}
                  />
                  <button
                    onClick={() => handleDeleteImage(image, index)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'rgba(0,0,0,0.7)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '8px',
                      color: '#ff4444',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,68,68,0.2)';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0,0,0,0.7)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Navigation Arrows - Enhanced visibility */}
          {images.length > 1 && (
            <>
              <button 
                className="swiper-button-prev-custom"
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  background: 'rgba(0,0,0,0.7)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '50%',
                  width: '52px',
                  height: '52px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: 0.6,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.background = 'rgba(255, 0, 0, 0.9)';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.15)';
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(255, 0, 0, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.6';
                  e.currentTarget.style.background = 'rgba(0,0,0,0.7)';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                }}
              >
                <ChevronLeft size={28} strokeWidth={3} />
              </button>
              <button 
                className="swiper-button-next-custom"
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  background: 'rgba(0,0,0,0.7)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '50%',
                  width: '52px',
                  height: '52px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: 0.6,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.background = 'rgba(255, 0, 0, 0.9)';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.15)';
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(255, 0, 0, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.6';
                  e.currentTarget.style.background = 'rgba(0,0,0,0.7)';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                }}
              >
                <ChevronRight size={28} strokeWidth={3} />
              </button>
            </>
          )}

          {/* Thumbnails */}
          {images.length > 1 && (
            <Swiper
              onSwiper={setActiveThumbsSwiper}
              modules={[Thumbs]}
              spaceBetween={10}
              slidesPerView={4}
              breakpoints={{
                640: { slidesPerView: 5 },
                768: { slidesPerView: 6 },
                1024: { slidesPerView: 7 },
              }}
              watchSlidesProgress
              style={{ marginTop: '12px' }}
              className="property-thumbs-carousel"
            >
              {images.map((image, index) => (
                <SwiperSlide key={index}>
                  <div style={{
                    width: '100%',
                    height: '60px',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                  className="thumb-slide"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.border = '2px solid #ff0000';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.border = '2px solid transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}>
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          )}
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '8px',
          border: '2px dashed rgba(255,255,255,0.1)'
        }}>
          <Upload size={48} style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '16px' }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '8px' }}>
            No images uploaded yet
          </p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
            Click "Upload Images" to add property photos
          </p>
        </div>
      )}
    </div>
  );
};

export default ImageCarousel;

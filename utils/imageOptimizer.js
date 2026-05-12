/**
 * Image Optimization Utility
 * Handles lazy loading, preloading, and error handling for images
 */

class ImageOptimizer {
    constructor() {
        this.observer = null;
        this.loadedImages = new Set();
        this.failedImages = new Map();
        this.init();
    }

    /**
     * Initialize Intersection Observer for lazy loading
     */
    init() {
        // Check if IntersectionObserver is supported
        if (!('IntersectionObserver' in window)) {
            console.warn('IntersectionObserver not supported, using eager loading');
            this.loadAllImages();
            return;
        }

        const options = {
            root: null,
            rootMargin: '50px', // Start loading 50px before image enters viewport
            threshold: 0.01
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                }
            });
        }, options);
    }

    /**
     * Observe an image element for lazy loading
     * @param {HTMLImageElement} img - Image element to observe
     */
    observe(img) {
        if (!img || !(img instanceof HTMLImageElement)) return;

        // If already loaded, skip
        if (this.loadedImages.has(img)) return;

        // Add loading attribute
        img.loading = 'lazy';

        // Store original src in data attribute
        if (img.src && !img.dataset.src) {
            img.dataset.src = img.src;
            img.removeAttribute('src');
        }

        // Add placeholder while loading
        if (!img.src) {
            img.src = this.createPlaceholder(img.width || 300, img.height || 200);
        }

        // Observe for intersection
        if (this.observer) {
            this.observer.observe(img);
        }
    }

    /**
     * Load an image
     * @param {HTMLImageElement} img - Image element to load
     */
    loadImage(img) {
        if (this.loadedImages.has(img)) return;

        const src = img.dataset.src;
        if (!src) return;

        // Show loading state
        img.classList.add('img-loading');

        // Create a new image to preload
        const tempImg = new Image();
        
        tempImg.onload = () => {
            img.src = src;
            img.classList.remove('img-loading');
            img.classList.add('img-loaded');
            this.loadedImages.add(img);
            
            // Stop observing once loaded
            if (this.observer) {
                this.observer.unobserve(img);
            }

            // Dispatch custom event
            img.dispatchEvent(new CustomEvent('imageLoaded', { 
                detail: { src } 
            }));
        };

        tempImg.onerror = () => {
            this.handleImageError(img, src);
        };

        tempImg.src = src;
    }

    /**
     * Handle image loading errors
     * @param {HTMLImageElement} img - Failed image element
     * @param {string} src - Failed source URL
     */
    handleImageError(img, src) {
        console.error(`Failed to load image: ${src}`);
        
        // Track failed images
        this.failedImages.set(img, src);

        // Set fallback image
        img.src = this.createErrorPlaceholder(img.width || 300, img.height || 200);
        img.classList.remove('img-loading');
        img.classList.add('img-error');
        img.alt = `Failed to load: ${img.alt || 'image'}`;

        // Stop observing
        if (this.observer) {
            this.observer.unobserve(img);
        }

        // Dispatch error event
        img.dispatchEvent(new CustomEvent('imageError', { 
            detail: { src } 
        }));
    }

    /**
     * Create a placeholder SVG
     * @param {number} width - Placeholder width
     * @param {number} height - Placeholder height
     * @returns {string} Data URI for placeholder
     */
    createPlaceholder(width, height) {
        const svg = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#e0e0e0"/>
                <text 
                    x="50%" 
                    y="50%" 
                    dominant-baseline="middle" 
                    text-anchor="middle" 
                    font-family="Arial, sans-serif" 
                    font-size="14" 
                    fill="#999"
                >Loading...</text>
            </svg>
        `;
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }

    /**
     * Create an error placeholder SVG
     * @param {number} width - Placeholder width
     * @param {number} height - Placeholder height
     * @returns {string} Data URI for error placeholder
     */
    createErrorPlaceholder(width, height) {
        const svg = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#f5f5f5"/>
                <text 
                    x="50%" 
                    y="50%" 
                    dominant-baseline="middle" 
                    text-anchor="middle" 
                    font-family="Arial, sans-serif" 
                    font-size="14" 
                    fill="#d32f2f"
                >✕ Failed to load</text>
            </svg>
        `;
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }

    /**
     * Preload critical images
     * @param {string[]} urls - Array of image URLs to preload
     * @returns {Promise<void>}
     */
    async preloadImages(urls) {
        if (!Array.isArray(urls) || urls.length === 0) return;

        const promises = urls.map(url => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(url);
                img.onerror = () => reject(url);
                img.src = url;
            });
        });

        try {
            await Promise.allSettled(promises);
        } catch (error) {
            console.warn('Some images failed to preload:', error);
        }
    }

    /**
     * Load all images immediately (fallback for no IntersectionObserver)
     */
    loadAllImages() {
        document.querySelectorAll('img[data-src]').forEach(img => {
            this.loadImage(img);
        });
    }

    /**
     * Retry loading failed images
     */
    retryFailed() {
        this.failedImages.forEach((src, img) => {
            img.dataset.src = src;
            img.classList.remove('img-error');
            this.loadImage(img);
        });
        this.failedImages.clear();
    }

    /**
     * Cleanup and disconnect observer
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.loadedImages.clear();
        this.failedImages.clear();
    }
}

// Create singleton instance
const imageOptimizer = new ImageOptimizer();

// Auto-observe images with data-src attribute
function observeImages() {
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageOptimizer.observe(img);
    });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeImages);
} else {
    observeImages();
}

// Export for use in modules
export { imageOptimizer, ImageOptimizer };
export default imageOptimizer;
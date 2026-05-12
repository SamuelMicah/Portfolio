/**
 * Animation Manager
 * Centralized system for managing animation lifecycle and cleanup
 */

class AnimationManager {
    constructor() {
        this.activeAnimations = new Map();
        this.animationFrames = new Set();
        this.intervals = new Set();
        this.timeouts = new Set();
        this.threeScenes = new Set();
        this.isActive = true;
    }

    /**
     * Register an animation with automatic cleanup
     * @param {string} id - Unique identifier for the animation
     * @param {Object} animation - Animation object (must have destroy/stop method)
     * @param {Object} options - Additional options
     */
    register(id, animation, options = {}) {
        // If animation already exists, clean it up first
        if (this.activeAnimations.has(id)) {
            this.unregister(id);
        }

        this.activeAnimations.set(id, {
            animation,
            type: options.type || 'generic',
            createdAt: Date.now(),
            metadata: options.metadata || {}
        });

        return id;
    }

    /**
     * Unregister and cleanup a specific animation
     * @param {string} id - Animation identifier
     */
    unregister(id) {
        const entry = this.activeAnimations.get(id);
        if (!entry) return;

        try {
            const { animation, type } = entry;

            // Call appropriate cleanup method based on type
            if (type === 'three') {
                this.cleanupThreeScene(animation);
            } else if (type === 'lottie') {
                animation.destroy?.();
            } else if (animation.stop) {
                animation.stop();
            } else if (animation.destroy) {
                animation.destroy();
            } else if (animation.pause) {
                animation.pause();
            }
        } catch (error) {
            console.warn(`Failed to cleanup animation ${id}:`, error);
        } finally {
            this.activeAnimations.delete(id);
        }
    }

    /**
     * Register a requestAnimationFrame ID
     * @param {number} frameId - requestAnimationFrame ID
     */
    addAnimationFrame(frameId) {
        this.animationFrames.add(frameId);
        return frameId;
    }

    /**
     * Cancel a specific animation frame
     * @param {number} frameId - requestAnimationFrame ID
     */
    cancelAnimationFrame(frameId) {
        if (this.animationFrames.has(frameId)) {
            cancelAnimationFrame(frameId);
            this.animationFrames.delete(frameId);
        }
    }

    /**
     * Register an interval
     * @param {Function} callback - Interval callback
     * @param {number} delay - Delay in milliseconds
     */
    addInterval(callback, delay) {
        const intervalId = setInterval(callback, delay);
        this.intervals.add(intervalId);
        return intervalId;
    }

    /**
     * Clear a specific interval
     * @param {number} intervalId - Interval ID
     */
    clearInterval(intervalId) {
        if (this.intervals.has(intervalId)) {
            clearInterval(intervalId);
            this.intervals.delete(intervalId);
        }
    }

    /**
     * Register a timeout
     * @param {Function} callback - Timeout callback
     * @param {number} delay - Delay in milliseconds
     */
    addTimeout(callback, delay) {
        const timeoutId = setTimeout(() => {
            callback();
            this.timeouts.delete(timeoutId);
        }, delay);
        this.timeouts.add(timeoutId);
        return timeoutId;
    }

    /**
     * Clear a specific timeout
     * @param {number} timeoutId - Timeout ID
     */
    clearTimeout(timeoutId) {
        if (this.timeouts.has(timeoutId)) {
            clearTimeout(timeoutId);
            this.timeouts.delete(timeoutId);
        }
    }

    /**
     * Register a Three.js scene
     * @param {Object} scene - Three.js scene object
     */
    addThreeScene(scene) {
        this.threeScenes.add(scene);
        return scene;
    }

    /**
     * Cleanup Three.js scene properly
     * @param {Object} scene - Three.js scene or renderer
     */
    cleanupThreeScene(sceneOrRenderer) {
        try {
            // Handle renderer
            if (sceneOrRenderer.dispose) {
                sceneOrRenderer.dispose();
            }

            // Handle scene
            if (sceneOrRenderer.traverse) {
                sceneOrRenderer.traverse((object) => {
                    // Cleanup geometry
                    if (object.geometry) {
                        object.geometry.dispose();
                    }

                    // Cleanup material
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => material.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }

                    // Cleanup texture
                    if (object.texture) {
                        object.texture.dispose();
                    }
                });

                // Clear the scene
                if (sceneOrRenderer.clear) {
                    sceneOrRenderer.clear();
                }
            }
        } catch (error) {
            console.warn('Error cleaning up Three.js scene:', error);
        }
    }

    /**
     * Pause all animations
     */
    pauseAll() {
        this.isActive = false;
        this.activeAnimations.forEach((entry) => {
            try {
                if (entry.animation.pause) {
                    entry.animation.pause();
                }
            } catch (error) {
                console.warn('Failed to pause animation:', error);
            }
        });
    }

    /**
     * Resume all animations
     */
    resumeAll() {
        this.isActive = true;
        this.activeAnimations.forEach((entry) => {
            try {
                if (entry.animation.play) {
                    entry.animation.play();
                } else if (entry.animation.resume) {
                    entry.animation.resume();
                }
            } catch (error) {
                console.warn('Failed to resume animation:', error);
            }
        });
    }

    /**
     * Cleanup all animations and timers
     */
    cleanupAll() {
        // Cancel all animation frames
        this.animationFrames.forEach(frameId => {
            cancelAnimationFrame(frameId);
        });
        this.animationFrames.clear();

        // Clear all intervals
        this.intervals.forEach(intervalId => {
            clearInterval(intervalId);
        });
        this.intervals.clear();

        // Clear all timeouts
        this.timeouts.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        this.timeouts.clear();

        // Cleanup Three.js scenes
        this.threeScenes.forEach(scene => {
            this.cleanupThreeScene(scene);
        });
        this.threeScenes.clear();

        // Cleanup all registered animations
        const animationIds = Array.from(this.activeAnimations.keys());
        animationIds.forEach(id => {
            this.unregister(id);
        });

        this.isActive = false;
    }

    /**
     * Get statistics about active animations
     * @returns {Object} Animation statistics
     */
    getStats() {
        return {
            animations: this.activeAnimations.size,
            animationFrames: this.animationFrames.size,
            intervals: this.intervals.size,
            timeouts: this.timeouts.size,
            threeScenes: this.threeScenes.size,
            isActive: this.isActive,
            breakdown: Array.from(this.activeAnimations.entries()).map(([id, entry]) => ({
                id,
                type: entry.type,
                age: Date.now() - entry.createdAt,
                metadata: entry.metadata
            }))
        };
    }

    /**
     * Debug: Log all active animations
     */
    debug() {
        const stats = this.getStats();
        console.group('🎬 Animation Manager Stats');
        console.log('Active Animations:', stats.animations);
        console.log('Animation Frames:', stats.animationFrames);
        console.log('Intervals:', stats.intervals);
        console.log('Timeouts:', stats.timeouts);
        console.log('Three.js Scenes:', stats.threeScenes);
        console.log('Is Active:', stats.isActive);
        if (stats.breakdown.length > 0) {
            console.table(stats.breakdown);
        }
        console.groupEnd();
    }
}

// Create singleton instance
const animationManager = new AnimationManager();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        animationManager.cleanupAll();
    });

    // Pause animations when page is hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            animationManager.pauseAll();
        } else {
            animationManager.resumeAll();
        }
    });
}

// Export singleton and class
export { animationManager, AnimationManager };
export default animationManager;
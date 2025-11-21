// Video Player Controls
// Handles video playback, position tracking, and auto-completion

class VideoController {
  constructor() {
    this.video = null;
    this.overlay = null;
    this.playButton = null;
    this.saveInterval = null;
    this.watchedPercentage = 0;

    this.init();
  }

  init() {
    this.video = document.getElementById('lesson-video');
    this.overlay = document.getElementById('video-overlay');
    this.playButton = document.getElementById('play-button');

    if (!this.video) return;

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Play button overlay
    this.playButton.addEventListener('click', () => {
      this.play();
    });

    // Video events
    this.video.addEventListener('play', () => {
      this.onPlay();
    });

    this.video.addEventListener('pause', () => {
      this.onPause();
    });

    this.video.addEventListener('ended', () => {
      this.onEnded();
    });

    this.video.addEventListener('timeupdate', () => {
      this.onTimeUpdate();
    });

    this.video.addEventListener('loadedmetadata', () => {
      this.loadSavedPosition();
    });

    // Save position periodically
    this.saveInterval = setInterval(() => {
      this.savePosition();
    }, 5000); // Every 5 seconds
  }

  play() {
    this.video.play();
  }

  onPlay() {
    this.overlay.classList.add('hidden');
  }

  onPause() {
    // Don't show overlay if video ended
    if (!this.video.ended) {
      this.overlay.classList.remove('hidden');
    }
  }

  onEnded() {
    // Auto-complete lesson when video finishes
    const completeCheckbox = document.getElementById('mark-complete');
    if (!completeCheckbox.checked) {
      completeCheckbox.checked = true;
      completeCheckbox.dispatchEvent(new Event('change'));
    }

    // Show overlay again
    this.overlay.classList.remove('hidden');

    // Auto-advance option (optional)
    const autoAdvance = localStorage.getItem('autoAdvanceEnabled') === 'true';
    if (autoAdvance) {
      setTimeout(() => {
        const nextBtn = document.getElementById('nav-next');
        if (nextBtn && !nextBtn.disabled) {
          nextBtn.click();
        }
      }, 2000);
    }
  }

  onTimeUpdate() {
    if (!this.video.duration) return;

    // Calculate watched percentage
    this.watchedPercentage = (this.video.currentTime / this.video.duration) * 100;

    // Auto-complete if watched 90%+
    if (this.watchedPercentage >= 90) {
      const completeCheckbox = document.getElementById('mark-complete');
      if (!completeCheckbox.checked) {
        completeCheckbox.checked = true;
        completeCheckbox.dispatchEvent(new Event('change'));
      }
    }
  }

  savePosition() {
    if (!this.video || !this.video.currentTime || this.video.ended) return;

    const lessonId = window.coursePlayer?.currentLesson?.id;
    if (!lessonId) return;

    const position = Math.floor(this.video.currentTime);

    // Save to localStorage
    localStorage.setItem(`video_position_${lessonId}`, position);

    // Send to API (optional)
    this.sendPositionToAPI(lessonId, position);
  }

  loadSavedPosition() {
    const lessonId = window.coursePlayer?.currentLesson?.id;
    if (!lessonId) return;

    const savedPosition = localStorage.getItem(`video_position_${lessonId}`);
    if (savedPosition && parseInt(savedPosition) > 0) {
      // Ask user if they want to resume
      const resume = confirm(`Resume from ${this.formatTime(savedPosition)}?`);
      if (resume) {
        this.video.currentTime = parseInt(savedPosition);
      } else {
        // Clear saved position
        localStorage.removeItem(`video_position_${lessonId}`);
      }
    }
  }

  async sendPositionToAPI(lessonId, position) {
    try {
      // In production:
      // await fetch(`/api/courses/lessons/${lessonId}/video-position`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ position })
      // });

      console.log(`Saved video position: ${position}s for lesson ${lessonId}`);
    } catch (error) {
      console.error('Error saving video position:', error);
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  destroy() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.videoController = new VideoController();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (window.videoController) {
    window.videoController.savePosition();
    window.videoController.destroy();
  }
});

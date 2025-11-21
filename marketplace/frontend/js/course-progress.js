// Course Progress Tracking
// Handles progress persistence and synchronization

class ProgressTracker {
  constructor() {
    this.courseId = null;
    this.enrollmentId = null;
    this.syncInterval = null;

    this.init();
  }

  init() {
    const urlParams = new URLSearchParams(window.location.search);
    this.courseId = urlParams.get('course') || '1';
    this.enrollmentId = urlParams.get('enrollment') || '1';

    // Sync progress every 30 seconds
    this.syncInterval = setInterval(() => {
      this.syncProgress();
    }, 30000);

    // Sync on page unload
    window.addEventListener('beforeunload', () => {
      this.syncProgress();
    });
  }

  async syncProgress() {
    if (!window.coursePlayer) return;

    const courseData = window.coursePlayer.courseData;
    if (!courseData) return;

    const progressData = {
      courseId: this.courseId,
      enrollmentId: this.enrollmentId,
      completedLessons: [],
      lastLessonId: window.coursePlayer.currentLesson?.id,
      totalCompleted: 0
    };

    // Collect all completed lesson IDs
    courseData.modules.forEach(module => {
      module.lessons.forEach(lesson => {
        if (lesson.completed) {
          progressData.completedLessons.push(lesson.id);
          progressData.totalCompleted++;
        }
      });
    });

    // Save to localStorage
    localStorage.setItem(
      `course_progress_${this.courseId}`,
      JSON.stringify(progressData)
    );

    // Send to API
    await this.sendProgressToAPI(progressData);
  }

  async sendProgressToAPI(progressData) {
    try {
      // In production:
      // const response = await fetch(`/api/courses/${this.courseId}/sync-progress`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(progressData)
      // });

      console.log('Progress synced:', progressData);
    } catch (error) {
      console.error('Error syncing progress:', error);
    }
  }

  loadLocalProgress() {
    const saved = localStorage.getItem(`course_progress_${this.courseId}`);
    if (saved) {
      return JSON.parse(saved);
    }
    return null;
  }

  clearProgress() {
    localStorage.removeItem(`course_progress_${this.courseId}`);
    console.log('Progress cleared for course', this.courseId);
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.progressTracker = new ProgressTracker();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (window.progressTracker) {
    window.progressTracker.destroy();
  }
});

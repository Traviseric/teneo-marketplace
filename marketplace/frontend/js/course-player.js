// Course Player - Main Controller
// Handles course navigation, TOC, and lesson loading

class CoursePlayer {
  constructor() {
    this.courseData = null;
    this.currentLesson = null;
    this.currentModule = null;
    this.enrollmentId = null;
    this.courseId = null;

    this.init();
  }

  async init() {
    // Get course and enrollment ID from URL params
    const urlParams = new URLSearchParams(window.location.search);
    this.courseId = urlParams.get('course') || '1';
    this.enrollmentId = urlParams.get('enrollment') || '1';

    // Load course data
    await this.loadCourseData();

    // Render TOC
    this.renderTableOfContents();

    // Load first lesson (or last accessed)
    this.loadLesson(this.courseData.lastLessonId || this.courseData.modules[0].lessons[0].id);

    // Setup event listeners
    this.setupEventListeners();
  }

  async loadCourseData() {
    try {
      // In production, this would be an API call
      // const response = await fetch(`/api/courses/${this.courseId}/player?enrollment=${this.enrollmentId}`);
      // this.courseData = await response.json();

      // For now, use mock data
      this.courseData = this.getMockCourseData();

    } catch (error) {
      console.error('Error loading course data:', error);
      alert('Failed to load course. Please refresh the page.');
    }
  }

  getMockCourseData() {
    return {
      id: 1,
      title: 'The Book Funnel Blueprint',
      subtitle: '4 Genre-Specific Funnels',
      icon: '💰',
      lastLessonId: 1,
      progress: {
        completed: 1,
        total: 14,
        percentage: 7
      },
      modules: [
        {
          id: 1,
          title: 'Building a Profitable Author Funnel 💰',
          order: 1,
          lessons: [
            {
              id: 1,
              title: 'The plug-and-play system for profitable author funnels',
              type: 'video',
              videoUrl: '/uploads/courses/intro.mp4',
              completed: true,
              locked: false,
              description: `
                <p>Welcome to The Book Funnel Blueprint — the plug-and-play system I used to sell over 50,000 books without a publisher.</p>
                <p>This isn't a course. It's a system. You'll be launching your optimized book funnel in less than a week — with full confidence in what you're building and why it works.</p>
                <h3>What You'll Need to Begin</h3>
                <ul>
                  <li>Your own book online store and Amazon link</li>
                  <li>1-2 hours to review this guide</li>
                  <li>1-2 hours per day over the next 3-7 days to implement, build, and get ready for launch</li>
                  <li>To go live with ads, you will need a Meta ad account + Meta conversion pixel (dataset) installed throughout your funnel</li>
                </ul>
                <h3>How to Use This System</h3>
                <ul>
                  <li>Start by choosing your funnel using the Funnel Selector Matrix in the next lesson</li>
                  <li>Use the included blueprints to map and build your funnel</li>
                  <li>Watch the Loom walkthroughs to see how I'd implement each step</li>
                  <li>Follow the 7-Day Roadmap for fast execution</li>
                </ul>
                <div class="lesson-note">
                  <strong>Don't aim for perfection!</strong> Aim for clarity and launch. Once your funnel is live and you're driving ad traffic, you will optimize based on data, not assumptions.
                </div>
              `
            }
          ]
        },
        {
          id: 2,
          title: 'CHOOSE YOUR FUNNEL IN 60 SEC',
          order: 2,
          lessons: [
            {
              id: 2,
              title: 'Video Walkthrough of The Funnels - What to build and why',
              type: 'video',
              videoUrl: '/uploads/courses/funnel-walkthrough.mp4',
              completed: false,
              locked: false
            },
            {
              id: 3,
              title: 'The 2-Step Funnel Selector Matrix Quiz',
              type: 'text',
              completed: false,
              locked: false
            },
            {
              id: 4,
              title: 'Strategic Tip from Charlotte',
              type: 'video',
              videoUrl: '/uploads/courses/charlotte-tip.mp4',
              completed: false,
              locked: false
            }
          ]
        },
        {
          id: 3,
          title: 'MODULE 2: THE 4 FUNNEL BLUEPRINTS',
          order: 3,
          lessons: [
            {
              id: 5,
              title: 'Funnel #1: The Gated Sneak-Peak Funnel',
              type: 'text',
              completed: false,
              locked: false
            },
            {
              id: 6,
              title: 'Funnel #2: The Story-Driven Sales Page (Ungated Sneak-Peak Funnel)',
              type: 'text',
              completed: false,
              locked: false
            },
            {
              id: 7,
              title: 'Funnel #3: The Reader Magnet Funnel',
              type: 'text',
              completed: false,
              locked: false
            },
            {
              id: 8,
              title: 'Funnel #4: The Direct-to-Sale Funnel',
              type: 'text',
              completed: false,
              locked: false
            },
            {
              id: 9,
              title: 'Implementation Priority',
              type: 'text',
              completed: false,
              locked: false
            }
          ]
        },
        {
          id: 4,
          title: 'MODULE 3: LAUNCH IMPLEMENTATION GUIDE',
          order: 4,
          lessons: [
            {
              id: 10,
              title: 'Your 7-Day Funnel Launch Timeline',
              type: 'text',
              completed: false,
              locked: false
            },
            {
              id: 11,
              title: 'Step 1: Foundation Setup (2 hours)',
              type: 'video',
              completed: false,
              locked: false
            },
            {
              id: 12,
              title: 'Step 2: Create Your Lead Magnet (for direct-to-sale, go to next lesson)',
              type: 'text',
              completed: false,
              locked: false
            },
            {
              id: 13,
              title: 'Step 3: Technical Setup (1 hour)',
              type: 'video',
              completed: false,
              locked: false
            },
            {
              id: 14,
              title: 'Is tracking really necessary?',
              type: 'text',
              completed: false,
              locked: false
            }
          ]
        }
      ]
    };
  }

  renderTableOfContents() {
    const tocContainer = document.getElementById('toc');
    tocContainer.innerHTML = '';

    this.courseData.modules.forEach(module => {
      const moduleEl = document.createElement('div');
      moduleEl.className = 'module';
      moduleEl.dataset.moduleId = module.id;

      const moduleHeader = document.createElement('div');
      moduleHeader.className = 'module-header';
      moduleHeader.innerHTML = `
        <span class="module-toggle">▼</span>
        <span class="module-title">${module.title}</span>
      `;

      const lessonsList = document.createElement('div');
      lessonsList.className = 'lessons-list';

      module.lessons.forEach(lesson => {
        const lessonEl = document.createElement('div');
        lessonEl.className = 'lesson-item';
        if (lesson.completed) lessonEl.classList.add('completed');
        if (lesson.locked) lessonEl.classList.add('locked');
        lessonEl.dataset.lessonId = lesson.id;

        const statusIcon = lesson.completed ? '✓' : (lesson.locked ? '🔒' : '○');

        lessonEl.innerHTML = `
          <span class="lesson-status ${lesson.completed ? 'completed' : (lesson.locked ? 'locked' : '')}">${statusIcon}</span>
          <span class="lesson-title">${lesson.title}</span>
        `;

        lessonEl.addEventListener('click', () => {
          if (!lesson.locked) {
            this.loadLesson(lesson.id);
          }
        });

        lessonsList.appendChild(lessonEl);
      });

      moduleHeader.addEventListener('click', () => {
        moduleEl.classList.toggle('collapsed');
      });

      moduleEl.appendChild(moduleHeader);
      moduleEl.appendChild(lessonsList);
      tocContainer.appendChild(moduleEl);
    });

    this.updateProgress();
  }

  loadLesson(lessonId) {
    // Find lesson in course data
    let foundLesson = null;
    let foundModule = null;

    for (const module of this.courseData.modules) {
      for (const lesson of module.lessons) {
        if (lesson.id === lessonId) {
          foundLesson = lesson;
          foundModule = module;
          break;
        }
      }
      if (foundLesson) break;
    }

    if (!foundLesson) {
      console.error('Lesson not found:', lessonId);
      return;
    }

    this.currentLesson = foundLesson;
    this.currentModule = foundModule;

    // Update active state in TOC
    document.querySelectorAll('.lesson-item').forEach(el => {
      el.classList.remove('active');
    });
    const activeLesson = document.querySelector(`[data-lesson-id="${lessonId}"]`);
    if (activeLesson) {
      activeLesson.classList.add('active');
    }

    // Update breadcrumb
    document.getElementById('breadcrumb-section').textContent = foundModule.title;
    document.getElementById('breadcrumb-lesson').textContent = foundLesson.title;

    // Update lesson title
    document.getElementById('lesson-title').textContent = foundLesson.title;

    // Load lesson content
    if (foundLesson.type === 'video' && foundLesson.videoUrl) {
      this.loadVideoLesson(foundLesson);
    } else {
      this.loadTextLesson(foundLesson);
    }

    // Update completion checkbox
    const completeCheckbox = document.getElementById('mark-complete');
    completeCheckbox.checked = foundLesson.completed;

    // Update navigation buttons
    this.updateNavigationButtons();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  loadVideoLesson(lesson) {
    const videoWrapper = document.getElementById('video-wrapper');
    videoWrapper.style.display = 'block';

    const video = document.getElementById('lesson-video');
    const source = video.querySelector('source');
    source.src = lesson.videoUrl;
    video.load();

    // Load description
    const lessonBody = document.getElementById('lesson-body');
    lessonBody.innerHTML = lesson.description || '<p>Watch the video above to continue.</p>';
  }

  loadTextLesson(lesson) {
    const videoWrapper = document.getElementById('video-wrapper');
    videoWrapper.style.display = 'none';

    const lessonBody = document.getElementById('lesson-body');
    lessonBody.innerHTML = lesson.description || '<p>Lesson content coming soon...</p>';
  }

  updateProgress() {
    const { completed, total } = this.courseData.progress;
    const percentage = Math.round((completed / total) * 100);

    // Update fraction text
    document.getElementById('progress-fraction').textContent = `${completed}/${total}`;

    // Update accessible SVG title
    const progressTitle = document.getElementById('progress-title');
    if (progressTitle) {
      progressTitle.textContent = `Course progress: ${completed} of ${total} lessons completed`;
    }

    // Update circle progress
    const progressPath = document.getElementById('progress-path');
    progressPath.setAttribute('stroke-dasharray', `${percentage}, 100`);
  }

  updateNavigationButtons() {
    const prevBtn = document.getElementById('nav-prev');
    const nextBtn = document.getElementById('nav-next');

    // Find previous and next lessons
    const { prev, next } = this.getAdjacentLessons();

    prevBtn.disabled = !prev;
    nextBtn.disabled = !next;

    prevBtn.onclick = () => prev && this.loadLesson(prev.id);
    nextBtn.onclick = () => next && this.loadLesson(next.id);
  }

  getAdjacentLessons() {
    const allLessons = [];

    this.courseData.modules.forEach(module => {
      module.lessons.forEach(lesson => {
        allLessons.push(lesson);
      });
    });

    const currentIndex = allLessons.findIndex(l => l.id === this.currentLesson.id);

    return {
      prev: currentIndex > 0 ? allLessons[currentIndex - 1] : null,
      next: currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null
    };
  }

  async markLessonComplete(completed) {
    this.currentLesson.completed = completed;

    // Update UI
    const lessonEl = document.querySelector(`[data-lesson-id="${this.currentLesson.id}"]`);
    if (lessonEl) {
      if (completed) {
        lessonEl.classList.add('completed');
        lessonEl.querySelector('.lesson-status').textContent = '✓';
        lessonEl.querySelector('.lesson-status').classList.add('completed');
      } else {
        lessonEl.classList.remove('completed');
        lessonEl.querySelector('.lesson-status').textContent = '○';
        lessonEl.querySelector('.lesson-status').classList.remove('completed');
      }
    }

    // Update progress
    this.courseData.progress.completed = this.courseData.modules.reduce((acc, module) => {
      return acc + module.lessons.filter(l => l.completed).length;
    }, 0);

    this.updateProgress();

    // Send to API
    try {
      // await fetch(`/api/courses/${this.courseId}/lessons/${this.currentLesson.id}/progress`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ completed })
      // });
      console.log('Lesson completion status updated:', completed);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }

  setupEventListeners() {
    // User menu toggle
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');

    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('active');
    });

    document.addEventListener('click', () => {
      userDropdown.classList.remove('active');
    });

    // Sidebar toggle (mobile)
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('course-sidebar');

    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside (mobile)
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      }
    });

    // Completion checkbox
    const completeCheckbox = document.getElementById('mark-complete');
    completeCheckbox.addEventListener('change', (e) => {
      this.markLessonComplete(e.target.checked);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const { prev, next } = this.getAdjacentLessons();

      if (e.key === 'ArrowLeft' && prev) {
        this.loadLesson(prev.id);
      } else if (e.key === 'ArrowRight' && next) {
        this.loadLesson(next.id);
      }
    });
  }
}

// Initialize course player when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.coursePlayer = new CoursePlayer();
});

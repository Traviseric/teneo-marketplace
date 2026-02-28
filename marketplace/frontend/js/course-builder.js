// Course Builder — admin-course-builder.html

// Drip content toggle
const dripCheckbox = document.getElementById('drip-enabled');
const dripSettings = document.getElementById('drip-settings');

if (dripCheckbox && dripSettings) {
  dripCheckbox.addEventListener('change', function () {
    dripSettings.hidden = !this.checked;
    this.setAttribute('aria-expanded', this.checked ? 'true' : 'false');
  });
}

// Module builder
const modulesContainer = document.getElementById('modules-container');
const addModuleBtn = document.getElementById('add-module-btn');
const moduleTemplate = document.getElementById('module-template');
const lessonTemplate = document.getElementById('lesson-template');

let moduleCount = 0;

function addModule() {
  if (!moduleTemplate || !modulesContainer) return;

  moduleCount++;
  const clone = moduleTemplate.content.cloneNode(true);
  const moduleBlock = clone.querySelector('.module-block');
  const titleInput = clone.querySelector('.module-title-input');
  const collapseBtn = clone.querySelector('.btn-collapse');
  const deleteBtn = clone.querySelector('.btn-delete');
  const moduleBody = clone.querySelector('.module-body');
  const addLessonBtn = clone.querySelector('.add-lesson-btn');

  // Unique IDs for accessibility
  const moduleId = `module-${moduleCount}`;
  const moduleBodyId = `module-body-${moduleCount}`;
  moduleBlock.dataset.moduleId = moduleId;
  titleInput.id = `module-title-${moduleCount}`;
  titleInput.setAttribute('aria-label', `Module ${moduleCount} title`);
  moduleBody.id = moduleBodyId;

  collapseBtn.setAttribute('aria-expanded', 'true');
  collapseBtn.setAttribute('aria-controls', moduleBodyId);

  collapseBtn.addEventListener('click', function () {
    const expanded = moduleBody.hidden;
    moduleBody.hidden = !expanded;
    this.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    this.textContent = expanded ? '▼' : '▶';
  });

  deleteBtn.addEventListener('click', function () {
    moduleBlock.remove();
  });

  addLessonBtn.addEventListener('click', function () {
    addLesson(clone.querySelector('.lessons-container') || moduleBody.querySelector('.lessons-container'));
  });

  modulesContainer.appendChild(clone);
}

let lessonCount = 0;

function addLesson(container) {
  if (!lessonTemplate || !container) return;

  lessonCount++;
  const clone = lessonTemplate.content.cloneNode(true);
  const lessonBlock = clone.querySelector('.lesson-block');
  const titleInput = clone.querySelector('.lesson-title-input');
  const typeSelect = clone.querySelector('.lesson-type-select');
  const deleteBtn = clone.querySelector('.btn-delete-lesson');
  const videoContent = clone.querySelector('.video-content');
  const textContent = clone.querySelector('.text-content');

  titleInput.setAttribute('aria-label', `Lesson ${lessonCount} title`);
  typeSelect.setAttribute('aria-label', `Lesson ${lessonCount} type`);

  typeSelect.addEventListener('change', function () {
    videoContent.style.display = this.value === 'video' ? '' : 'none';
    textContent.style.display = this.value === 'text' ? '' : 'none';
  });

  deleteBtn.addEventListener('click', function () {
    lessonBlock.remove();
  });

  container.appendChild(clone);
}

if (addModuleBtn) {
  addModuleBtn.addEventListener('click', addModule);
}

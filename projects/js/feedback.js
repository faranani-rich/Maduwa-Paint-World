import { getProjectById, updateProject } from './storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1) Identify project
  const params    = new URLSearchParams(window.location.search);
  const projectId = params.get('projectId');
  const project   = await getProjectById(projectId);

  if (!project) {
    document.body.innerHTML = '<p>Project not found.</p>';
    return;
  }

  // 2) Cache DOM
  const form     = document.getElementById('feedback-form');
  const rating   = form.querySelector('input[name="rating"]');
  const comments = form.querySelector('textarea[name="comments"]');
  const thanks   = document.getElementById('thanks');

  // 3) Prefill if existing feedback
  if (project.feedback) {
    rating.value   = project.feedback.rating || '';
    comments.value = project.feedback.comments || '';
    thanks.textContent = `Previous feedback submitted on ${project.feedback.date
      ? new Date(project.feedback.date).toLocaleString()
      : "an earlier date"
    }. You can update it below.`;
    thanks.style.display = 'block';
  }

  // 4) Handle submit (create or update)
  form.addEventListener('submit', async ev => {
    ev.preventDefault();

    // Attach customer email if present on project
    const customerEmail =
      (project.customer && project.customer.email) ? project.customer.email : '';

    const feedback = {
      rating:        parseInt(rating.value, 10),
      comments:      comments.value.trim(),
      date:          new Date().toISOString(),
      customerEmail: customerEmail,
    };

    await updateProject(projectId, { feedback });

    thanks.textContent = '✅ Thank you! Your feedback has been saved.';
    thanks.style.display = 'block';
  });
});

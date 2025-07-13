// js/email.js

// 1. Import EmailJS (must be available in your build!)
// If using NPM: import emailjs from 'emailjs-com';
// If using CDN, ensure <script src="https://cdn.jsdelivr.net/npm/emailjs-com@3/dist/email.min.js"></script> is in your HTML

/**
 * Initialize EmailJS ONCE for your app.
 * Call this in your app entrypoint (with your public key).
 * @param {string} userId - Your EmailJS user/public key.
 */
export function initEmailJS(userId) {
  if (!window._emailjsInitialized) {
    emailjs.init(userId);
    window._emailjsInitialized = true;
  }
}

/**
 * Send a receipt or project update email to the customer.
 * @param {Object} project – Full project object (must include customer.email).
 * @param {Object} totals  – Project totals (price, cost, profit, etc.).
 * @param {Object} options – { templateId, serviceId, extraParams }
 * @returns {Promise}
 */
export function sendCustomerReceipt(project, totals, options = {}) {
  if (!project.customer?.email) {
    return Promise.reject(new Error('No customer email found.'));
  }

  // ← your real Service ID
  const serviceId  = options.serviceId   || 'service_n7i20ej';
  // ← your real Template ID
  const templateId = options.templateId  || 'template_5pdfuin';
  const extraParams = options.extraParams || {};

  const templateParams = {
    to_name:       project.customer.name         || 'Customer',
    to_email:      project.customer.email,
    project_name:  project.name                  || '',
    project_status: project.status               || '',
    total_price:   totals.price?.toFixed?.(2)    ?? totals.price ?? '',
    progress:      project.progress?.percent     ?? project.progress ?? 0,
    manager:       project.projectManager?.name   ?? '',
    ...extraParams
  };

  return emailjs.send(serviceId, templateId, templateParams);
}

/**
 * Helper: Print and then email a receipt to the customer.
 * (Not used by project-enhancements.js, but left here for backward compatibility)
 */
export async function printAndEmailReceipt(project, totals, options = {}) {
  window.print();
  try {
    await sendCustomerReceipt(project, totals, options);
    alert('Customer email sent successfully!');
  } catch (err) {
    alert('Failed to send customer email: ' + err.message);
  }
}

/**
 * Send an email-only customer copy (no printing).
 * @param {string} email   – recipient address
 * @param {Object} options – overrides for serviceId, templateId, extraParams
 * @returns {Promise}
 */
export function sendCustomerEmail(email, options = {}) {
  if (!email) {
    return Promise.reject(new Error('No customer email provided.'));
  }
  // Minimal project object for the template—add fields via options.extraParams as needed
  const project = { customer: { email } };
  const totals  = {};
  return sendCustomerReceipt(project, totals, options);
}

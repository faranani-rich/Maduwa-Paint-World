// js/email.js
import emailjs from 'emailjs-com';

// Initialize EmailJS (do this once on page load)
export function initEmailJS(userId) {
  emailjs.init(userId);
}

/**
 * Send a receipt or project update email to the customer.
 * @param {Object} project - Full project object (must include customer.email).
 * @param {Object} totals - Project totals (price, cost, profit, etc.).
 * @param {Object} options - Optional: { templateId, serviceId, ... }
 * @returns {Promise}
 */
export function sendCustomerReceipt(project, totals, options = {}) {
  if (!project.customer?.email) {
    return Promise.reject(new Error('No customer email found.'));
  }

  const {
    serviceId = 'YOUR_SERVICE_ID',
    templateId = 'YOUR_TEMPLATE_ID'
  } = options;

  // Map your fields to template params
  const templateParams = {
    to_name: project.customer.name || 'Customer',
    to_email: project.customer.email,
    project_name: project.name || '',
    project_status: project.status || '',
    total_price: totals.price?.toFixed ? totals.price.toFixed(2) : totals.price,
    progress: project.progress?.percent || 0,
    manager: project.projectManager?.name || '',
    // add more fields as needed
  };

  return emailjs.send(serviceId, templateId, templateParams);
}

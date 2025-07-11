// js/email.js

// 1. Import EmailJS (must be available in your build!)
// If using NPM: import emailjs from 'emailjs-com';
// If using CDN, ensure <script src="https://cdn.jsdelivr.net/npm/emailjs-com@3/dist/email.min.js"></script> is in your HTML



/**
 * Initialize EmailJS ONCE for your app.
 * Call this in your app entrypoint or login (with your public key).
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
 * @param {Object} project - Full project object (must include customer.email).
 * @param {Object} totals - Project totals (price, cost, profit, etc.).
 * @param {Object} options - { templateId, serviceId, extraParams }
 * @returns {Promise}
 */
export function sendCustomerReceipt(project, totals, options = {}) {
  if (!project.customer?.email) {
    return Promise.reject(new Error('No customer email found.'));
  }

  // IDs: replace with your own, or pass via options
  const {
    serviceId = 'YOUR_SERVICE_ID',
    templateId = 'YOUR_TEMPLATE_ID',
    extraParams = {}
  } = options;

  // Prepare template params for your EmailJS template
  const templateParams = {
    to_name: project.customer.name || 'Customer',
    to_email: project.customer.email,
    project_name: project.name || '',
    project_status: project.status || '',
    total_price: totals.price?.toFixed ? totals.price.toFixed(2) : totals.price,
    progress: project.progress?.percent || 0,
    manager: project.projectManager?.name || '',
    // Spread any additional params needed for your template
    ...extraParams
  };

  // For debugging, you can uncomment the line below:
  // console.log('[EmailJS] Sending:', { serviceId, templateId, templateParams });

  return emailjs.send(serviceId, templateId, templateParams);
}

/**
 * Helper: Print and then email a receipt to the customer.
 * (Call this from your UI after user clicks "Print Customer Copy" if you want both)
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

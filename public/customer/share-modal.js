// share-modal.js

// Ensure html2pdf is loaded (once globally)
import "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";

const modal = document.getElementById("shareModal");
const shareName = document.getElementById("shareProjectName");
const shareWhatsAppBtn = document.getElementById("shareWhatsAppBtn");
const shareEmailBtn = document.getElementById("shareEmailBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const closeShareBtn = document.getElementById("closeShareModal");

let currentProject = null;

export function openShareModal(project) {
  currentProject = project;
  shareName.textContent = project.name || "Unnamed Project";
  modal.style.display = "flex";
}

closeShareBtn.onclick = () => {
  modal.style.display = "none";
};

async function generateProjectPDF(projectId) {
  const iframe = document.getElementById("printFrame");
  return new Promise((resolve, reject) => {
    iframe.src = `project-view.html?id=${projectId}&action=print`;
    iframe.onload = async () => {
      try {
        const element = iframe.contentDocument.querySelector("main");
        if (!element) return reject("Main content not found in iframe.");

        const opt = {
          margin: 0.4,
          filename: `${currentProject.name || "project"}-summary.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "in", format: "a4", orientation: "portrait" }
        };

        const worker = window.html2pdf().set(opt).from(element);
        const blob = await worker.outputPdf("blob");
        resolve(blob);
      } catch (err) {
        reject(err);
      }
    };
  });
}

shareWhatsAppBtn.onclick = async () => {
  if (!currentProject) return;
  try {
    const blob = await generateProjectPDF(currentProject.id);
    const url = URL.createObjectURL(blob);
    alert("✅ PDF generated! Please manually send it via WhatsApp by downloading it now.");
    window.open(url, "_blank");
  } catch (err) {
    alert("Failed to generate PDF:\n" + err.message);
  }
};

shareEmailBtn.onclick = async () => {
  if (!currentProject) return;
  try {
    const blob = await generateProjectPDF(currentProject.id);
    const url = URL.createObjectURL(blob);
    alert("✅ PDF generated! Please manually attach it to your email.");
    window.open(`mailto:?subject=Project Summary: ${currentProject.name}`);
    window.open(url, "_blank");
  } catch (err) {
    alert("Failed to generate PDF:\n" + err.message);
  }
};

copyLinkBtn.onclick = () => {
  if (!currentProject) return;
  const link = `${window.location.origin}/public/customer/project-view.html?id=${currentProject.id}`;
  navigator.clipboard.writeText(link).then(() => {
    copyLinkBtn.textContent = "✅ Copied!";
    setTimeout(() => (copyLinkBtn.textContent = "🔗 Copy Link"), 2000);
  });
};

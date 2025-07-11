/**
 * Returns a brand-new, empty project object with all required fields.
 */
export function emptyProject() {
  return {
    id: 'prj-' + Date.now() + '-' + Math.floor(Math.random() * 10000), // Unique, e.g. "prj-1720682187666-3842"
    name: '',
    location: '',
    status: 'quotation', // "quotation", "in-progress", "completed", etc.
    notes: '',
    quotation: {
      cost: 0,
      profit: 0,
      price: 0
    },
    actual: {
      cost: 0,
      profit: 0,
      price: 0
    },
    progress: {
      percent: 0,
      comment: '',
      updatedAt: ''
    },
    ownerId: '', // user id of project owner/creator
    createdAt: new Date().toISOString(), // set creation time
    projectManager: {
      name: '',
      email: ''
    },
    customer: {
      name: '',
      email: ''
    },
    lines: {
      employees: [],
      paints: [],
      materials: [],
      vehicles: [],
      expenses: []
    },
    feedback: {
      rating: 0,
      comments: '',
      date: '',
      customerEmail: ''
    },
    signatureData: '', // digital signature (base64 image or similar)
    reassignments: [],
    internalNotes: ''
  };
}

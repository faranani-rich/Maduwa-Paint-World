// js/models.js

/**
 * Returns a brand-new, empty project object with all required fields.
 */
export function emptyProject() {
  return {
    id: '',
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
    createdAt: '', // date string
    projectManager: {
      name: '',
      email: ''
    },
    customer: {
      name: '',
      email: ''
    },
    lines: {
      employees: [
        // { name, role, hours, rate, overtime, bonus }
      ],
      paints: [
        // { type, color, buckets, costPerBucket, supplier }
      ],
      materials: [
        // { description, quantity, unitCost }
      ],
      vehicles: [
        // { driver, car, purpose, km, petrol, tolls, location, date, notes }
      ],
      expenses: [
        // { type, amount, notes }
        // e.g., { type: 'airtime', amount: 0, notes: '' }
      ]
    },
    feedback: {
      rating: 0,
      comments: '',
      date: '',
      customerEmail: ''
    },
    signatureData: '', // digital signature (base64 image or similar)
    reassignments: [
      // { employeeName, fromRole, toRole, date, notes }
    ],
    internalNotes: ''
  };
}

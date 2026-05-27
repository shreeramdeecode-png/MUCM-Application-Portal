export const moduleNavigation = [
  { name: 'Application form', note: 'Manage your full application' },
  { name: 'Notification', note: 'Track important updates' },
  { name: 'FAQ', note: 'FAQs and support tickets' },
  { name: 'Document', note: 'Uploads and submitted files' },
  { name: 'Submitted Applications', note: 'View past submissions' },
]

export const notificationItems = [
  {
    title: 'Application draft saved',
    message: 'Your latest progress was auto-saved successfully.',
    status: 'Info',
    time: '2 mins ago',
  },
  {
    title: 'Document reminder',
    message: 'Upload all required documents before final submission.',
    status: 'Action Needed',
    time: '1 hour ago',
  },
  {
    title: 'Validation complete',
    message: 'Current step has no validation errors.',
    status: 'Success',
    time: 'Today, 09:12 AM',
  },
]

export const faqSections = [
  {
    title: 'Application Process',
    items: [
      {
        question: 'Can I save and continue later?',
        answer:
          'Yes. Your progress is saved locally and can be resumed anytime.',
      },
      {
        question: 'Do all fields need to be completed?',
        answer:
          'Required fields must be completed before continuing to the next step.',
      },
    ],
  },
  {
    title: 'Documents & Uploads',
    items: [
      {
        question: 'Which files can I upload?',
        answer:
          'PDF, JPG, JPEG, and PNG are supported for all document uploads.',
      },
    ],
  },
]

export const faqSupport = {
  title: 'Need personal help?',
  description:
    'Contact admissions for one-to-one support with your form and documents.',
  email: 'admissions@muantigua.org',
}

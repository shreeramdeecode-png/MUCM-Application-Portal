export const requiredDocuments = [
  {
    id: 'passport',
    name: 'Valid Passport',
    type: 'REQUIRED',
    description:
      'Clear copy of your passport bio-data page (must be valid for at least 12 months)',
  },
  {
    id: 'bankStatement',
    name: 'Bank Statement (3 months)',
    type: 'REQUIRED',
    description:
      'Recent bank statements covering the last 3 months as proof of financial standing',
  },
  {
    id: 'preMedicalTranscript',
    name: 'Pre-Medical / Bachelor / 12th Grade Transcript',
    type: 'REQUIRED',
    description: 'Official transcript from your most recent qualifying education',
  },
  {
    id: 'grade11Transcript',
    name: '11th Grade Transcript',
    type: 'REQUIRED',
    description: 'Official transcript from your 11th grade / secondary education',
  },
  {
    id: 'cv',
    name: 'Curriculum Vitae (CV)',
    type: 'REQUIRED',
    description:
      'Up-to-date CV highlighting academic achievements, work experience, and extracurriculars',
  },
  {
    id: 'photo',
    name: 'Passport-Size Photograph',
    type: 'REQUIRED',
    description:
      'Recent colour photograph with white background (JPEG/PNG, min 300x400px)',
  },
]

export const optionalDocuments = [
  {
    id: 'examResults',
    name: 'MCAT / NEET / UCAT Exam Results',
    type: 'IF APPLICABLE',
    description:
      'Score report from any standardized medical entrance examination',
  },
  {
    id: 'professionalTranscripts',
    name: 'Other professional transcripts / certifications / awards',
    type: 'OPTIONAL',
    description:
      'Transcripts from additional professional or graduate programs, certifications, or awards',
  },
  {
    id: 'englishTest',
    name: 'TOEFL / IELTS Score Report',
    type: 'IF APPLICABLE',
    description:
      'English proficiency test results (for non-native English speakers)',
  },
  {
    id: 'recommendations',
    name: 'Letters of Recommendation',
    type: 'OPTIONAL',
    description:
      'Academic or professional references supporting your application',
  },
]

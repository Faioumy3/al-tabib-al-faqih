export enum CategoryId {
  ICU = 'ICU',
  SURGERY = 'SURGERY',
  OBGYN = 'OBGYN',
  INTERNAL = 'INTERNAL',
  GENERAL = 'GENERAL',
  UNIT_8_WORSHIP = 'UNIT_8_WORSHIP'
}

export interface Fatwa {
  id: string;
  title: string;
  category: CategoryId;
  question: string;
  medical_context: string; // The medical keywords (e.g., "Rhinoplasty")
  ruling: string; // The detailed Islamic ruling
  verdict: 'PERMITTED' | 'FORBIDDEN' | 'CONDITIONAL'; // Simplified for Emergency mode
  source: string; // e.g., Dar Al-Ifta
  tags: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isEmergency?: boolean;
  relatedFatwaIds?: string[]; // قائمة الفتاوى المطابقة (قد تكون متعددة)
}

export interface PatientLicenseData {
  doctorName: string;
  patientName: string;
  date: string;
  diagnosis: string;
  rulingSummary: string;
}

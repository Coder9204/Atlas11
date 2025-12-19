
export enum ModalityType {
  VOICE = 'voice',
  TEXT = 'text',
  VISUAL = 'visual'
}

export interface Concept {
  id: string;
  name: string;
  mastery: number; // 0-100
  exposure: 'none' | 'explained' | 'practiced';
  lastReviewed: number;
  nextReview: number;
  prerequisites: string[];
  misconceptions?: string[]; // Observed specific errors
  
  // SM-2 Algorithm Fields
  easeFactor?: number; // Default 2.5
  consecutiveCorrect?: number; // For interval calculation
}

export interface LearningSession {
  id: string;
  topic: string;
  startTime: number;
  events: LearningEvent[];
  flowState?: 'bored' | 'optimal' | 'anxious' | 'confused';
}

export interface LearningEvent {
  type: 'explanation' | 'retrieval' | 'feedback' | 'visual_gen' | 'media_watch';
  timestamp: number;
  content: string;
  success?: boolean;
}

export interface LearnerProfile {
  goals: string[]; // Why they are learning
  interests: string[]; // Contexts they relate to
  background: string; // Profession/Education
  preferences: {
    pace: 'fast' | 'moderate' | 'slow';
    style: 'visual' | 'theoretical' | 'practical';
  };
}

export interface UserState {
  name: string;
  profile: LearnerProfile;
  concepts: Record<string, Concept>;
  activeSession?: LearningSession;
}

export type VisualContentType = 'youtube' | 'diagram' | 'whiteboard' | 'document' | 'screen' | 'podcast' | 'briefing' | 'assessment' | 'none';

export interface AssessmentOption {
  id: string;
  label: string;
  value?: number;
  isCorrect?: boolean;
  feedback?: string; // Specific feedback if this option is chosen
}

export interface InvestigationItem {
  id: string;
  label: string;
  clue: string; // Revealed upon inspection
  isCritical?: boolean;
}

export interface AssessmentData {
  type: 'target_challenge' | 'prediction_commit' | 'diagnosis_detective' | 'sorting_challenge' | 'multiple_choice';
  title: string;
  scenario: string;
  question: string;
  
  // For Multiple Choice / Prediction
  options?: AssessmentOption[];
  
  // For Target Challenge (Sliders)
  targetValue?: number; 
  min?: number;
  max?: number;
  unit?: string;
  correctValue?: number | string; 
  
  // For Sorting Challenge
  items?: AssessmentOption[]; // The items to sort
  correctOrder?: string[]; // Array of IDs in correct order
  
  // For Diagnosis Detective
  investigationItems?: InvestigationItem[];
  correctDiagnosisId?: string; // Corresponds to an option ID

  explanation?: string; // Revealed after answer
}

export interface VisualContext {
  type: VisualContentType;
  data: any;
  command?: {
    action: 'pause' | 'play' | 'seek';
    timestamp?: number;
    id: string; // unique id to trigger effects
  };
}

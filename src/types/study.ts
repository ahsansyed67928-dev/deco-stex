export type UnitNumber = 1 | 2 | 3 | 4 | 5;

export type ExamScope = 'cie1' | 'cie2' | 'see';

export type ConfidenceLevel = 'weak' | 'moderate' | 'strong';

export type BloomLevel = 'BTL1' | 'BTL2' | 'BTL3' | 'BTL4' | 'BTL5' | 'BTL6';

export type AppSection = 'overview' | 'schedule' | 'flashcards' | 'practice' | 'progress';

export interface CourseUnit {
  unit: UnitNumber;
  code: string;
  coCode: string;
  title: string;
  shortTitle: string;
  hours: number;
  weightage: number;
  summary: string;
  topics: string[];
  keyFormulas: string[];
}

export interface Flashcard {
  id: string;
  unit: UnitNumber;
  co: string;
  topic: string;
  front: string;
  back: string;
  formula?: string;
  diagramUrl?: string;
  diagramAlt?: string;
  isCustom?: boolean;
}

export type CardRating = 'again' | 'good' | 'mastered';

export interface FlashcardProgress {
  cardId: string;
  box: 0 | 1 | 2 | 3; // 0: unseen/again, 1: learning, 2: familiar, 3: mastered
  reviews: number;
  lastReviewedAt: string;
  nextReviewDate: string; // YYYY-MM-DD
}

export interface PracticeQuestion {
  id: string;
  unit: UnitNumber;
  co: string;
  btl: BloomLevel;
  topic: string;
  type: 'mcq' | 'true_false';
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sourceTag: string;
}

export interface WrittenQuestionAnswer {
  id: string;
  unit: UnitNumber;
  co: string;
  btl: BloomLevel;
  kind: 'SAQ' | 'LAQ';
  marks: number;
  question: string;
  answerPoints: string[];
  keyFormulaOrRtl?: string;
  diagramUrl?: string;
  diagramAlt?: string;
  sourceTag: string;
}

export interface TestAttempt {
  id: string;
  title: string;
  mode: 'timed' | 'study';
  units: UnitNumber[];
  createdAt: string;
  durationSeconds: number;
  totalQuestions: number;
  correctCount: number;
  scorePercent: number;
  perUnit: Partial<Record<UnitNumber, { correct: number; total: number }>>;
  answers: Record<string, number>;
  questionIds: string[];
}

export interface StudyConfig {
  examScope: ExamScope;
  examDate: string; // YYYY-MM-DD
  dailyMinutes: number;
  unitConfidence: Record<UnitNumber, ConfidenceLevel>;
  studentGoalPercent: number;
}

export type StudyTaskKind = 'concept' | 'flashcards' | 'practice' | 'revision';

export interface ScheduledTask {
  id: string;
  date: string; // YYYY-MM-DD
  unit: UnitNumber;
  title: string;
  detail: string;
  kind: StudyTaskKind;
  minutes: number;
  topicFocus: string;
}

export interface StudyActivityLog {
  date: string; // YYYY-MM-DD
  minutesStudied: number;
  cardsReviewed: number;
  questionsAnswered: number;
}

export interface PersistedStudyState {
  config: StudyConfig;
  flashcardProgress: Record<string, FlashcardProgress>;
  customFlashcards: Flashcard[];
  completedTaskIds: Record<string, string>; // taskId -> completedAt ISO
  testAttempts: TestAttempt[];
  activityLog: Record<string, StudyActivityLog>; // YYYY-MM-DD -> log
  reviewedWrittenIds: string[];
}

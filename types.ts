
import React from 'react';

export interface BilingualText {
  ml: string;
  en: string;
}

export type ExamLevel = 'Preliminary' | 'Main' | 'Departmental' | 'Special' | 'Interview' | 'Physical' | 'Prelims + Mains' | 'Preliminary + Physical' | 'Prelims + Physical';
export type Difficulty = 'Easy' | 'Moderate' | 'PSC Level';
export type ExamCategory = '10th Level' | 'Plus Two Level' | 'Degree Level' | 'Medical' | 'Engineering' | 'Uniformed Services' | 'Administrative' | 'Higher Secondary' | 'Technical' | 'General' | 'Special';

export interface TopicMapping {
    id: number;
    subject: string;
    topic: string;
    micro_topic: string;
}

export interface Exam {
  id: string;
  title: BilingualText;
  description: BilingualText;
  icon: React.ReactNode;
  category: ExamCategory;
  level: ExamLevel;
}

export interface FlashCard {
  id: string;
  front: string;
  back: string;
  topic: string;
  explanation?: string;
}

export interface SubscriptionData {
  status: SubscriptionStatus;
  expiryDate?: string;
  planType?: string;
}

export interface FeedbackData {
  needs: string;
  easeInfo: string;
  transact: string;
  appeal: string;
  understand: string;
  recommend: number;
  improvement: string;
  userId?: string;
}

export interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  topic: string;
  subject: string;
  difficulty: Difficulty;
  explanation?: string;
}

export interface MockTest {
  id: string;
  examId: string;
  title: BilingualText;
  description: BilingualText;
  questionsCount: number;
  duration: number; // in minutes
  negativeMarking: number;
  isPro?: boolean;
}

export interface SubjectStats {
  correct: number;
  total: number;
}

export interface TestResult {
  score: number;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  timeSpent: number;
  subjectBreakdown: Record<string, SubjectStats>;
}

export interface ActiveTest {
  title: string;
  questionsCount: number;
  subject: string;
  topic: string;
  isPro?: boolean;
  negativeMarking?: number;
  examId?: string;
}

export type SubscriptionStatus = 'free' | 'pro';

export type Page = 
  | 'dashboard' 
  | 'exam_details' 
  | 'test' 
  | 'results' 
  | 'bookstore' 
  | 'about' 
  | 'privacy' 
  | 'terms' 
  | 'disclosure'
  | 'disclaimer'
  | 'exam_calendar'
  | 'quiz_home'
  | 'mock_test_home'
  | 'upgrade'
  | 'psc_live_updates'
  | 'previous_papers'
  | 'current_affairs'
  | 'gk'
  | 'flash_cards'
  | 'admin_panel'
  | 'study_material'
  | 'sitemap'
  | 'external_viewer'
  | 'feedback';

export interface Notification {
  id: string;
  title: string;
  categoryNumber: string;
  lastDate: string;
  link: string;
}

export interface StudyMaterial {
  id: string;
  title: string;
  subject: string;
  icon?: React.ReactNode;
}

export interface PracticeTest {
  id: string;
  title: string;
  questions: number;
  duration: number;
  subject: string;
  topic: string;
  examId?: string;
  micro_topics?: string;
}

export interface ExamPageContent {
  practiceTests: PracticeTest[];
  studyNotes: StudyMaterial[];
  previousPapers: { id: string; title: string }[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  imageUrl: string;
  amazonLink: string;
}

export interface UserAnswers {
  [questionIndex: number]: number;
}

export interface NavLink {
  nameKey: string;
  target?: Page;
  children?: NavLink[];
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  quote: string;
}

export interface ExamCalendarEntry {
  slNo: string | number;
  catNo: string;
  postName: string;
  department: string;
  examDate: string;
  syllabusLink: string;
}

export interface QuizCategory {
  id: string;
  title: BilingualText;
  description: BilingualText;
  icon: React.ReactNode;
  isPro?: boolean;
}

export interface PscUpdateItem {
  title: string;
  url: string;
  section: string;
  published_date: string;
}

/**
 * QuestionPaper interface updated to fix type errors in constants.ts.
 */
export interface QuestionPaper {
  title: string;
  url: string;
  // Made optional as MOCK_QUESTION_PAPERS in constants.ts doesn't provide it.
  date?: string;
  size?: string;
  year?: string;
  // Added category property to match usage in constants.ts and PreviousPapersPage.tsx
  category?: string;
  // Added isDirectPdf to align with the response schema in geminiService.ts
  isDirectPdf?: boolean;
}

export interface CurrentAffairsItem {
  id: string;
  title: string;
  source: string;
  date: string;
}

export interface GkItem {
  id: string;
  fact: string;
  category: string;
}

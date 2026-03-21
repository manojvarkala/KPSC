
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import Header from './components/Header';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import ExamPage from './components/ExamPage';
import TestPage from './components/TestPage';
import TestResultPage from './components/TestResultPage';
import AboutUsPage from './components/pages/AboutUsPage';
import PrivacyPolicyPage from './components/pages/PrivacyPolicyPage';
import TermsPage from './components/pages/TermsPage';
import DisclosurePage from './components/pages/DisclosurePage';
import DisclaimerPage from './components/pages/DisclaimerPage';
import BookstorePage from './components/pages/BookstorePage';
import ExamCalendarPage from './components/pages/ExamCalendarPage';
import QuizHomePage from './components/pages/QuizHomePage';
import MockTestHomePage from './components/pages/MockTestHomePage';
import UpgradePage from './components/pages/UpgradePage';
import PscLiveUpdatesPage from './components/pages/PscLiveUpdatesPage';
import PreviousPapersPage from './components/pages/PreviousPapersPage';
import CurrentAffairsPage from './components/pages/CurrentAffairsPage';
import GkPage from './components/pages/GkPage';
import FlashCardsPage from './components/pages/FlashCardsPage';
import AdminPage from './components/pages/AdminPage';
import StudyMaterialPage from './components/pages/StudyMaterialPage';
import SitemapPage from './components/pages/SitemapPage';
import ExternalViewerPage from './components/pages/ExternalViewerPage';
import FeedbackPage from './components/pages/FeedbackPage';
import LoadingScreen from './components/LoadingScreen';
import type { Exam, SubscriptionStatus, ActiveTest, Page, QuizQuestion, UserAnswers } from './types';
import { EXAMS_DATA, EXAM_CONTENT_MAP, MOCK_TESTS_DATA } from './constants'; 
import { subscriptionService } from './services/subscriptionService';
import { getSettings, getExams } from './services/pscDataService';
import { useTheme } from './contexts/ThemeContext';

const App: React.FC = () => {
  const { user, isSignedIn, isLoaded: clerkLoaded } = useUser();
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  
  // App States
  const [allExams, setAllExams] = useState<Exam[]>(EXAMS_DATA);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [activeTest, setActiveTest] = useState<ActiveTest | null>(null);
  const [testResult, setTestResult] = useState<{ score: number; total: number; stats?: any; questions?: QuizQuestion[]; answers?: UserAnswers } | null>(null);
  const [activeStudyTopic, setActiveStudyTopic] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>({ subscription_model_active: 'true', free_pro_mode: 'false' });
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('free');
  const [hitCount, setHitCount] = useState<number>(12345);
  const { theme } = useTheme();

  const isInitialized = useRef(false);

  useEffect(() => {
      if (isInitialized.current) return;
      isInitialized.current = true;
      const initData = async () => {
          try {
              const [s, eRes] = await Promise.all([getSettings(), getExams()]);
              if (s) setSettings(s);
              if (eRes && eRes.exams && eRes.exams.length > 0) setAllExams(eRes.exams);
              
              // Increment hit counter
              const hitRes = await fetch('/api/hitcounter');
              if (hitRes.ok) {
                  const data = await hitRes.json();
                  setHitCount(data.count);
              }
          } catch (e) { console.error(e); }
      };
      initData();
  }, []);

  useEffect(() => {
      const refreshSettings = async () => {
          try {
              const s = await getSettings();
              if (s) setSettings(s);
          } catch (e) { console.error("Failed to refresh settings:", e); }
      };
      window.addEventListener('settings_updated', refreshSettings);
      return () => window.removeEventListener('settings_updated', refreshSettings);
  }, []);

  useEffect(() => {
      if (clerkLoaded) setIsAppLoading(false);
      const safetyExit = setTimeout(() => setIsAppLoading(false), 6000);
      return () => clearTimeout(safetyExit);
  }, [clerkLoaded]);

  const syncStateFromHash = useCallback(() => {
    const rawHash = window.location.hash || '#dashboard';
    const [hashPath, hashQuery] = rawHash.replace(/^#\/?/, '').split('?');
    const parts = hashPath.split('/');
    const pageName = parts[0] as Page;

    setActiveTest(null);
    setSelectedExam(null);
    setActiveStudyTopic(null);

    if (pageName === 'exam_details' && parts[1]) {
        const found = allExams.find(e => String(e.id).toLowerCase() === parts[1].toLowerCase());
        if (found) setSelectedExam(found);
    }

    if (pageName === 'test') {
        if (parts[1] === 'mock' && parts[2]) {
            const mt = MOCK_TESTS_DATA.find(m => String(m.id) === String(parts[2]));
            if (mt) setActiveTest({ title: mt.title.ml, questionsCount: mt.questionsCount, subject: 'mixed', topic: 'mixed', negativeMarking: mt.negativeMarking });
        } else if (parts[1] && parts[2] && parts[3]) {
            setActiveTest({ subject: decodeURIComponent(parts[1]), topic: decodeURIComponent(parts[2]), questionsCount: parseInt(parts[3]) || 20, title: parts[4] ? decodeURIComponent(parts[4]) : decodeURIComponent(parts[2]) });
        }
    }

    if (pageName === 'study_material' && parts[1]) setActiveStudyTopic(decodeURIComponent(parts[1]));
    if (pageName === 'external_viewer' && hashQuery) setExternalUrl(new URLSearchParams(hashQuery).get('url'));

    setCurrentPage(pageName || 'dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [allExams]);

  useEffect(() => {
    if (!isAppLoading) {
        syncStateFromHash();
        window.addEventListener('hashchange', syncStateFromHash);
        return () => window.removeEventListener('hashchange', syncStateFromHash);
    }
  }, [syncStateFromHash, isAppLoading]);

  useEffect(() => {
    const determineStatus = async () => {
        // If subscription model is disabled OR free pro mode is enabled, everyone is PRO
        if (settings.subscription_model_active === 'false' || settings.free_pro_mode === 'true') {
            setSubscriptionStatus('pro');
            return;
        }

        // Otherwise, check user's actual subscription
        if (clerkLoaded) {
            if (isSignedIn && user?.id) {
                try {
                    const data = await subscriptionService.getSubscriptionData(user.id);
                    setSubscriptionStatus(data.status);
                } catch (e) {
                    console.error("Failed to fetch subscription:", e);
                    setSubscriptionStatus('free');
                }
            } else {
                setSubscriptionStatus('free');
            }
        }
    };

    determineStatus();
    
    const handleSubUpdate = () => determineStatus();
    window.addEventListener('subscription_updated', handleSubUpdate);
    return () => window.removeEventListener('subscription_updated', handleSubUpdate);
  }, [user, isSignedIn, settings, clerkLoaded]);

  const handleNavigate = (page: string) => {
    window.location.hash = page.startsWith('#') ? page : `#${page}`;
  };

  if (isAppLoading) return <LoadingScreen />;

  const isFullPage = currentPage === 'external_viewer';

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      {!isFullPage && <Header onNavigate={handleNavigate as any} />}
      <main className={`flex-grow ${isFullPage ? '' : 'container mx-auto px-4 py-8'}`}>
        {(() => {
          switch(currentPage) {
            case 'admin_panel': return <AdminPage onBack={() => handleNavigate('dashboard')} />;
            case 'exam_details': return selectedExam ? <ExamPage exam={selectedExam} content={EXAM_CONTENT_MAP[selectedExam.id] || EXAM_CONTENT_MAP['10th_level']} subscriptionStatus={subscriptionStatus} onBack={() => handleNavigate('dashboard')} onStartTest={(t: any) => handleNavigate(`test/${encodeURIComponent(t.subject)}/${encodeURIComponent(t.topic)}/${t.questions}/${encodeURIComponent(t.title)}`)} onStartStudy={(t: string) => handleNavigate(`study_material/${encodeURIComponent(t)}`)} onNavigate={handleNavigate} onNavigateToUpgrade={() => handleNavigate('upgrade')} /> : <div className="p-20 text-center">Finding Exam Data...</div>;
            case 'test': return activeTest ? <TestPage activeTest={activeTest} subscriptionStatus={subscriptionStatus} onTestComplete={(s, t, st, q, a) => { setTestResult({ score: s, total: t, stats: st, questions: q, answers: a }); handleNavigate('results'); }} onBack={() => window.history.back()} onNavigateToUpgrade={() => handleNavigate('upgrade')} /> : <div className="text-center p-20">Loading...</div>;
            case 'results': return testResult ? <TestResultPage score={testResult.score} total={testResult.total} stats={testResult.stats} questions={testResult.questions} answers={testResult.answers} onBackToPrevious={() => handleNavigate('dashboard')} /> : <Dashboard onNavigateToExam={e => handleNavigate(`exam_details/${e.id}`)} onNavigate={handleNavigate} onStartStudy={(t) => handleNavigate(`study_material/${encodeURIComponent(t)}`)} />;
            case 'bookstore': return <BookstorePage onBack={() => handleNavigate('dashboard')} />;
            case 'quiz_home': return <QuizHomePage onBack={() => handleNavigate('dashboard')} onStartQuiz={(c) => handleNavigate(`test/${encodeURIComponent(c.title.en)}/mixed/15/${encodeURIComponent(c.title.ml)}`)} subscriptionStatus={subscriptionStatus} />;
            case 'mock_test_home': return <MockTestHomePage onBack={() => handleNavigate('dashboard')} onStartTest={(t) => handleNavigate(`test/mock/${t.id}`)} />;
            case 'psc_live_updates': return <PscLiveUpdatesPage onBack={() => handleNavigate('dashboard')} />;
            case 'previous_papers': return <PreviousPapersPage onBack={() => handleNavigate('dashboard')} />;
            case 'current_affairs': return <CurrentAffairsPage onBack={() => handleNavigate('dashboard')} />;
            case 'gk': return <GkPage onBack={() => handleNavigate('dashboard')} />;
            case 'flash_cards': return <FlashCardsPage onBack={() => handleNavigate('dashboard')} />;
            case 'upgrade': return <UpgradePage onBack={() => window.history.back()} onUpgrade={() => {}} />;
            case 'study_material': return <StudyMaterialPage topic={activeStudyTopic || 'General Study'} onBack={() => handleNavigate('dashboard')} />;
            case 'external_viewer': return <ExternalViewerPage url={externalUrl || ''} onBack={() => handleNavigate('dashboard')} />;
            case 'exam_calendar': return <ExamCalendarPage onBack={() => handleNavigate('dashboard')} />;
            case 'sitemap': return <SitemapPage onBack={() => handleNavigate('dashboard')} onNavigate={handleNavigate as any} />;
            case 'feedback': return <FeedbackPage onBack={() => handleNavigate('dashboard')} />;
            case 'about': return <AboutUsPage onBack={() => handleNavigate('dashboard')} />;
            case 'privacy': return <PrivacyPolicyPage onBack={() => handleNavigate('dashboard')} />;
            case 'terms': return <TermsPage onBack={() => handleNavigate('dashboard')} />;
            case 'disclosure': return <DisclosurePage onBack={() => handleNavigate('dashboard')} />;
            case 'disclaimer': return <DisclaimerPage onBack={() => handleNavigate('dashboard')} />;
            default: return <Dashboard onNavigateToExam={e => handleNavigate(`exam_details/${e.id}`)} onNavigate={handleNavigate} onStartStudy={(t) => handleNavigate(`study_material/${encodeURIComponent(t)}`)} />;
          }
        })()}
      </main>
      {!isFullPage && <Footer onNavigate={handleNavigate as any} hitCount={hitCount} />}
    </div>
  );
};

export default App;

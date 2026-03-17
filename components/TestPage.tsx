
import React, { useState, useEffect, useCallback } from 'react';
import type { QuizQuestion, UserAnswers, SubscriptionStatus, ActiveTest } from '../types';
import { getQuestionsForTest } from '../services/pscDataService';
import Modal from './Modal';
import { ClockIcon } from './icons/ClockIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { useTranslation } from '../contexts/LanguageContext';

interface TestPageProps {
  activeTest: ActiveTest;
  subscriptionStatus: SubscriptionStatus;
  onTestComplete: (score: number, total: number, stats: any, questions: QuizQuestion[], answers: UserAnswers) => void;
  onBack: () => void;
  onNavigateToUpgrade: () => void;
}

const QUESTION_TIME_LIMIT = 25; // per question limit for practice

const TestPage: React.FC<TestPageProps> = ({ activeTest, subscriptionStatus, onTestComplete, onBack, onNavigateToUpgrade }) => {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(activeTest.questionsCount * 45); 
  const [questionTimeLeft, setQuestionTimeLeft] = useState(QUESTION_TIME_LIMIT);

  const isFullMock = activeTest.questionsCount >= 100;
  const isLast = currentIndex === questions.length - 1;

  useEffect(() => {
      if (isFullMock) {
          setTimeLeft(75 * 60); 
      }
  }, [isFullMock]);

  const handleSubmit = useCallback(() => {
    let score = 0;
    let correct = 0;
    let wrong = 0;
    const neg = activeTest.negativeMarking || 0.33;

    questions.forEach((q, idx) => {
      const selected = answers[idx];
      if (selected !== undefined) {
        let correctIdx = Number(q.correctAnswerIndex);
        if (correctIdx === 0) correctIdx = 1; 
        const userSelectionIdx = Number(selected) + 1;
        if (userSelectionIdx === correctIdx) {
          correct++;
          score += 1;
        } else {
          wrong++;
          score -= neg;
        }
      }
    });

    onTestComplete(parseFloat(score.toFixed(2)), questions.length, { correct, wrong, skipped: questions.length - (correct + wrong) }, questions, answers);
  }, [questions, answers, onTestComplete, activeTest]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [handleSubmit]);

  useEffect(() => {
    if (loading || questions.length === 0 || isSubmitModalOpen || isFullMock) return;
    const qTimer = setInterval(() => {
        setQuestionTimeLeft(prev => {
            if (prev <= 1) {
                if (currentIndex < questions.length - 1) { setCurrentIndex(c => c + 1); return QUESTION_TIME_LIMIT; }
                else { clearInterval(qTimer); setIsSubmitModalOpen(true); return 0; }
            }
            return prev - 1;
        });
    }, 1000);
    return () => clearInterval(qTimer);
  }, [currentIndex, questions.length, loading, isSubmitModalOpen, isFullMock]);

  useEffect(() => {
    setQuestionTimeLeft(QUESTION_TIME_LIMIT);
  }, [currentIndex]);

  useEffect(() => {
    getQuestionsForTest(activeTest.subject, activeTest.topic, activeTest.questionsCount)
      .then(data => {
        setQuestions(data as QuizQuestion[]);
        setLoading(false);
      });
  }, [activeTest]);

  const selectOption = (idx: number) => setAnswers(prev => ({...prev, [currentIndex]: idx}));

  if (loading) return (
    <div className="h-[80vh] flex flex-col items-center justify-center p-6 space-y-8 animate-fade-in">
        <div className="relative">
            <div className="w-24 h-24 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center font-black text-indigo-600 text-xs">AI</div>
        </div>
        <div className="text-center">
            <p className="font-black text-2xl text-slate-800 dark:text-white tracking-tighter uppercase">Initializing Exam...</p>
        </div>
    </div>
  );

  if (!questions.length) return (
    <div className="h-[80vh] flex flex-col items-center justify-center p-10 text-center">
        <div className="bg-red-50 p-10 rounded-[2.5rem] border border-red-100 max-w-md">
            <h2 className="text-2xl font-black text-red-600 mb-4">No Questions Found</h2>
            <button onClick={onBack} className="w-full bg-slate-800 text-white font-black py-4 rounded-xl shadow-lg">Back</button>
        </div>
    </div>
  );

  const q = questions[currentIndex];

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-120px)] flex flex-col px-4 overflow-hidden">
      <div className={`bg-white dark:bg-slate-900 p-5 md:p-8 rounded-[2.5rem] shadow-2xl border dark:border-slate-800 flex flex-col h-full overflow-hidden`}>
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6 border-b pb-4 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-lg">{currentIndex + 1}</div>
            <div>
                <h2 className="text-lg font-black dark:text-white leading-none tracking-tight line-clamp-1">{activeTest.title}</h2>
                <div className="flex items-center space-x-2 mt-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{currentIndex + 1} / {questions.length}</p>
                    {!isFullMock && (
                        <span className={`text-[9px] font-black uppercase ${questionTimeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-indigo-500'}`}>T: {questionTimeLeft}s</span>
                    )}
                </div>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-xl flex items-center space-x-2 font-mono font-bold dark:text-white shadow-inner border transition-colors ${timeLeft < 300 ? 'bg-red-50 text-red-600' : 'bg-slate-50 dark:bg-slate-800'}`}>
            <ClockIcon className="h-4 w-4" />
            <span className="text-base">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</span>
          </div>
        </div>

        {/* Question Area - Flex Grow to take available space */}
        <div className="flex-grow flex flex-col overflow-hidden">
            <div className="mb-6 flex-shrink-0">
                <h1 className="text-lg md:text-xl font-black dark:text-white leading-snug tracking-tight">{q.question}</h1>
            </div>

            {/* Scrollable Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto pr-2 custom-scrollbar pb-4">
              {q.options.map((opt, idx) => (
                <button 
                  key={idx} 
                  onClick={() => selectOption(idx)}
                  className={`p-4 rounded-2xl border-2 text-left font-bold transition-all flex items-center group relative overflow-hidden ${
                    answers[currentIndex] === idx 
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' 
                    : 'border-slate-100 dark:border-slate-800 hover:border-indigo-400'
                  }`}
                >
                  <div className="flex items-center space-x-3 w-full relative z-10">
                    <span className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center border font-black text-xs transition-all ${answers[currentIndex] === idx ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>{String.fromCharCode(65+idx)}</span>
                    <span className="text-sm md:text-base leading-tight flex-1 dark:text-slate-200">{opt}</span>
                  </div>
                </button>
              ))}
            </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center mt-6 pt-6 border-t dark:border-slate-800 flex-shrink-0">
          <button 
            onClick={() => setCurrentIndex(c => Math.max(0, c-1))} 
            disabled={currentIndex===0} 
            className="flex items-center gap-2 px-6 py-3 font-black text-slate-400 hover:text-indigo-600 disabled:opacity-20 uppercase text-[10px] tracking-widest transition-all group"
          >
            <ChevronLeftIcon className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            {t('test.previous')}
          </button>
          
          <div className="flex items-center space-x-3">
            {!isLast ? (
              <button 
                onClick={() => setCurrentIndex(c => c+1)} 
                className="flex items-center gap-2 bg-white dark:bg-slate-800 text-indigo-600 border-2 border-indigo-100 dark:border-indigo-900 px-8 py-3 rounded-2xl font-black shadow-sm hover:shadow-md hover:border-indigo-300 transition-all uppercase text-[10px] tracking-widest group"
              >
                {t('test.next')}
                <ChevronRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            ) : null}
            
            <button 
              onClick={() => isLast && setIsSubmitModalOpen(true)} 
              disabled={!isLast}
              className={`px-8 py-3 rounded-2xl font-black shadow-xl transition-all active:scale-95 uppercase text-[10px] tracking-widest border-b-4 ${
                isLast 
                ? 'bg-indigo-600 text-white border-indigo-800 cursor-pointer opacity-100 hover:bg-indigo-700' 
                : 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed opacity-50'
              }`}
            >
              പരീക്ഷ പൂർത്തിയാക്കുക
            </button>
          </div>
        </div>
      </div>
      
      <Modal isOpen={isSubmitModalOpen} onClose={()=>setIsSubmitModalOpen(false)} onConfirm={handleSubmit} title="Confirmation">
          <p className="font-bold text-slate-600 text-sm">ഉത്തരങ്ങൾ ഒരിക്കൽ കൂടി പരിശോധിച്ച ശേഷം സബ്മിറ്റ് ചെയ്യുക.</p>
      </Modal>
    </div>
  );
};

export default TestPage;

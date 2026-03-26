
import React, { useState, useEffect, useMemo, Fragment } from 'react';
import ExamCard from './ExamCard';
import { getExams } from '../services/pscDataService';
import type { Exam, Page } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import NewsTicker from './NewsTicker';
import HeroSlider from './HeroSlider';
import AdsenseWidget from './AdsenseWidget';
import PscLiveWidget from './PscLiveWidget';
import PracticeExamsWidget from './PracticeExamsWidget';
import RotatingDailyWidget from './RotatingDailyWidget';
import CalendarWidget from './CalendarWidget';
import { categorizeExams } from '../lib/examUtils';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';

const WelcomeBar: React.FC = () => {
    return (
        <div className="bg-slate-950 p-10 md:p-14 rounded-[4rem] text-white flex flex-col md:row items-center justify-between gap-10 relative overflow-hidden mb-16 border-2 border-white/5 shadow-2xl">
            <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-600/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
            <div className="relative z-10 space-y-6 max-w-2xl text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start space-x-4">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg"><SparklesIcon className="h-6 w-6 text-white" /></div>
                    <span className="font-black text-[11px] uppercase tracking-[0.5em] text-indigo-400">Premium Learning</span>
                </div>
                <h2 className="text-5xl md:text-6xl font-black tracking-tighter leading-[0.95]">റാങ്ക് പട്ടികയിൽ <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-200 to-indigo-500">മുന്നിലെത്താം!</span></h2>
                <p className="text-slate-400 font-bold text-lg leading-relaxed">AI സാങ്കേതികവിദ്യയുടെ സഹായത്തോടെ തയ്യാറാക്കിയ ലക്ഷക്കണക്കിന് ചോദ്യങ്ങൾ ഇപ്പോൾ നിങ്ങളുടെ വിരൽത്തുമ്പിൽ.</p>
            </div>
        </div>
    );
};

const Dashboard: React.FC<{ onNavigateToExam: (exam: Exam) => void; onNavigate: (page: Page) => void; onStartStudy: (topic: string) => void; }> = ({ onNavigateToExam, onNavigate, onStartStudy }) => {
  const { t, language } = useTranslation();
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExams().then(res => {
        setAllExams(res.exams);
        setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const sections = useMemo(() => categorizeExams(allExams), [allExams]);

  const themes: ('indigo' | 'emerald' | 'rose' | 'amber' | 'cyan')[] = ['indigo', 'emerald', 'rose', 'amber', 'cyan'];

  if (loading) return (
    <div className="space-y-12 animate-pulse p-4">
        <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-[3.5rem]"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1,2,3].map(i => <div key={i} className="h-64 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem]"></div>)}
        </div>
    </div>
  );

  const renderExamSection = (sectionId: string, title: string, data: { groups: Record<string, Exam[]>, ids: string[], total: number }, icon: React.ReactNode) => (
    <div className="space-y-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center space-x-6">
                <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">{icon}</div>
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-slate-800 dark:text-white">{title}</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Total {data.total} Exams Available</p>
                </div>
            </div>
            <div className="flex items-center space-x-2 px-6 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                <span className="text-2xl font-black text-indigo-600">{data.total}</span>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Exams</span>
            </div>
        </div>

        {data.ids.map((catId) => (
            <section key={catId} className="animate-fade-in-up">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 border-b-2 dark:border-slate-800 pb-10">
                  <div className="flex items-center space-x-6">
                    <div className="h-16 w-3 bg-indigo-600 rounded-full shadow-lg"></div>
                    <div>
                        <h3 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{t(`dashboard.examCategories.${catId}`) || catId}</h3>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px] mt-2">Professional PSC Tracks</p>
                    </div>
                  </div>
                  <button onClick={() => onNavigate('mock_test_home')} className="flex items-center space-x-2 text-indigo-600 font-black uppercase text-[10px] tracking-widest hover:translate-x-2 transition-transform">
                     <span>View All</span>
                     <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-10">
                  {(data.groups[catId] || []).map((exam, idx) => (
                      <Fragment key={exam.id}>
                          <div className="h-full flex flex-col">
                              <ExamCard 
                                exam={exam} 
                                onNavigate={onNavigateToExam} 
                                language={language} 
                                theme={themes[idx % themes.length]} 
                              />
                          </div>
                          {(idx + 1) % 7 === 0 && <AdsenseWidget />}
                      </Fragment>
                  ))}
                </div>
            </section>
        ))}
    </div>
  );

  return (
    <div className="space-y-12 pb-32">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 px-4">
          <div className="lg:col-span-3"><HeroSlider onNavigate={onNavigate} /></div>
          <div className="hidden lg:block h-full"><RotatingDailyWidget onNavigate={onNavigate} /></div>
      </div>
      <div className="px-4"><NewsTicker /></div>
      
      <div className="px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                  { id: 'flash_cards', label: 'Flashcards', icon: SparklesIcon, color: 'bg-rose-50 text-rose-600 border-rose-100' },
                  { id: 'quiz_home', label: 'Daily Quiz', icon: BeakerIcon, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
                  { id: 'mock_test_home', label: 'Mock Tests', icon: ClipboardListIcon, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                  { id: 'exam_calendar', label: 'Calendar', icon: CalendarDaysIcon, color: 'bg-amber-50 text-amber-600 border-amber-100' }
              ].map(action => (
                  <button 
                    key={action.id} 
                    onClick={() => onNavigate(action.id as Page)}
                    className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all hover:scale-105 hover:shadow-lg ${action.color}`}
                  >
                      <action.icon className="h-8 w-8 mb-3" />
                      <span className="font-black text-[10px] uppercase tracking-widest">{action.label}</span>
                  </button>
              ))}
          </div>
      </div>

      <div className="px-4"><WelcomeBar /></div>

      <section className="px-4">
          <div className="flex items-center space-x-4 mb-8">
              <div className="h-10 w-2 bg-rose-600 rounded-full"></div>
              <h3 className="text-3xl font-black tracking-tighter">പരിശീലന പരീക്ഷകൾ</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {sections.practice.ids.map(catId => (
                  <button 
                    key={catId}
                    onClick={() => onNavigate('practice_exams_home')}
                    className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-center hover:border-indigo-500 hover:shadow-md transition-all group"
                  >
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-indigo-600">
                          {t(`dashboard.examCategories.${catId}`) || catId}
                      </span>
                  </button>
              ))}
          </div>
      </section>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 px-4">
        <div className="lg:col-span-3 space-y-32">
            {renderExamSection(
                'mock_tests', 
                t('dashboard.examCategories.mockTests'), 
                sections.mock, 
                <ClipboardListIcon className="h-8 w-8 text-white" />
            )}
            
            {renderExamSection(
                'practice_exams', 
                t('dashboard.examCategories.practiceExams'), 
                sections.practice, 
                <BeakerIcon className="h-8 w-8 text-white" />
            )}
        </div>

        <aside className="hidden lg:block space-y-8">
            <PscLiveWidget onNavigate={() => onNavigate('psc_live_updates')} />
            <PracticeExamsWidget onNavigate={() => onNavigate('quiz_home')} />
            <CalendarWidget onNavigate={() => onNavigate('exam_calendar')} />
            <div className="sticky top-28 py-4 flex flex-col gap-4">
                <AdsenseWidget />
            </div>
        </aside>
      </div>
    </div>
  );
};

export default Dashboard;

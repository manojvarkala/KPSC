import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { BeakerIcon } from '../icons/BeakerIcon';
import type { Exam } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import { getExams } from '../../services/pscDataService';
import { categorizeExams } from '../../lib/examUtils';

interface PracticeCardProps {
  exam: Exam;
  onStart: (exam: Exam) => void;
}

const PracticeCard: React.FC<PracticeCardProps> = ({ exam, onStart }) => {
  const { t, language } = useTranslation();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl hover:shadow-2xl hover:-translate-y-2 transform transition-all duration-500 flex flex-col border-2 border-slate-100 dark:border-slate-800 group relative overflow-hidden h-full">
      <div className="h-3 w-full bg-gradient-to-r from-emerald-600 to-teal-600"></div>
      
      <div className="p-8 flex flex-col h-full">
        <div className="flex items-start space-x-5 mb-6">
          <div className="p-4 rounded-2xl shadow-inner group-hover:rotate-3 transition-transform bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border dark:border-slate-800">
             {exam.icon || <BeakerIcon className="h-8 w-8" />}
          </div>
          <div className="flex-1">
              <h4 className="text-xl font-black text-slate-800 dark:text-white leading-tight tracking-tight group-hover:text-emerald-600 transition-colors mb-1">{exam.title[language]}</h4>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{exam.category || 'Practice'}</span>
          </div>
        </div>
        
        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed mb-8 line-clamp-2 italic opacity-80">"{exam.description[language]}"</p>
      
        <div className="mt-auto">
            <button 
              onClick={() => onStart(exam)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest"
            >
              പരിശീലനം ആരംഭിക്കുക
            </button>
        </div>
      </div>
    </div>
  );
};

interface PageProps {
  onBack: () => void;
  onStartPractice: (exam: Exam) => void;
}

const PracticeExamsHomePage: React.FC<PageProps> = ({ onBack, onStartPractice }) => {
  const { t, language } = useTranslation();
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExams().then(res => {
      setAllExams(res.exams);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const practiceData = useMemo(() => categorizeExams(allExams).practice, [allExams]);

  return (
    <div className="animate-fade-in pb-32 max-w-7xl mx-auto px-4">
      <button onClick={onBack} className="flex items-center space-x-2 text-indigo-600 font-black hover:underline mb-8 group">
        <ChevronLeftIcon className="h-5 w-5 transform group-hover:-translate-x-1 transition-transform" />
        <span>{t('backToDashboard')}</span>
      </button>

      <header className="mb-12">
        <div className="space-y-4">
          <h1 className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">
            {t('nav.practiceExams')}
          </h1>
          <p className="text-lg text-slate-500 font-bold max-w-2xl leading-relaxed">
            ഓരോ വിഷയങ്ങളും ആഴത്തിൽ പഠിക്കാനായി തയ്യാറാക്കിയ പ്രാക്ടീസ് പരീക്ഷകൾ.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-slate-100 dark:bg-slate-900 rounded-[3rem]"></div>
          ))}
        </div>
      ) : practiceData.total > 0 ? (
        <div className="space-y-16">
          {practiceData.ids.map(catId => (
            <div key={catId} className="space-y-8">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-2 bg-emerald-600 rounded-full"></div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                  {t(`dashboard.examCategories.${catId}`) || catId}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {practiceData.groups[catId].map((exam) => (
                  <PracticeCard key={exam.id} exam={exam} onStart={onStartPractice} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-40 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800 shadow-inner">
           <p className="text-2xl font-black text-slate-300 dark:text-slate-700 tracking-tighter">Updating Practice Hall...</p>
        </div>
      )}
    </div>
  );
};

export default PracticeExamsHomePage;

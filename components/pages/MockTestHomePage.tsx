
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { DocumentChartBarIcon } from '../icons/DocumentChartBarIcon';
import ProBadge from '../ProBadge';
import type { MockTest, Exam } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import { ClockIcon } from '../icons/ClockIcon';
import { getExams } from '../../services/pscDataService';
import { categorizeExams } from '../../lib/examUtils';
import { MOCK_TESTS_DATA } from '../../constants';

interface MockTestCardProps {
  exam: Exam | MockTest;
  onStart: (exam: any) => void;
}

const MockTestCard: React.FC<MockTestCardProps> = ({ exam, onStart }) => {
  const { t, language } = useTranslation();
  const isPro = 'level' in exam ? exam.level?.toLowerCase().includes('pro') : exam.isPro;
  const category = 'category' in exam ? exam.category : 'Full Mock Test';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl hover:shadow-2xl hover:-translate-y-2 transform transition-all duration-500 flex flex-col border-2 border-slate-100 dark:border-slate-800 group relative overflow-hidden h-full">
      <div className="h-3 w-full bg-gradient-to-r from-indigo-600 to-blue-600"></div>
      
      <div className="p-8 flex flex-col h-full">
        <div className="flex items-start space-x-5 mb-6">
          <div className="p-4 rounded-2xl shadow-inner group-hover:rotate-3 transition-transform bg-indigo-50 dark:bg-indigo-950 text-indigo-600 border dark:border-slate-800">
             {('icon' in exam && exam.icon) || <DocumentChartBarIcon className="h-8 w-8" />}
          </div>
          <div className="flex-1">
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <h4 className="text-xl font-black text-slate-800 dark:text-white leading-tight tracking-tight group-hover:text-indigo-600 transition-colors">{exam.title[language]}</h4>
                {isPro && <ProBadge />}
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{category || 'PSC Official'}</span>
          </div>
        </div>
        
        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed mb-8 line-clamp-2 italic opacity-80">"{exam.description[language]}"</p>
      
        <div className="mt-auto">
            <button 
              onClick={() => onStart(exam)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest"
            >
              {language === 'ml' ? 'പരീക്ഷ ആരംഭിക്കുക' : 'Start Exam'}
            </button>
        </div>
      </div>
    </div>
  );
};

interface PageProps {
  onBack: () => void;
  onStartTest: (exam: any) => void;
}

const MockTestHomePage: React.FC<PageProps> = ({ onBack, onStartTest }) => {
  const { t, language } = useTranslation();
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExams().then(res => {
      setAllExams(res.exams);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const mockData = useMemo(() => categorizeExams(allExams).mock, [allExams]);

  return (
    <div className="animate-fade-in pb-32 max-w-7xl mx-auto px-4">
      <button onClick={onBack} className="flex items-center space-x-2 text-indigo-600 font-black hover:underline mb-8 group">
        <ChevronLeftIcon className="h-5 w-5 transform group-hover:-translate-x-1 transition-transform" />
        <span>{t('backToDashboard')}</span>
      </button>

      <header className="mb-12">
        <div className="space-y-4">
          <h1 className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">
            {t('dashboard.examCategories.mockTests')}
          </h1>
          <p className="text-lg text-slate-500 font-bold max-w-2xl leading-relaxed">
            കേരള PSC ഒറിജിനൽ പരീക്ഷയുടെ അതേ സിലബസ്സിലും സമയക്രമത്തിലും തയ്യാറാക്കിയ മോഡൽ പരീക്ഷകൾ.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-slate-100 dark:bg-slate-900 rounded-[3rem]"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-16">
          {/* Full Mock Tests Section */}
          <div className="space-y-8">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-2 bg-rose-600 rounded-full"></div>
              <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                {language === 'ml' ? 'പൂർണ്ണ മോക്ക് ടെസ്റ്റുകൾ' : 'Full Mock Tests'}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {MOCK_TESTS_DATA.map((mt) => (
                <MockTestCard key={mt.id} exam={mt} onStart={onStartTest} />
              ))}
            </div>
          </div>

          {/* Categorized Mock Tests */}
          {mockData.ids.map(catId => (
            <div key={catId} className="space-y-8">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-2 bg-indigo-600 rounded-full"></div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                  {t(`dashboard.examCategories.${catId}`) || catId}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {mockData.groups[catId].map((exam) => (
                  <MockTestCard key={exam.id} exam={exam} onStart={onStartTest} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MockTestHomePage;

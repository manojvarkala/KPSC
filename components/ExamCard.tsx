
import React from 'react';
import type { Exam } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface ExamCardProps {
  exam: Exam;
  onNavigate: (exam: Exam) => void;
  language: 'ml' | 'en';
  theme?: 'indigo' | 'amber' | 'rose' | 'emerald' | 'cyan';
  syllabusPreview?: string[];
}

const ExamCard: React.FC<ExamCardProps> = ({ exam, onNavigate, language, theme = 'indigo', syllabusPreview = [] }) => {
  const { t } = useTranslation();
  
  const themeGradients = {
    indigo: 'from-indigo-600 to-indigo-800',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-pink-600',
    emerald: 'from-emerald-500 to-teal-600',
    cyan: 'from-cyan-500 to-blue-600'
  };

  const themeBorder = {
    indigo: 'border-indigo-100 dark:border-indigo-900/30',
    amber: 'border-amber-100 dark:border-amber-900/30',
    rose: 'border-rose-100 dark:border-rose-900/30',
    emerald: 'border-emerald-100 dark:border-emerald-900/30',
    cyan: 'border-cyan-100 dark:border-cyan-900/30'
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl hover:shadow-2xl hover:-translate-y-2 transform transition-all duration-500 flex flex-col border-2 ${themeBorder[theme]} relative overflow-hidden group h-full`}>
      {/* Dynamic Gradient Header */}
      <div className={`h-3 w-full bg-gradient-to-r ${themeGradients[theme]}`}></div>
      
      <div className="p-8 flex flex-col h-full">
        <div className="flex items-start space-x-5 mb-6">
          <div className={`p-4 rounded-2xl bg-gradient-to-br ${themeGradients[theme]} text-white shadow-lg group-hover:rotate-6 transition-transform flex-shrink-0`}>
              {exam.icon}
          </div>
          <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 tracking-widest">{exam.level}</span>
                {exam.category && (
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded bg-gradient-to-r ${themeGradients[theme]} text-white tracking-widest opacity-90`}>
                    {t(`dashboard.examCategories.${exam.category}`) || exam.category}
                  </span>
                )}
              </div>
              <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 leading-tight tracking-tight line-clamp-2">{exam.title[language]}</h4>
          </div>
        </div>
        
        <p className="text-slate-500 dark:text-slate-400 text-sm font-bold leading-relaxed line-clamp-2 mb-8 italic opacity-80">"{exam.description[language]}"</p>

        <div className="mt-auto pt-6 border-t border-slate-50 dark:border-slate-800 flex flex-col gap-5">
            {syllabusPreview.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {syllabusPreview.map((item, idx) => (
                        <span key={idx} className="bg-slate-50 dark:bg-slate-800 text-slate-400 text-[8px] font-black px-2 py-0.5 rounded uppercase">
                            {item}
                        </span>
                    ))}
                </div>
            )}
            
            <button 
                onClick={() => onNavigate(exam)}
                className={`w-full text-center text-white font-black py-4 rounded-2xl transition-all active:scale-95 shadow-lg text-[10px] uppercase tracking-[0.2em] bg-gradient-to-r ${themeGradients[theme]} hover:brightness-110`}
            >
                {t('start')}
            </button>
        </div>
      </div>

      {/* Decorative background element */}
      <div className={`absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-br ${themeGradients[theme]} opacity-[0.03] rounded-full`}></div>
    </div>
  );
};

export default ExamCard;

import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { useTranslation } from '../contexts/LanguageContext';

interface PracticeExamsWidgetProps {
  onNavigate: () => void;
}

const PracticeExamsWidget: React.FC<PracticeExamsWidgetProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-lg border border-slate-100 dark:border-slate-800">
      <div className="flex items-center space-x-3 mb-4">
        <SparklesIcon className="h-7 w-7 text-emerald-500" />
        <h4 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">പ്രാക്ടീസ് കോർണർ</h4>
      </div>
      <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mb-4">വിവിധ വിഷയങ്ങളിൽ നിങ്ങളുടെ അറിവ് പരീക്ഷിച്ച് റാങ്കുകളിൽ മുന്നിലെത്തൂ.</p>
      <button 
        onClick={onNavigate} 
        className="w-full text-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-black px-4 py-3 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition duration-200 uppercase tracking-widest text-[10px]"
      >
        പരിശീലനം ആരംഭിക്കുക
      </button>
    </div>
  );
};

export default PracticeExamsWidget;

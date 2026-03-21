
import React from 'react';
import type { Page } from '../types';
import { FacebookIcon } from './icons/FacebookIcon';
import { useTranslation } from '../contexts/LanguageContext';

interface FooterProps {
  onNavigate: (page: Page) => void;
  hitCount?: number;
}

const Footer: React.FC<FooterProps> = ({ onNavigate, hitCount }) => {
  const { t } = useTranslation();

  const footerLinks: { nameKey: string, target: Page }[] = [
    { nameKey: 'footer.about', target: 'about' },
    { nameKey: 'footer.privacy', target: 'privacy' },
    { nameKey: 'footer.terms', target: 'terms' },
    { nameKey: 'footer.disclosure', target: 'disclosure' },
    { nameKey: 'footer.disclaimer', target: 'disclaimer' },
    { nameKey: 'nav.sitemap', target: 'sitemap' },
    { nameKey: 'nav.feedback', target: 'feedback' },
  ];
  
  const annapoornaUrl = 'https://annapoornainfo.com/';
  const facebookUrl = 'https://www.facebook.com/people/Kerala-PSC-Daily-Quiz-Guidance/61577831024012/';

  return (
    <footer className="bg-slate-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <h3 className="font-bold text-lg mb-2">{t('app.title')}</h3>
            <p className="text-slate-400 text-sm">{t('footer.tagline')}</p>
             <div className="mt-4">
                <p className="font-semibold text-sm">Powered by Annapoorna Exam App</p>
                <a 
                  href={annapoornaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 hover:text-white transition"
                >
                  An Annapoorna infotech venture
                </a>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2">{t('footer.linksTitle')}</h3>
            <ul className="space-y-2">
              {footerLinks.map(link => (
                <li key={link.nameKey}>
                  <button onClick={() => onNavigate(link.target)} className="text-slate-300 hover:text-white text-sm transition">
                    {t(link.nameKey) || link.nameKey.replace('footer.', '')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2">{t('footer.socialTitle')}</h3>
            <a 
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-slate-300 hover:text-white transition"
            >
              <FacebookIcon className="h-5 w-5" />
              <span>Facebook</span>
            </a>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-700 pt-6 text-center flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} {t('app.title')} | {t('footer.copyright')}
            </p>
            {hitCount !== undefined && (
              <div className="flex items-center space-x-2 bg-slate-900/50 px-4 py-1.5 rounded-full border border-slate-700/50 shadow-inner">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Visitors</span>
                <span className="text-xs font-black text-indigo-400 font-mono tracking-tighter">
                  {String(hitCount).padStart(6, '0')}
                </span>
              </div>
            )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;

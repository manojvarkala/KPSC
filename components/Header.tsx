
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SignInButton, UserButton, useUser } from '@clerk/clerk-react';
import { NAV_STRUCTURE } from '../constants';
import { LogoIcon } from './icons/LogoIcon';
import type { Page, NavLink, SubscriptionData } from '../types';
import AiBadge from './AiBadge';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { Bars3Icon } from './icons/Bars3Icon';
import { XMarkIcon } from './icons/XMarkIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { LockOpenIcon } from './icons/LockOpenIcon';
import { subscriptionService } from '../services/subscriptionService';
import { getSettings } from '../services/pscDataService';

interface HeaderProps {
    onNavigate: (page: Page) => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const { t, language, setLanguage } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isSubActive, setIsSubActive] = useState(true);
  const [isFreePro, setIsFreePro] = useState(false);
  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  
  const { isLoaded, isSignedIn, user } = useUser();
  const navRef = useRef<HTMLElement>(null);
  
  const isAdmin = useMemo(() => {
    return user?.publicMetadata?.role === 'admin';
  }, [user]);

  useEffect(() => {
    const refreshSettings = () => {
        getSettings().then(s => {
            if (s) {
                if (s.subscription_model_active !== undefined) {
                    setIsSubActive(String(s.subscription_model_active) === 'true');
                }
                if (s.free_pro_mode !== undefined) {
                    setIsFreePro(String(s.free_pro_mode) === 'true');
                }
            }
        }).catch(() => {
            setIsSubActive(true);
            setIsFreePro(false);
        });
    };

    refreshSettings();
    window.addEventListener('settings_updated', refreshSettings);
    return () => window.removeEventListener('settings_updated', refreshSettings);
  }, [isSignedIn]);

  useEffect(() => {
    const fetchSub = async () => {
        if (isSignedIn && user?.id) {
          const data = await subscriptionService.getSubscriptionData(user.id);
          setSubData(data);
        } else {
          setSubData(null);
        }
    };
    
    if (isLoaded) {
        fetchSub();
    }
    
    window.addEventListener('subscription_updated', fetchSub);
    return () => window.removeEventListener('subscription_updated', fetchSub);
  }, [user, isSignedIn, isLoaded]);

  const daysRemaining = useMemo(() => {
    if (!subData?.expiryDate || subData.status !== 'pro') return null;
    const expiry = new Date(subData.expiryDate);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [subData]);

  const toggleLanguage = () => {
    setLanguage(language === 'ml' ? 'en' : 'ml');
  };
  
  const handleNavClick = (page: Page) => {
    onNavigate(page);
    setTimeout(() => {
        setOpenDropdown(null);
        setIsMenuOpen(false);
    }, 50);
  }
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const adminButtonClasses = "flex items-center space-x-2 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-black transition duration-200 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-800";

  const renderAuthControls = () => {
    if (!isLoaded) {
      return <div className="h-10 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse"></div>;
    }

    const isPro = subData?.status === 'pro' || !isSubActive || isFreePro;

    if (isSignedIn) {
      return (
        <div className="flex items-center space-x-4">
          {isPro ? (
              <div className="hidden lg:flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
                  <LockOpenIcon className="h-4 w-4 text-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{!isSubActive ? 'Free Pro Access' : 'Pro Member'}</span>
              </div>
          ) : isSubActive && (
            <button 
                onClick={() => handleNavClick('upgrade')}
                className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-white font-black px-5 py-2.5 rounded-xl shadow-[0_10px_20px_rgba(245,158,11,0.3)] hover:scale-105 transition-all text-[11px] border border-white/20 uppercase tracking-widest"
            >
                <SparklesIcon className="h-4 w-4" />
                <span className="drop-shadow-sm">{t('goPro')}</span>
            </button>
          )}
          <UserButton afterSignOutUrl="/" />
        </div>
      );
    }

    return (
      <SignInButton mode="modal">
        <button className="bg-indigo-600 text-white font-black px-8 py-3 rounded-xl shadow-xl hover:bg-indigo-700 transition duration-300 whitespace-nowrap active:scale-95 text-xs uppercase tracking-widest">
          {t('login')}
        </button>
      </SignInButton>
    );
  };

  return (
    <div className="flex flex-col w-full sticky top-0 z-50">
      {/* Global Pro Free Banner */}
      {(!isSubActive || isFreePro) && (
          <div className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 text-white py-2.5 px-4 text-center animate-fade-in flex items-center justify-center space-x-4 shadow-xl border-b border-white/10">
              <SparklesIcon className="h-4 w-4 text-emerald-200 animate-pulse hidden sm:block" />
              <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.15em] drop-shadow-sm">
                  പരിമിത കാലത്തേക്ക് എല്ലാ പ്രോ ഫീച്ചറുകളും <span className="bg-white text-emerald-600 px-2 py-0.5 rounded ml-1">സൗജന്യം!</span>
              </p>
              <SparklesIcon className="h-4 w-4 text-emerald-200 animate-pulse hidden sm:block" />
          </div>
      )}

      {/* Expiry Warning Banner (Only show if not in global free mode) */}
      {isSubActive && daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0 && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white py-2 px-4 text-center animate-fade-in flex items-center justify-center space-x-4 shadow-lg overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-full opacity-10"><SparklesIcon className="w-full h-full" /></div>
              <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.1em] drop-shadow-sm">
                 Pro Access expires in <span className="underline decoration-2 underline-offset-2 font-black">{daysRemaining} days</span>. 
                 <span className="hidden sm:inline"> Renew now!</span>
              </p>
              <button 
                onClick={() => handleNavClick('upgrade')}
                className="bg-white text-orange-600 px-4 py-1 rounded-full font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all active:scale-95"
              >
                  Renew
              </button>
          </div>
      )}

      <header className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 shadow-xl transition-all duration-500">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* Logo & Branding */}
            <div className="flex items-center space-x-4 cursor-pointer group" onClick={() => handleNavClick('dashboard')}>
              <div className="relative">
                <LogoIcon className="h-12 w-12 md:h-14 md:w-14 transition-transform group-hover:scale-110 drop-shadow-md" variant={theme === 'dark' ? 'dark' : 'transparent'} />
                <div className="absolute -inset-1 bg-indigo-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center">
                  <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">{t('app.title')}</h1>
                  <AiBadge />
                </div>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1.5">{t('app.subtitle')}</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav ref={navRef} className="hidden lg:flex items-center space-x-8">
              {NAV_STRUCTURE.map((link: NavLink) => (
                <div key={link.nameKey} className="relative group/nav">
                  {link.children ? (
                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(openDropdown === link.nameKey ? null : link.nameKey);
                      }}
                      className={`flex items-center space-x-1 font-black text-[11px] uppercase tracking-[0.1em] transition duration-200 ${openDropdown === link.nameKey ? 'text-indigo-600' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600'}`}
                    >
                      <span>{t(link.nameKey)}</span>
                      <ChevronDownIcon className={`h-3 w-3 transition-transform duration-300 ${openDropdown === link.nameKey ? 'rotate-180' : ''}`} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => link.target && handleNavClick(link.target as Page)} 
                      className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 font-black text-[11px] uppercase tracking-[0.1em] transition duration-200"
                    >
                      {t(link.nameKey)}
                    </button>
                  )}

                  {/* Dropdown Menu */}
                  {link.children && openDropdown === link.nameKey && (
                    <div className="absolute top-full left-0 mt-4 w-64 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl p-3 animate-fade-in-up z-50 ring-1 ring-black/5">
                      {link.children.map((child: NavLink) => (
                        <button
                          key={child.nameKey}
                          onClick={() => child.target && handleNavClick(child.target as Page)}
                          className="w-full text-left px-5 py-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-black text-10px uppercase tracking-widest transition-all"
                        >
                          {t(child.nameKey)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isSubActive && (
                <button 
                    onClick={() => handleNavClick('upgrade')} 
                    className="text-amber-600 dark:text-amber-400 hover:text-amber-700 font-black text-[11px] uppercase tracking-[0.1em] transition duration-200"
                >
                    {t('nav.pricing')}
                </button>
              )}
              {isAdmin && (
                  <button onClick={() => handleNavClick('admin_panel')} className={adminButtonClasses}>
                      <ShieldCheckIcon className="h-4 w-4" />
                      <span className="text-[10px] uppercase tracking-widest">Admin</span>
                  </button>
              )}
            </nav>

            {/* Controls & Mobile Toggle */}
            <div className="flex items-center space-x-3">
              <button 
                onClick={toggleTheme} 
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-inner border border-slate-100 dark:border-slate-800"
              >
                {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
              </button>
              <button onClick={toggleLanguage} className="hidden md:block text-slate-500 font-black px-4 py-2.5 rounded-xl text-[9px] border border-slate-100 dark:border-slate-800 hover:bg-slate-50 transition-colors uppercase tracking-widest">
                {language === 'ml' ? 'ENGLISH' : 'മലയാളം'}
              </button>
              {renderAuthControls()}
              
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-500"
              >
                {isMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 animate-fade-in px-6 pb-12 overflow-y-auto max-h-[85vh] shadow-2xl">
            <div className="flex flex-col space-y-2 mt-6">
              {subData?.status !== 'pro' && isSubActive && isSignedIn && (
                  <button 
                      onClick={() => handleNavClick('upgrade')}
                      className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black py-5 rounded-2xl shadow-xl mb-6 text-center uppercase tracking-[0.2em] text-xs"
                  >
                      {t('goPro')}
                  </button>
              )}
              {NAV_STRUCTURE.map((link: NavLink) => (
                <div key={link.nameKey} className="flex flex-col">
                  {link.children ? (
                    <>
                      <div className="px-4 py-4 text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] border-b dark:border-slate-800 mb-2 mt-6">
                        {t(link.nameKey)}
                      </div>
                      {link.children.map((child: NavLink) => (
                        <button
                          key={child.nameKey}
                          onClick={() => child.target && handleNavClick(child.target as Page)}
                          className="w-full text-left px-6 py-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-black text-sm uppercase tracking-widest"
                        >
                          {t(child.nameKey)}
                        </button>
                      ))}
                    </>
                  ) : (
                    <button 
                      onClick={() => link.target && handleNavClick(link.target as Page)} 
                      className="w-full text-left px-4 py-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-black text-sm uppercase tracking-widest"
                    >
                      {t(link.nameKey)}
                    </button>
                  )}
                </div>
              ))}
              {isSubActive && (
                <button onClick={() => handleNavClick('upgrade')} className="w-full text-left px-4 py-4 rounded-2xl text-amber-600 font-black text-sm uppercase tracking-widest mt-4">
                  {t('nav.pricing')}
                </button>
              )}
              {isAdmin && (
                 <button onClick={() => handleNavClick('admin_panel')} className="w-full text-left px-4 py-5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 font-black text-sm uppercase tracking-widest mt-6">
                    ADMIN PANEL
                 </button>
              )}
              <button onClick={toggleLanguage} className="w-full text-left px-4 py-5 rounded-2xl text-slate-400 font-black text-[10px] uppercase tracking-widest mt-4 border-t dark:border-slate-800">
                Switch to {language === 'ml' ? 'English' : 'Malayalam'}
              </button>
            </div>
          </div>
        )}
      </header>
    </div>
  );
};

export default Header;

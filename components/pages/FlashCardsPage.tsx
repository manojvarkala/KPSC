
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { FlashCard } from '../../types';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { useTranslation } from '../../contexts/LanguageContext';
import { SparklesIcon } from '../icons/SparklesIcon';
import AiDisclaimer from '../AiDisclaimer';

const Card: React.FC<{ card: FlashCard }> = ({ card }) => {
    const [flipped, setFlipped] = useState(false);
    return (
        <div className="perspective-1000 h-96 w-full max-w-2xl mx-auto cursor-pointer group" onClick={() => setFlipped(!flipped)}>
            <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${flipped ? 'rotate-y-180' : ''}`}>
                {/* Front of the card (Book Cover) */}
                <div className="absolute inset-0 backface-hidden bg-[#fdfbf7] dark:bg-slate-900 rounded-r-3xl rounded-l-md shadow-[10px_10px_30px_rgba(0,0,0,0.1),-5px_0_15px_rgba(0,0,0,0.05)] border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-10 text-center before:absolute before:inset-y-0 before:left-0 before:w-8 before:bg-gradient-to-r before:from-black/10 before:to-transparent before:rounded-l-md">
                    <div className="absolute top-0 bottom-0 left-6 w-[1px] bg-black/5"></div>
                    <div className="absolute top-0 bottom-0 left-8 w-[1px] bg-black/5"></div>
                    <div className="bg-rose-50 dark:bg-rose-900/30 px-6 py-2 rounded-full mb-8 shadow-sm border border-rose-100 dark:border-rose-800/50">
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{card.topic}</p>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 leading-snug font-serif">{card.front}</h3>
                    <div className="mt-12 flex items-center space-x-2 text-slate-400 group-hover:text-rose-500 transition-colors">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Open to Reveal</span>
                        <ChevronLeftIcon className="h-4 w-4 rotate-180" />
                    </div>
                </div>
                
                {/* Back of the card (Inside Book) */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#fdfbf7] dark:bg-slate-900 rounded-l-3xl rounded-r-md shadow-[-10px_10px_30px_rgba(0,0,0,0.1),5px_0_15px_rgba(0,0,0,0.05)] border border-slate-200 dark:border-slate-800 flex flex-col p-8 md:p-12 text-left overflow-y-auto scrollbar-hide before:absolute before:inset-y-0 before:right-0 before:w-8 before:bg-gradient-to-l before:from-black/10 before:to-transparent before:rounded-r-md">
                    <div className="absolute top-0 bottom-0 right-6 w-[1px] bg-black/5"></div>
                    <div className="absolute top-0 bottom-0 right-8 w-[1px] bg-black/5"></div>
                    
                    <div className="relative z-10 h-full flex flex-col">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="h-8 w-1.5 bg-emerald-500 rounded-full"></div>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-relaxed font-serif">{card.back}</h3>
                        </div>
                        
                        {card.explanation && (
                            <div className="flex-1 mt-4">
                                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-3 text-slate-500">Explanation</p>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800 shadow-inner">
                                    {card.explanation}
                                </div>
                            </div>
                        )}
                        
                        <div className="mt-auto pt-6 flex justify-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center space-x-2">
                                <ChevronLeftIcon className="h-3 w-3" />
                                <span>Close</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FlashCardsPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { t } = useTranslation();
    const [cards, setCards] = useState<FlashCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [activeTopic, setActiveTopic] = useState('All');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [viewMode, setViewMode] = useState<'flipbook' | 'grid'>('flipbook');
    
    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback((node: HTMLDivElement | null) => {
        if (loading || loadingMore || activeTopic !== 'All' || viewMode === 'flipbook') return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setOffset(prev => prev + 20);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore, activeTopic, viewMode]);

    const fetchCards = useCallback(async (currentOffset: number) => {
        if (currentOffset === 0) setLoading(true);
        else setLoadingMore(true);
        
        try {
            const res = await fetch(`/api/data?type=flash_cards&offset=${currentOffset}&limit=20`);
            const data = await res.json();
            if (Array.isArray(data)) {
                if (data.length < 20) setHasMore(false);
                setCards(prev => currentOffset === 0 ? data : [...prev, ...data]);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); setLoadingMore(false); }
    }, []);

    useEffect(() => { fetchCards(offset); }, [offset, fetchCards]);

    const topics = useMemo(() => ['All', ...Array.from(new Set(cards.map(c => c.topic)))], [cards]);
    const filtered = useMemo(() => activeTopic === 'All' ? cards : cards.filter(c => c.topic === activeTopic), [cards, activeTopic]);

    const nextCard = () => {
        if (currentIndex < filtered.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else if (hasMore && activeTopic === 'All') {
            setOffset(prev => prev + 20);
        }
    };

    const prevCard = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    return (
        <div className="animate-fade-in pb-20 max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
                <button onClick={onBack} className="flex items-center space-x-2 text-indigo-600 font-black hover:underline group">
                    <ChevronLeftIcon className="h-5 w-5 transform group-hover:-translate-x-1 transition-transform" />
                    <span>{t('backToDashboard')}</span>
                </button>
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <button 
                        onClick={() => setViewMode('flipbook')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'flipbook' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                    >
                        Flipbook
                    </button>
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                    >
                        Grid
                    </button>
                </div>
            </div>

            <header className="mb-16 flex flex-col lg:flex-row lg:items-end justify-between gap-10">
                <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-indigo-600">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl"><SparklesIcon className="h-6 w-6" /></div>
                        <span className="font-black tracking-[0.2em] uppercase text-[10px]">Active Recall Method</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">{t('flashCards.title')}</h1>
                    <p className="text-xl text-slate-500 font-medium max-w-2xl">{t('flashCards.subtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {topics.map(topic => (
                        <button key={topic} onClick={() => { setActiveTopic(topic); setCurrentIndex(0); }} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTopic === topic ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-400'}`}>{topic}</button>
                    ))}
                </div>
            </header>

            <AiDisclaimer className="mb-12" />

            {filtered.length > 0 ? (
                viewMode === 'flipbook' ? (
                    <div className="max-w-2xl mx-auto space-y-10">
                        <div className="flex items-center justify-between px-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Card {currentIndex + 1} of {filtered.length}</span>
                            <div className="h-1 flex-1 mx-8 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${((currentIndex + 1) / filtered.length) * 100}%` }}></div>
                            </div>
                        </div>
                        
                        <div className="relative px-12 md:px-24">
                            <Card card={filtered[currentIndex]} key={filtered[currentIndex].id} />
                            
                            <div className="absolute top-1/2 left-0 -translate-y-1/2 z-10">
                                <button 
                                    onClick={prevCard}
                                    disabled={currentIndex === 0}
                                    className={`p-3 md:p-4 rounded-full shadow-xl transition-all ${currentIndex === 0 ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-white dark:bg-slate-800 text-rose-600 hover:scale-110 active:scale-95 border border-slate-100 dark:border-slate-700'}`}
                                >
                                    <ChevronLeftIcon className="h-6 w-6 md:h-8 md:w-8" />
                                </button>
                            </div>
                            
                            <div className="absolute top-1/2 right-0 -translate-y-1/2 z-10">
                                <button 
                                    onClick={nextCard}
                                    disabled={currentIndex === filtered.length - 1 && !hasMore}
                                    className={`p-3 md:p-4 rounded-full shadow-xl transition-all ${currentIndex === filtered.length - 1 && !hasMore ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-white dark:bg-slate-800 text-rose-600 hover:scale-110 active:scale-95 border border-slate-100 dark:border-slate-700'}`}
                                >
                                    <div className="rotate-180"><ChevronLeftIcon className="h-6 w-6 md:h-8 md:w-8" /></div>
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-center space-x-4">
                            <button onClick={() => setCurrentIndex(Math.floor(Math.random() * filtered.length))} className="px-8 py-4 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all">Shuffle</button>
                            <button onClick={() => setCurrentIndex(0)} className="px-8 py-4 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all">Reset</button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filtered.map((card, idx) => <Card key={card.id || idx} card={card} />)}
                    </div>
                )
            ) : !loading && (
                <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800 shadow-inner">
                    <p className="text-slate-400 font-black text-2xl tracking-tight">{t('flashCards.noCards')}</p>
                </div>
            )}

            {loadingMore && (
                <div className="py-10 text-center flex justify-center">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            
            <div ref={lastElementRef} className="h-10"></div>
            
            {loading && cards.length === 0 && (
                <div className="py-24 text-center">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
            )}

            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default FlashCardsPage;

import React, { useState, useEffect } from 'react';
import { getNotifications, getGKFacts } from '../services/pscDataService'; // GK ഫാക്ട്സ് എടുക്കാൻ പുതിയ സർവീസ്
import type { Notification, GKFact } from '../types';
import { MegaphoneIcon } from './icons/MegaphoneIcon';
import { LightBulbIcon } from './icons/LightBulbIcon'; // GK-യ്ക്ക് അനുയോജ്യമായ ഐക്കൺ

const NewsTicker: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [gkFacts, setGkFacts] = useState<GKFact[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // നോട്ടിഫിക്കേഷനും GK ഫാക്ട്സും ഒരേസമയം എടുക്കുന്നു
                const [notifData, gkData] = await Promise.all([
                    getNotifications(),
                    getGKFacts() 
                ]);
                
                setNotifications(notifData.slice(0, 8)); // കൂടുതൽ ഐറ്റംസ് സ്മൂത്ത് ലൂപ്പിന് നല്ലതാണ്
                setGkFacts(gkData.slice(0, 8));
            } catch (err) {
                console.error("Failed to load ticker data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading || (notifications.length === 0 && gkFacts.length === 0)) {
        return loading ? (
            <div className="bg-slate-900 p-3 rounded-lg text-center text-sm text-slate-400 animate-pulse">
                Loading latest updates...
            </div>
        ) : null;
    }

    return (
        <section className="bg-slate-900 text-white rounded-xl shadow-lg overflow-hidden border border-slate-700">
            {/* ഒന്നാമത്തെ വരി: PSC നോട്ടിഫിക്കേഷൻ */}
            <div className="flex items-center border-b border-slate-800">
                <div className="z-10 bg-red-600 font-bold px-3 py-1 flex items-center shadow-lg text-xs uppercase tracking-wider min-w-[120px]">
                    <MegaphoneIcon className="h-4 w-4 mr-1" />
                    <span>PSC News</span>
                </div>
                <div className="ticker-wrap h-8">
                    <div className="ticker-move">
                        {[...notifications, ...notifications].map((item, index) => (
                            <a 
                                href={`#external_viewer?url=${encodeURIComponent(item.link)}`} 
                                key={`notif-${item.id}-${index}`} 
                                className="mx-8 text-slate-200 hover:text-red-400 text-sm font-medium whitespace-nowrap inline-block"
                            >
                               <span className="text-red-500 mr-2">•</span>
                               {item.title} (Cat: {item.categoryNumber})
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            {/* രണ്ടാമത്തെ വരി: GK ഫാക്ട്സ് */}
            <div className="flex items-center bg-slate-800/50">
                <div className="z-10 bg-blue-600 font-bold px-3 py-1 flex items-center shadow-lg text-xs uppercase tracking-wider min-w-[120px]">
                    <LightBulbIcon className="h-4 w-4 mr-1" />
                    <span>GK Facts</span>
                </div>
                <div className="ticker-wrap h-8">
                    <div className="ticker-move-reverse"> {/* ഇത് വിപരീത ദിശയിൽ സ്ക്രോൾ ചെയ്യും */}
                        {[...gkFacts, ...gkFacts].map((item, index) => (
                            <div 
                                key={`gk-${index}`} 
                                className="mx-8 text-slate-300 text-sm italic whitespace-nowrap inline-block"
                            >
                               <span className="text-blue-400 mr-2">★</span>
                               {item.fact} 
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default NewsTicker;
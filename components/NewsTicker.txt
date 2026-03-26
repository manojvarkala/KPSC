
import React, { useState, useEffect } from 'react';
import { getNotifications } from '../services/pscDataService';
import type { Notification } from '../types';
import { MegaphoneIcon } from './icons/MegaphoneIcon';

const NewsTicker: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const data = await getNotifications();
                setNotifications(data.slice(0, 5)); 
            } catch (err) {
                console.error("Failed to load notifications for ticker:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    if (loading) {
        return (
            <div className="bg-slate-800 p-3 rounded-lg text-center text-sm text-slate-400 animate-pulse">
                Loading latest news...
            </div>
        );
    }
    
    if (notifications.length === 0) {
        return null;
    }

    // Duplicate content to create a seamless loop
    const tickerContent = [...notifications, ...notifications];

    return (
        <section className="bg-slate-800 text-white p-2 rounded-xl shadow-md flex items-center space-x-2 ticker-content">
            <div className="flex-shrink-0 bg-red-600 font-bold px-3 py-1.5 rounded-md flex items-center">
                <MegaphoneIcon className="h-5 w-5 mr-2" />
                <span>Latest News</span>
            </div>
            <div className="ticker-wrap">
                <div className="ticker-move">
                    {tickerContent.map((item, index) => (
                        <a 
                            href={`#external_viewer?url=${encodeURIComponent(item.link)}`} 
                            key={`${item.id}-${index}`} 
                            className="mx-6 text-slate-200 hover:text-white font-medium transition-colors whitespace-nowrap"
                        >
                           <span className="font-semibold">{item.title}</span> (Cat No: {item.categoryNumber}) - Last Date: {item.lastDate}
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default NewsTicker;

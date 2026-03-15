
import type { Exam, PracticeTest, FeedbackData, QuizQuestion, FlashCard } from '../types';
import { 
    EXAMS_DATA, 
    EXAM_CONTENT_MAP, 
    MOCK_NOTIFICATIONS, 
    MOCK_PSC_UPDATES, 
    MOCK_CURRENT_AFFAIRS, 
    MOCK_GK, 
    MOCK_BOOKS_DATA, 
    MOCK_QUESTION_BANK,
    MOCK_FLASHCARDS
} from '../constants';
import React from 'react';
import { BookOpenIcon } from '../components/icons/BookOpenIcon';
import { ShieldCheckIcon } from '../components/icons/ShieldCheckIcon';
import { AcademicCapIcon } from '../components/icons/AcademicCapIcon';
import { BeakerIcon } from '../components/icons/BeakerIcon';
import { LightBulbIcon } from '../components/icons/LightBulbIcon';
import { StarIcon } from '../components/icons/StarIcon';
import { GlobeAltIcon } from '../components/icons/GlobeAltIcon';

let isFetchingExams = false;

const getIcon = (type: string) => {
    const icons: Record<string, any> = {
        'book': BookOpenIcon, 'shield': ShieldCheckIcon, 'cap': AcademicCapIcon,
        'beaker': BeakerIcon, 'light': LightBulbIcon, 'star': StarIcon, 'globe': GlobeAltIcon
    };
    const IconComp = icons[String(type || 'book').toLowerCase()] || BookOpenIcon;
    return React.createElement(IconComp, { className: "h-8 w-8 text-indigo-500" });
};

const fetchWithTimeout = async (url: string, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (e) { 
        clearTimeout(id); 
        console.warn(`Fetch timeout/error for ${url}:`, e);
        throw e; 
    }
};

export const getExams = async (): Promise<{ exams: Exam[], source: 'database' | 'static' }> => {
    if (isFetchingExams) return { exams: EXAMS_DATA, source: 'static' };
    isFetchingExams = true;
    try {
        const res = await fetchWithTimeout('/api/data?type=exams');
        if (res.ok) {
            const raw = await res.json();
            if (Array.isArray(raw) && raw.length > 0) {
                const formatted = raw.map((e: any) => ({
                    id: String(e.id || e.ID).trim().toLowerCase(),
                    title: { ml: e.title_ml || 'PSC Exam', en: e.title_en || 'PSC Exam' },
                    description: { ml: e.description_ml || '', en: e.description_en || '' },
                    category: e.category || 'General',
                    level: e.level || 'Preliminary',
                    icon: getIcon(e.icon_type)
                }));
                isFetchingExams = false;
                return { exams: formatted, source: 'database' };
            }
        }
    } catch (e) { console.error("Exams fetch failed:", e); }
    isFetchingExams = false;
    return { exams: EXAMS_DATA, source: 'static' };
};

export const getFlashCards = async (): Promise<FlashCard[]> => {
    try {
        const res = await fetchWithTimeout('/api/data?type=flash_cards', 4000);
        if (res.ok) {
            const data = await res.json();
            return (Array.isArray(data) && data.length > 0) ? data : MOCK_FLASHCARDS;
        }
    } catch (e) {}
    return MOCK_FLASHCARDS;
};

export const getExamSyllabus = async (examId: string): Promise<PracticeTest[]> => {
    const cleanId = String(examId).trim().toLowerCase();
    const fallback = EXAM_CONTENT_MAP[cleanId]?.practiceTests || EXAM_CONTENT_MAP['10th_level']?.practiceTests || [];
    try {
        const res = await fetchWithTimeout(`/api/data?type=syllabus&examId=${cleanId}`);
        if (res.ok) {
            const data = await res.json();
            return Array.isArray(data) && data.length > 0 ? data : fallback;
        }
    } catch (e) {}
    return fallback;
};

export const getSettings = async () => {
    try {
        const res = await fetchWithTimeout('/api/data?type=settings', 2000);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                // Reduce array of {key, value} into a single object
                return data.reduce((acc: any, curr: any) => {
                    acc[curr.key] = curr.value;
                    return acc;
                }, {});
            }
            return data;
        }
    } catch (e) {}
    return { subscription_model_active: 'true', paypal_client_id: 'sb' };
};

export const getSubscriptions = async () => {
    try {
        const res = await fetchWithTimeout('/api/data?type=subscriptions', 3000);
        if (res.ok) return await res.json();
    } catch (e) {}
    return [];
};

export const getQuestionsForTest = async (subject: string, topic: string, count: number): Promise<QuizQuestion[]> => {
    const fallback = MOCK_QUESTION_BANK.slice(0, count || 20);
    try {
        const res = await fetchWithTimeout(`/api/data?type=questions&subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}&count=${count}`, 8000);
        if (res.ok) {
            const data = await res.json();
            return (Array.isArray(data) && data.length > 0) ? data : fallback;
        }
    } catch (e) {}
    return fallback;
};

const fetchHub = async <T>(params: string, mockData: T): Promise<T> => {
    try {
        const res = await fetchWithTimeout(`/api/data?${params}`);
        if (!res.ok) return mockData;
        const data = await res.json();
        return (data && (!Array.isArray(data) || (Array.isArray(data) && data.length > 0))) ? data : mockData;
    } catch (e) { return mockData; }
};

export const getNotifications = () => fetchHub('type=notifications', MOCK_NOTIFICATIONS);
export const getLiveUpdates = () => fetchHub('type=updates', MOCK_PSC_UPDATES);
export const getCurrentAffairs = () => fetchHub('type=affairs', MOCK_CURRENT_AFFAIRS);
export const getGk = () => fetchHub('type=gk', MOCK_GK);
export const getBooks = () => fetchHub('type=books', MOCK_BOOKS_DATA);

export const submitFeedback = (feedbackData: FeedbackData) => fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'submit-feedback', feedback: feedbackData })
});

export const saveTestResult = (resultData: any) => fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save-result', resultData })
});

export const testConnection = async (token: string | null) => {
    try {
        // Try POST first
        let res = await fetch('/api/admin?action=test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ action: 'test-connection' })
        });
        
        // If POST fails, try GET as a fallback (more resilient to body parsing issues)
        if (!res.ok) {
            res = await fetch('/api/admin?action=test-connection', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }

        if (!res.ok) {
            const errorText = await res.text();
            return { status: { sheets: false, supabase: false, sheetsErr: errorText, supabaseErr: errorText } };
        }
        return await res.json();
    } catch (e: any) {
        return { status: { sheets: false, supabase: false, sheetsErr: e.message, supabaseErr: e.message } };
    }
};

export const clearStudyCache = (token: string | null) => fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ action: 'clear-study-cache' })
});

export const updateSetting = async (key: string, value: string, token: string | null) => {
    const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'update-setting', setting: { key, value } })
    });
    return res.json();
};

export const getStudyMaterial = async (topic: string): Promise<{ notes: string }> => {
    const res = await fetch('/api/study-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
    });
    return res.json();
};

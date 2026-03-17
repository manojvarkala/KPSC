
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { 
    getExams,
    testConnection,
    getExamSyllabus,
    getSubscriptions,
    getBooks,
    getSettings
} from '../../services/pscDataService';
import { TrashIcon } from '../icons/TrashIcon';
import { BookOpenIcon } from '../icons/BookOpenIcon';
import { AcademicCapIcon } from '../icons/AcademicCapIcon';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { XMarkIcon } from '../icons/XMarkIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { BeakerIcon } from '../icons/BeakerIcon';
import { LightBulbIcon } from '../icons/LightBulbIcon';
import { PencilSquareIcon } from '../icons/PencilSquareIcon';
import { Cog6ToothIcon } from '../icons/Cog6ToothIcon';
import { LanguageIcon } from '../icons/LanguageIcon';
import { TagIcon } from '../icons/TagIcon';
import { CloudArrowUpIcon } from '../icons/CloudArrowUpIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import type { Exam, PracticeTest, Book } from '../../types';

type AdminTab = 'automation' | 'qbank' | 'exams' | 'syllabus' | 'books' | 'users' | 'settings';

interface AuditReport {
    syllabusReport: { id: string; topic: string; count: number }[];
    totalQuestions: number;
    unclassifiedCount: number;
    normalizationTodoCount?: number;
    repairTodoCount?: number;
    questionSubjectMismatches?: number;
    subjectMismatches: string[];
    unapprovedTopics?: string[];
    lastAuditedId?: number;
    approvedSubjects: string[];
}

const AdminPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { getToken } = useAuth();
    const { user, isLoaded: userLoaded } = useUser();
    const [activeTab, setActiveTab] = useState<AdminTab>('automation');
    const [exams, setExams] = useState<Exam[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [dbStatus, setDbStatus] = useState({sheets: false, supabase: false, sheetsErr: null, supabaseErr: null});
    const [status, setStatus] = useState<string | null>(null);
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isProcessingAll, setIsProcessingAll] = useState(false);
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [syllabusItems, setSyllabusItems] = useState<PracticeTest[]>([]);
    const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
    const [settings, setSettings] = useState<Record<string, string>>({});
    
    const updateSetting = async (key: string, value: string) => {
        try {
            await handleAction('update-setting', { setting: { key, value } });
            setSettings(prev => ({ ...prev, [key]: value }));
        } catch (err) { console.error("Failed to update setting:", err); }
    };

    const [editingExam, setEditingExam] = useState<any | null>(null);
    const [editingBook, setEditingBook] = useState<any | null>(null);

    const totalGaps = useMemo(() => auditReport?.syllabusReport.filter(r => r.count === 0).length || 0, [auditReport]);
    const totalClassified = useMemo(() => auditReport?.syllabusReport.reduce((acc, curr) => acc + curr.count, 0) || 0, [auditReport]);
    const totalQuestions = useMemo(() => auditReport?.totalQuestions || 0, [auditReport]);
    const totalUnclassified = useMemo(() => {
        if (!auditReport) return 0;
        // Unclassified is Total - Classified
        return Math.max(0, totalQuestions - totalClassified);
    }, [totalQuestions, totalClassified, auditReport]);

    const isAdmin = useMemo(() => user?.publicMetadata?.role === 'admin', [user]);

    const refreshData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        const token = await getToken();
        try {
            const conn = await testConnection(token);
            if (conn && conn.status) setDbStatus(conn.status);
            
            // Only try to fetch full data if connection is at least partially online
            if (conn?.status?.sheets || conn?.status?.supabase) {
                const [examRes, subs, bks, s] = await Promise.all([getExams(), getSubscriptions(), getBooks(), getSettings()]);
                setExams(examRes.exams || []);
                setSubscriptions(subs || []);
                setBooks(bks || []);
                if (s) setSettings(s);
                
                if (activeTab === 'qbank') {
                    const report = await adminOp('get-audit-report');
                    setAuditReport(report);
                }
            }
        } catch (e) { console.error("Admin refresh error:", e); } finally { if (!silent) setLoading(false); }
    }, [getToken, activeTab]);

    useEffect(() => { refreshData(); }, [refreshData]);
    
    if (userLoaded && !isAdmin) {
        return (
            <div className="max-w-7xl mx-auto py-20 px-4 text-center animate-fade-in">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheckIcon className="h-10 w-10" />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Access Denied</h2>
                <p className="text-slate-500 mt-4 max-w-md mx-auto font-medium">You do not have administrative privileges to access this panel. Please contact the system administrator if you believe this is an error.</p>
                <button onClick={onBack} className="mt-8 bg-slate-800 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-950 transition-all">Back to Dashboard</button>
            </div>
        );
    }

    useEffect(() => { 
        if (activeTab === 'syllabus' && selectedExamId) {
            getExamSyllabus(selectedExamId).then(items => setSyllabusItems(items));
        }
        if (activeTab === 'qbank' && (dbStatus.sheets || dbStatus.supabase)) {
            adminOp('get-audit-report').then(report => setAuditReport(report)).catch(() => {});
        }
    }, [selectedExamId, activeTab]);

    const adminOp = async (action: string, payload: any = {}) => {
        const token = await getToken();
        const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ action, ...payload })
        });
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt.includes('401') ? "Access Denied: You are not authorized." : txt);
        }
        return await res.json();
    };

    const handleAction = async (action: string, payload: any = {}) => {
        setStatus("Processing operation..."); 
        setIsError(false);
        try {
            const r = await adminOp(action, payload);
            setStatus(r.message || "Action completed successfully.");
            if (['delete-row', 'rebuild-db', 'sync-to-sheets', 'run-daily-sync', 'run-book-scraper', 'update-setting', 'save-row', 'run-batch-qa', 'run-language-repair', 'run-topic-repair', 'run-explanation-repair', 'run-all-gaps', 'run-targeted-gap-fill', 'normalize-topics', 'normalize-subjects', 'repair-options'].includes(action)) {
                await refreshData(true);
            }
        } catch(e:any) { setStatus(e.message); setIsError(true); }
    };

    const handleProcessAll = async (action: 'run-topic-repair' | 'normalize-topics') => {
        if (isProcessingAll) return;
        setIsProcessingAll(true);
        setStatus(`Starting automated ${action === 'run-topic-repair' ? 'Repair' : 'Normalization'}...`);
        setIsError(false);
        
        let continueLoop = true;
        let batchesDone = 0;
        
        while (continueLoop) {
            try {
                const res = await adminOp(action);
                batchesDone++;
                setStatus(`${res.message} (Batch ${batchesDone} completed)`);
                
                if (res.message.includes("No pending") || res.message.includes("failed") || res.message.includes("No questions")) {
                    continueLoop = false;
                } else {
                    // Wait 3 seconds between batches to prevent server hang
                    await new Promise(r => setTimeout(r, 3000));
                    
                    // Refresh report to check remaining
                    const report = await adminOp('get-audit-report');
                    setAuditReport(report);
                    const remaining = action === 'run-topic-repair' ? report.repairTodoCount : report.normalizationTodoCount;
                    
                    if (!remaining || remaining <= 0) {
                        continueLoop = false;
                        setStatus(`Automated ${action === 'run-topic-repair' ? 'Repair' : 'Normalization'} finished. All questions processed.`);
                    }
                }
            } catch (err: any) {
                setStatus(`Error during automated process: ${err.message}`);
                setIsError(true);
                continueLoop = false;
            }
        }
        setIsProcessingAll(false);
        await refreshData(true);
    };

    const ToolCard = ({ title, icon: Icon, action, color, desc }: any) => (
        <div className={`p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group ${color}`}>
            <div className="absolute right-0 top-0 opacity-10 group-hover:scale-110 transition-transform -mr-10 -mt-10"><Icon className="h-48 w-48" /></div>
            <div className="relative z-10">
                <h3 className="text-xl font-black uppercase tracking-tighter">{title}</h3>
                <p className="text-white/70 font-bold mt-2 text-[10px] leading-relaxed max-w-[80%]">{desc}</p>
                <div className="flex gap-2 mt-6">
                    <button onClick={() => handleAction(action)} disabled={isProcessingAll} className="bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all disabled:opacity-50">Run Now</button>
                    {(action === 'run-topic-repair' || action === 'normalize-topics') && (
                        <button 
                            onClick={() => handleProcessAll(action as any)} 
                            disabled={isProcessingAll}
                            className="bg-black/20 text-white border border-white/20 px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:bg-black/40 transition-all disabled:opacity-50"
                        >
                            {isProcessingAll ? 'Processing...' : 'Process All'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-32 px-4 animate-fade-in text-slate-800 dark:text-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="bg-white dark:bg-slate-900 px-6 py-4 rounded-[1.5rem] shadow-xl border border-slate-100 dark:border-slate-800 flex items-center space-x-6">
                    <div className="flex items-center space-x-2 group cursor-help relative">
                        <div className={`w-3 h-3 rounded-full ${dbStatus.sheets ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Sheets: {dbStatus.sheets ? 'ONLINE' : 'OFFLINE'}</span>
                        {!dbStatus.sheets && dbStatus.sheetsErr && (
                            <div className="absolute top-full mt-2 left-0 w-64 bg-slate-800 text-white p-3 rounded-xl text-[10px] z-50 shadow-2xl invisible group-hover:visible border border-white/10">
                                <p className="font-bold text-red-400 mb-1">Reason:</p>
                                {dbStatus.sheetsErr}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center space-x-2 group cursor-help relative">
                        <div className={`w-3 h-3 rounded-full ${dbStatus.supabase ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Supabase: {dbStatus.supabase ? 'ONLINE' : 'OFFLINE'}</span>
                        {!dbStatus.supabase && dbStatus.supabaseErr && (
                            <div className="absolute top-full mt-2 left-0 w-64 bg-slate-800 text-white p-3 rounded-xl text-[10px] z-50 shadow-2xl invisible group-hover:visible border border-white/10">
                                <p className="font-bold text-red-400 mb-1">Reason:</p>
                                {dbStatus.supabaseErr}
                            </div>
                        )}
                    </div>
                    <button onClick={() => refreshData()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-400'}`} /></button>
                </div>
                <button onClick={onBack} className="bg-slate-800 text-white px-8 py-4 rounded-2xl shadow-lg flex items-center space-x-2 font-black text-xs uppercase hover:bg-slate-950 transition-all"><ChevronLeftIcon className="h-4 w-4" /><span>Dashboard</span></button>
            </div>

            {status && (
                <div className={`p-6 rounded-[2rem] border-2 shadow-xl flex items-center justify-between animate-fade-in ${isError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-indigo-50 border-indigo-200 text-indigo-800'}`}>
                    <div className="flex items-center space-x-3">{isError ? <XMarkIcon className="h-5 w-5" /> : <CheckCircleIcon className="h-5 w-5" />}<p className="font-black text-xs uppercase tracking-widest">{status}</p></div>
                    <button onClick={() => setStatus(null)} className="p-2 hover:bg-black/5 rounded-full"><XMarkIcon className="h-5 w-5" /></button>
                </div>
            )}

            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
                {[
                    { id: 'automation', label: 'Automation', icon: BeakerIcon },
                    { id: 'qbank', label: 'Database Audit', icon: ShieldCheckIcon },
                    { id: 'exams', label: 'Exams', icon: AcademicCapIcon },
                    { id: 'syllabus', label: 'Syllabus', icon: PlusIcon },
                    { id: 'books', label: 'Books', icon: BookOpenIcon },
                    { id: 'users', label: 'Users', icon: UserGroupIcon },
                    { id: 'settings', label: 'Settings', icon: Cog6ToothIcon }
                ].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id as AdminTab)} className={`flex items-center space-x-3 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-xl' : 'bg-white dark:bg-slate-900 text-slate-500 border border-transparent hover:border-indigo-500'}`}>
                        <t.icon className="h-4 w-4" /><span>{t.label}</span>
                    </button>
                ))}
            </div>

            <main className="bg-white dark:bg-slate-950 p-8 md:p-12 rounded-[3rem] shadow-2xl border dark:border-slate-800 min-h-[600px] relative overflow-hidden">
                {loading && <div className="absolute inset-0 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}

                {(!dbStatus.sheets && !dbStatus.supabase && !loading) && (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center animate-pulse"><XMarkIcon className="h-10 w-10" /></div>
                        <div>
                            <h3 className="text-2xl font-black uppercase">System Offline</h3>
                            <p className="text-slate-500 font-medium max-w-sm mt-2">Check your Vercel Environment Variables. Hover over the status indicators above for error details.</p>
                        </div>
                    </div>
                )}

                {(dbStatus.sheets || dbStatus.supabase) && (
                    <>
                        {activeTab === 'automation' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <ToolCard title="Full DB Sync" icon={ArrowPathIcon} action="rebuild-db" color="bg-red-600" desc="Synchronizes all records from Google Sheets to Supabase production database." />
                                <ToolCard title="Push to Sheets" icon={CloudArrowUpIcon} action="sync-to-sheets" color="bg-orange-600" desc="Backup Supabase data back to Google Sheets (Emergency Use)." />
                                <ToolCard title="PSC Daily Sync" icon={SparklesIcon} action="run-daily-sync" color="bg-indigo-600" desc="Full cycle sync: Jobs, Live Updates, CA, GK and Gap Filler." />
                                <ToolCard title="Language Repair" icon={LanguageIcon} action="run-language-repair" color="bg-cyan-600" desc="Fixes questions that were accidentally translated to Malayalam instead of English." />
                                <ToolCard title="Topic Repair" icon={TagIcon} action="run-topic-repair" color="bg-violet-600" desc={`AI analysis to fill blank topics and fix subject mismatches. ${auditReport?.repairTodoCount ? `(${auditReport.repairTodoCount} pending)` : ''}`} />
                                <ToolCard title="AI Explanations" icon={SparklesIcon} action="run-explanation-repair" color="bg-emerald-600" desc="AI generation of missing explanations for questions in the database." />
                                <ToolCard title="Book Store Sync" icon={BookOpenIcon} action="run-book-scraper" color="bg-slate-800" desc="Updates bookstore with top Amazon PSC guides." />
                                <ToolCard title="GK Fact Scraper" icon={LightBulbIcon} action="run-gk-scraper" color="bg-amber-500" desc="Generates unique study facts for the daily widget." />
                                <ToolCard title="Flashcard Generator" icon={SparklesIcon} action="run-flashcard-generator" color="bg-rose-600" desc="AI generation of high-quality Malayalam flashcards with explanations." />
                                <ToolCard title="Topic Normalization" icon={TagIcon} action="normalize-topics" color="bg-blue-600" desc={`Maps existing non-syllabus topics to approved syllabus topics. ${auditReport?.normalizationTodoCount ? `(${auditReport.normalizationTodoCount} pending)` : ''}`} />
                                <ToolCard title="Database Cleanup" icon={SparklesIcon} action="clean-database" color="bg-slate-700" desc="Removes trailing whitespace from all topics and subjects in the database to fix matching issues." />
                                <ToolCard title="Rebuild Syllabus" icon={PlusIcon} action="rebuild-syllabus" color="bg-amber-600" desc="Populates the syllabus table with standard PSC topics for all exams. Use this if exams show zero micro-topics." />
                                <ToolCard title="Reconfigure Syllabus" icon={Cog6ToothIcon} action="reconfigure-syllabus" color="bg-indigo-700" desc="Fixes existing syllabus entries that have 0 questions or 0 duration. Adjusts based on Prelims/Mains type." />
                                <ToolCard title="Normalize Subjects" icon={ShieldCheckIcon} action="normalize-subjects" color="bg-teal-600" desc="Standardizes subject names in the question bank to match the approved list (e.g. 'Kerala History' instead of 'History of Kerala')." />
                                <ToolCard title="Repair Options" icon={PencilSquareIcon} action="repair-options" color="bg-purple-600" desc="Fixes double-stringified or improperly formatted question options in the database." />
                            </div>
                        )}

                        {activeTab === 'qbank' && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                                    <div className="bg-orange-50 dark:bg-orange-900/20 p-8 rounded-[2.5rem] border-2 border-orange-100 dark:border-orange-800 shadow-xl flex flex-col justify-between">
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase text-orange-600 tracking-widest mb-2">Sequential Audit</h4>
                                            <p className="text-5xl font-black text-orange-700 dark:text-orange-300">{auditReport?.lastAuditedId || 0}</p>
                                            <p className="text-xs font-bold text-orange-500 mt-2">Current Serial Number (ID) processed</p>
                                        </div>
                                        <button onClick={() => handleAction('run-batch-qa')} className="mt-6 w-full bg-orange-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-orange-700 transition-all text-[10px] uppercase tracking-widest">Audit Next Batch</button>
                                    </div>

                                    <div className="bg-rose-50 dark:bg-rose-900/20 p-8 rounded-[2.5rem] border-2 border-rose-100 dark:border-rose-800 shadow-xl flex flex-col justify-between">
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase text-rose-600 tracking-widest mb-2">Topic Repair</h4>
                                            <p className="text-5xl font-black text-rose-700 dark:text-rose-300">{auditReport?.repairTodoCount || 0}</p>
                                            <p className="text-xs font-bold text-rose-500 mt-2">Questions needing Topic/Subject repair</p>
                                        </div>
                                        <div className="flex flex-col gap-2 mt-6">
                                            <button onClick={() => handleAction('run-topic-repair')} disabled={isProcessingAll} className="w-full bg-rose-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-rose-700 transition-all text-[10px] uppercase tracking-widest disabled:opacity-50">Repair Batch (100)</button>
                                            <button onClick={() => handleProcessAll('run-topic-repair')} disabled={isProcessingAll} className="w-full bg-rose-900 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-rose-950 transition-all text-[10px] uppercase tracking-widest disabled:opacity-50">
                                                {isProcessingAll ? 'Processing...' : 'Repair All (Auto)'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-[2.5rem] border-2 border-indigo-100 dark:border-indigo-800 shadow-xl flex flex-col justify-between">
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-2">Syllabus Gaps</h4>
                                            <p className="text-5xl font-black text-indigo-700 dark:text-indigo-300">{totalGaps}</p>
                                            <p className="text-xs font-bold text-indigo-500 mt-2">Micro-topics with zero questions</p>
                                        </div>
                                        <button onClick={() => handleAction('run-all-gaps')} className="mt-6 w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all text-[10px] uppercase tracking-widest">Auto-Fill Gaps</button>
                                    </div>
                                    
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-8 rounded-[2.5rem] border-2 border-emerald-100 dark:border-emerald-800 shadow-xl flex flex-col justify-between">
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-2">Verified Topics</h4>
                                            <p className="text-5xl font-black text-emerald-700 dark:text-emerald-300">{auditReport?.syllabusReport.length || 0}</p>
                                            <p className="text-xs font-bold text-emerald-500 mt-2">Unique micro-topics in syllabus</p>
                                        </div>
                                        <button onClick={() => refreshData()} className="mt-6 w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-emerald-700 transition-all text-[10px] uppercase tracking-widest">Refresh Report</button>
                                    </div>

                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-8 rounded-[2.5rem] border-2 border-blue-100 dark:border-blue-800 shadow-xl flex flex-col justify-between">
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-2">Database Health</h4>
                                            <p className="text-5xl font-black text-blue-700 dark:text-blue-300">{totalQuestions}</p>
                                            <p className="text-xs font-bold text-blue-500 mt-2">Total questions in database</p>
                                            <div className="mt-4 space-y-1">
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                    <span className="text-emerald-600">Verified:</span>
                                                    <span className="text-emerald-700">{auditReport?.classifiedCount || 0}</span>
                                                </div>
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                    <span className="text-rose-600">Unclassified:</span>
                                                    <span className="text-rose-700">{auditReport?.unclassifiedCount || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleAction('clean-database')} className="mt-6 w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-blue-700 transition-all text-[10px] uppercase tracking-widest">Clean Whitespace</button>
                                    </div>
                                </div>

                                 {auditReport?.unapprovedTopics && auditReport.unapprovedTopics.length > 0 && (
                                    <div className="bg-orange-50 dark:bg-orange-900/20 p-8 rounded-[2.5rem] border-2 border-orange-100 dark:border-orange-800 shadow-xl mb-8">
                                        <div className="flex items-center space-x-3 mb-4">
                                            <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
                                            <h4 className="text-sm font-black uppercase tracking-tight text-orange-700">Unapproved Topics Detected</h4>
                                        </div>
                                        <p className="text-xs font-bold text-orange-600/80 mb-4 uppercase tracking-widest">
                                            The following topics in your Question Bank do not match any micro-topic in your Syllabus. 
                                            Use the "Topic Normalization" tool to map these to approved syllabus topics. (Processes 100 questions per click).
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {auditReport.unapprovedTopics.map(t => (
                                                <span key={t} className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-orange-200">
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                 {auditReport?.subjectMismatches && auditReport.subjectMismatches.length > 0 && (
                                    <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-[2.5rem] border-2 border-red-100 dark:border-red-800 shadow-xl">
                                        <div className="flex items-center space-x-3 mb-4">
                                            <XMarkIcon className="h-6 w-6 text-red-600" />
                                            <h4 className="text-sm font-black uppercase tracking-tight text-red-700">Subject Naming Mismatches Detected</h4>
                                        </div>
                                        <p className="text-xs font-bold text-red-600/80 mb-4 uppercase tracking-widest">
                                            The following subjects in your Syllabus or Question Bank do not match the App's "Approved Subjects" list. 
                                            {auditReport.questionSubjectMismatches ? ` Found ${auditReport.questionSubjectMismatches} questions with invalid subjects.` : ''}
                                            Use the "Topic Repair" tool to fix these automatically.
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {auditReport.subjectMismatches.map(s => (
                                                <span key={s} className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-red-200">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="mt-6 pt-6 border-t border-red-100 dark:border-red-800">
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Approved List (Use these exactly):</p>
                                            <div className="flex flex-wrap gap-1">
                                                {auditReport.approvedSubjects.map(s => (
                                                    <span key={s} className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded text-[8px] font-bold">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border dark:border-slate-800 shadow-xl">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-500">
                                            <tr><th className="px-8 py-5">Syllabus Topic</th><th className="px-8 py-5">Matched QB Topics</th><th className="px-8 py-5">Question Count</th><th className="px-8 py-5 text-right">Actions</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {auditReport?.syllabusReport.map((report: any) => (
                                                <tr key={report.id} className="text-sm font-bold">
                                                    <td className="px-8 py-6">
                                                        <p className="font-black text-sm text-slate-800 dark:text-slate-200">{report.topic}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{report.subject || 'Uncategorized'}</p>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-wrap gap-1">
                                                            {report.matchedTopics && report.matchedTopics.length > 0 ? (
                                                                report.matchedTopics.map((t: string) => (
                                                                    <span key={t} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[9px] font-bold border border-blue-100">
                                                                        {t}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-[9px] text-slate-400 italic">No matches found</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${report.count === 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                            {report.count} Questions
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <button onClick={() => handleAction('run-targeted-gap-fill', { topic: report.id })} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                                                            <SparklesIcon className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* Total Row */}
                                            <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                                                <td className="px-8 py-6 uppercase tracking-widest text-[10px] text-slate-500">Total Classified Questions</td>
                                                <td className="px-8 py-6">
                                                    <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest shadow-lg">
                                                        {totalClassified} Questions
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6"></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'syllabus' && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <h3 className="text-2xl font-black uppercase tracking-tight">Micro-Topic Manager</h3>
                                    <select 
                                        value={selectedExamId}
                                        onChange={(e) => setSelectedExamId(e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-none font-bold text-sm shadow-inner min-w-[250px] outline-none"
                                    >
                                        <option value="">Select an Exam</option>
                                        {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.title.ml}</option>)}
                                    </select>
                                </div>

                                {selectedExamId ? (
                                    <div className="bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border dark:border-slate-800 shadow-xl">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-500">
                                                <tr><th className="px-8 py-5">Topic Name</th><th className="px-8 py-5">Subject</th><th className="px-8 py-5 text-right">Actions</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {syllabusItems.map(item => (
                                                    <tr key={item.id} className="text-sm font-bold">
                                                        <td className="px-8 py-6">{item.topic}</td>
                                                        <td className="px-8 py-6"><span className="text-[10px] text-slate-400">{item.subject}</span></td>
                                                        <td className="px-8 py-6 text-right">
                                                            <button onClick={() => handleAction('delete-row', { sheet: 'Syllabus', id: item.id })} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                                                <TrashIcon className="h-4 w-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="py-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                                        <PlusIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                        <p className="text-slate-500 font-bold">Select an exam above to manage its syllabus items.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
                                <h3 className="text-2xl font-black uppercase tracking-tight">App Configuration</h3>
                                <div className="space-y-6">
                                    {/* Special Toggle for Free Pro Mode */}
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-800 flex items-center justify-between gap-6 shadow-xl shadow-indigo-500/5">
                                        <div>
                                            <h4 className="text-lg font-black uppercase tracking-tight text-indigo-900 dark:text-indigo-100">Free Pro Mode</h4>
                                            <p className="text-xs font-bold text-indigo-600/70 mt-1">When enabled, all users get Pro features for free.</p>
                                        </div>
                                        <button 
                                            onClick={() => updateSetting('free_pro_mode', settings.free_pro_mode === 'true' ? 'false' : 'true')}
                                            className={`w-20 h-10 rounded-full p-1 transition-all duration-500 ${settings.free_pro_mode === 'true' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                                        >
                                            <div className={`w-8 h-8 bg-white rounded-full shadow-lg transform transition-transform duration-500 ${settings.free_pro_mode === 'true' ? 'translate-x-10' : 'translate-x-0'}`} />
                                        </button>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl">
                                        <h4 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                                            <ArrowPathIcon className="w-5 h-5 text-indigo-600" />
                                            Daily Automation Controls
                                        </h4>
                                        <div className="space-y-4">
                                            {[
                                                { key: 'auto_update_news', label: 'PSC Notifications & Updates', desc: 'Scrapes latest news from KPSC website.', default: true },
                                                { key: 'auto_update_ca', label: 'Current Affairs', desc: 'Daily current affairs updates.', default: true },
                                                { key: 'auto_update_gk', label: 'GK Facts', desc: 'Daily general knowledge facts.', default: true },
                                                { key: 'auto_update_ai_gaps', label: 'AI Question Generation', desc: 'Uses Gemini to fill syllabus gaps (High AI Cost).', warning: true, default: false },
                                                { key: 'auto_update_flashcards', label: 'Daily Flashcards', desc: 'Generates new flashcards for users.', default: true }
                                            ].map(item => {
                                                const isEnabled = settings[item.key] === undefined ? item.default : settings[item.key] === 'true';
                                                return (
                                                    <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                                        <div>
                                                            <p className={`text-sm font-black uppercase ${item.warning ? 'text-amber-600' : 'text-slate-900 dark:text-slate-100'}`}>{item.label}</p>
                                                            <p className="text-[10px] font-bold text-slate-500">{item.desc}</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => updateSetting(item.key, isEnabled ? 'false' : 'true')}
                                                            className={`w-14 h-7 rounded-full p-1 transition-all ${isEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                                        >
                                                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${isEnabled ? 'translate-x-7' : 'translate-x-0'}`} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {Object.entries(settings).filter(([k]) => !['free_pro_mode', 'auto_update_news', 'auto_update_ca', 'auto_update_gk', 'auto_update_ai_gaps', 'auto_update_flashcards'].includes(k)).map(([key, value]) => (
                                        <div key={key} className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">{key.replace(/_/g, ' ')}</label>
                                            <div className="flex items-center space-x-3">
                                                <input 
                                                    type="text" 
                                                    defaultValue={String(value)}
                                                    onBlur={async (e) => await updateSetting(key, e.target.value)}
                                                    className="flex-1 bg-white dark:bg-slate-800 p-3 rounded-xl border-none font-bold text-sm shadow-inner" 
                                                />
                                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircleIcon className="h-4 w-4" /></div>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="pt-8 border-t dark:border-slate-800">
                                        <button 
                                            onClick={() => {
                                                const key = prompt("Enter new setting key:");
                                                if (key) updateSetting(key, "value");
                                            }}
                                            className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 font-black uppercase text-[10px] tracking-widest hover:border-indigo-300 hover:text-indigo-400 transition-all"
                                        >
                                            + Add New Configuration Key
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'exams' && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-2xl font-black uppercase tracking-tight">Exams Manager</h3>
                                    <button onClick={() => setEditingExam({ id: '', title_ml: '', title_en: '', description_ml: '', description_en: '', category: 'General', level: 'Preliminary', icon_type: 'cap' })} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center space-x-2 shadow-lg">
                                        <PlusIcon className="h-4 w-4" /><span>Add Exam</span>
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {exams.map(ex => (
                                        <div key={ex.id} className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
                                            <div className="flex items-center space-x-4">
                                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm"><AcademicCapIcon className="h-6 w-6 text-indigo-600" /></div>
                                                <div>
                                                    <h4 className="font-black text-sm uppercase">{ex.title.ml}</h4>
                                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">{ex.category} • {ex.level}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button onClick={() => setEditingExam({ ...ex, title_ml: ex.title.ml, title_en: ex.title.en, description_ml: ex.description.ml, description_en: ex.description.en })} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"><PencilSquareIcon className="h-4 w-4" /></button>
                                                <button onClick={() => handleAction('delete-row', { sheet: 'Exams', id: ex.id })} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"><TrashIcon className="h-4 w-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'books' && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-2xl font-black uppercase tracking-tight">Bookstore Manager</h3>
                                    <button onClick={() => setEditingBook({ id: '', title: '', author: '', imageUrl: '', amazonLink: '' })} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center space-x-2 shadow-lg">
                                        <PlusIcon className="h-4 w-4" /><span>Add Book</span>
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {books.map(book => (
                                        <div key={book.id} className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
                                            <div className="aspect-[3/4] bg-white dark:bg-slate-800 rounded-2xl mb-4 overflow-hidden shadow-inner flex items-center justify-center">
                                                {book.imageUrl ? <img src={book.imageUrl} alt={book.title} className="w-full h-full object-cover" /> : <BookOpenIcon className="h-12 w-12 text-slate-200" />}
                                            </div>
                                            <h4 className="font-black text-xs uppercase line-clamp-2 h-8 mb-1">{book.title}</h4>
                                            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-4">{book.author}</p>
                                            <div className="flex items-center justify-end space-x-2 mt-auto">
                                                <button onClick={() => setEditingBook(book)} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"><PencilSquareIcon className="h-4 w-4" /></button>
                                                <button onClick={() => handleAction('delete-row', { sheet: 'Bookstore', id: book.id })} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"><TrashIcon className="h-4 w-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="space-y-8 animate-fade-in">
                                <h3 className="text-2xl font-black uppercase tracking-tight">Subscription Manager</h3>
                                <div className="bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border dark:border-slate-800 shadow-xl">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-500">
                                            <tr><th className="px-8 py-5">User ID</th><th className="px-8 py-5">Status</th><th className="px-8 py-5">Expiry</th><th className="px-8 py-5 text-right">Actions</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {subscriptions.map(sub => (
                                                <tr key={sub.id} className="text-sm font-bold">
                                                    <td className="px-8 py-6 font-mono text-[10px]">{sub.user_id}</td>
                                                    <td className="px-8 py-6">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${sub.status === 'pro' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                                                            {sub.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-[10px] text-slate-500">{sub.expiry_date ? new Date(sub.expiry_date).toLocaleDateString() : 'N/A'}</td>
                                                    <td className="px-8 py-6 text-right">
                                                        <button onClick={() => handleAction('delete-row', { sheet: 'Subscriptions', id: sub.id })} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                                            <TrashIcon className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Modals for Editing */}
                        {editingExam && (
                            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                                <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in-up border dark:border-slate-800">
                                    <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                        <h3 className="text-xl font-black uppercase tracking-tight">Edit Exam</h3>
                                        <button onClick={() => setEditingExam(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><XMarkIcon className="h-6 w-6" /></button>
                                    </div>
                                    <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400">Exam ID</label>
                                                <input type="text" value={editingExam.id} onChange={e => setEditingExam({...editingExam, id: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm shadow-inner" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400">Icon Type</label>
                                                <input type="text" value={editingExam.icon_type} onChange={e => setEditingExam({...editingExam, icon_type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm shadow-inner" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400">Title (Malayalam)</label>
                                            <input type="text" value={editingExam.title_ml} onChange={e => setEditingExam({...editingExam, title_ml: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm shadow-inner" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400">Title (English)</label>
                                            <input type="text" value={editingExam.title_en} onChange={e => setEditingExam({...editingExam, title_en: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm shadow-inner" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400">Category</label>
                                                <input type="text" value={editingExam.category} onChange={e => setEditingExam({...editingExam, category: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm shadow-inner" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400">Level</label>
                                                <input type="text" value={editingExam.level} onChange={e => setEditingExam({...editingExam, level: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm shadow-inner" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-800 flex justify-end space-x-4">
                                        <button onClick={() => setEditingExam(null)} className="px-8 py-4 rounded-2xl font-black uppercase text-xs text-slate-500">Cancel</button>
                                        <button onClick={async () => { await handleAction('save-row', { sheet: 'Exams', rowData: editingExam }); setEditingExam(null); }} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-indigo-700 transition-all">Save Changes</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {editingBook && (
                            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                                <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in-up border dark:border-slate-800">
                                    <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                        <h3 className="text-xl font-black uppercase tracking-tight">Edit Book</h3>
                                        <button onClick={() => setEditingBook(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><XMarkIcon className="h-6 w-6" /></button>
                                    </div>
                                    <div className="p-8 space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400">Book ID</label>
                                            <input type="text" value={editingBook.id} onChange={e => setEditingBook({...editingBook, id: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm shadow-inner" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400">Title</label>
                                            <input type="text" value={editingBook.title} onChange={e => setEditingBook({...editingBook, title: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm shadow-inner" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400">Author</label>
                                            <input type="text" value={editingBook.author} onChange={e => setEditingBook({...editingBook, author: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm shadow-inner" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400">Image URL</label>
                                            <input type="text" value={editingBook.imageUrl} onChange={e => setEditingBook({...editingBook, imageUrl: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm shadow-inner" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400">Amazon Link</label>
                                            <input type="text" value={editingBook.amazonLink} onChange={e => setEditingBook({...editingBook, amazonLink: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-sm shadow-inner" />
                                        </div>
                                    </div>
                                    <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-800 flex justify-end space-x-4">
                                        <button onClick={() => setEditingBook(null)} className="px-8 py-4 rounded-2xl font-black uppercase text-xs text-slate-500">Cancel</button>
                                        <button onClick={async () => { await handleAction('save-row', { sheet: 'Bookstore', rowData: editingBook }); setEditingBook(null); }} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-indigo-700 transition-all">Save Changes</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default AdminPage;

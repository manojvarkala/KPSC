
import React from 'react';
import type { Exam, Notification, StudyMaterial, ExamPageContent, Testimonial, Book, ExamCalendarEntry, QuizCategory, MockTest, PscUpdateItem, QuestionPaper, CurrentAffairsItem, GkItem, QuizQuestion, Page, NavLink, FlashCard } from './types';
import { BookOpenIcon } from './components/icons/BookOpenIcon';
import { StarIcon } from './components/icons/StarIcon';
import { AcademicCapIcon } from './components/icons/AcademicCapIcon';
import { ShieldCheckIcon } from './components/icons/ShieldCheckIcon';
import { BeakerIcon } from './components/icons/BeakerIcon';
import { GlobeAltIcon } from './components/icons/GlobeAltIcon';
import { LightBulbIcon } from './components/icons/LightBulbIcon';
import { ScaleIcon } from './components/icons/ScaleIcon';
import { ClipboardListIcon } from './components/icons/ClipboardListIcon';
import { Cog6ToothIcon } from './components/icons/Cog6ToothIcon';
import { WrenchScrewdriverIcon } from './components/icons/WrenchScrewdriverIcon';

export const EXAMS_DATA: Exam[] = [
  { id: 'ldc_lgs', title: { ml: 'LDC / LGS (എൽ.ഡി.സി / എൽ.ജി.എസ്) 2026', en: 'LDC / LGS' }, description: { ml: 'പത്താം ക്ലാസ്സ് യോഗ്യതയുള്ള പ്രധാന പരീക്ഷകൾ.', en: 'Major exams for 10th level qualification.' }, icon: React.createElement(BookOpenIcon, { className: "h-8 w-8 text-blue-500" }), category: 'General', level: 'Preliminary' },
  { id: 'plus_two_prelims', title: { ml: 'Plus Two Prelims (CPO / Excise)', en: 'Plus Two Level Prelims' }, description: { ml: 'സിവിൽ പോലീസ് ഓഫീസർ, എക്സൈസ് ഇൻസ്പെക്ടർ തുടങ്ങിയ പരീക്ഷകൾ.', en: 'CPO, Excise Inspector and related exams.' }, icon: React.createElement(BookOpenIcon, { className: "h-8 w-8 text-indigo-500" }), category: 'General', level: 'Preliminary' },
  { id: 'degree_prelims', title: { ml: 'Degree Level Exams (ഡിഗ്രി ലെവൽ)', en: 'Degree Level Exams' }, description: { ml: 'സെക്രട്ടേറിയറ്റ് അസിസ്റ്റന്റ് ഉൾപ്പെടെയുള്ള ബിരുദതല പരീക്ഷകൾ.', en: 'Exams including Secretariat Assistant.' }, icon: React.createElement(BookOpenIcon, { className: "h-8 w-8 text-purple-500" }), category: 'General', level: 'Preliminary' },
  { id: 'veo_exam', title: { ml: 'VEO (വില്ലേജ് എക്സ്റ്റൻഷൻ ഓഫീസർ)', en: 'Village Extension Officer' }, description: { ml: 'ഗ്രാമവികസന വകുപ്പിലെ പ്രധാന പരീക്ഷ.', en: 'Key exam in Rural Development department.' }, icon: React.createElement(BookOpenIcon, { className: "h-8 w-8 text-emerald-500" }), category: 'General', level: 'Main' },
  { id: 'fireman_exam', title: { ml: 'Fireman / Firewoman (ഫയർമാൻ)', en: 'Fireman / Firewoman' }, description: { ml: 'ഫയർ ആന്റ് റെസ്ക്യൂ സർവീസിലെ പരീക്ഷകൾ.', en: 'Fire and Rescue services exams.' }, icon: React.createElement(ShieldCheckIcon, { className: "h-8 w-8 text-orange-500" }), category: 'Special', level: 'Preliminary' },
  { id: 'lp_up_assistant_malayalam', title: { ml: 'LP/UP Assistant Malayalam Medium (എൽ.പി/യു.പി അസിസ്റ്റന്റ് മലയാളം മീഡിയം)', en: 'LP/UP Assistant (Malayalam Medium)' }, description: { ml: 'വിദ്യാഭ്യാസ വകുപ്പിലെ മലയാളം മീഡിയം അദ്ധ്യാപക തസ്തികകൾ.', en: 'Teaching posts in Education department (Malayalam Medium).' }, icon: React.createElement(AcademicCapIcon, { className: "h-8 w-8 text-rose-500" }), category: 'General', level: 'Main' },
  { id: 'staff_nurse', title: { ml: 'Staff Nurse Gr II (സ്റ്റാഫ് നഴ്സ്)', en: 'Staff Nurse Gr II' }, description: { ml: 'ആരോഗ്യ വകുപ്പിലെ നഴ്സിംഗ് തസ്തികകളിലേക്കുള്ള പരീക്ഷ.', en: 'Nursing post exams in Health Department.' }, icon: React.createElement(BeakerIcon, { className: "h-8 w-8 text-rose-500" }), category: 'Technical', level: 'Main' },
  { id: 'kseb_sub_eng', title: { ml: 'KSEB Sub Engineer (സബ് എൻജിനീയർ)', en: 'KSEB Sub Engineer' }, description: { ml: 'കെ.എസ്.ഇ.ബി ഇലക്ട്രിക്കൽ വിഭാഗം പരീക്ഷകൾ.', en: 'KSEB Electrical Engineering exams.' }, icon: React.createElement(Cog6ToothIcon, { className: "h-8 w-8 text-yellow-500" }), category: 'Technical', level: 'Main' },
  { id: 'si_police_2026', title: { ml: 'SI Police (സബ് ഇൻസ്പെക്ടർ പോലീസ്) 2026', en: 'SI Police' }, description: { ml: 'സബ് ഇൻസ്പെക്ടർ ഓഫ് പോലീസ് (ട്രെയിനി) പരീക്ഷകൾ.', en: 'Sub Inspector of Police (Trainee) exams.' }, icon: React.createElement(ShieldCheckIcon, { className: "h-8 w-8 text-slate-700" }), category: 'General', level: 'Prelims + Mains' },
  { id: 'cpo_exam_2026', title: { ml: 'Civil Police Officer (സിവിൽ പോലീസ് ഓഫീസർ)', en: 'CPO' }, description: { ml: 'പോലീസ് വകുപ്പിലെ സിവിൽ പോലീസ് ഓഫീസർ പരീക്ഷകൾ.', en: 'Civil Police Officer exams in Police Department.' }, icon: React.createElement(ShieldCheckIcon, { className: "h-8 w-8 text-blue-600" }), category: 'General', level: 'Preliminary + Physical' },
  { id: 'assistant_engineer_civil', title: { ml: 'Assistant Engineer Civil (അസിസ്റ്റന്റ് എഞ്ചിനീയർ - സിവിൽ)', en: 'Assistant Engineer Civil' }, description: { ml: 'KSEB / PWD / Irrigation വകുപ്പുകളിലെ സിവിൽ അസിസ്റ്റന്റ് എഞ്ചിനീയർ പരീക്ഷ.', en: 'Assistant Engineer (Civil) in various departments.' }, icon: React.createElement(Cog6ToothIcon, { className: "h-8 w-8 text-cyan-500" }), category: 'Technical', level: 'Prelims + Mains' },
  { id: 'assistant_engineer_electrical', title: { ml: 'Assistant Engineer Electrical (അസിസ്റ്റന്റ് എഞ്ചിനീയർ - ഇലക്ട്രിക്കൽ)', en: 'Assistant Engineer Electrical' }, description: { ml: 'KSEB / Electrical വകുപ്പുകളിലെ ഇലക്ട്രിക്കൽ അസിസ്റ്റന്റ് എഞ്ചിനീയർ പരീക്ഷ.', en: 'Assistant Engineer (Electrical) in KSEB etc.' }, icon: React.createElement(Cog6ToothIcon, { className: "h-8 w-8 text-cyan-500" }), category: 'Technical', level: 'Prelims + Mains' },
  { id: 'assistant_engineer_mechanical', title: { ml: 'Assistant Engineer Mechanical (അസിസ്റ്റന്റ് എഞ്ചിനീയർ - മെക്കാനിക്കൽ)', en: 'Assistant Engineer Mechanical' }, description: { ml: 'വിവിധ വകുപ്പുകളിലെ മെക്കാനിക്കൽ അസിസ്റ്റന്റ് എഞ്ചിനീയർ പരീക്ഷ.', en: 'Assistant Engineer (Mechanical) posts.' }, icon: React.createElement(Cog6ToothIcon, { className: "h-8 w-8 text-cyan-500" }), category: 'Technical', level: 'Prelims + Mains' },
  { id: 'jphn_anm', title: { ml: 'Junior Public Health Nurse / ANM (ജെ.പി.എച്ച്.എൻ / എ.എൻ.എം)', en: 'Junior Public Health Nurse / ANM' }, description: { ml: 'ആരോഗ്യ വകുപ്പിലെ ജൂനിയർ പബ്ലിക് ഹെൽത്ത് നഴ്സ് / ANM പരീക്ഷകൾ.', en: 'JPHN / ANM exams in Health Services.' }, icon: React.createElement(BeakerIcon, { className: "h-8 w-8 text-emerald-500" }), category: 'Technical', level: 'Main' },
  { id: 'kseb_ae', title: { ml: 'KSEB Assistant Engineer (കെ.എസ്.ഇ.ബി അസിസ്റ്റന്റ് എഞ്ചിനീയർ)', en: 'KSEB Assistant Engineer' }, description: { ml: 'കെ.എസ്.ഇ.ബി ഇലക്ട്രിക്കൽ / സിവിൽ അസിസ്റ്റന്റ് എഞ്ചിനീയർ പരീക്ഷകൾ.', en: 'Assistant Engineer in Kerala State Electricity Board.' }, icon: React.createElement(Cog6ToothIcon, { className: "h-8 w-8 text-yellow-600" }), category: 'Technical', level: 'Prelims + Mains' },
  { id: 'kas_2026', title: { ml: 'KAS (കേരള അഡ്മിനിസ്ട്രേറ്റീവ് സർവീസ്)', en: 'KAS' }, description: { ml: 'KAS ഓഫീസർ (Junior Time Scale) പരീക്ഷകൾ.', en: 'Kerala Administrative Service exams.' }, icon: React.createElement(BookOpenIcon, { className: "h-8 w-8 text-emerald-600" }), category: 'General', level: 'Prelims + Mains' },
  { id: 'pharmacist_gr2', title: { ml: 'Pharmacist Gr II (ഫാർമസിസ്റ്റ്)', en: 'Pharmacist Gr II' }, description: { ml: 'ആരോഗ്യ / ഇൻഷുറൻസ് മെഡിക്കൽ സർവീസസിലെ ഫാർമസിസ്റ്റ് പരീക്ഷകൾ.', en: 'Pharmacist posts in Health / Insurance Medical Services.' }, icon: React.createElement(BeakerIcon, { className: "h-8 w-8 text-teal-500" }), category: 'Technical', level: 'Main' },
  { id: 'beat_forest_officer', title: { ml: 'Beat Forest Officer (ബീറ്റ് ഫോറസ്റ്റ് ഓഫീസർ)', en: 'Beat Forest Officer' }, description: { ml: 'വന വകുപ്പിലെ ബീറ്റ് ഫോറസ്റ്റ് ഓഫീസർ പരീക്ഷകൾ.', en: 'Beat Forest Officer exams (frequent notifications).' }, icon: React.createElement(GlobeAltIcon, { className: "h-8 w-8 text-green-600" }), category: 'Special', level: 'Prelims + Physical' },
  { id: 'civil_excise_officer', title: { ml: 'Civil Excise Officer (സിവിൽ എക്സൈസ് ഓഫീസർ)', en: 'Civil Excise Officer' }, description: { ml: 'എക്സൈസ് വകുപ്പിലെ സിവിൽ എക്സൈസ് ഓഫീസർ പരീക്ഷകൾ.', en: 'Civil Excise Officer (Plus Two level).' }, icon: React.createElement(ShieldCheckIcon, { className: "h-8 w-8 text-amber-600" }), category: 'General', level: 'Prelims + Physical' },
  { id: 'junior_health_inspector', title: { ml: 'Junior Health Inspector (ജൂനിയർ ഹെൽത്ത് ഇൻസ്പെക്ടർ)', en: 'Junior Health Inspector' }, description: { ml: 'ആരോഗ്യ വകുപ്പിലെ ജൂനിയർ ഹെൽത്ത് ഇൻസ്പെക്ടർ പരീക്ഷകൾ.', en: 'Junior Health Inspector Gr II exams.' }, icon: React.createElement(BeakerIcon, { className: "h-8 w-8 text-blue-400" }), category: 'Technical', level: 'Main' },
  { id: 'tradesman_civil', title: { ml: 'Tradesman Civil (ട്രേഡ്സ്മാൻ - സിവിൽ)', en: 'Tradesman Civil' }, description: { ml: 'ടെക്നിക്കൽ എഡ്യൂക്കേഷൻ / ITI-യിലെ സിവിൽ ട്രേഡ്സ്മാൻ പരീക്ഷ.', en: 'Tradesman (Civil) posts.' }, icon: React.createElement(Cog6ToothIcon, { className: "h-8 w-8 text-slate-500" }), category: 'Technical', level: 'Main' },
  { id: 'tradesman_mechanical', title: { ml: 'Tradesman Mechanical (ട്രേഡ്സ്മാൻ - മെക്കാനിക്കൽ)', en: 'Tradesman Mechanical' }, description: { ml: 'മെക്കാനിക്കൽ ട്രേഡുകളിലുള്ള ട്രേഡ്സ്മാൻ പരീക്ഷ.', en: 'Tradesman (Mechanical/Fitter/Turner etc.).' }, icon: React.createElement(Cog6ToothIcon, { className: "h-8 w-8 text-slate-500" }), category: 'Technical', level: 'Main' },
  { id: 'tradesman_electrical', title: { ml: 'Tradesman Electrical (ട്രേഡ്സ്മാൻ - ഇലക്ട്രിക്കൽ)', en: 'Tradesman Electrical' }, description: { ml: 'ഇലക്ട്രിക്കൽ ട്രേഡുകളിലുള്ള ട്രേഡ്സ്മാൻ പരീക്ഷ.', en: 'Tradesman (Electrical) posts.' }, icon: React.createElement(Cog6ToothIcon, { className: "h-8 w-8 text-slate-500" }), category: 'Technical', level: 'Main' },
  { id: 'tradesman_fitter', title: { ml: 'Tradesman Fitter (ട്രേഡ്സ്മാൻ - ഫിറ്റർ)', en: 'Tradesman Fitter' }, description: { ml: 'ഫിറ്റർ ട്രേഡിലുള്ള ജൂനിയർ ഇൻസ്ട്രക്ടർ / ട്രേഡ്സ്മാൻ പരീക്ഷ.', en: 'Fitter trade exams.' }, icon: React.createElement(Cog6ToothIcon, { className: "h-8 w-8 text-slate-500" }), category: 'Technical', level: 'Main' },
  { id: 'tradesman_turner', title: { ml: 'Tradesman Turner (ട്രേഡ്സ്മാൻ - ടർണർ)', en: 'Tradesman Turner' }, description: { ml: 'ടർണർ ട്രേഡിലുള്ള പരീക്ഷകൾ.', en: 'Turner trade in ITI/Technical Education.' }, icon: React.createElement(Cog6ToothIcon, { className: "h-8 w-8 text-slate-500" }), category: 'Technical', level: 'Main' },
  { id: 'tradesman_draughtsman_civil', title: { ml: 'Tradesman Draughtsman Civil (ട്രേഡ്സ്മാൻ - ഡ്രോട്ട്സ്മാൻ സിവിൽ)', en: 'Tradesman Draughtsman Civil' }, description: { ml: 'ഡ്രോട്ട്സ്മാൻ സിവിൽ ട്രേഡ് പരീക്ഷ.', en: 'Draughtsman Civil trade.' }, icon: React.createElement(Cog6ToothIcon, { className: "h-8 w-8 text-slate-500" }), category: 'Technical', level: 'Main' },
  { id: 'blood_bank_tech', title: { ml: 'Blood Bank Technician (ബ്ലഡ് ബാങ്ക് ടെക്നീഷ്യൻ)', en: 'Blood Bank Technician' }, description: { ml: 'ആരോഗ്യ വകുപ്പിലെ ബ്ലഡ് ബാങ്ക് ടെക്നീഷ്യൻ പരീക്ഷകൾ.', en: 'Blood Bank Technician (NCA variants).' }, icon: React.createElement(BeakerIcon, { className: "h-8 w-8 text-red-500" }), category: 'Technical', level: 'Main' },
  { id: 'prof_assistant_library', title: { ml: 'Professional Assistant Gr II (Library) (പ്രൊഫഷണൽ അസിസ്റ്റന്റ് (ലൈബ്രറി))', en: 'Professional Assistant (Library)' }, description: { ml: 'യൂണിവേഴ്സിറ്റികളിലെ പ്രൊഫഷണൽ അസിസ്റ്റന്റ് (ലൈബ്രറി) പരീക്ഷകൾ.', en: 'Library posts in Universities.' }, icon: React.createElement(BookOpenIcon, { className: "h-8 w-8 text-indigo-400" }), category: 'General', level: 'Main' },
  { id: 'hsst_sanskrit', title: { ml: 'HSST Sanskrit (ഹയർ സെക്കൻഡറി സ്കൂൾ ടീച്ചർ - സംസ്കൃതം)', en: 'HSST Sanskrit' }, description: { ml: 'ഹയർ സെക്കൻഡറി വിദ്യാഭ്യാസ വകുപ്പിലെ സംസ്കൃതം വിഷയത്തിലുള്ള HSST പരീക്ഷ.', en: 'Higher Secondary School Teacher - Sanskrit.' }, icon: React.createElement(AcademicCapIcon, { className: "h-8 w-8 text-indigo-500" }), category: 'General', level: 'Main' },
  { id: 'hsst_english', title: { ml: 'HSST English (ഹയർ സെക്കൻഡറി സ്കൂൾ ടീച്ചർ - ഇംഗ്ലീഷ്)', en: 'HSST English' }, description: { ml: 'ഹയർ സെക്കൻഡറി വിദ്യാഭ്യാസ വകുപ്പിലെ ഇംഗ്ലീഷ് വിഷയത്തിലുള്ള HSST പരീക്ഷ.', en: 'Higher Secondary School Teacher - English.' }, icon: React.createElement(AcademicCapIcon, { className: "h-8 w-8 text-indigo-500" }), category: 'General', level: 'Main' },
  { id: 'hsst_kannada', title: { ml: 'HSST Kannada (ഹയർ സെക്കൻഡറി സ്കൂൾ ടീച്ചർ - കന്നഡ)', en: 'HSST Kannada' }, description: { ml: 'ഹയർ സെക്കൻഡറി വിദ്യാഭ്യാസ വകുപ്പിലെ കന്നഡ വിഷയത്തിലുള്ള HSST പരീക്ഷ.', en: 'Higher Secondary School Teacher - Kannada.' }, icon: React.createElement(AcademicCapIcon, { className: "h-8 w-8 text-indigo-500" }), category: 'General', level: 'Main' },
  { id: 'hsst_sociology', title: { ml: 'HSST Sociology (ഹയർ സെക്കൻഡറി സ്കൂൾ ടീച്ചർ - സോഷ്യോളജി)', en: 'HSST Sociology' }, description: { ml: 'ഹയർ സെക്കൻഡറി വിദ്യാഭ്യാസ വകുപ്പിലെ സോഷ്യോളജി വിഷയത്തിലുള്ള HSST പരീക്ഷ.', en: 'Higher Secondary School Teacher - Sociology.' }, icon: React.createElement(AcademicCapIcon, { className: "h-8 w-8 text-indigo-500" }), category: 'General', level: 'Main' },
  { id: 'hsst_statistics', title: { ml: 'HSST Statistics (ഹയർ സെക്കൻഡറി സ്കൂൾ ടീച്ചർ - സ്റ്റാറ്റിസ്റ്റിക്സ്)', en: 'HSST Statistics' }, description: { ml: 'ഹയർ സെക്കൻഡറി വിദ്യാഭ്യാസ വകുപ്പിലെ സ്റ്റാറ്റിസ്റ്റിക്സ് വിഷയത്തിലുള്ള HSST പരീക്ഷ.', en: 'Higher Secondary School Teacher - Statistics.' }, icon: React.createElement(AcademicCapIcon, { className: "h-8 w-8 text-indigo-500" }), category: 'General', level: 'Main' },
  { id: 'hsst_political_science', title: { ml: 'HSST Political Science (ഹയർ സെക്കൻഡറി സ്കൂൾ ടീച്ചർ - പൊളിറ്റിക്കൽ സയൻസ്)', en: 'HSST Political Science' }, description: { ml: 'ഹയർ സെക്കൻഡറി വിദ്യാഭ്യാസ വകുപ്പിലെ പൊളിറ്റിക്കൽ സയൻസ് വിഷയത്തിലുള്ള HSST പരീക്ഷ.', en: 'Higher Secondary School Teacher - Political Science.' }, icon: React.createElement(AcademicCapIcon, { className: "h-8 w-8 text-indigo-500" }), category: 'General', level: 'Main' },
  { id: 'hsst_economics', title: { ml: 'HSST Economics (ഹയർ സെക്കൻഡറി സ്കൂൾ ടീച്ചർ - എക്കണോമിക്സ്)', en: 'HSST Economics' }, description: { ml: 'ഹയർ സെക്കൻഡറി വിദ്യാഭ്യാസ വകുിലെ എക്കണോമിക്സ് വിഷയത്തിലുള്ള HSST പരീക്ഷ.', en: 'Higher Secondary School Teacher - Economics.' }, icon: React.createElement(AcademicCapIcon, { className: "h-8 w-8 text-indigo-500" }), category: 'General', level: 'Main' },
  { id: 'hsst_botany', title: { ml: 'HSST Botany (ഹയർ സെക്കൻഡറി സ്കൂൾ ടീച്ചർ - ബോട്ടണി)', en: 'HSST Botany' }, description: { ml: 'ഹയർ സെക്കൻഡറി വിദ്യാഭ്യാസ വകുപ്പിലെ ബോട്ടണി വിഷയത്തിലുള്ള HSST പരീക്ഷ.', en: 'Higher Secondary School Teacher - Botany.' }, icon: React.createElement(AcademicCapIcon, { className: "h-8 w-8 text-indigo-500" }), category: 'General', level: 'Main' },
  { id: 'hsst_zoology', title: { ml: 'HSST Zoology (ഹയർ സെക്കൻഡറി സ്കൂൾ ടീച്ചർ - സൂയോളജി)', en: 'HSST Zoology' }, description: { ml: 'ഹയർ സെക്കൻഡറി വിദ്യാഭ്യാസ വകുപ്പിലെ സൂയോളജി വിഷയത്തിലുള്ള HSST പരീക്ഷ.', en: 'Higher Secondary School Teacher - Zoology.' }, icon: React.createElement(AcademicCapIcon, { className: "h-8 w-8 text-indigo-500" }), category: 'General', level: 'Main' },
  { id: 'hsst_geography', title: { ml: 'HSST Geography (ഹയർ സെക്കൻഡറി സ്കൂൾ ടീച്ചർ - ജിയോഗ്രഫി)', en: 'HSST Geography' }, description: { ml: 'ഹയർ സെക്കൻഡറി വിദ്യാഭ്യാസ വകുപ്പിലെ ജിയോഗ്രഫി വിഷയത്തിലുള്ള HSST പരീക്ഷ.', en: 'Higher Secondary School Teacher - Geography.' }, icon: React.createElement(AcademicCapIcon, { className: "h-8 w-8 text-indigo-500" }), category: 'General', level: 'Main' },
  { id: 'hsst_chemistry', title: { ml: 'HSST Chemistry (ഹയർ സെക്കൻഡറി സ്കൂൾ ടീച്ചർ - കെമിസ്ട്രി)', en: 'HSST Chemistry' }, description: { ml: 'ഹയർ സെക്കൻഡറി വിദ്യാഭ്യാസ വകുപ്പിലെ കെമിസ്ട്രി വിഷയത്തിലുള്ള HSST പരീക്ഷ.', en: 'Higher Secondary School Teacher - Chemistry.' }, icon: React.createElement(AcademicCapIcon, { className: "h-8 w-8 text-indigo-500" }), category: 'General', level: 'Main' },
  { id: 'hsst_mathematics', title: { ml: 'HSST Mathematics (ഹയർ സെക്കൻഡറി സ്കൂൾ ടീച്ചർ - മാത്തമാറ്റിക്സ്)', en: 'HSST Mathematics' }, description: { ml: 'ഹയർ സെക്കൻഡറി വിദ്യാഭ്യാസ വകുപ്പിലെ മാത്തമാറ്റിക്സ് വിഷയത്തിലുള്ള HSST പരീക്ഷ.', en: 'Higher Secondary School Teacher - Mathematics.' }, icon: React.createElement(AcademicCapIcon, { className: "h-8 w-8 text-indigo-500" }), category: 'General', level: 'Main' },
  { id: 'hsst_physics', title: { ml: 'HSST Physics (ഹയർ സെക്കൻഡറി സ്കൂൾ ടീച്ചർ - ഫിസിക്സ്)', en: 'HSST Physics' }, description: { ml: 'ഹയർ സെക്കൻഡറി വിദ്യാഭ്യാസ വകുപ്പിലെ ഫിസിക്സ് വിഷയത്തിലുള്ള HSST പരീക്ഷ.', en: 'Higher Secondary School Teacher - Physics.' }, icon: React.createElement(AcademicCapIcon, { className: "h-8 w-8 text-indigo-500" }), category: 'General', level: 'Main' }
];

export const MOCK_TESTS_DATA: MockTest[] = [
  { id: 'ldc_lgs_p1', examId: 'ldc_lgs', title: { ml: 'LDC/LGS Prelims Mock Test 1', en: 'LDC/LGS Prelims Mock Test 1' }, description: { ml: '100 ചോദ്യങ്ങൾ അടങ്ങിയ പ്രിലിംസ് മോക്ക് ടെസ്റ്റ്.', en: '100 Questions Preliminary Mock Test.' }, questionsCount: 100, duration: 90, negativeMarking: 0.33, isPro: false },
  { id: 'plus_two_p1', examId: 'plus_two_prelims', title: { ml: 'Plus Two Prelims Mock Test 1', en: 'Plus Two Prelims Mock Test 1' }, description: { ml: 'CPO, Excise തുടങ്ങിയവയ്ക്കുള്ള പ്രിലിംസ് മോക്ക് ടെസ്റ്റ്.', en: 'Prelims Mock Test for CPO, Excise, etc.' }, questionsCount: 100, duration: 90, negativeMarking: 0.33, isPro: false },
  { id: 'degree_p1', examId: 'degree_prelims', title: { ml: 'Degree Prelims Mock Test 1', en: 'Degree Prelims Mock Test 1' }, description: { ml: 'സെക്രട്ടേറിയറ്റ് അസിസ്റ്റന്റ് തുടങ്ങിയവയ്ക്കുള്ള പ്രിലിംസ് മോക്ക് ടെസ്റ്റ്.', en: 'Prelims Mock Test for Secretariat Asst, etc.' }, questionsCount: 100, duration: 90, negativeMarking: 0.33, isPro: false },
  { id: 'si_p1', examId: 'si_police_2026', title: { ml: 'SI Police Prelims Mock Test 1', en: 'SI Police Prelims Mock Test 1' }, description: { ml: 'SI പോലീസ് 2026 പ്രിലിംസ് മോക്ക് ടെസ്റ്റ്.', en: 'SI Police 2026 Prelims Mock Test.' }, questionsCount: 100, duration: 90, negativeMarking: 0.33, isPro: false },
  { id: 'si_m1', examId: 'si_police_2026', title: { ml: 'SI Police Mains Paper I', en: 'SI Police Mains Paper I' }, description: { ml: 'English + GK (Mains Paper I).', en: 'English + GK (Mains Paper I).' }, questionsCount: 100, duration: 120, negativeMarking: 0.33, isPro: true },
  { id: 'kas_p1', examId: 'kas_2026', title: { ml: 'KAS Prelims Mock Test 1', en: 'KAS Prelims Mock Test 1' }, description: { ml: 'KAS 2026 പ്രിലിംസ് മോക്ക് ടെസ്റ്റ്.', en: 'KAS 2026 Prelims Mock Test.' }, questionsCount: 100, duration: 90, negativeMarking: 0.33, isPro: false },
  { id: 'kas_m1', examId: 'kas_2026', title: { ml: 'KAS Mains Paper I', en: 'KAS Mains Paper I' }, description: { ml: 'KAS മെയിൻസ് പേപ്പർ I.', en: 'KAS Mains Paper I.' }, questionsCount: 100, duration: 120, negativeMarking: 0.33, isPro: true },
  { id: 'fireman_p1', examId: 'fireman_exam', title: { ml: 'Fireman Prelims Mock Test 1', en: 'Fireman Prelims Mock Test 1' }, description: { ml: 'ഫയർമാൻ പ്രിലിംസ് മോക്ക് ടെസ്റ്റ്.', en: 'Fireman Prelims Mock Test.' }, questionsCount: 100, duration: 90, negativeMarking: 0.33, isPro: false },
  { id: 'fireman_phys_1', examId: 'fireman_exam', title: { ml: 'Physical Efficiency Test Simulation', en: 'Physical Efficiency Test Simulation' }, description: { ml: 'കായികക്ഷമത പരിശോധനയ്ക്കുള്ള ചോദ്യങ്ങൾ.', en: 'Simulation questions for Physical Efficiency Test.' }, questionsCount: 50, duration: 60, negativeMarking: 0, isPro: true }
];

export const HSST_PHYSICS_CONTENT: ExamPageContent = {
  practiceTests: [
    { id: 'hsst_phy_m1', title: 'Classical Mechanics: Newtonian & Lagrangian Formulation', questions: 20, duration: 20, subject: 'Physics', topic: 'Classical Mechanics' },
    { id: 'hsst_phy_m2', title: 'Classical Mechanics: Hamiltonian & Phase Space', questions: 20, duration: 20, subject: 'Physics', topic: 'Classical Mechanics' },
    { id: 'hsst_phy_m3', title: 'Mathematical Methods: Fourier Series, Transforms & Special Functions', questions: 20, duration: 20, subject: 'Physics', topic: 'Mathematical Methods' },
    { id: 'hsst_phy_m4', title: 'Mathematical Methods: Group Theory & Symmetry', questions: 20, duration: 20, subject: 'Physics', topic: 'Mathematical Methods' },
    { id: 'hsst_phy_m5', title: 'Electronics: Analog (Op-amps, Filters, Amplifiers)', questions: 20, duration: 20, subject: 'Physics', topic: 'Electronics' },
    { id: 'hsst_phy_m6', title: 'Electronics: Digital & Microprocessor 8085 Basics', questions: 20, duration: 20, subject: 'Physics', topic: 'Electronics' },
    { id: 'hsst_phy_m7', title: 'Quantum Mechanics: Schrödinger Equation & Particle in Box', questions: 20, duration: 20, subject: 'Physics', topic: 'Quantum Mechanics' },
    { id: 'hsst_phy_m8', title: 'Quantum Mechanics: Hydrogen Atom & Angular Momentum', questions: 20, duration: 20, subject: 'Physics', topic: 'Quantum Mechanics' },
    { id: 'hsst_phy_m9', title: 'Electrodynamics: Maxwell\'s Equations & EM Waves', questions: 20, duration: 20, subject: 'Physics', topic: 'Electrodynamics' },
    { id: 'hsst_phy_m10', title: 'Statistical Physics: Ensembles & Partition Function', questions: 20, duration: 20, subject: 'Physics', topic: 'Statistical Physics' },
    { id: 'hsst_phy_m11', title: 'Spectroscopy: Rotational, Vibrational, NMR', questions: 20, duration: 20, subject: 'Physics', topic: 'Spectroscopy' },
    { id: 'hsst_phy_m12', title: 'Condensed Matter: Crystal Structure & Band Theory', questions: 20, duration: 20, subject: 'Physics', topic: 'Condensed Matter' },
    { id: 'hsst_phy_m13', title: 'Nuclear Physics: Models & Reactions', questions: 20, duration: 20, subject: 'Physics', topic: 'Nuclear Physics' },
    { id: 'hsst_phy_m14', title: 'Particle Physics: Quarks & Standard Model', questions: 20, duration: 20, subject: 'Physics', topic: 'Particle Physics' }
  ],
  studyNotes: [],
  previousPapers: []
};

export const HSST_CHEMISTRY_CONTENT: ExamPageContent = {
  practiceTests: [
    { id: 'hsst_chem_m1', title: 'Inorganic Chemistry 1: Structure, Bonding & Periodicity', questions: 20, duration: 20, subject: 'Chemistry', topic: 'Inorganic Chemistry' },
    { id: 'hsst_chem_m2', title: 'Inorganic Chemistry 1: s-block & p-block Elements', questions: 20, duration: 20, subject: 'Chemistry', topic: 'Inorganic Chemistry' },
    { id: 'hsst_chem_m3', title: 'Inorganic Chemistry 2: Coordination Chemistry (CFT, LFT, MOT)', questions: 20, duration: 20, subject: 'Chemistry', topic: 'Inorganic Chemistry' },
    { id: 'hsst_chem_m4', title: 'Inorganic Chemistry 2: Organometallics & Bioinorganic', questions: 20, duration: 20, subject: 'Chemistry', topic: 'Inorganic Chemistry' },
    { id: 'hsst_chem_m5', title: 'Inorganic Chemistry 3: Nuclear Reactions & Models', questions: 20, duration: 20, subject: 'Chemistry', topic: 'Inorganic Chemistry' },
    { id: 'hsst_chem_m6', title: 'Inorganic Chemistry 3: Advanced Materials (Solid Electrolytes, Pigments)', questions: 20, duration: 20, subject: 'Chemistry', topic: 'Inorganic Chemistry' },
    { id: 'hsst_chem_m7', title: 'Organic Chemistry 1: Stereochemistry & Chirality', questions: 20, duration: 20, subject: 'Chemistry', topic: 'Organic Chemistry' },
    { id: 'hsst_chem_m8', title: 'Organic Chemistry 1: Reaction Mechanisms (Addition, Substitution)', questions: 20, duration: 20, subject: 'Chemistry', topic: 'Organic Chemistry' },
    { id: 'hsst_chem_m9', title: 'Organic Chemistry 2: Elimination & Rearrangements (Hoffmann, Beckmann etc.)', questions: 20, duration: 20, subject: 'Chemistry', topic: 'Organic Chemistry' },
    { id: 'hsst_chem_m10', title: 'Organic Chemistry 3: Spectroscopy & Photochemistry', questions: 20, duration: 20, subject: 'Chemistry', topic: 'Organic Chemistry' },
    { id: 'hsst_chem_m11', title: 'Physical Chemistry 1: Thermodynamics & Phase Equilibria', questions: 20, duration: 20, subject: 'Chemistry', topic: 'Physical Chemistry' },
    { id: 'hsst_chem_m12', title: 'Physical Chemistry 1: Kinetics & Catalysis', questions: 20, duration: 20, subject: 'Chemistry', topic: 'Physical Chemistry' }
  ],
  studyNotes: [],
  previousPapers: []
};

export const PHARMACIST_SIDDHA_CONTENT: ExamPageContent = {
  practiceTests: [
    { id: 'pharm_sid_m1', title: 'Fundamentals of Siddha: Three Humoral Theory (Vali, Azhal, Iyam)', questions: 20, duration: 20, subject: 'Siddha', topic: 'Fundamentals' },
    { id: 'pharm_sid_m2', title: 'Fundamentals of Siddha: Seven Physical Constituents (Udal Kattugal)', questions: 20, duration: 20, subject: 'Siddha', topic: 'Fundamentals' },
    { id: 'pharm_sid_m3', title: 'Anatomy & Physiology: Nervous System & Siddha Concepts (Dasavayu, Dasanadi)', questions: 20, duration: 20, subject: 'Siddha', topic: 'Anatomy & Physiology' },
    { id: 'pharm_sid_m4', title: 'Basic Pharmacology: Thogai Charakkugal & Dispensing', questions: 20, duration: 20, subject: 'Siddha', topic: 'Pharmacology' },
    { id: 'pharm_sid_m5', title: 'Pharmacy & Pharmacognosy: Crude Drugs (Laxatives, Cardiotonics)', questions: 20, duration: 20, subject: 'Siddha', topic: 'Pharmacy' },
    { id: 'pharm_sid_m6', title: 'Siddha Pharmacology 1: Properties & Classifications of Drugs', questions: 20, duration: 20, subject: 'Siddha', topic: 'Pharmacology' },
    { id: 'pharm_sid_m7', title: 'Siddha Pharmacology 2: Internal & External Medicines Relation to Panchabotham', questions: 20, duration: 20, subject: 'Siddha', topic: 'Pharmacology' },
    { id: 'pharm_sid_m8', title: 'Siddha Pharmaceuticals: Formulations & Quality Control', questions: 20, duration: 20, subject: 'Siddha', topic: 'Pharmaceuticals' },
    { id: 'pharm_sid_m9', title: 'Siddha Toxicology 1: Toxic Substances & Antidotes', questions: 20, duration: 20, subject: 'Siddha', topic: 'Toxicology' },
    { id: 'pharm_sid_m10', title: 'Siddha Toxicology 2: Poison Management & Safety', questions: 20, duration: 20, subject: 'Siddha', topic: 'Toxicology' }
  ],
  studyNotes: [],
  previousPapers: []
};

export const PHARMACIST_HOMOEOPATHY_CONTENT: ExamPageContent = {
  practiceTests: [
    { id: 'pharm_hom_m1', title: 'Homoeopathic Pharmacy Basics: Philosophy, History & Pioneers', questions: 20, duration: 20, subject: 'Homoeopathy', topic: 'Pharmacy Basics' },
    { id: 'pharm_hom_m2', title: 'Homoeopathic Pharmacopoeia: HPUS/HPI Monographs & Sources', questions: 20, duration: 20, subject: 'Homoeopathy', topic: 'Pharmacopoeia' },
    { id: 'pharm_hom_m3', title: 'Pharmacognosy: Drug Substances (Botany, Zoology Identification)', questions: 20, duration: 20, subject: 'Homoeopathy', topic: 'Pharmacognosy' },
    { id: 'pharm_hom_m4', title: 'Drug Proving: Prover Selection & Pathogenetic Properties', questions: 20, duration: 20, subject: 'Homoeopathy', topic: 'Drug Proving' },
    { id: 'pharm_hom_m5', title: 'Posology & Administration: Routes, Potentization, Dosing', questions: 20, duration: 20, subject: 'Homoeopathy', topic: 'Posology' },
    { id: 'pharm_hom_m6', title: 'Anatomy: Skeletal, Muscular, Respiratory Systems', questions: 20, duration: 20, subject: 'Homoeopathy', topic: 'Anatomy' },
    { id: 'pharm_hom_m7', title: 'Physiology: Blood Composition & Functions', questions: 20, duration: 20, subject: 'Homoeopathy', topic: 'Physiology' },
    { id: 'pharm_hom_m8', title: 'First Aid & Hygiene: Vital Signs, ABC of Life Support', questions: 20, duration: 20, subject: 'Homoeopathy', topic: 'First Aid' },
    { id: 'pharm_hom_m9', title: 'Community Health: Personal & Hospital Hygiene', questions: 20, duration: 20, subject: 'Homoeopathy', topic: 'Community Health' },
    { id: 'pharm_hom_m10', title: 'Materia Medica Basics: Common Remedies & Indications', questions: 20, duration: 20, subject: 'Homoeopathy', topic: 'Materia Medica' }
  ],
  studyNotes: [],
  previousPapers: []
};

export const LP_UP_ASSISTANT_CONTENT: ExamPageContent = {
  practiceTests: [
    { id: 'lpup_ped_1', title: 'Child Development & Learning Theories', questions: 20, duration: 20, subject: 'Educational Psychology / Pedagogy', topic: 'Child Development & Learning' },
    { id: 'lpup_ped_2', title: 'Educational Psychology & Personality', questions: 20, duration: 20, subject: 'Educational Psychology / Pedagogy', topic: 'Educational Psychology' },
    { id: 'lpup_ped_3', title: 'Pedagogy, Teaching Aptitude & ICT', questions: 20, duration: 20, subject: 'Educational Psychology / Pedagogy', topic: 'Pedagogy & Teaching Aptitude' },
    { id: 'lpup_ped_4', title: 'Inclusive Education & Classroom Management', questions: 20, duration: 20, subject: 'Educational Psychology / Pedagogy', topic: 'Inclusive Education' },
    { id: 'lpup_gk_1', title: 'General Knowledge & Current Affairs', questions: 20, duration: 15, subject: 'General Knowledge', topic: 'General Knowledge & Current Affairs' },
    { id: 'lpup_mal_1', title: 'Malayalam Grammar & Literature', questions: 20, duration: 15, subject: 'Malayalam', topic: 'Malayalam Language' },
    { id: 'lpup_eng_1', title: 'English Grammar & Usage', questions: 20, duration: 15, subject: 'English', topic: 'Basic English' },
    { id: 'lpup_math_1', title: 'Basic Arithmetic & Mental Ability', questions: 20, duration: 20, subject: 'Quantitative Aptitude', topic: 'Basic Arithmetic' },
    { id: 'lpup_sci_1', title: 'General Science (Physics, Chemistry, Biology)', questions: 20, duration: 15, subject: 'General Science / Science & Tech', topic: 'General Science' }
  ],
  studyNotes: [],
  previousPapers: []
};

export const HSST_GENERAL_CONTENT: ExamPageContent = {
  practiceTests: [
    { id: 'hsst_gen_1', title: 'Research Methodology & Teaching Aptitude', questions: 20, duration: 20, subject: 'Educational Psychology / Pedagogy', topic: 'Research Methodology & Teaching Aptitude' },
    { id: 'hsst_gen_2', title: 'General Knowledge & Current Affairs', questions: 20, duration: 15, subject: 'General Knowledge', topic: 'General Knowledge & Current Affairs' },
    { id: 'hsst_gen_3', title: 'Indian Constitution & Social Welfare', questions: 20, duration: 15, subject: 'Indian Polity / Constitution', topic: 'Indian Constitution & Social Welfare' },
    { id: 'hsst_gen_4', title: 'Educational Psychology & Pedagogy', questions: 20, duration: 20, subject: 'Educational Psychology / Pedagogy', topic: 'Educational Psychology' }
  ],
  studyNotes: [],
  previousPapers: []
};

export const EXAM_CONTENT_MAP: Record<string, ExamPageContent> = {
    'ldc_lgs': { 
      practiceTests: [
        { id: 'ldc_gk_1', title: 'General Knowledge: Kerala & India', questions: 20, duration: 15, subject: 'General Knowledge', topic: 'General Knowledge' },
        { id: 'ldc_hist_1', title: 'Kerala History & Renaissance', questions: 20, duration: 15, subject: 'Kerala History', topic: 'Kerala History & Renaissance' },
        { id: 'ldc_polity_1', title: 'Indian Constitution & Polity', questions: 20, duration: 15, subject: 'Indian Polity / Constitution', topic: 'Indian Polity & Constitution' },
        { id: 'ldc_math_1', title: 'Basic Arithmetic & Mental Ability', questions: 20, duration: 20, subject: 'Quantitative Aptitude', topic: 'Basic Arithmetic' },
        { id: 'ldc_eng_1', title: 'General English Grammar', questions: 20, duration: 15, subject: 'English', topic: 'Basic English' },
        { id: 'ldc_mal_1', title: 'Malayalam Grammar & Vocabulary', questions: 20, duration: 15, subject: 'Malayalam', topic: 'Malayalam Language' }
      ], 
      studyNotes: [], 
      previousPapers: [] 
    },
    'plus_two_prelims': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'degree_prelims': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'veo_exam': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'fireman_exam': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'lp_up_assistant_malayalam': LP_UP_ASSISTANT_CONTENT,
    'staff_nurse': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'kseb_sub_eng': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'si_police_2026': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'cpo_exam_2026': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'assistant_engineer_civil': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'assistant_engineer_electrical': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'assistant_engineer_mechanical': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'jphn_anm': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'kseb_ae': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'kas_2026': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'pharmacist_gr2': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'beat_forest_officer': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'civil_excise_officer': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'junior_health_inspector': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'tradesman_civil': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'tradesman_mechanical': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'tradesman_electrical': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'tradesman_fitter': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'tradesman_turner': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'tradesman_draughtsman_civil': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'blood_bank_tech': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'prof_assistant_library': { practiceTests: [], studyNotes: [], previousPapers: [] },
    'hsst_sanskrit': HSST_GENERAL_CONTENT,
    'hsst_english': HSST_GENERAL_CONTENT,
    'hsst_kannada': HSST_GENERAL_CONTENT,
    'hsst_sociology': HSST_GENERAL_CONTENT,
    'hsst_statistics': HSST_GENERAL_CONTENT,
    'hsst_political_science': HSST_GENERAL_CONTENT,
    'hsst_economics': HSST_GENERAL_CONTENT,
    'hsst_botany': HSST_GENERAL_CONTENT,
    'hsst_zoology': HSST_GENERAL_CONTENT,
    'hsst_geography': HSST_GENERAL_CONTENT,
    'hsst_chemistry': HSST_CHEMISTRY_CONTENT,
    'hsst_mathematics': HSST_GENERAL_CONTENT,
    'hsst_physics': HSST_PHYSICS_CONTENT,
};

export const NAV_STRUCTURE: NavLink[] = [
  { nameKey: 'nav.home', target: 'dashboard' },
  { nameKey: 'nav.practice', children: [{ nameKey: 'nav.mockTests', target: 'mock_test_home' }, { nameKey: 'nav.practiceExams', target: 'quiz_home' }] },
  { nameKey: 'nav.dailyFacts', children: [
      { nameKey: 'nav.currentAffairs', target: 'current_affairs' }, 
      { nameKey: 'nav.gk', target: 'gk' }, 
      { nameKey: 'nav.flashCards', target: 'flash_cards' },
      { nameKey: 'nav.pscLive', target: 'psc_live_updates' }
    ] 
  },
  { nameKey: 'nav.examHub', children: [{ nameKey: 'nav.examCalendar', target: 'exam_calendar' }, { nameKey: 'nav.previousPapers', target: 'previous_papers' }, { nameKey: 'nav.studyMaterials', target: 'study_material' }] },
  { nameKey: 'nav.bookstore', target: 'bookstore' }
];

export const STUDY_SUBJECTS: StudyMaterial[] = [
    { id: 'hist', title: 'ചരിത്രം', subject: 'History', icon: React.createElement(BookOpenIcon, { className: "h-6 w-6 text-rose-500" }) },
    { id: 'const', title: 'ഭരണഘടന', subject: 'Constitution', icon: React.createElement(ScaleIcon, { className: "h-6 w-6 text-indigo-500" }) },
    { id: 'sci', title: 'ശാസ്ത്രം', subject: 'Science', icon: React.createElement(BeakerIcon, { className: "h-6 w-6 text-cyan-500" }) },
    { id: 'geo', title: 'ഭൂമിശാസ്ത്രം', subject: 'Geography', icon: React.createElement(GlobeAltIcon, { className: "h-6 w-6 text-emerald-500" }) },
    { id: 'math', title: 'ഗണിതം', subject: 'Maths', icon: React.createElement(ClipboardListIcon, { className: "h-6 w-6 text-amber-500" }) },
    { id: 'mal', title: 'മലയാളം', subject: 'Malayalam', icon: React.createElement(LightBulbIcon, { className: "h-6 w-6 text-orange-500" }) },
    { id: 'eng', title: 'ഇംഗ്ലീഷ്', subject: 'English', icon: React.createElement(AcademicCapIcon, { className: "h-6 w-6 text-blue-500" }) },
    { id: 'it', title: 'ഐ.ടി', subject: 'IT', icon: React.createElement(ShieldCheckIcon, { className: "h-6 w-6 text-teal-500" }) }
];

export const MOCK_QUESTION_PAPERS: QuestionPaper[] = [
    { title: 'TRADESMAN – AUTOMOBILE MECHANIC – TECHNICAL EDUCATION', url: 'https://keralapsc.gov.in/sites/default/files/2018-08/175-2016.pdf', year: '2016', category: 'OMR Question' },
    { title: 'TRADESMAN – SM LAB – TECHNICAL EDUCATION', url: 'https://keralapsc.gov.in/previous-question-papers', year: '2016', category: 'OMR Question' },
    { title: 'UP SCHOOL ASSISTANT – KANNADA MEDIUM – EDUCATION', url: 'https://keralapsc.gov.in/previous-question-papers', year: '2016', category: 'OMR Question' },
    { title: 'PLUMBER / PLUMBER-CUM-OPERATOR – IMS', url: 'https://keralapsc.gov.in/previous-question-papers', year: '2016', category: 'OMR Question' },
    { title: 'UP SCHOOL ASSISTANT – MALAYALAM MEDIUM – EDUCATION', url: 'https://keralapsc.gov.in/previous-question-papers', year: '2016', category: 'OMR Question' },
    { title: 'LECTURER IN CIVIL ENGINEERING – GOVT POLYTECHNICS', url: 'https://keralapsc.gov.in/previous-question-papers', year: '2016', category: 'OMR Question' },
    { title: 'TRADESMAN – REFRIGERATION AND AIR CONDITIONING', url: 'https://keralapsc.gov.in/previous-question-papers', year: '2016', category: 'OMR Question' },
    { title: 'LABORATORY TECHNICIAN GR II – ANIMAL HUSBANDRY', url: 'https://keralapsc.gov.in/previous-question-papers', year: '2016', category: 'OMR Question' },
    { title: 'LECTURER IN ELECTRICAL & ELECTRONICS ENGINEERING', url: 'https://keralapsc.gov.in/previous-question-papers', year: '2016', category: 'OMR Question' },
    { title: 'PHARMACIST GR II – IMS / MEDICAL EDUCATION', url: 'https://keralapsc.gov.in/previous-question-papers', year: '2016', category: 'OMR Question' }
];

export const QUIZ_CATEGORIES: QuizCategory[] = [
  { id: 'kerala_renaissance', title: { ml: 'നവോത്ഥാനം', en: 'Kerala Renaissance' }, description: { ml: 'കേരളത്തിലെ നവോത്ഥാന നായകരെയും സമരങ്ങളെയും കുറിച്ചുള്ള ചോദ്യങ്ങൾ.', en: 'Questions about Kerala renaissance leaders and movements.' }, icon: React.createElement(StarIcon, { className: "h-6 w-6 text-indigo-500" }) },
  { id: 'indian_constitution', title: { ml: 'ഭരണഘടന', en: 'Indian Constitution' }, description: { ml: 'ഇന്ത്യൻ ഭരണഘടനയുടെ പ്രസക്ത ഭാഗങ്ങളെക്കുറിച്ചുള്ള ക്വിസ്.', en: 'Quiz on essential parts of the Indian Constitution.' }, icon: React.createElement(ScaleIcon, { className: "h-6 w-6 text-amber-600" }) },
  { id: 'kerala_history', title: { ml: 'കേരള ചരിത്രം', en: 'Kerala History' }, description: { ml: 'ചരിത്രപ്രധാനമായ സംഭവങ്ങളും ഭരണാധികാരികളും.', en: 'Historical events and rulers of Kerala.' }, icon: React.createElement(BookOpenIcon, { className: "h-6 w-6 text-rose-600" }) },
  { id: 'science', title: { ml: 'ശാസ്ത്രം', en: 'General Science' }, description: { ml: 'ഭൗതികശാസ്ത്രം, രസതന്ത്രം, ജീവശാസ്ത്രം.', en: 'Physics, Chemistry, and Biology essentials.' }, icon: React.createElement(BeakerIcon, { className: "h-6 w-6 text-cyan-600" }) },
];

export const MARCH_EXAMS_DATA: ExamCalendarEntry[] = [
  { slNo: 1, catNo: "021/2024", postName: "LDC (Various Departments)", department: "Various", examDate: "14-03-2026", syllabusLink: "#" },
  { slNo: 2, catNo: "115/2024", postName: "Civil Police Officer", department: "Police", examDate: "21-03-2026", syllabusLink: "#" },
  { slNo: 3, catNo: "442/2024", postName: "University Assistant", department: "Universities", examDate: "28-03-2026", syllabusLink: "#" }
];

export const APRIL_EXAMS_DATA: ExamCalendarEntry[] = [
  { slNo: 1, catNo: "005/2025", postName: "Last Grade Servants", department: "Various", examDate: "04-04-2026", syllabusLink: "#" },
  { slNo: 2, catNo: "189/2024", postName: "Beat Forest Officer", department: "Forest", examDate: "18-04-2026", syllabusLink: "#" },
  { slNo: 3, catNo: "312/2024", postName: "Sub Inspector of Police", department: "Police", examDate: "25-04-2026", syllabusLink: "#" }
];

export const MOCK_FLASHCARDS: FlashCard[] = [
    { id: 'fc1', front: 'കേരളത്തിലെ ഏറ്റവും നീളം കൂടിയ നദി ഏതാണ്?', back: 'പെരിയാർ (244 കി.മീ)', topic: 'Geography', explanation: 'ഇടുക്കി ജില്ലയിലെ ശിവഗിരി മലകളിൽ നിന്നാണ് പെരിയാർ ഉത്ഭവിക്കുന്നത്. ഇത് കേരളത്തിലെ ഏറ്റവും വലിയ നദിയുമാണ്.' },
    { id: 'fc2', front: 'കേരള നവോത്ഥാനത്തിന്റെ പിതാവ് എന്നറിയപ്പെടുന്നത് ആരാണ്?', back: 'ശ്രീനാരായണ ഗുരു', topic: 'History', explanation: 'കേരളത്തിലെ സാമൂഹിക അസമത്വങ്ങൾക്കെതിരെ പോരാടിയ പ്രധാന നവോത്ഥാന നായകനാണ് ശ്രീനാരായണ ഗുരു. 1888-ലെ അരുവിപ്പുറം പ്രതിഷ്ഠ അദ്ദേഹത്തിന്റെ പ്രധാന സംഭാവനകളിലൊന്നാണ്.' },
    { id: 'fc3', front: 'ഇന്ത്യൻ ഭരണഘടനയുടെ ശില്പി ആരാണ്?', back: 'ഡോ. ബി. ആർ. അംബേദ്കർ', topic: 'Constitution', explanation: 'ഇന്ത്യൻ ഭരണഘടനാ ഡ്രാഫ്റ്റിംഗ് കമ്മിറ്റിയുടെ ചെയർമാനായിരുന്നു ഡോ. ബി. ആർ. അംബേദ്കർ. സ്വതന്ത്ര ഇന്ത്യയുടെ ആദ്യത്തെ നിയമമന്ത്രി കൂടിയായിരുന്നു അദ്ദേഹം.' },
    { id: 'fc4', front: 'കേരളത്തിൽ അവസാനം രൂപീകൃതമായ ജില്ല ഏതാണ്?', back: 'കാസർഗോഡ് (1984)', topic: 'General', explanation: '1984 മെയ് 24-നാണ് കാസർഗോഡ് ജില്ല രൂപീകൃതമായത്. കണ്ണൂർ ജില്ല വിഭജിച്ചാണ് ഇത് രൂപീകരിച്ചത്.' },
    { id: 'fc5', front: 'അറബിക്കടലിന്റെ റാണി എന്നറിയപ്പെടുന്ന നഗരം ഏതാണ്?', back: 'കൊച്ചി', topic: 'Geography', explanation: 'പുരാതന കാലം മുതൽ ഒരു പ്രധാന സുഗന്ധവ്യഞ്ജന വ്യാപാര കേന്ദ്രമായിരുന്നതിനാലാണ് കൊച്ചിയെ അറബിക്കടലിന്റെ റാണി എന്ന് വിളിക്കുന്നത്.' }
];

export const SYLLABUS_STRUCTURE = {
  'GK / Current Affairs / History / Geography / Polity / Economy': [
    'Indian History', 'Kerala History & Renaissance', 'World & Indian Geography', 'Kerala Geography', 
    'Indian Economy & Kerala Economy', 'Indian Polity & Constitution', 'Kerala Polity & Administration', 
    'Important Laws & Acts', 'Important National & International Events', 'Current Affairs & Renaissance', 
    'Environment & Forestry', 'Kerala Specific'
  ],
  'Science / Technical / Engineering': [
    'General Science - Physics', 'General Science - Chemistry', 'General Science - Biology & Public Health', 
    'Electrical Circuits & Machines', 'Structural Engineering', 'Power Systems', 'Thermodynamics', 
    'Civil Construction Basics', 'Mechanical Fitting', 'Electrical Wiring', 'Blood Banking Techniques', 
    'Anatomy & Physiology', 'Medical Surgical Nursing', 'Pharmacology & Pharmaceutics', 'Public Health & Sanitation',
    'Computer Organization', 'Data Structures & Algorithms', 'Operating Systems', 'Database Management Systems',
    'Software Engineering', 'Computer Networks', 'Web Technologies', 'Cyber Laws & Ethics'
  ],
  'Languages / Literature': [
    'Malayalam Grammar', 'Malayalam Vocabulary & Idioms', 'Grammar & Usage', 'Vocabulary & Comprehension', 
    'Basic English', 'Malayalam Language', 'Sanskrit Literature & Grammar', 'English Literature & Language', 
    'Arts Literature Culture & Sports', 'Hindi Literature & Grammar', 'Kannada Literature', 'Arabic Literature',
    'Tamil Literature'
  ],
  'Aptitude / Reasoning / Maths': [
    'Basic Arithmetic', 'Mental Ability & Logical Reasoning', 'Arithmetic & Reasoning', 'Simple Maths', 'Algebra & Calculus'
  ],
  'Education / Pedagogy': [
    'Child Development & Learning', 'Educational Psychology', 'Pedagogy & Teaching Aptitude', 
    'Inclusive Education', 'Educational Philosophy', 'Classroom Management', 'Evaluation & Assessment', 
    'ICT in Education', 'Learning Theories', 'Motivation & Personality', 'Research Methodology & Teaching Aptitude'
  ],
  'Specialized / Subject Specific': [
    'Computer Basics & IT Awareness', 'Library Management', 'Police & Law', 'Excise Laws Basics', 
    'Botany & Plant Physiology', 'Zoology & Animal Physiology', 'Organic & Inorganic Chemistry', 'Mechanics & Electromagnetism',
    'Physical Education Theory', 'History of Physical Education', 'Anatomy & Physiology in Sports', 'Kinesiology & Biomechanics',
    'Sports Psychology', 'Health Education', 'Music Theory & History', 'Raga & Tala System'
  ]
};

export const MOCK_QUESTION_BANK: QuizQuestion[] = [];
export const MOCK_NOTIFICATIONS: Notification[] = [];
export const MOCK_PSC_UPDATES: PscUpdateItem[] = [];
export const MOCK_CURRENT_AFFAIRS: CurrentAffairsItem[] = [];
export const MOCK_GK: GkItem[] = [];
export const STUDY_MATERIALS_DATA: StudyMaterial[] = [];
export const TESTIMONIALS_DATA: Testimonial[] = [];
export const MOCK_BOOKS_DATA: Book[] = [];
export const SEPTEMBER_EXAMS_DATA: ExamCalendarEntry[] = MARCH_EXAMS_DATA; // Fallback
export const OCTOBER_EXAMS_DATA: ExamCalendarEntry[] = APRIL_EXAMS_DATA; // Fallback

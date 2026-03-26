
import type { Exam } from '../types';

export interface ExamSections {
  mock: {
    total: number;
    groups: Record<string, Exam[]>;
    ids: string[];
  };
  practice: {
    total: number;
    groups: Record<string, Exam[]>;
    ids: string[];
  };
}

export const categorizeExams = (allExams: Exam[]): ExamSections => {
  const mockCategories = ['KPSC', 'Teachers', 'Degree Level', '12th Level', '10th Level', 'Cultural Subjects'];
  const mockGroups: Record<string, Exam[]> = {};
  const practiceGroups: Record<string, Exam[]> = {};

  allExams.forEach(exam => {
    let cat = (exam.category || 'General').trim();
    if (cat.toLowerCase() === 'teachers') cat = 'Teachers';
    if (cat.toLowerCase() === 'kpsc') cat = 'KPSC';
    if (cat.toLowerCase() === 'cultural subjects') cat = 'Cultural Subjects';
    
    const titleEn = exam.title.en.toLowerCase();
    const titleMl = exam.title.ml.toLowerCase();
    
    const hasPractice = titleEn.includes('practice') || titleMl.includes('പ്രാക്ടീസ്');
    const hasMock = titleEn.includes('mock') || titleMl.includes('മോക്ക്');
    
    let isMock = false;
    if (hasPractice) {
      isMock = false;
    } else if (hasMock) {
      isMock = true;
    } else {
      isMock = mockCategories.includes(cat) || 
               ['Preliminary', 'Main', 'Prelims', 'Mains'].some(l => exam.level?.includes(l));
    }

    if (isMock) {
      if (!mockGroups[cat]) mockGroups[cat] = [];
      mockGroups[cat].push(exam);
    } else {
      if (!practiceGroups[cat]) practiceGroups[cat] = [];
      practiceGroups[cat].push(exam);
    }
  });

  const mockTotal = Object.values(mockGroups).reduce((acc, curr) => acc + curr.length, 0);
  const practiceTotal = Object.values(practiceGroups).reduce((acc, curr) => acc + curr.length, 0);

  const mockSortedIds = Object.keys(mockGroups).sort((a, b) => {
    const order = ['KPSC', 'Teachers', 'Degree Level', '12th Level', '10th Level'];
    const idxA = order.indexOf(a);
    const idxB = order.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const practiceSortedIds = Object.keys(practiceGroups).sort((a, b) => a.localeCompare(b));

  return {
    mock: {
      total: mockTotal,
      groups: mockGroups,
      ids: mockSortedIds
    },
    practice: {
      total: practiceTotal,
      groups: practiceGroups,
      ids: practiceSortedIds
    }
  };
};

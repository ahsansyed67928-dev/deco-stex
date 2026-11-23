import {
  ConfidenceLevel,
  ExamScope,
  ScheduledTask,
  StudyConfig,
  UnitNumber,
} from '../types/study';
import { DECO_UNITS } from '../data/decoCurriculum';

export function getScopeUnits(scope: ExamScope): UnitNumber[] {
  if (scope === 'cie1') return [1, 2];
  if (scope === 'cie2') return [3, 4, 5];
  return [1, 2, 3, 4, 5];
}

export function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysIso(startIso: string, days: number): string {
  const [y, m, d] = startIso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function daysBetweenIso(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = toIso.split('-').map(Number);
  const a = new Date(fy, fm - 1, fd).getTime();
  const b = new Date(ty, tm - 1, td).getTime();
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

function confidenceWeight(level: ConfidenceLevel, unitAccuracy?: number | null): number {
  let base = level === 'weak' ? 3 : level === 'moderate' ? 2 : 1;
  if (typeof unitAccuracy === 'number') {
    if (unitAccuracy < 60) base += 1.5;
    else if (unitAccuracy < 78) base += 0.5;
    else if (unitAccuracy >= 88 && base > 1) base -= 0.5;
  }
  return base;
}

export function generatePersonalizedSchedule(
  config: StudyConfig,
  unitAccuracyMap: Partial<Record<UnitNumber, number | null>>,
  anchorDateIso: string = getTodayIso()
): ScheduledTask[] {
  const activeUnits = getScopeUnits(config.examScope);
  const rawDays = daysBetweenIso(anchorDateIso, config.examDate);
  const totalDays = Math.min(28, Math.max(4, rawDays || 10));

  // Build weighted rotation queue of units prioritizing weak units
  const weightedQueue: UnitNumber[] = [];
  const rankedUnits = [...activeUnits].sort((a, b) => {
    const wa = confidenceWeight(config.unitConfidence[a], unitAccuracyMap[a]);
    const wb = confidenceWeight(config.unitConfidence[b], unitAccuracyMap[b]);
    return wb - wa;
  });

  rankedUnits.forEach((u) => {
    const w = Math.round(confidenceWeight(config.unitConfidence[u], unitAccuracyMap[u]));
    for (let i = 0; i < w; i++) {
      weightedQueue.push(u);
    }
  });

  const tasks: ScheduledTask[] = [];
  const dailyBudget = Math.max(30, Math.min(240, config.dailyMinutes));

  for (let dayIdx = 0; dayIdx < totalDays; dayIdx++) {
    const date = addDaysIso(anchorDateIso, dayIdx);
    const isFinalStretch = dayIdx >= totalDays - 2;

    if (isFinalStretch) {
      const focusUnit = rankedUnits[dayIdx % rankedUnits.length];
      const unitInfo = DECO_UNITS.find((u) => u.unit === focusUnit)!;
      const drillMins = Math.round(dailyBudget * 0.45);
      const mockMins = dailyBudget - drillMins;

      tasks.push({
        id: `task-${date}-final-1`,
        date,
        unit: focusUnit,
        title:
          dayIdx === totalDays - 1
            ? `Final Formula & Weak-Card Rapid Sweep`
            : `High-Yield LAQ Diagrams & ${unitInfo.code} Recap`,
        detail: `Review key RTL/equations and clear all remaining Due flashcards for ${unitInfo.shortTitle}.`,
        kind: 'revision',
        minutes: drillMins,
        topicFocus: unitInfo.topics[0],
      });

      tasks.push({
        id: `task-${date}-final-2`,
        date,
        unit: focusUnit,
        title:
          dayIdx === totalDays - 1
            ? `Full Timed ${config.examScope.toUpperCase()} Simulation`
            : `Timed Past-Paper Practice Set`,
        detail: `Run a timed test covering ${activeUnits.map((u) => `Unit ${u}`).join(', ')} and review every missed step.`,
        kind: 'practice',
        minutes: mockMins,
        topicFocus: 'Mixed Exam Simulation',
      });
      continue;
    }

    const primaryUnit = weightedQueue[dayIdx % weightedQueue.length];
    const secondaryUnit = weightedQueue[(dayIdx + 1) % weightedQueue.length];
    const primaryInfo = DECO_UNITS.find((u) => u.unit === primaryUnit)!;
    const secondaryInfo = DECO_UNITS.find((u) => u.unit === secondaryUnit)!;
    const topicIdx = Math.floor(dayIdx / Math.max(1, activeUnits.length)) % primaryInfo.topics.length;
    const topicFocus = primaryInfo.topics[topicIdx];

    if (dailyBudget <= 45) {
      const flashMins = Math.round(dailyBudget * 0.45);
      const testMins = dailyBudget - flashMins;
      tasks.push({
        id: `task-${date}-u${primaryUnit}-fc`,
        date,
        unit: primaryUnit,
        title: `${primaryInfo.code}: Active Recall Flashcards`,
        detail: `Master key cards on ${topicFocus}.`,
        kind: 'flashcards',
        minutes: flashMins,
        topicFocus,
      });
      tasks.push({
        id: `task-${date}-u${primaryUnit}-pq`,
        date,
        unit: primaryUnit,
        title: `${primaryInfo.code}: Topic Practice Drill`,
        detail: `Solve 5–8 targeted questions & check BTL explanations.`,
        kind: 'practice',
        minutes: testMins,
        topicFocus,
      });
    } else {
      const conceptMins = Math.round(dailyBudget * 0.35);
      const flashMins = Math.round(dailyBudget * 0.3);
      const practiceMins = dailyBudget - conceptMins - flashMins;

      tasks.push({
        id: `task-${date}-u${primaryUnit}-con`,
        date,
        unit: primaryUnit,
        title: `${primaryInfo.code}: ${topicFocus}`,
        detail: `Study core definitions, truth tables/RTL, and SAQ/LAQ answer blueprint.`,
        kind: 'concept',
        minutes: conceptMins,
        topicFocus,
      });
      tasks.push({
        id: `task-${date}-u${primaryUnit}-fc`,
        date,
        unit: primaryUnit,
        title: `${primaryInfo.code}: Spaced Flashcard Deck`,
        detail: `Rate confidence (Again / Good / Mastered) across ${primaryInfo.shortTitle}.`,
        kind: 'flashcards',
        minutes: flashMins,
        topicFocus,
      });
      tasks.push({
        id: `task-${date}-u${secondaryUnit}-pq`,
        date,
        unit: secondaryUnit,
        title: `${secondaryInfo.code}: Interleaved Practice Quiz`,
        detail: `Mixed retrieval check to reinforce ${secondaryInfo.shortTitle} alongside today’s primary unit.`,
        kind: 'practice',
        minutes: practiceMins,
        topicFocus: secondaryInfo.topics[dayIdx % secondaryInfo.topics.length],
      });
    }
  }

  return tasks;
}

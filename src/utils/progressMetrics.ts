import {
  Flashcard,
  PersistedStudyState,
  UnitNumber,
} from '../types/study';
import { addDaysIso, getTodayIso } from './scheduleGenerator';

export interface UnitProgressSummary {
  unit: UnitNumber;
  totalCards: number;
  masteredCards: number;
  dueCards: number;
  quizAttemptsCount: number;
  quizCorrect: number;
  quizTotal: number;
  quizAccuracy: number | null;
  masteryPercent: number;
}

export function computeUnitSummaries(
  state: PersistedStudyState,
  allCards: Flashcard[]
): UnitProgressSummary[] {
  const today = getTodayIso();
  const units: UnitNumber[] = [1, 2, 3, 4, 5];

  return units.map((unit) => {
    const unitCards = allCards.filter((c) => c.unit === unit);
    let masteredCards = 0;
    let dueCards = 0;

    unitCards.forEach((c) => {
      const prog = state.flashcardProgress[c.id];
      if (!prog) {
        dueCards += 1;
      } else {
        if (prog.box === 3) masteredCards += 1;
        if (prog.nextReviewDate <= today) dueCards += 1;
      }
    });

    let quizCorrect = 0;
    let quizTotal = 0;
    let quizAttemptsCount = 0;

    state.testAttempts.forEach((attempt) => {
      const uStat = attempt.perUnit[unit];
      if (uStat && uStat.total > 0) {
        quizAttemptsCount += 1;
        quizCorrect += uStat.correct;
        quizTotal += uStat.total;
      }
    });

    const quizAccuracy = quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : null;
    const cardMasteryRatio = unitCards.length > 0 ? masteredCards / unitCards.length : 0;

    // Combine flashcard mastery + quiz accuracy when tests exist, else weighted card & confidence readiness
    let masteryPercent = 0;
    if (quizAccuracy !== null) {
      masteryPercent = Math.round(cardMasteryRatio * 45 + (quizAccuracy / 100) * 55);
    } else {
      const confidence = state.config.unitConfidence[unit];
      const confBaseline = confidence === 'strong' ? 28 : confidence === 'moderate' ? 16 : 6;
      masteryPercent = Math.min(100, Math.round(cardMasteryRatio * 72 + confBaseline * 0.4));
    }

    return {
      unit,
      totalCards: unitCards.length,
      masteredCards,
      dueCards,
      quizAttemptsCount,
      quizCorrect,
      quizTotal,
      quizAccuracy,
      masteryPercent,
    };
  });
}

export function computeStudyStreak(state: PersistedStudyState): number {
  const today = getTodayIso();
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = addDaysIso(today, -i);
    const log = state.activityLog[d];
    const hasActivity =
      log && (log.cardsReviewed > 0 || log.questionsAnswered > 0 || log.minutesStudied > 0);
    if (hasActivity) {
      streak += 1;
    } else if (i === 0) {
      // Allow today to not break streak if yesterday had activity
      continue;
    } else {
      break;
    }
  }
  return streak;
}

export function computeOverallReadiness(summaries: UnitProgressSummary[], scopeUnits: UnitNumber[]): number {
  const active = summaries.filter((s) => scopeUnits.includes(s.unit));
  if (active.length === 0) return 0;
  const total = active.reduce((acc, item) => acc + item.masteryPercent, 0);
  return Math.round(total / active.length);
}

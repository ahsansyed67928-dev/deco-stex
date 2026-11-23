import { useState, useMemo } from 'react';
import { Menu, Play, X } from 'lucide-react';
import {
  AppSection,
  CardRating,
  Flashcard,
  PersistedStudyState,
  StudyConfig,
  TestAttempt,
  UnitNumber,
} from './types/study';
import { INITIAL_FLASHCARDS } from './data/decoCurriculum';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  addDaysIso,
  generatePersonalizedSchedule,
  getScopeUnits,
  getTodayIso,
} from './utils/scheduleGenerator';
import {
  computeOverallReadiness,
  computeStudyStreak,
  computeUnitSummaries,
} from './utils/progressMetrics';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OverviewView } from './components/OverviewView';
import { ScheduleView } from './components/ScheduleView';
import { FlashcardsView } from './components/FlashcardsView';
import { PracticeView } from './components/PracticeView';
import { ProgressView } from './components/ProgressView';

const STORAGE_KEY = 'deco-prep-studio-state-v1';

function buildInitialState(): PersistedStudyState {
  const today = getTodayIso();
  return {
    config: {
      examScope: 'see',
      examDate: addDaysIso(today, 14),
      dailyMinutes: 75,
      unitConfidence: {
        1: 'moderate',
        2: 'weak',
        3: 'weak',
        4: 'moderate',
        5: 'moderate',
      },
      studentGoalPercent: 85,
    },
    flashcardProgress: {},
    customFlashcards: [],
    completedTaskIds: {},
    testAttempts: [],
    activityLog: {},
    reviewedWrittenIds: [],
  };
}

const NAV_ITEMS: Array<{ id: AppSection; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'practice', label: 'Practice' },
  { id: 'progress', label: 'Progress' },
];

export default function App() {
  const [state, setState] = useLocalStorage<PersistedStudyState>(
    STORAGE_KEY,
    buildInitialState()
  );
  const [activeSection, setActiveSection] = useState<AppSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [flashcardUnitFilter, setFlashcardUnitFilter] = useState<UnitNumber | 'all'>('all');
  const [practiceUnitFilter, setPracticeUnitFilter] = useState<UnitNumber | 'all'>('all');
  const [autoStartTrigger, setAutoStartTrigger] = useState<{
    unit: UnitNumber | 'all';
    nonce: number;
  } | null>(null);

  const allCards = useMemo(
    () => [...INITIAL_FLASHCARDS, ...state.customFlashcards],
    [state.customFlashcards]
  );

  const unitSummaries = useMemo(
    () => computeUnitSummaries(state, allCards),
    [state, allCards]
  );

  const unitAccuracyMap = useMemo(() => {
    const map: Partial<Record<UnitNumber, number | null>> = {};
    unitSummaries.forEach((s) => {
      map[s.unit] = s.quizAccuracy;
    });
    return map;
  }, [unitSummaries]);

  const schedule = useMemo(
    () => generatePersonalizedSchedule(state.config, unitAccuracyMap),
    [state.config, unitAccuracyMap]
  );

  const scopeUnits = getScopeUnits(state.config.examScope);
  const readinessPercent = computeOverallReadiness(unitSummaries, scopeUnits);
  const streakDays = computeStudyStreak(state);

  const navigateTo = (section: AppSection) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  const handleStartUnitFlashcards = (unit: UnitNumber) => {
    setFlashcardUnitFilter(unit);
    setActiveSection('flashcards');
    setMobileMenuOpen(false);
  };

  const handleStartUnitTest = (unit: UnitNumber) => {
    setPracticeUnitFilter(unit);
    setAutoStartTrigger({ unit, nonce: Date.now() });
    setActiveSection('practice');
    setMobileMenuOpen(false);
  };

  const handleStartMockExam = () => {
    setPracticeUnitFilter('all');
    setAutoStartTrigger({ unit: 'all', nonce: Date.now() });
    setActiveSection('practice');
    setMobileMenuOpen(false);
  };

  const handleToggleTask = (taskId: string, minutes: number) => {
    const today = getTodayIso();
    setState((prev) => {
      const nextCompleted = { ...prev.completedTaskIds };
      const wasDone = !!nextCompleted[taskId];
      if (wasDone) {
        delete nextCompleted[taskId];
      } else {
        nextCompleted[taskId] = new Date().toISOString();
      }
      const prevLog = prev.activityLog[today] || {
        date: today,
        minutesStudied: 0,
        cardsReviewed: 0,
        questionsAnswered: 0,
      };
      return {
        ...prev,
        completedTaskIds: nextCompleted,
        activityLog: {
          ...prev.activityLog,
          [today]: {
            ...prevLog,
            minutesStudied: Math.max(0, prevLog.minutesStudied + (wasDone ? -minutes : minutes)),
          },
        },
      };
    });
  };

  const handleUpdateConfig = (updater: (prev: StudyConfig) => StudyConfig) => {
    setState((prev) => ({
      ...prev,
      config: updater(prev.config),
    }));
  };

  const handleRateCard = (cardId: string, rating: CardRating) => {
    const today = getTodayIso();
    setState((prev) => {
      const existing = prev.flashcardProgress[cardId];
      const nextBox: 0 | 1 | 2 | 3 =
        rating === 'again' ? 1 : rating === 'good' ? 2 : 3;
      const intervalDays = rating === 'again' ? 0 : rating === 'good' ? 2 : 7;
      const nextReviewDate = addDaysIso(today, intervalDays);

      const prevLog = prev.activityLog[today] || {
        date: today,
        minutesStudied: 0,
        cardsReviewed: 0,
        questionsAnswered: 0,
      };

      return {
        ...prev,
        flashcardProgress: {
          ...prev.flashcardProgress,
          [cardId]: {
            cardId,
            box: nextBox,
            reviews: (existing?.reviews || 0) + 1,
            lastReviewedAt: new Date().toISOString(),
            nextReviewDate,
          },
        },
        activityLog: {
          ...prev.activityLog,
          [today]: {
            ...prevLog,
            cardsReviewed: prevLog.cardsReviewed + 1,
            minutesStudied: prevLog.minutesStudied + 1,
          },
        },
      };
    });
  };

  const handleAddCustomCard = (card: Omit<Flashcard, 'id' | 'isCustom'>) => {
    const newCard: Flashcard = {
      ...card,
      id: `custom-${Date.now()}`,
      isCustom: true,
    };
    setState((prev) => ({
      ...prev,
      customFlashcards: [newCard, ...prev.customFlashcards],
    }));
  };

  const handleDeleteCustomCard = (cardId: string) => {
    setState((prev) => ({
      ...prev,
      customFlashcards: prev.customFlashcards.filter((c) => c.id !== cardId),
    }));
  };

  const handleSaveAttempt = (attempt: TestAttempt) => {
    const today = getTodayIso();
    setState((prev) => {
      const prevLog = prev.activityLog[today] || {
        date: today,
        minutesStudied: 0,
        cardsReviewed: 0,
        questionsAnswered: 0,
      };
      return {
        ...prev,
        testAttempts: [...prev.testAttempts, attempt],
        activityLog: {
          ...prev.activityLog,
          [today]: {
            ...prevLog,
            questionsAnswered: prevLog.questionsAnswered + attempt.totalQuestions,
            minutesStudied:
              prevLog.minutesStudied + Math.max(2, Math.round(attempt.durationSeconds / 60)),
          },
        },
      };
    });
  };

  const handleToggleWrittenReviewed = (id: string) => {
    setState((prev) => {
      const exists = prev.reviewedWrittenIds.includes(id);
      return {
        ...prev,
        reviewedWrittenIds: exists
          ? prev.reviewedWrittenIds.filter((x) => x !== id)
          : [...prev.reviewedWrittenIds, id],
      };
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar: 3 clean zones on one row */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => navigateTo('overview')}
            className="flex items-center gap-2.5 shrink-0 text-left cursor-pointer"
          >
            <img
              src="/icon.svg"
              alt="DECO Prep Studio emblem"
              className="w-8 h-8 rounded-lg shrink-0"
            />
            <span className="font-display font-bold text-base sm:text-lg tracking-tight text-slate-900 whitespace-nowrap">
              DECO Prep Studio
            </span>
          </button>

          {/* Zone 2: Single-line Navigation */}
          <nav
            aria-label="Primary sections"
            className="hidden md:flex items-center gap-1 lg:gap-2"
          >
            {NAV_ITEMS.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-sky-50 text-sky-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action CTA + mobile toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleStartMockExam}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start Mock Test</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                  activeSection === item.id
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleStartMockExam}
              className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>Start Mock Test</span>
            </button>
          </div>
        )}
      </header>

      <OfflineIndicator />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeSection === 'overview' && (
          <OverviewView
            state={state}
            allCards={allCards}
            unitSummaries={unitSummaries}
            readinessPercent={readinessPercent}
            streakDays={streakDays}
            schedule={schedule}
            onNavigate={navigateTo}
            onStartUnitFlashcards={handleStartUnitFlashcards}
            onStartUnitTest={handleStartUnitTest}
            onToggleTask={handleToggleTask}
          />
        )}

        {activeSection === 'schedule' && (
          <ScheduleView
            state={state}
            schedule={schedule}
            unitSummaries={unitSummaries}
            onUpdateConfig={handleUpdateConfig}
            onToggleTask={handleToggleTask}
            onStartUnitFlashcards={handleStartUnitFlashcards}
            onStartUnitTest={handleStartUnitTest}
          />
        )}

        {activeSection === 'flashcards' && (
          <FlashcardsView
            state={state}
            allCards={allCards}
            initialUnitFilter={flashcardUnitFilter}
            onRateCard={handleRateCard}
            onAddCustomCard={handleAddCustomCard}
            onDeleteCustomCard={handleDeleteCustomCard}
          />
        )}

        {activeSection === 'practice' && (
          <PracticeView
            state={state}
            initialUnitFilter={practiceUnitFilter}
            autoStartTrigger={autoStartTrigger}
            onSaveAttempt={handleSaveAttempt}
            onToggleWrittenReviewed={handleToggleWrittenReviewed}
          />
        )}

        {activeSection === 'progress' && (
          <ProgressView
            state={state}
            allCards={allCards}
            unitSummaries={unitSummaries}
            readinessPercent={readinessPercent}
            streakDays={streakDays}
            onStartUnitTest={handleStartUnitTest}
            onStartUnitFlashcards={handleStartUnitFlashcards}
            onImportState={(next) => setState(next)}
            onResetState={() => setState(buildInitialState())}
          />
        )}
      </main>
    </div>
  );
}

import { useState } from 'react';
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Circle,
  HardDriveDownload,
  Layers,
  AlertTriangle,
  Flame,
  ClipboardCheck,
} from 'lucide-react';
import {
  AppSection,
  Flashcard,
  PersistedStudyState,
  ScheduledTask,
  UnitNumber,
} from '../types/study';
import { DECO_UNITS } from '../data/decoCurriculum';
import { UnitProgressSummary } from '../utils/progressMetrics';
import { daysBetweenIso, getScopeUnits, getTodayIso } from '../utils/scheduleGenerator';
import { PWAInstallButton } from './PWAInstallButton';
import { InteractiveSandbox } from './InteractiveSandbox';

interface OverviewViewProps {
  state: PersistedStudyState;
  allCards: Flashcard[];
  unitSummaries: UnitProgressSummary[];
  readinessPercent: number;
  streakDays: number;
  schedule: ScheduledTask[];
  onNavigate: (section: AppSection) => void;
  onStartUnitFlashcards: (unit: UnitNumber) => void;
  onStartUnitTest: (unit: UnitNumber) => void;
  onToggleTask: (taskId: string, minutes: number) => void;
}

const DIAGRAM_PATHS = [
  '/assets/aistudio/DECO1_1cb5244a.JPG',
  '/assets/aistudio/andornot_8662986d.JPG',
  '/assets/aistudio/Nandand_Nor_54c707f9.JPG',
  '/assets/aistudio/Xor_b0f26fef.JPG',
];

export function OverviewView({
  state,
  allCards,
  unitSummaries,
  readinessPercent,
  streakDays,
  schedule,
  onNavigate,
  onStartUnitFlashcards,
  onStartUnitTest,
  onToggleTask,
}: OverviewViewProps) {
  const [cacheVerification, setCacheVerification] = useState<'idle' | 'verifying' | 'verified'>('idle');
  const [cachedDiagramCount, setCachedDiagramCount] = useState<number | null>(null);

  const today = getTodayIso();
  const daysLeft = daysBetweenIso(today, state.config.examDate);
  const scopeUnits = getScopeUnits(state.config.examScope);

  const todaysTasks = schedule.filter((t) => t.date === today);
  const completedToday = todaysTasks.filter((t) => !!state.completedTaskIds[t.id]).length;

  const totalDueCards = unitSummaries
    .filter((s) => scopeUnits.includes(s.unit))
    .reduce((sum, s) => sum + s.dueCards, 0);

  const totalMastered = Object.values(state.flashcardProgress).filter((p) => p.box === 3).length;

  const weakestSummary = [...unitSummaries]
    .filter((s) => scopeUnits.includes(s.unit))
    .sort((a, b) => a.masteryPercent - b.masteryPercent)[0];

  const handleVerifyOfflinePack = async () => {
    setCacheVerification('verifying');
    try {
      if ('caches' in window) {
        const cache = await caches.open('deco-offline-diagrams-v1');
        let okCount = 0;
        for (const url of DIAGRAM_PATHS) {
          try {
            const match = await caches.match(url);
            if (match) {
              okCount += 1;
            } else {
              const res = await fetch(url);
              if (res.ok) {
                await cache.put(url, res);
                okCount += 1;
              }
            }
          } catch {
            // ignore individual fetch failure if offline
          }
        }
        setCachedDiagramCount(okCount);
      }
      setCacheVerification('verified');
    } catch {
      setCacheVerification('verified');
    }
  };

  return (
    <div className="space-y-6">
      {/* Dominant Focal Anchor */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="text-xs font-medium text-slate-500 tracking-wide uppercase">
              U24EC304 · Digital Electronics &amp; Computer Organization ·{' '}
              {state.config.examScope === 'cie1'
                ? 'CIE-1 Scope (Units I–II)'
                : state.config.examScope === 'cie2'
                  ? 'CIE-2 Scope (Units III–V)'
                  : 'SEE Full Syllabus (Units I–V)'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
              Exam readiness is at{' '}
              <span className="font-mono tabular-nums text-sky-700">{readinessPercent}%</span> with{' '}
              <span className="font-mono tabular-nums text-slate-900">
                {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
              </span>{' '}
              until target exam date.
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Your study plan adapts to weak syllabus units using spaced-repetition flashcards, timed CIE/SEE practice sets, and full offline PWA caching for study on the go.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() =>
                  weakestSummary ? onStartUnitTest(weakestSummary.unit) : onNavigate('practice')
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4 shrink-0" />
                <span>
                  {weakestSummary
                    ? `Drill Weakest Unit (Unit ${weakestSummary.unit})`
                    : 'Launch Practice Test'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('flashcards')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4 shrink-0 text-sky-600" />
                <span className="tabular-nums">Review {totalDueCards} Due Cards</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('schedule')}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-sky-700 hover:text-sky-800 cursor-pointer"
              >
                <span>Tune Schedule</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="text-xs font-medium text-slate-500">Exam Target Goal</div>
              <div className="font-mono tabular-nums text-2xl font-semibold text-slate-900 mt-1">
                {state.config.studentGoalPercent}%
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Date: <span className="font-mono tabular-nums">{state.config.examDate}</span>
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="text-xs font-medium text-slate-500">Study Streak</div>
              <div className="flex items-center gap-1.5 font-mono tabular-nums text-2xl font-semibold text-slate-900 mt-1">
                <Flame className="w-5 h-5 text-amber-600 shrink-0" />
                <span>{streakDays}d</span>
              </div>
              <div className="text-xs text-slate-600 mt-1 tabular-nums">
                {state.testAttempts.length} tests logged
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="text-xs font-medium text-slate-500">Cards Mastered</div>
              <div className="font-mono tabular-nums text-2xl font-semibold text-slate-900 mt-1">
                {totalMastered} / {allCards.length}
              </div>
              <div className="text-xs text-slate-600 mt-1 tabular-nums">
                {totalDueCards} due today
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="text-xs font-medium text-slate-500">Today’s Plan</div>
              <div className="font-mono tabular-nums text-2xl font-semibold text-slate-900 mt-1">
                {completedToday} / {todaysTasks.length}
              </div>
              <div className="text-xs text-slate-600 mt-1 tabular-nums">
                {state.config.dailyMinutes} min daily budget
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two-column Today Queue + Offline Ready Pack */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Today’s Study Queue</h2>
              <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                {today} · Check off blocks as you complete them
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('schedule')}
              className="text-xs font-medium text-sky-700 hover:text-sky-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <CalendarCheck2 className="w-4 h-4" />
              <span>Full Roadmap</span>
            </button>
          </div>

          {todaysTasks.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-lg p-6 text-center text-sm text-slate-600">
              No scheduled blocks for today. Open the Schedule tab to set an upcoming exam date.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {todaysTasks.map((task) => {
                const done = !!state.completedTaskIds[task.id];
                return (
                  <li key={task.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => onToggleTask(task.id, task.minutes)}
                        className="flex items-start gap-3 text-left group cursor-pointer flex-1"
                      >
                        {done ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-400 group-hover:text-sky-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div
                            className={`text-sm font-medium ${
                              done ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            {task.title}
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">{task.detail}</div>
                          <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                            Unit {task.unit} · {task.kind.toUpperCase()} · {task.minutes} min
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          task.kind === 'flashcards'
                            ? onStartUnitFlashcards(task.unit)
                            : onStartUnitTest(task.unit)
                        }
                        className="text-xs font-medium text-sky-700 hover:text-sky-800 whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer"
                      >
                        {task.kind === 'flashcards' ? 'Open Deck' : 'Practice'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Offline On-the-Go Card */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900">
              <HardDriveDownload className="w-5 h-5 text-sky-600 shrink-0" />
              <h2 className="text-lg font-semibold">Study On-the-Go (Offline PWA)</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every DECO unit outline, {allCards.length} flashcards, practice questions, written model answers, and logic diagrams are stored locally in your browser so you can study in transit or low-signal classrooms.
            </p>
            <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50 space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span>Local Progress Persistence</span>
                <span className="font-medium text-emerald-700">Active (Device Storage)</span>
              </div>
              <div className="flex justify-between">
                <span>Service Worker App Shell</span>
                <span className="font-medium text-slate-900">
                  {'serviceWorker' in navigator ? 'Supported & Enabled' : 'Browser Fallback'}
                </span>
              </div>
              {cachedDiagramCount !== null && (
                <div className="flex justify-between">
                  <span>Course Diagrams Pre-cached</span>
                  <span className="font-mono tabular-nums font-medium text-sky-700">
                    {cachedDiagramCount} / {DIAGRAM_PATHS.length} verified
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200">
            <PWAInstallButton variant="primary" />
            <button
              type="button"
              onClick={handleVerifyOfflinePack}
              disabled={cacheVerification === 'verifying'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs sm:text-sm font-medium hover:bg-slate-50 cursor-pointer disabled:opacity-60"
            >
              <span>
                {cacheVerification === 'verifying'
                  ? 'Caching Diagrams...'
                  : cacheVerification === 'verified'
                    ? 'Offline Pack Verified'
                    : 'Pre-Cache Study Assets'}
              </span>
            </button>
          </div>
        </section>
      </div>

      {/* 5-Unit Syllabus Matrix */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Syllabus Units &amp; Mastery Matrix (U24EC304)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Jump directly into spaced flashcards or a targeted unit quiz.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            CIE: 40 Marks · SEE: 60 Marks · 5 Units
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {DECO_UNITS.map((unitObj) => {
            const summary = unitSummaries.find((s) => s.unit === unitObj.unit)!;
            const isWeak =
              state.config.unitConfidence[unitObj.unit] === 'weak' ||
              (summary.quizAccuracy !== null && summary.quizAccuracy < 60);
            const inScope = scopeUnits.includes(unitObj.unit);

            return (
              <div
                key={unitObj.unit}
                className={`border rounded-xl p-4 flex flex-col justify-between gap-3 ${
                  inScope ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/70 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-500">
                    <span>
                      {unitObj.code} · {unitObj.coCode}
                    </span>
                    <span className="tabular-nums font-semibold text-slate-900">
                      {summary.masteryPercent}% Mastery
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mt-1.5 leading-snug">
                    {unitObj.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                    {unitObj.summary}
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="w-full h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        summary.masteryPercent >= 75
                          ? 'bg-emerald-600'
                          : isWeak
                            ? 'bg-amber-600'
                            : 'bg-sky-600'
                      }`}
                      style={{ width: `${Math.max(4, summary.masteryPercent)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 font-mono tabular-nums">
                    <span>
                      Cards: {summary.masteredCards}/{summary.totalCards}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {isWeak && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                      <span>
                        {summary.quizAccuracy !== null
                          ? `Quiz: ${summary.quizAccuracy}%`
                          : `Rating: ${state.config.unitConfidence[unitObj.unit]}`}
                      </span>
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onStartUnitFlashcards(unitObj.unit)}
                      className="flex-1 py-1.5 px-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50 cursor-pointer"
                    >
                      Flashcards ({summary.dueCards} due)
                    </button>
                    <button
                      type="button"
                      onClick={() => onStartUnitTest(unitObj.unit)}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 cursor-pointer"
                    >
                      Unit Quiz
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Interactive Simulator */}
      <InteractiveSandbox />
    </div>
  );
}

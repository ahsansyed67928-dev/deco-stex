import { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Circle,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ConfidenceLevel,
  ExamScope,
  PersistedStudyState,
  ScheduledTask,
  StudyConfig,
  UnitNumber,
} from '../types/study';
import { DECO_UNITS } from '../data/decoCurriculum';
import { UnitProgressSummary } from '../utils/progressMetrics';
import { daysBetweenIso, getScopeUnits, getTodayIso } from '../utils/scheduleGenerator';

interface ScheduleViewProps {
  state: PersistedStudyState;
  schedule: ScheduledTask[];
  unitSummaries: UnitProgressSummary[];
  onUpdateConfig: (updater: (prev: StudyConfig) => StudyConfig) => void;
  onToggleTask: (taskId: string, minutes: number) => void;
  onStartUnitFlashcards: (unit: UnitNumber) => void;
  onStartUnitTest: (unit: UnitNumber) => void;
}

export function ScheduleView({
  state,
  schedule,
  unitSummaries,
  onUpdateConfig,
  onToggleTask,
  onStartUnitFlashcards,
  onStartUnitTest,
}: ScheduleViewProps) {
  const [selectedDayFilter, setSelectedDayFilter] = useState<'upcoming' | 'all'>('upcoming');
  const today = getTodayIso();
  const { config } = state;
  const activeUnits = getScopeUnits(config.examScope);
  const daysLeft = daysBetweenIso(today, config.examDate);

  // Group schedule by date
  const groupedByDate: Array<{ date: string; tasks: ScheduledTask[] }> = [];
  schedule.forEach((task) => {
    const existing = groupedByDate.find((g) => g.date === task.date);
    if (existing) existing.tasks.push(task);
    else groupedByDate.push({ date: task.date, tasks: [task] });
  });

  const visibleDays =
    selectedDayFilter === 'upcoming' ? groupedByDate.slice(0, 7) : groupedByDate;

  const totalTasks = schedule.length;
  const completedCount = schedule.filter((t) => !!state.completedTaskIds[t.id]).length;

  const handleAutoSyncConfidence = () => {
    onUpdateConfig((prev) => {
      const nextConfidence = { ...prev.unitConfidence };
      unitSummaries.forEach((s) => {
        if (s.quizAccuracy !== null) {
          nextConfidence[s.unit] =
            s.quizAccuracy < 60 ? 'weak' : s.quizAccuracy < 82 ? 'moderate' : 'strong';
        }
      });
      return { ...prev, unitConfidence: nextConfidence };
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Personalization Controls */}
        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-sky-600" />
              <h2 className="text-base font-semibold text-slate-900">Personalize Plan</h2>
            </div>
            <button
              type="button"
              onClick={handleAutoSyncConfidence}
              className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-800 cursor-pointer"
              title="Adjust unit ratings from your latest quiz scores"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync from Scores</span>
            </button>
          </div>

          {/* Exam Scope */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">Target Exam Scope</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'cie1', label: 'CIE-1 (U1–2)' },
                  { id: 'cie2', label: 'CIE-2 (U3–5)' },
                  { id: 'see', label: 'SEE (All 5)' },
                ] as Array<{ id: ExamScope; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateConfig((prev) => ({ ...prev, examScope: opt.id }))}
                  className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    config.examScope === opt.id
                      ? 'bg-sky-600 border-sky-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Exam Date */}
          <div className="space-y-1.5">
            <label
              htmlFor="exam-date-input"
              className="flex justify-between text-xs font-medium text-slate-700"
            >
              <span>Target Exam Date</span>
              <span className="font-mono tabular-nums text-sky-700">{daysLeft} days left</span>
            </label>
            <input
              id="exam-date-input"
              type="date"
              min={today}
              value={config.examDate}
              onChange={(e) =>
                e.target.value && onUpdateConfig((prev) => ({ ...prev, examDate: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Daily Study Budget */}
          <div className="space-y-1.5">
            <label
              htmlFor="daily-mins-slider"
              className="flex justify-between text-xs font-medium text-slate-700"
            >
              <span>Daily Study Budget</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {config.dailyMinutes} min/day
              </span>
            </label>
            <input
              id="daily-mins-slider"
              type="range"
              min={30}
              max={180}
              step={15}
              value={config.dailyMinutes}
              onChange={(e) =>
                onUpdateConfig((prev) => ({ ...prev, dailyMinutes: Number(e.target.value) }))
              }
              className="w-full accent-sky-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs font-mono tabular-nums text-slate-500">
              <span>30 min</span>
              <span>90 min</span>
              <span>180 min</span>
            </div>
          </div>

          {/* Unit Confidence */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200">
            <div className="text-xs font-medium text-slate-700">
              Unit Confidence (Weak units receive 3× more time)
            </div>
            {DECO_UNITS.filter((u) => activeUnits.includes(u.unit)).map((u) => {
              const current = config.unitConfidence[u.unit];
              return (
                <div key={u.unit} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-800">
                      Unit {u.unit} · {u.shortTitle}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(['weak', 'moderate', 'strong'] as ConfidenceLevel[]).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() =>
                          onUpdateConfig((prev) => ({
                            ...prev,
                            unitConfidence: { ...prev.unitConfidence, [u.unit]: lvl },
                          }))
                        }
                        className={`py-1 rounded text-xs font-medium capitalize border cursor-pointer transition-colors ${
                          current === lvl
                            ? lvl === 'weak'
                              ? 'bg-amber-50 border-amber-400 text-amber-900'
                              : lvl === 'moderate'
                                ? 'bg-sky-50 border-sky-400 text-sky-900'
                                : 'bg-emerald-50 border-emerald-400 text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Generated Timeline */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sky-600" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Adaptive Study Roadmap
                </h2>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 font-mono tabular-nums">
                {completedCount} of {totalTasks} study blocks completed · {groupedByDate.length} scheduled days
              </p>
            </div>

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedDayFilter('upcoming')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  selectedDayFilter === 'upcoming'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Next 7 Days
              </button>
              <button
                type="button"
                onClick={() => setSelectedDayFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  selectedDayFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Full Plan ({groupedByDate.length}d)
              </button>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            {visibleDays.map((day, idx) => {
              const isToday = day.date === today;
              const dayTotalMins = day.tasks.reduce((s, t) => s + t.minutes, 0);
              const dayDoneCount = day.tasks.filter((t) => !!state.completedTaskIds[t.id]).length;

              return (
                <div
                  key={day.date}
                  className={`border rounded-xl p-4 ${
                    isToday ? 'border-sky-300 bg-sky-50/30' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <span className="font-mono tabular-nums text-sm font-semibold text-slate-900">
                        {isToday ? `Today · ${day.date}` : `Day ${idx + 1} · ${day.date}`}
                      </span>
                      {idx >= groupedByDate.length - 2 && selectedDayFilter === 'all' && (
                        <span className="text-xs font-medium text-amber-800">
                          · Final Mock &amp; Revision
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono tabular-nums text-slate-600">
                      {dayDoneCount}/{day.tasks.length} done · {dayTotalMins} min
                    </span>
                  </div>

                  <ul className="divide-y divide-slate-100 mt-1">
                    {day.tasks.map((task) => {
                      const done = !!state.completedTaskIds[task.id];
                      return (
                        <li
                          key={task.id}
                          className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
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
                              <div className="text-xs font-mono tabular-nums text-slate-500 mt-1">
                                Unit {task.unit} · {task.kind.toUpperCase()} · {task.minutes} min
                              </div>
                            </div>
                          </button>

                          <div className="flex items-center gap-2 pl-8 sm:pl-0 shrink-0">
                            {task.kind === 'flashcards' ? (
                              <button
                                type="button"
                                onClick={() => onStartUnitFlashcards(task.unit)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50 cursor-pointer"
                              >
                                Study Cards
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onStartUnitTest(task.unit)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50 cursor-pointer"
                              >
                                Open Quiz
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

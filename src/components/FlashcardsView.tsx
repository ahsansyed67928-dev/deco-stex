import { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Plus,
  RotateCw,
  Shuffle,
  Trash2,
  X,
} from 'lucide-react';
import {
  CardRating,
  Flashcard,
  PersistedStudyState,
  UnitNumber,
} from '../types/study';
import { DECO_UNITS } from '../data/decoCurriculum';
import { getTodayIso } from '../utils/scheduleGenerator';

interface FlashcardsViewProps {
  state: PersistedStudyState;
  allCards: Flashcard[];
  initialUnitFilter: UnitNumber | 'all';
  onRateCard: (cardId: string, rating: CardRating) => void;
  onAddCustomCard: (card: Omit<Flashcard, 'id' | 'isCustom'>) => void;
  onDeleteCustomCard: (cardId: string) => void;
}

type DeckMode = 'due' | 'all' | 'unmastered';

export function FlashcardsView({
  state,
  allCards,
  initialUnitFilter,
  onRateCard,
  onAddCustomCard,
  onDeleteCustomCard,
}: FlashcardsViewProps) {
  const [unitFilter, setUnitFilter] = useState<UnitNumber | 'all'>(initialUnitFilter);
  const [deckMode, setDeckMode] = useState<DeckMode>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [imgErrorIds, setImgErrorIds] = useState<Record<string, boolean>>({});

  // Custom card form
  const [newUnit, setNewUnit] = useState<UnitNumber>(1);
  const [newTopic, setNewTopic] = useState('');
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newFormula, setNewFormula] = useState('');

  useEffect(() => {
    setUnitFilter(initialUnitFilter);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [initialUnitFilter]);

  const today = getTodayIso();

  const filteredDeck = useMemo(() => {
    let list = allCards.filter((c) => unitFilter === 'all' || c.unit === unitFilter);
    if (deckMode === 'due') {
      list = list.filter((c) => {
        const p = state.flashcardProgress[c.id];
        return !p || p.nextReviewDate <= today;
      });
    } else if (deckMode === 'unmastered') {
      list = list.filter((c) => state.flashcardProgress[c.id]?.box !== 3);
    }

    if (shuffleSeed > 0) {
      const copy = [...list];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = (i * 7 + shuffleSeed * 13) % (i + 1);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }
    return list;
  }, [allCards, unitFilter, deckMode, state.flashcardProgress, today, shuffleSeed]);

  const safeIndex = filteredDeck.length > 0 ? Math.min(currentIndex, filteredDeck.length - 1) : 0;
  const activeCard = filteredDeck[safeIndex];
  const activeProg = activeCard ? state.flashcardProgress[activeCard.id] : undefined;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showAddModal) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.code === 'ArrowRight') {
        setIsFlipped(false);
        setCurrentIndex((i) => (filteredDeck.length > 0 ? (i + 1) % filteredDeck.length : 0));
      } else if (e.code === 'ArrowLeft') {
        setIsFlipped(false);
        setCurrentIndex((i) =>
          filteredDeck.length > 0 ? (i - 1 + filteredDeck.length) % filteredDeck.length : 0
        );
      } else if (activeCard && isFlipped && e.key === '1') {
        handleRate('again');
      } else if (activeCard && isFlipped && e.key === '2') {
        handleRate('good');
      } else if (activeCard && isFlipped && e.key === '3') {
        handleRate('mastered');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleRate = (rating: CardRating) => {
    if (!activeCard) return;
    onRateCard(activeCard.id, rating);
    setIsFlipped(false);
    setCurrentIndex((prev) => (filteredDeck.length > 1 ? (prev + 1) % filteredDeck.length : 0));
  };

  const handleSubmitCustomCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;
    onAddCustomCard({
      unit: newUnit,
      co: `CO${newUnit}`,
      topic: newTopic.trim() || 'Custom Note',
      front: newFront.trim(),
      back: newBack.trim(),
      formula: newFormula.trim() || undefined,
    });
    setNewTopic('');
    setNewFront('');
    setNewBack('');
    setNewFormula('');
    setShowAddModal(false);
  };

  const boxLabel = (box?: number) => {
    if (box === 3) return 'Mastered';
    if (box === 2) return 'Familiar';
    if (box === 1) return 'Learning';
    return 'New / Due';
  };

  return (
    <div className="space-y-6">
      {/* Filter & Controls Bar */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setUnitFilter('all');
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                unitFilter === 'all'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Units ({allCards.length})
            </button>
            {DECO_UNITS.map((u) => {
              const count = allCards.filter((c) => c.unit === u.unit).length;
              return (
                <button
                  key={u.unit}
                  type="button"
                  onClick={() => {
                    setUnitFilter(u.unit);
                    setCurrentIndex(0);
                    setIsFlipped(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    unitFilter === u.unit
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Unit {u.unit} ({count})
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'all', label: 'All Cards' },
                { id: 'due', label: 'Due Today' },
                { id: 'unmastered', label: 'Unmastered' },
              ] as Array<{ id: DeckMode; label: string }>
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setDeckMode(m.id);
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                  deckMode === m.id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {m.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setShuffleSeed((s) => s + 1);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Shuffle</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-medium hover:bg-sky-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Card</span>
            </button>
          </div>
        </div>
      </section>

      {/* Active Flashcard Stage */}
      {!activeCard ? (
        <section className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-900">
            Deck Complete for Current Filter
          </h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            All matching cards in this filter have been cleared. Switch to &ldquo;All Cards&rdquo; or select another DECO unit to continue reviewing.
          </p>
          <button
            type="button"
            onClick={() => {
              setDeckMode('all');
              setUnitFilter('all');
              setCurrentIndex(0);
            }}
            className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 cursor-pointer"
          >
            Show All Cards
          </button>
        </section>
      ) : (
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-600 px-1">
            <span>
              Card {safeIndex + 1} of {filteredDeck.length} · Unit {activeCard.unit} · {activeCard.co} · {activeCard.topic}
            </span>
            <span
              className={`font-sans font-medium ${
                activeProg?.box === 3
                  ? 'text-emerald-700'
                  : activeProg?.box === 1 || activeProg?.box === 2
                    ? 'text-sky-700'
                    : 'text-amber-700'
              }`}
            >
              Status: {boxLabel(activeProg?.box)}
            </span>
          </div>

          {/* 3D Flip Card */}
          <div className="flashcard-scene h-[420px] sm:h-[440px]">
            <div
              className={`flashcard-inner cursor-pointer ${isFlipped ? 'is-flipped' : ''}`}
              onClick={() => setIsFlipped((f) => !f)}
              role="button"
              tabIndex={0}
              aria-label="Flip flashcard"
              onKeyDown={(e) => {
                if (e.key === 'Enter') setIsFlipped((f) => !f);
              }}
            >
              {/* Front Face */}
              <div className="flashcard-face bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono">QUESTION PROMPT</span>
                  <span className="inline-flex items-center gap-1 text-sky-700 font-medium">
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Click or Space to reveal</span>
                  </span>
                </div>

                <div className="my-auto py-4 space-y-4">
                  <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 leading-snug text-center">
                    {activeCard.front}
                  </h2>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{activeCard.isCustom ? 'Custom Study Card' : 'DECO U24EC304 Deck'}</span>
                  {activeCard.isCustom && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCustomCard(activeCard.id);
                      }}
                      className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Back Face */}
              <div className="flashcard-face flashcard-face-back bg-slate-900 text-slate-50 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono">ANSWER &amp; EXAM EXPLANATION</span>
                  <span className="inline-flex items-center gap-1 text-sky-300 font-medium">
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Click to view prompt</span>
                  </span>
                </div>

                <div className="my-auto py-3 space-y-4">
                  <p className="text-base sm:text-lg text-slate-100 leading-relaxed">
                    {activeCard.back}
                  </p>

                  {activeCard.formula && (
                    <div className="rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 font-mono text-sm text-sky-300 text-center">
                      {activeCard.formula}
                    </div>
                  )}

                  {activeCard.diagramUrl && !imgErrorIds[activeCard.id] && (
                    <div className="bg-white rounded-lg p-2 max-h-44 overflow-hidden flex items-center justify-center">
                      <img
                        src={activeCard.diagramUrl}
                        alt={activeCard.diagramAlt || activeCard.topic}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setImgErrorIds((prev) => ({ ...prev, [activeCard.id]: true }))
                        }
                        className="max-h-40 w-auto object-contain"
                      />
                    </div>
                  )}
                </div>

                <div className="text-xs text-slate-400 text-center">
                  Rate below or press 1 (Again) · 2 (Good) · 3 (Mastered)
                </div>
              </div>
            </div>
          </div>

          {/* Navigation & Rating Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentIndex(
                    (safeIndex - 1 + filteredDeck.length) % filteredDeck.length
                  );
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentIndex((safeIndex + 1) % filteredDeck.length);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleRate('again')}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs sm:text-sm font-medium hover:bg-amber-100 cursor-pointer"
              >
                Again (Today)
              </button>
              <button
                type="button"
                onClick={() => handleRate('good')}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-lg border border-sky-300 bg-sky-50 text-sky-900 text-xs sm:text-sm font-medium hover:bg-sky-100 cursor-pointer"
              >
                Good (+2d)
              </button>
              <button
                type="button"
                onClick={() => handleRate('mastered')}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs sm:text-sm font-medium hover:bg-emerald-700 cursor-pointer"
              >
                Mastered (+7d)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Flashcard Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-card-title"
        >
          <form
            onSubmit={handleSubmitCustomCard}
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 id="add-card-title" className="text-lg font-semibold text-slate-900">
                Add Custom Offline Flashcard
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Unit</label>
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(Number(e.target.value) as UnitNumber)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                >
                  {DECO_UNITS.map((u) => (
                    <option key={u.unit} value={u.unit}>
                      Unit {u.unit}: {u.shortTitle}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Topic</label>
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="e.g., K-Map Don't Cares"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Front (Question / Concept)
              </label>
              <textarea
                required
                rows={2}
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                placeholder="Enter exam question or prompt..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Back (Answer &amp; Key Points)
              </label>
              <textarea
                required
                rows={3}
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                placeholder="Enter concise explanation..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Optional Formula / RTL
              </label>
              <input
                type="text"
                value={newFormula}
                onChange={(e) => setNewFormula(e.target.value)}
                placeholder="e.g., S = (n·k) / (k + n − 1)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 cursor-pointer"
              >
                Save Card Offline
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

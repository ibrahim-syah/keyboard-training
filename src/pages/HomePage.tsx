import { Link } from 'react-router-dom';
import type { KeyCategory } from '../domain/types';
import { getProficiencyRating, getSessions } from '../domain/progress-tracker';

interface CategoryCard {
  id: KeyCategory | 'mixed';
  label: string;
  description: string;
  icon: string;
  link: string;
}

const CATEGORY_CARDS: CategoryCard[] = [
  {
    id: 'modifiers',
    label: 'Modifiers',
    description: 'Practice ⌘ ⌃ ⌥ ⇧ keys alone and together',
    icon: '⌘',
    link: '/exercise?category=modifiers',
  },
  {
    id: 'numbers',
    label: 'Numbers',
    description: 'Number keys 0–9 with modifier combos',
    icon: '#',
    link: '/exercise?category=numbers',
  },
  {
    id: 'function-keys',
    label: 'Function Keys',
    description: 'F1–F12 with Fn/Globe and modifiers',
    icon: 'Fn',
    link: '/exercise?category=function-keys',
  },
  {
    id: 'navigation',
    label: 'Navigation',
    description: 'Arrows, Home, End, Page Up/Down',
    icon: '↑',
    link: '/exercise?category=navigation',
  },
  {
    id: 'combinations',
    label: 'Combinations',
    description: 'Multi-key combos across difficulty levels',
    icon: '⌃⇧',
    link: '/exercise?category=combinations',
  },
  {
    id: 'mixed',
    label: 'Mixed Mode',
    description: 'Random prompts from all categories',
    icon: '🎲',
    link: '/exercise?category=mixed',
  },
];

const MIN_SESSIONS_FOR_RATING = 5;

function ProficiencyStars({ category }: { category: KeyCategory }) {
  const rating = getProficiencyRating(category);

  if (rating === null) {
    const sessions = getSessions(category);
    const remaining = MIN_SESSIONS_FOR_RATING - sessions.length;
    return (
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {remaining} more session{remaining !== 1 ? 's' : ''} needed
      </span>
    );
  }

  return (
    <span className="text-sm" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={i < rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
        >
          ★
        </span>
      ))}
    </span>
  );
}

export default function HomePage() {
  return (
    <div className="p-8">
      {/* Welcome section */}
      <section className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Modifier Key Trainer
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
          Build muscle memory for modifier keys, number keys, function keys, and
          multi-key combinations on macOS. Pick a category below to get started.
        </p>
      </section>

      {/* Quick-start category grid */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Quick Start
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORY_CARDS.map((card) => (
            <Link
              key={card.id}
              to={card.link}
              className="group block rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl" aria-hidden="true">
                  {card.icon}
                </span>
                {card.id !== 'mixed' && (
                  <ProficiencyStars category={card.id as KeyCategory} />
                )}
              </div>
              <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {card.label}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Navigation links */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          More Options
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/drill"
            className="inline-flex items-center gap-2 rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            🔁 Drill Mode
          </Link>
          <Link
            to="/progress"
            className="inline-flex items-center gap-2 rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            📊 Progress
          </Link>
          <Link
            to="/custom-sets"
            className="inline-flex items-center gap-2 rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            🎯 Custom Sets
          </Link>
        </div>
      </section>
    </div>
  );
}

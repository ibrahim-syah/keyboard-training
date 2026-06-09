import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import {
  getSessions,
  getWeakestCombinations,
  getProficiencyRating,
  isStorageAvailable,
} from '../domain/progress-tracker';
import { formatKeyCombination } from '../domain/key-display';
import type { KeyCategory, SessionRecord } from '../domain/types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

const ALL_CATEGORIES: { id: KeyCategory; label: string }[] = [
  { id: 'modifiers', label: 'Modifiers' },
  { id: 'numbers', label: 'Numbers' },
  { id: 'function-keys', label: 'Function Keys' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'combinations', label: 'Combinations' },
];

const MIN_SESSIONS_FOR_PROFICIENCY = 5;

/**
 * TrendChart component renders a Line chart with accuracy and speed
 * over the last 30 days. Falls back to a text table on render error.
 */
function TrendChart({ sessions }: { sessions: SessionRecord[] }) {
  const [chartError, setChartError] = useState(false);

  const chartData = useMemo(() => {
    const sorted = [...sessions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const labels = sorted.map((s) => {
      const d = new Date(s.date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Accuracy (%)',
          data: sorted.map((s) => Math.round(s.accuracy * 100)),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          yAxisID: 'y',
          tension: 0.3,
        },
        {
          label: 'Avg Response Time (ms)',
          data: sorted.map((s) => Math.round(s.avgResponseTimeMs)),
          borderColor: 'rgb(249, 115, 22)',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          yAxisID: 'y1',
          tension: 0.3,
        },
      ],
    };
  }, [sessions]);

  const chartOptions: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: 'Performance Trends (Last 30 Days)',
        },
      },
      scales: {
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          min: 0,
          max: 100,
          title: {
            display: true,
            text: 'Accuracy (%)',
          },
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          min: 0,
          title: {
            display: true,
            text: 'Response Time (ms)',
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    }),
    [],
  );

  if (chartError) {
    return <FallbackStatsTable sessions={sessions} />;
  }

  try {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <ErrorBoundary onError={() => setChartError(true)}>
          <Line data={chartData} options={chartOptions} />
        </ErrorBoundary>
      </div>
    );
  } catch {
    setChartError(true);
    return <FallbackStatsTable sessions={sessions} />;
  }
}

/**
 * Fallback text-based stats table when chart rendering fails.
 */
function FallbackStatsTable({ sessions }: { sessions: SessionRecord[] }) {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Performance Trends (Last 30 Days)
      </h3>
      <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
        Chart unavailable — showing text-based stats.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">
                Date
              </th>
              <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">
                Category
              </th>
              <th className="text-right py-2 px-3 text-gray-700 dark:text-gray-300">
                Accuracy
              </th>
              <th className="text-right py-2 px-3 text-gray-700 dark:text-gray-300">
                Avg Time
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr
                key={s.id}
                className="border-b border-gray-100 dark:border-gray-700"
              >
                <td className="py-2 px-3 text-gray-800 dark:text-gray-200">
                  {new Date(s.date).toLocaleDateString()}
                </td>
                <td className="py-2 px-3 text-gray-800 dark:text-gray-200">
                  {s.category}
                </td>
                <td className="py-2 px-3 text-right text-gray-800 dark:text-gray-200">
                  {Math.round(s.accuracy * 100)}%
                </td>
                <td className="py-2 px-3 text-right text-gray-800 dark:text-gray-200">
                  {Math.round(s.avgResponseTimeMs)}ms
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Simple ErrorBoundary component for catching chart render errors.
 */
import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onError: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    this.props.onError();
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

/**
 * Renders filled and empty stars for a proficiency rating (1-5).
 */
function ProficiencyStars({ rating }: { rating: number }) {
  return (
    <span className="text-xl" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) =>
        i < rating ? '★' : '☆',
      ).join('')}
    </span>
  );
}

export default function ProgressPage() {
  const storageAvailable = useMemo(() => isStorageAvailable(), []);
  const sessions = useMemo(() => getSessions(undefined, 30), []);
  const weakest = useMemo(() => getWeakestCombinations(5), []);

  const proficiencyByCategory = useMemo(() => {
    return ALL_CATEGORIES.map((cat) => ({
      ...cat,
      rating: getProficiencyRating(cat.id),
      sessionCount: getSessions(cat.id).length,
    }));
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Progress
      </h1>

      {!storageAvailable && (
        <div
          className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4 text-amber-800 dark:text-amber-200"
          role="alert"
        >
          Progress cannot be saved — storage unavailable
        </div>
      )}

      {/* Trend Chart */}
      {sessions.length > 0 ? (
        <TrendChart sessions={sessions} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400">
            No sessions recorded in the last 30 days. Complete some exercises to
            see your progress trends.
          </p>
        </div>
      )}

      {/* Weakest Combinations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Weakest Combinations
        </h2>
        {weakest.length > 0 ? (
          <ul className="space-y-3">
            {weakest.map((stat, idx) => {
              const accuracy =
                stat.attempts > 0
                  ? Math.round((stat.correctCount / stat.attempts) * 100)
                  : 0;
              return (
                <li
                  key={idx}
                  className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2 last:border-0"
                >
                  <span className="font-mono text-lg text-gray-900 dark:text-gray-100">
                    {formatKeyCombination(stat.combination)}
                  </span>
                  <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
                    <span>
                      Accuracy:{' '}
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {accuracy}%
                      </span>
                    </span>
                    <span>
                      Avg Time:{' '}
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {Math.round(stat.avgResponseTimeMs)}ms
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            No combination data available yet. Complete some exercises to see
            your weakest areas.
          </p>
        )}
      </div>

      {/* Proficiency Ratings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Proficiency by Category
        </h2>
        <ul className="space-y-4">
          {proficiencyByCategory.map((cat) => (
            <li
              key={cat.id}
              className="flex items-center justify-between"
            >
              <span className="text-gray-900 dark:text-gray-100 font-medium">
                {cat.label}
              </span>
              <span>
                {cat.rating !== null ? (
                  <ProficiencyStars rating={cat.rating} />
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {MIN_SESSIONS_FOR_PROFICIENCY - cat.sessionCount} more{' '}
                    {MIN_SESSIONS_FOR_PROFICIENCY - cat.sessionCount === 1
                      ? 'session'
                      : 'sessions'}{' '}
                    needed
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

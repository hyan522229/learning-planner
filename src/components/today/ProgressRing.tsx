import { motion } from 'motion/react';

interface Props {
  completed: number;
  total: number;
}

export function ProgressRing({ completed, total }: Props) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (pct / 100) * circumference;
  const allDone = total > 0 && completed >= total;

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${allDone ? 'bg-emerald-50' : 'bg-indigo-50'}`}>
      <svg width="88" height="88" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" fill="none" stroke="#e5e7eb" strokeWidth="6" />
        {total > 0 && (
          <motion.circle
            cx="50" cy="50" r="44" fill="none" stroke={allDone ? '#10b981' : '#6366f1'} strokeWidth="6"
            strokeLinecap="round" strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            transform="rotate(-90 50 50)"
          />
        )}
        {total > 0 && (
          <text x="50" y="54" textAnchor="middle" className="text-sm font-bold" fill={allDone ? '#059669' : '#4f46e5'}>
            {pct}%
          </text>
        )}
      </svg>
      <div>
        {total > 0 ? (
          <>
            <div className={`text-2xl font-bold ${allDone ? 'text-emerald-600' : 'text-indigo-600'}`}>
              {completed}/{total}
            </div>
            {allDone ? (
              <div className="text-xs text-emerald-600 font-medium">全部完成！</div>
            ) : (
              <div className="text-xs text-gray-500">今日已安排 {total} 个学习块</div>
            )}
            <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> 复习
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> 新学
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="text-lg font-semibold text-gray-400">--/--</div>
            <div className="text-xs text-gray-400">尚未生成今日规划</div>
          </>
        )}
      </div>
    </div>
  );
}

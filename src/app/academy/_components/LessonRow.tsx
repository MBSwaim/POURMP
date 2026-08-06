import { LessonStateBadge } from './LessonStateBadge'
import type { Lesson } from '../taproom/placeholderData'

export function LessonRow({ lesson }: { lesson: Lesson }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-[#e8e2d7] bg-[#fffdf8] px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#1b1b1b]">{lesson.title}</p>
        {lesson.note && (
          <p className="text-xs text-[#8a5a1e] mt-1 leading-relaxed">{lesson.note}</p>
        )}
      </div>
      <div className="shrink-0">
        <LessonStateBadge state={lesson.state} />
      </div>
    </div>
  )
}

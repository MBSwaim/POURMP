import Link from 'next/link'

interface Props {
  name: string
  description: string
  href?: string
  status: 'active' | 'future'
}

export function AcademyCard({ name, description, href, status }: Props) {
  const body = (
    <div
      className={
        status === 'active'
          ? 'rounded-2xl border border-[#e8e2d7] bg-[#fffdf8] px-5 py-5 transition-all hover:-translate-y-0.5 hover:border-[#cfc6b8] hover:shadow-[0_8px_20px_rgba(0,0,0,0.05)]'
          : 'rounded-2xl border border-dashed border-[#d7d0c5] bg-[#fffdf8]/60 px-5 py-5 opacity-70'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-[#1b1b1b]">{name}</h3>
        {status === 'future' && (
          <span className="text-[10px] font-bold tracking-widest uppercase text-[#999] border border-[#d7d0c5] rounded-full px-2 py-0.5 whitespace-nowrap">
            Future
          </span>
        )}
      </div>
      <p className="text-sm text-[#777] mt-1.5 leading-relaxed">{description}</p>
      {status === 'active' && (
        <p className="text-xs font-bold uppercase tracking-wide text-[#b07d2e] mt-3">Enter Academy →</p>
      )}
    </div>
  )

  if (status === 'active' && href) {
    return <Link href={href}>{body}</Link>
  }
  return body
}

// Visual scope note: this layout applies the Academy-specific look (warm
// cream background, restrained accent, rounded/pill controls) only within
// /academy/* — it does not touch globals.css or any shared token, so every
// other route in the app is unaffected.
export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full bg-[#f7f3ea]">{children}</div>
}

import { getPackages } from '@/lib/db'
import { BookingForm } from './BookingForm'

export const dynamic = 'force-dynamic'

export default function BookPage() {
  const packages = getPackages()
  return (
    <div className="min-h-screen bg-[#f9f8f6] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-2">Manhattan Project Beer Co.</p>
          <h1 className="text-3xl font-bold text-[#1F3348]">Private Event Request</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Fill out the form below and our events team will be in touch within 48 hours.
          </p>
        </div>

        <BookingForm packages={packages} />

        <p className="text-center text-xs text-gray-400 mt-8">
          Questions? Email us at <a href="mailto:events@manhattanproject.beer" className="underline">events@manhattanproject.beer</a>
        </p>
      </div>
    </div>
  )
}

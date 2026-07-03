import Link from 'next/link'
import { getAllPackages, getSettings } from '@/lib/db'
import { GENERAL_INFO, CANCELLATION_POLICY, MPBC_CONTACT } from '@/lib/constants'
import { SettingsClient } from './SettingsClient'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  const packages = getAllPackages()
  const stored   = getSettings()

  const settings = {
    general_info:        stored.general_info        ?? GENERAL_INFO,
    cancellation_policy: stored.cancellation_policy ?? CANCELLATION_POLICY,
    contact:             stored.contact             ?? MPBC_CONTACT,
    notif_sms_enabled:   stored.notif_sms_enabled   ?? 'false',
    notif_email_enabled: stored.notif_email_enabled ?? 'false',
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Manage proposal content, packages, and business info.</p>
        </div>
        <Link href="/staff" className="text-xs text-[#C8973A] hover:underline whitespace-nowrap mt-1">
          Staff Directory →
        </Link>
      </div>
      <SettingsClient initialSettings={settings} initialPackages={packages} />
    </div>
  )
}

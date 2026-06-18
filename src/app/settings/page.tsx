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
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage proposal content, packages, and business info.</p>
      </div>
      <SettingsClient initialSettings={settings} initialPackages={packages} />
    </div>
  )
}

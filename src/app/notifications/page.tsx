import { NotificationsClient } from './NotificationsClient'

export default function NotificationsPage() {
  return (
    <div className="px-4 py-5 space-y-5 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold tracking-widest uppercase text-white leading-none">Notification Center</h1>
      <NotificationsClient />
    </div>
  )
}

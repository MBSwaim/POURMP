export default function SettingsPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="rounded-xl border border-white/10 bg-[#1F3348]/50 p-6 space-y-4">
        <p className="text-gray-400">Settings coming soon. Planned features:</p>
        <ul className="text-gray-300 space-y-2 text-sm list-disc pl-5">
          <li>Cancellation policy text editor</li>
          <li>Package management (add / edit / archive)</li>
          <li>Logo upload for proposals</li>
          <li>Default buffer percentage</li>
          <li>Tax rate configuration</li>
          <li>Contact info for PDF footer</li>
        </ul>
      </div>
    </div>
  )
}

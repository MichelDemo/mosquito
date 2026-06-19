import ReminderPreferences from '@/components/ReminderPreferences'

export default function PreferencesPage({ params }: { params: { token: string } }) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full">
        <div className="text-center mb-5">
          <div className="text-5xl mb-2">🦟</div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Mosquito
          </p>
        </div>

        <ReminderPreferences token={params.token} />

        <p className="mt-6 text-center text-xs text-gray-300">
          Mosquito — La piqûre de rappel qui ne s&apos;oublie pas.
        </p>
      </div>
    </main>
  )
}

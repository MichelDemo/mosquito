export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
          <p className="text-5xl font-bold text-blue-600 mb-4">404</p>
          <h1 className="text-xl font-semibold text-gray-800 mb-3">
            Lien introuvable
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Ce lien de rappel est invalide ou a expiré.
            <br />
            Veuillez contacter votre formateur si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
          </p>
        </div>
      </div>
    </div>
  )
}

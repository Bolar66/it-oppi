import { Link } from 'react-router'

export default function NotFound() {
  return (
    <div className="py-10 text-center">
      <h1 className="text-2xl font-bold">Sivua ei löytynyt</h1>
      <Link to="/" className="mt-4 inline-block text-accent underline">
        Etusivulle
      </Link>
    </div>
  )
}

import Markdown from 'react-markdown'

export default function Theory({ markdown }: { markdown: string }) {
  return (
    <article className="theory">
      <Markdown>{markdown}</Markdown>
    </article>
  )
}

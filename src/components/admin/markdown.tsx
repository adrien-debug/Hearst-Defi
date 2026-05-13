import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-spec">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-8 mb-4 text-2xl font-medium first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-7 mb-3 text-lg font-medium text-[--color-text]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-5 mb-2 text-base font-medium text-[--color-text-muted]">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-3 text-sm leading-relaxed text-[--color-text-muted]">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-3 list-disc space-y-1 pl-5 text-sm text-[--color-text-muted]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 list-decimal space-y-1 pl-5 text-sm text-[--color-text-muted]">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="text-sm">{children}</li>,
          code: ({ children, className }) => {
            if (className?.startsWith("language-")) {
              return (
                <code className="font-mono text-xs text-[--color-brand]">
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-[--color-bg-elevated] px-1 py-0.5 font-mono text-xs text-[--color-text]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-4 overflow-x-auto rounded-md border border-[--color-border] bg-[--color-bg-elevated] p-4 text-xs">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-[--color-border] px-3 py-2 text-left font-medium text-[--color-text-muted] uppercase tracking-wide">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-[--color-border] px-3 py-2 align-top text-[--color-text-muted]">
              {children}
            </td>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-[--color-brand] underline-offset-2 hover:underline"
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noreferrer" : undefined}
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-2 border-[--color-brand] pl-4 text-sm italic text-[--color-text-muted]">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-6 border-t border-[--color-border]" />
          ),
          strong: ({ children }) => (
            <strong className="font-medium text-[--color-text]">
              {children}
            </strong>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

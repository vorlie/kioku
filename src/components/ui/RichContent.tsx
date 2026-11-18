import { Fragment, useMemo, useState, type ReactNode } from "react";
import { parseRichContent, type RichNode } from "../../utils/richContent";
import { openExternalUrl } from "../../utils/safeUrl";

interface RichContentProps {
  content?: string | null;
  allowBasicHtml?: boolean;
  className?: string;
}

function SpoilerNode({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <button
      type="button"
      className={`rich-content__spoiler ${revealed ? "rich-content__spoiler--revealed" : ""}`}
      aria-expanded={revealed}
      onClick={(event) => {
        event.stopPropagation();
        setRevealed((prev) => !prev);
      }}
      title={revealed ? "Hide spoiler" : "Click to reveal spoiler"}
    >
      {children}
    </button>
  );
}

function renderNodes(nodes: RichNode[], keyPrefix: string): ReactNode {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (node.type) {
      case "text":
        return <Fragment key={key}>{node.value}</Fragment>;
      case "break":
        return <br key={key} />;
      case "bold":
        return <strong key={key}>{renderNodes(node.children, key)}</strong>;
      case "italic":
        return <em key={key}>{renderNodes(node.children, key)}</em>;
      case "strike":
        return <del key={key}>{renderNodes(node.children, key)}</del>;
      case "code":
        return (
          <code key={key} className="rich-content__code">
            {node.value}
          </code>
        );
      case "spoiler":
        return (
          <SpoilerNode key={key}>
            {renderNodes(node.children, key)}
          </SpoilerNode>
        );
      case "link":
        return (
          <a
            key={key}
            href={node.href}
            className="rich-content__link"
            rel="noopener noreferrer"
            title={node.href}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void openExternalUrl(node.href);
            }}
          >
            {renderNodes(node.children, key)}
          </a>
        );
      case "image":
        return (
          <img
            key={key}
            src={node.src}
            alt={node.alt}
            className="rich-content__image"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        );
      case "blockquote":
        return (
          <blockquote key={key} className="rich-content__quote">
            {renderNodes(node.children, key)}
          </blockquote>
        );
      case "paragraph":
        return (
          <p key={key} className="rich-content__paragraph">
            {renderNodes(node.children, key)}
          </p>
        );
    }
  });
}

export default function RichContent({
  content,
  allowBasicHtml = false,
  className = "",
}: RichContentProps) {
  const { nodes, truncated } = useMemo(
    () => parseRichContent(content ?? "", { allowBasicHtml }),
    [content, allowBasicHtml],
  );

  if (nodes.length === 0) return null;

  return (
    <div className={`rich-content ${className}`.trim()}>
      {renderNodes(nodes, "rc")}
      {truncated && (
        <p className="rich-content__truncated">Content truncated for safety.</p>
      )}
    </div>
  );
}

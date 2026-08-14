import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { MediaRelationConnection } from "../../types/anilist";

interface MediaRelationsProps {
  relations?: MediaRelationConnection | null;
}

function formatRelationType(type: string) {
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatStatus(status?: string) {
  if (!status) return "";

  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function MediaRelations({
  relations,
}: MediaRelationsProps) {
  const edges = relations?.edges?.filter(
    (edge) => edge?.node
  ) ?? [];

  if (edges.length === 0) return null;

  return (
    <section className="detail-panel media-relations">
      <div className="media-relations__header">
        <div>
          <span className="media-relations__eyebrow">
            Connected Media
          </span>

          <h2 className="media-relations__title">
            Relations
          </h2>
        </div>

        <span className="media-relations__count">
          {edges.length}
        </span>
      </div>

      <div className="media-relations__grid">
        {edges.map((edge, index) => {
          const node = edge.node;

          if (!node) return null;

          const title =
            node.title?.userPreferred ||
            node.title?.english ||
            node.title?.romaji ||
            "Unknown title";

          const cover =
            node.coverImage?.large ||
            node.coverImage?.medium;

          const mediaType =
            node.type?.toLowerCase() ?? "anime";

          return (
            <Link
              key={`${node.id}-${edge.relationType}-${index}`}
              to={`/${mediaType}/${node.id}`}
              className="media-relation"
            >
              <div className="media-relation__cover-wrapper">
                {cover ? (
                  <img
                    src={cover}
                    alt={title}
                    className="media-relation__cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="media-relation__cover-placeholder">
                    No Image
                  </div>
                )}

                {node.format && (
                  <span className="media-relation__format">
                    {node.format}
                  </span>
                )}
              </div>

              <div className="media-relation__content">
                <span className="media-relation__type">
                  {formatRelationType(edge.relationType)}
                </span>

                <h3
                  className="media-relation__name"
                  title={title}
                >
                  {title}
                </h3>

                <div className="media-relation__meta">
                  {node.status && (
                    <span>
                      {formatStatus(node.status)}
                    </span>
                  )}

                  {node.type && (
                    <>
                      <span className="media-relation__dot">
                        •
                      </span>

                      <span>
                        {node.type}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <ArrowUpRight
                size={16}
                className="media-relation__arrow"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
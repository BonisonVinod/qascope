"use client";

import { useState } from "react";
import { deleteDocumentAction } from "./actions";

export function DeleteButton({
  documentId,
  title,
}: {
  documentId: string;
  title: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${title}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteDocumentAction(documentId);
      if (!result.ok) {
        setError(result.error);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete document"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
    );
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
    >
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  );
}

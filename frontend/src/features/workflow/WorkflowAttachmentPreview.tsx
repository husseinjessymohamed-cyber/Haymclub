import {
  useEffect,
  useState,
} from 'react';

import {
  getWorkflowApiError,
  getWorkflowFeedbackAttachment,
} from '../../lib/workflow-api';

interface WorkflowAttachmentPreviewProps {
  feedbackId: string;
  originalName?: string | null;
}

export function WorkflowAttachmentPreview({
  feedbackId,
  originalName,
}: WorkflowAttachmentPreviewProps) {
  const [imageUrl, setImageUrl] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(
          imageUrl,
        );
      }
    };
  }, [imageUrl]);

  async function loadImage():
  Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const blob =
        await getWorkflowFeedbackAttachment(
          feedbackId,
        );

      const nextUrl =
        URL.createObjectURL(blob);

      setImageUrl((current) => {
        if (current) {
          URL.revokeObjectURL(
            current,
          );
        }

        return nextUrl;
      });
    } catch (requestError) {
      setError(
        getWorkflowApiError(
          requestError,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  if (imageUrl) {
    return (
      <div className="workflow-attachment-preview">
        <a
          href={imageUrl}
          target="_blank"
          rel="noreferrer"
        >
          <img
            src={imageUrl}
            alt={
              originalName ||
              'الصورة المرفقة'
            }
          />
        </a>

        <small>
          {originalName ||
            'الصورة المرفقة'}
        </small>
      </div>
    );
  }

  return (
    <div className="workflow-attachment-loader">
      <button
        type="button"
        disabled={loading}
        onClick={() =>
          void loadImage()
        }
      >
        {loading
          ? 'جارٍ تحميل الصورة...'
          : '🖼 عرض الصورة المرفقة'}
      </button>

      {error && (
        <small className="workflow-attachment-error">
          {error}
        </small>
      )}
    </div>
  );
}

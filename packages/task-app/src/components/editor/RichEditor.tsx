"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import type { NodeViewRenderer } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { Image as TiptapImageExtension } from "@tiptap/extension-image";
import { CaseService } from "@task/core";
import { Bold, Heading1, Heading2, Image as ImageIcon, Italic, List, ListOrdered } from "lucide-react";

export type DescriptionFormat = "plain" | "tiptap_json";

export interface RichEditorOutput {
  description: string;
  descriptionFormat: DescriptionFormat;
  descriptionText: string;
}

// ── Presigned URL cache ────────────────────────────────────────────────────────
// Module-level: shared across instances, survives re-renders.
// TTL 50 min gives safe margin before the 60-min S3 expiry.
const presignedUrlCache = new Map<string, { readUrl: string; expiresAt: number }>();
const CACHE_TTL_MS = 50 * 60 * 1000;

async function fetchReadUrl(objectKey: string): Promise<string> {
  const cached = presignedUrlCache.get(objectKey);
  if (cached && cached.expiresAt > Date.now()) return cached.readUrl;
  const { readUrl } = await CaseService.getReadPresignedUrl(objectKey);
  presignedUrlCache.set(objectKey, { readUrl, expiresAt: Date.now() + CACHE_TTL_MS });
  return readUrl;
}

// ── Custom image node view ─────────────────────────────────────────────────────
function ImageNodeView(props: NodeViewProps) {
  const attrs = props.node?.attrs ?? {};
  const objectKey = attrs.objectKey as string | null;
  const staticSrc = attrs.src as string | null;
  const [src, setSrc] = useState<string | null>(staticSrc || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!objectKey) {
      setSrc(staticSrc || null);
      return;
    }
    let cancelled = false;
    fetchReadUrl(objectKey)
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [objectKey, staticSrc]);

  return (
    <NodeViewWrapper>
      {failed ? (
        <div className="flex items-center justify-center h-16 w-full bg-red-50 rounded-lg my-2 text-xs text-red-400">
          Image failed to load
        </div>
      ) : src ? (
        <img src={src} alt="" className="max-w-full h-auto rounded-lg my-2" />
      ) : (
        <div className="flex items-center justify-center h-16 w-32 bg-slate-100 rounded-lg my-2 text-xs text-slate-400 animate-pulse">
          Loading…
        </div>
      )}
    </NodeViewWrapper>
  );
}

// ── Custom image extension ─────────────────────────────────────────────────────
const CustomImage = TiptapImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      objectKey: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-object-key"),
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.objectKey ? { "data-object-key": attrs.objectKey } : {},
      },
    };
  },
  addNodeView(): NodeViewRenderer {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_SIZE = 5 * 1024 * 1024;

// ── Content conversion helper ─────────────────────────────────────────────────
function toEditorContent(description: string, descriptionFormat?: DescriptionFormat): object | string {
  if (descriptionFormat === "tiptap_json" && description) {
    try {
      return JSON.parse(description) as object;
    } catch {
      // fall through to plain text conversion
    }
  }
  if (!description) return "";
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: description }] }],
  };
}

// ── Toolbar button ────────────────────────────────────────────────────────────
function ToolbarBtn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center justify-center w-7 h-7 rounded text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed${active ? " bg-slate-200 text-indigo-600" : ""}`}
    >
      {children}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface RichEditorProps {
  description: string;
  descriptionFormat?: DescriptionFormat;
  onChange?: (output: RichEditorOutput) => void;
  readOnly?: boolean;
  caseId?: string;
}

export function RichEditor({ description, descriptionFormat, onChange, readOnly = false, caseId }: RichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, CustomImage],
    content: toEditorContent(description, descriptionFormat),
    editable: !readOnly,
    onUpdate: ({ editor: e }) => {
      if (!onChange) return;
      onChange({
        description: JSON.stringify(e.getJSON()),
        descriptionFormat: "tiptap_json",
        descriptionText: e.getText(),
      });
    },
  });

  // Sync content when description prop changes (e.g., modal re-opens with different case)
  const lastSyncedRef = useRef<{ desc: string; fmt: string | undefined }>({ desc: description, fmt: descriptionFormat });
  useEffect(() => {
    if (!editor) return;
    if (lastSyncedRef.current.desc === description && lastSyncedRef.current.fmt === descriptionFormat) return;
    lastSyncedRef.current = { desc: description, fmt: descriptionFormat };
    editor.commands.setContent(toEditorContent(description, descriptionFormat) || "", { emitUpdate: false });
  }, [editor, description, descriptionFormat]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!caseId || !editor) return;
    if (!ALLOWED_TYPES.has(file.type)) {
      setUploadError("PNG, JPEG, WebP images only");
      return;
    }
    if (file.size > MAX_SIZE) {
      setUploadError("Image must be under 5MB");
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      const { url, fields, objectKey } = await CaseService.getUploadPresignedUrl({
        caseId,
        contentType: file.type,
        fileSize: file.size,
      });
      const fd = new FormData();
      Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
      fd.append("file", file);
      const res = await fetch(url, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      editor.chain().focus().insertContent({ type: "image", attrs: { src: "", objectKey } }).run();
    } catch {
      setUploadError("Image upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, [caseId, editor]);

  // ── Drag & drop handler ──────────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!caseId) return;
    const file = Array.from(e.dataTransfer.files).find((f) => ALLOWED_TYPES.has(f.type));
    if (!file) return;
    e.preventDefault();
    void handleImageUpload(file);
  }, [caseId, handleImageUpload]);

  // ── Clipboard paste handler ──────────────────────────────────────────────────
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!caseId) return;
    const file = Array.from(e.clipboardData.items)
      .find((item) => item.kind === "file" && ALLOWED_TYPES.has(item.type))
      ?.getAsFile();
    if (!file) return;
    e.preventDefault();
    void handleImageUpload(file);
  }, [caseId, handleImageUpload]);

  if (!editor) return null;

  // Read-only: plain text
  if (readOnly && descriptionFormat !== "tiptap_json") {
    return (
      <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap min-h-[80px] bg-slate-50/60 rounded-xl p-4 border border-slate-100">
        {description || <span className="text-slate-300 italic">No description</span>}
      </div>
    );
  }

  // Read-only: rich text
  if (readOnly) {
    return (
      <div className="rich-editor-body min-h-[80px] bg-slate-50/60 rounded-xl p-4 border border-slate-100 text-sm text-slate-700">
        <EditorContent editor={editor} />
      </div>
    );
  }

  // Edit mode
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 bg-slate-50/80">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <Bold size={13} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <Italic size={13} />
        </ToolbarBtn>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1">
          <Heading1 size={13} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2">
          <Heading2 size={13} />
        </ToolbarBtn>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
          <List size={13} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered list">
          <ListOrdered size={13} />
        </ToolbarBtn>
        {caseId && (
          <>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <ToolbarBtn onClick={() => fileInputRef.current?.click()} active={false} disabled={isUploading} title="Insert image">
              <ImageIcon size={13} />
            </ToolbarBtn>
          </>
        )}
      </div>

      {/* Editor area — handles drop and image paste */}
      <div
        className="rich-editor-body min-h-[120px] px-4 py-3 text-sm text-slate-700"
        onDrop={handleDrop}
        onDragOver={(e) => { if (caseId) e.preventDefault(); }}
        onPaste={handlePaste}
      >
        <EditorContent editor={editor} />
      </div>

      {isUploading && (
        <div className="px-4 py-2 text-xs text-indigo-600 bg-indigo-50 border-t border-indigo-100">
          Uploading image…
        </div>
      )}
      {uploadError && (
        <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">
          {uploadError}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImageUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

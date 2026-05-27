"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  FileText,
  Image as ImageIcon,
  Trash2,
  Upload,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  CaseDetail,
  CaseFile,
  CaseOwnerType,
  CaseService,
  UserProfile,
} from "@task/core";
import { resolveDisplayName } from "../dashboard/caseLabels";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImageFile = (contentType: string): boolean =>
  contentType.startsWith("image/");

const ErrorAlert = ({ message }: { message: string }) => (
  <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600 my-3">
    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
    <span>{message}</span>
  </div>
);

export interface CaseFileSectionProps {
  caseId: string;
  caseDetail: CaseDetail;
  currentUserId: string | null | undefined;
  currentProfile: UserProfile | null;
  userMap: Map<string, { name: string; email: string }>;
  onHistoryRefresh?: () => void;
  onFilesLoaded?: (count: number) => void;
}

export const CaseFileSection = ({
  caseId,
  caseDetail,
  currentUserId,
  currentProfile,
  userMap,
  onHistoryRefresh,
  onFilesLoaded,
}: CaseFileSectionProps) => {
  const { t } = useTranslation("ui");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<CaseFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(new Map());

  const isOwnerCompany = currentProfile?.companyId === caseDetail.companyId;
  const canUploadDelete =
    isOwnerCompany &&
    (caseDetail.creatorId === currentUserId ||
      (caseDetail.ownerType === CaseOwnerType.USER &&
        caseDetail.ownerId === currentUserId));

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await CaseService.getCaseFiles(caseId);
      setFiles(data);
      onFilesLoaded?.(data.length);

      // 画像ファイルの preview URL を非同期で取得
      const imageFiles = data.filter((f) => isImageFile(f.contentType));
      if (imageFiles.length > 0) {
        const entries = await Promise.allSettled(
          imageFiles.map(async (f) => {
            const { downloadUrl } = await CaseService.getCaseFileDownloadUrl(caseId, f.fileId);
            return [f.fileId, downloadUrl] as [string, string];
          }),
        );
        const urlMap = new Map<string, string>();
        entries.forEach((result) => {
          if (result.status === "fulfilled") {
            urlMap.set(result.value[0], result.value[1]);
          }
        });
        setPreviewUrls(urlMap);
      }
    } catch {
      setLoadError(t("Failed to load files."));
    } finally {
      setIsLoading(false);
    }
  }, [caseId, t, onFilesLoaded]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (!file) return;

    if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
      setUploadError(t("Failed to upload file."));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(t("Failed to upload file."));
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const { url, fields, fileId } = await CaseService.getCaseFileUploadUrl(caseId, {
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      });

      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
      formData.append("file", file);

      const s3Res = await fetch(url, { method: "POST", body: formData });
      if (!s3Res.ok) throw new Error("S3 upload failed");

      const confirmed = await CaseService.confirmCaseFileUpload(caseId, {
        fileId,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      });

      setFiles((prev) => {
        const updated = [confirmed, ...prev];
        onFilesLoaded?.(updated.length);
        return updated;
      });
      if (isImageFile(file.type)) {
        try {
          const { downloadUrl } = await CaseService.getCaseFileDownloadUrl(caseId, confirmed.fileId);
          setPreviewUrls((prev) => new Map(prev).set(confirmed.fileId, downloadUrl));
        } catch {
          // preview URL 取得失敗はサイレントに無視
        }
      }
      onHistoryRefresh?.();
    } catch {
      setUploadError(t("Failed to upload file."));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const { downloadUrl } = await CaseService.getCaseFileDownloadUrl(caseId, fileId);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileName;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      alert(t("Failed to download file."));
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!window.confirm(`${t("Are you sure you want to delete this file?")} (${fileName})`)) return;
    setDeletingFileId(fileId);
    try {
      await CaseService.deleteCaseFile(caseId, fileId);
      setFiles((prev) => {
        const updated = prev.filter((f) => f.fileId !== fileId);
        onFilesLoaded?.(updated.length);
        return updated;
      });
      setPreviewUrls((prev) => {
        const next = new Map(prev);
        next.delete(fileId);
        return next;
      });
      onHistoryRefresh?.();
    } catch {
      alert(t("Failed to delete file."));
    } finally {
      setDeletingFileId(null);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
        <h3 className="text-sm font-bold text-gray-800">{t("Files")}</h3>
        {canUploadDelete && (
          <button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? (
              <span className="inline-block w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            ) : (
              <Upload size={12} />
            )}
            {t("Upload File")}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={Array.from(ALLOWED_CONTENT_TYPES).join(",")}
          onChange={handleFileChange}
        />
      </div>

      {uploadError && <ErrorAlert message={uploadError} />}

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
        </div>
      ) : loadError ? (
        <ErrorAlert message={loadError} />
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <FileText size={28} className="text-slate-300" />
          <p className="text-xs text-gray-400 text-center">{t("No files uploaded yet.")}</p>
          {canUploadDelete && (
            <button
              onClick={handleUploadClick}
              disabled={isUploading}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 disabled:opacity-50 transition-colors mt-1"
            >
              <Upload size={12} />
              {t("Upload File")}
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.fileId}
              className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors"
            >
              {isImageFile(file.contentType) ? (
                previewUrls.get(file.fileId) ? (
                  <img
                    src={previewUrls.get(file.fileId)}
                    alt={file.fileName}
                    className="w-10 h-10 object-cover rounded-md flex-shrink-0 border border-gray-200"
                    loading="lazy"
                  />
                ) : (
                  <ImageIcon size={20} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                )
              ) : (
                <FileText size={20} className="text-slate-400 flex-shrink-0 mt-0.5" />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{file.fileName}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {formatFileSize(file.fileSize)} · {new Date(file.createdAt).toLocaleString()} · {resolveDisplayName(file.uploadedBy, userMap)}
                </p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleDownload(file.fileId, file.fileName)}
                  className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 border border-indigo-200 rounded-md px-2 py-1 hover:bg-indigo-50 transition-colors"
                  title={t("Download")}
                >
                  <Download size={11} />
                  {t("Download")}
                </button>
                {canUploadDelete && (
                  <button
                    onClick={() => handleDelete(file.fileId, file.fileName)}
                    disabled={deletingFileId === file.fileId}
                    className="flex items-center gap-1 text-[10px] font-semibold text-red-500 border border-red-200 rounded-md px-2 py-1 hover:bg-red-50 disabled:opacity-50 transition-colors"
                    title={t("Delete File")}
                  >
                    {deletingFileId === file.fileId ? (
                      <span className="inline-block w-2.5 h-2.5 border border-red-300 border-t-red-500 rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={11} />
                    )}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

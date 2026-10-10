import { Download, Eye, FileText } from "lucide-react";
import { useState } from "react";
import { AttachmentPreview, canPreview } from "./attachment-preview";
import { Button } from "@/components/ui/button";

interface FileAttachmentProps {
    url: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
}

// Get file extension from filename
const getFileExtension = (fileName?: string) => {
    if (!fileName) return "";
    const parts = fileName.split(".");
    return parts.length > 1 ? parts.pop()?.toUpperCase() : "";
};

// Format file size
const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Get background color based on file type
const getFileColor = (fileType?: string) => {
    if (!fileType) return "bg-cream text-plum";
    if (fileType.startsWith("image/") || fileType.includes("video") || fileType.includes("audio"))
        return "bg-[#381d2a] dark:bg-[#4a2838] text-white";
    if (fileType.includes("pdf") || fileType.includes("presentation") || fileType.includes("powerpoint"))
        return "bg-brand/10 text-brand";
    return "bg-cream text-plum";
};

export const FileAttachment = ({
    url,
    fileName,
    fileType,
    fileSize,
}: FileAttachmentProps) => {
    const handleDownload = () => {
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName || "download";
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const extension = getFileExtension(fileName);
    const [previewOpen, setPreviewOpen] = useState(false);
    const previewable = canPreview(fileType);

    return (
        <div className="flex items-center gap-3 p-3 bg-surface border border-plum/12 rounded-xl hover:bg-cream/70 transition-colors max-w-sm group">
            {/* File Icon */}
            <div
                className={`size-11 rounded-lg flex items-center justify-center shrink-0 ${getFileColor(
                    fileType
                )}`}
            >
                <FileText className="size-5" />
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">
                    {fileName || "Untitled File"}
                </p>
                <div className="flex items-center gap-2 text-xs text-ink/65">
                    {extension && (
                        <span className="uppercase font-medium">{extension}</span>
                    )}
                    {extension && fileSize && <span>•</span>}
                    {fileSize && <span>{formatFileSize(fileSize)}</span>}
                </div>
            </div>

            {previewable && (
                <>
                    <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Preview file"
                        onClick={() => setPreviewOpen(true)}
                        className="shrink-0 rounded-lg md:opacity-0 md:transition-opacity md:group-hover:opacity-100 focus-visible:opacity-100"
                    >
                        <Eye className="size-4" />
                    </Button>
                    <AttachmentPreview open={previewOpen} onOpenChange={setPreviewOpen} url={url} name={fileName || "File"} type={fileType} />
                </>
            )}

            {/* Download Button */}
            <Button
                variant="ghost"
                size="sm"
                aria-label="Download file"
                onClick={handleDownload}
                className="md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shrink-0 rounded-lg"
            >
                <Download className="size-4" />
            </Button>
        </div>
    );
};
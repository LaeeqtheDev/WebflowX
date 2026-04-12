import { Download, FileText, File } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileAttachmentProps {
    url: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
}

// File type icons mapping
const getFileIcon = (fileType?: string) => {
    if (!fileType) return "📎";
    if (fileType.startsWith("image/")) return "🖼️";
    if (fileType.includes("pdf")) return "📄";
    if (fileType.includes("word") || fileType.includes("document")) return "📝";
    if (fileType.includes("sheet") || fileType.includes("excel")) return "📊";
    if (fileType.includes("presentation") || fileType.includes("powerpoint"))
        return "📽️";
    if (fileType.includes("zip") || fileType.includes("rar") || fileType.includes("7z"))
        return "📦";
    if (fileType.includes("video")) return "🎬";
    if (fileType.includes("audio")) return "🎵";
    if (fileType.includes("text") || fileType.includes("plain")) return "📃";
    if (fileType.includes("json")) return "{ }";
    if (fileType.includes("javascript") || fileType.includes("typescript"))
        return "⚡";
    if (fileType.includes("python")) return "🐍";
    if (fileType.includes("html")) return "🌐";
    if (fileType.includes("css")) return "🎨";
    return "📎";
};

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
    if (!fileType) return "bg-gray-100";
    if (fileType.includes("pdf")) return "bg-red-50 text-red-600";
    if (fileType.includes("word") || fileType.includes("document"))
        return "bg-blue-50 text-blue-600";
    if (fileType.includes("sheet") || fileType.includes("excel"))
        return "bg-green-50 text-green-600";
    if (fileType.includes("presentation") || fileType.includes("powerpoint"))
        return "bg-orange-50 text-orange-600";
    if (fileType.includes("zip") || fileType.includes("rar"))
        return "bg-yellow-50 text-yellow-600";
    if (fileType.includes("video")) return "bg-purple-50 text-purple-600";
    if (fileType.includes("audio")) return "bg-pink-50 text-pink-600";
    if (
        fileType.includes("javascript") ||
        fileType.includes("typescript") ||
        fileType.includes("json")
    )
        return "bg-amber-50 text-amber-600";
    if (fileType.includes("python")) return "bg-emerald-50 text-emerald-600";
    return "bg-gray-50 text-gray-600";
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

    return (
        <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors max-w-sm group">
            {/* File Icon */}
            <div
                className={`size-12 rounded-lg flex items-center justify-center text-xl shrink-0 ${getFileColor(
                    fileType
                )}`}
            >
                {getFileIcon(fileType)}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                    {fileName || "Untitled File"}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {extension && (
                        <span className="uppercase font-medium">{extension}</span>
                    )}
                    {extension && fileSize && <span>•</span>}
                    {fileSize && <span>{formatFileSize(fileSize)}</span>}
                </div>
            </div>

            {/* Download Button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            >
                <Download className="size-4" />
            </Button>
        </div>
    );
};
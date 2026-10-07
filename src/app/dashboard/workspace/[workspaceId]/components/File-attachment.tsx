import { Download, FileText } from "lucide-react";
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
    if (!fileType) return "bg-[#f7f2ee] text-[#381d2a]";
    if (fileType.startsWith("image/") || fileType.includes("video") || fileType.includes("audio"))
        return "bg-[#381d2a] text-white";
    if (fileType.includes("pdf") || fileType.includes("presentation") || fileType.includes("powerpoint"))
        return "bg-[#ff5018]/10 text-[#ff5018]";
    return "bg-[#f7f2ee] text-[#381d2a]";
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
        <div className="flex items-center gap-3 p-3 bg-white border border-[#381d2a]/12 rounded-xl hover:bg-[#f7f2ee]/70 transition-colors max-w-sm group">
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
                <p className="text-sm font-medium text-[#1b1017] truncate">
                    {fileName || "Untitled File"}
                </p>
                <div className="flex items-center gap-2 text-xs text-[#1b1017]/65">
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
                aria-label="Download file"
                onClick={handleDownload}
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 rounded-lg"
            >
                <Download className="size-4" />
            </Button>
        </div>
    );
};
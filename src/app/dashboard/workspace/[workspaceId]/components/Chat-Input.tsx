import { useCreateMessage } from "@/features/messages/api/use-create-message";
import { useGenerateUploadUrl } from "@/features/upload/api/use-generate-upload-url";
import { useChannelId } from "@/hooks/use-channel-id";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import dynamic from "next/dynamic";
import Quill from "quill";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Id } from "../../../../../../convex/_generated/dataModel";

const Editor = dynamic(() => import("./Editor"), { ssr: false });

interface ChatInputProps {
    placeholder: string;
}

type CreateMessageValues = {
    channelId: Id<"channels">;
    workspaceId: Id<"workspaces">;
    body: string;
    image: Id<"_storage"> | undefined;
    file: Id<"_storage"> | undefined;
    fileName: string | undefined;
    fileType: string | undefined;
    fileSize: number | undefined;
};

export const ChatInput = ({ placeholder }: ChatInputProps) => {
    const [editorKey, setEditorKey] = useState(0);
    const editorRef = useRef<Quill | null>(null);

    const workspaceId = useWorkspaceId();
    const channelId = useChannelId();
    const { mutate: createMessage } = useCreateMessage();
    const [isPending, setIsPending] = useState(false);
    const { mutate: GenerateUploadUrl } = useGenerateUploadUrl();

    const handleSubmit = async ({
        body,
        image,
        file,
    }: {
        body: string;
        image: File | null;
        file: File | null;
    }) => {
        try {
            setIsPending(true);
            editorRef?.current?.enable(false);

            const values: CreateMessageValues = {
                channelId,
                workspaceId,
                body,
                image: undefined,
                file: undefined,
                fileName: undefined,
                fileType: undefined,
                fileSize: undefined,
            };

            // Handle image upload
            if (image) {
                const url = await GenerateUploadUrl({}, { throwError: true });

                if (!url) {
                    throw new Error("URL not found");
                }

                const result = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": image.type,
                    },
                    body: image,
                });

                if (!result.ok) {
                    throw new Error("Failed to upload the image");
                }
                const { storageId } = await result.json();

                values.image = storageId;
            }

            // Handle file upload
            if (file) {
                const url = await GenerateUploadUrl({}, { throwError: true });

                if (!url) {
                    throw new Error("URL not found for file upload");
                }

                const result = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": file.type || "application/octet-stream",
                    },
                    body: file,
                });

                if (!result.ok) {
                    throw new Error("Failed to upload the file");
                }
                const { storageId } = await result.json();

                values.file = storageId;
                values.fileName = file.name;
                values.fileType = file.type || "application/octet-stream";
                values.fileSize = file.size;
            }

            await createMessage(values, { throwError: true });

            setEditorKey((prevKey) => prevKey + 1);
        } catch (error) {
            toast.error("Failed to send the Message");
        } finally {
            setIsPending(false);
            editorRef?.current?.enable(true);
        }
    };

    return (
        <div className="px-5 w-full">
            <Editor
                key={editorKey}
                placeholder={placeholder}
                onSubmit={handleSubmit}
                disabled={isPending}
                innerRef={editorRef}
            />
        </div>
    );
};
import { useCreateMessage } from "@/features/messages/api/use-create-message";
import { useUploader } from "@/lib/upload-photo";
import { useLimitHandler } from "@/hooks/use-limit-handler";
import { useChannelId } from "@/hooks/use-channel-id";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import dynamic from "next/dynamic";
import Quill from "quill";
import { useRef, useState } from "react";
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
    const { upload } = useUploader();
    const { handleLimitError } = useLimitHandler();

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

            if (image) {
                values.image = await upload(image, "image", workspaceId);
            }

            if (file) {
                values.file = await upload(file, "file", workspaceId);
                values.fileName = file.name;
                values.fileType = file.type || "application/octet-stream";
                values.fileSize = file.size;
            }

            await createMessage(values, { throwError: true });

            setEditorKey((prevKey) => prevKey + 1);
        } catch (error) {
            handleLimitError(error, "Failed to send the message");
        } finally {
            setIsPending(false);
            editorRef?.current?.enable(true);
        }
    };

    return (
        <div data-chat-input className="px-3 md:px-5 w-full pb-[env(safe-area-inset-bottom)]">
            <Editor
                key={editorKey}
                placeholder={placeholder}
                allowEveryone
                onSubmit={handleSubmit}
                disabled={isPending}
                innerRef={editorRef}
            />
        </div>
    );
};
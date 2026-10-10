import { useCreateMessage } from "@/features/messages/api/use-create-message";
import { useUploader } from "@/lib/upload-photo";
import { useSendFlow } from "@/hooks/use-send-flow";
import { SendStatus } from "@/components/send-status";
import { useChannelId } from "@/hooks/use-channel-id";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import dynamic from "next/dynamic";
import Quill from "quill";
import { useRef } from "react";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { TypingIndicator, useTypingPing } from "@/features/presence/typing";

const Editor = dynamic(() => import("./Editor"), { ssr: false });

interface ChatInputProps {
    placeholder: string;
}

type CreateMessageValues = {
    channelId: Id<"channels">;
    workspaceId: Id<"workspaces">;
    body: string;
    image: Id<"_storage"> | undefined;
    imageName?: string;
    file: Id<"_storage"> | undefined;
    fileName: string | undefined;
    fileType: string | undefined;
    fileSize: number | undefined;
};

export const ChatInput = ({ placeholder }: ChatInputProps) => {
    const editorRef = useRef<Quill | null>(null);

    const workspaceId = useWorkspaceId();
    const channelId = useChannelId();
    const { mutate: createMessage } = useCreateMessage();
    const { upload } = useUploader();
    const onTyping = useTypingPing({ workspaceId, channelId });

    const { editorKey, isPending, upload: sending, submit } = useSendFlow(
        editorRef,
        `${workspaceId}:${channelId}`,
        async ({ body, image, file }: { body: string; image: File | null; file: File | null }, onProgress) => {
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
                values.image = await upload(image, "image", workspaceId, (p) => onProgress(image.name, p));
                values.imageName = image.name;
            }

            if (file) {
                values.file = await upload(file, "file", workspaceId, (p) => onProgress(file.name, p));
                values.fileName = file.name;
                values.fileType = file.type || "application/octet-stream";
                values.fileSize = file.size;
            }

            await createMessage(values, { throwError: true });
        },
    );

    return (
        <div data-chat-input className="px-3 md:px-5 w-full pb-[env(safe-area-inset-bottom)]">
            <TypingIndicator channelId={channelId} />
            <SendStatus pending={isPending} upload={sending} />
            <Editor
                onTyping={onTyping}
                key={editorKey}
                draftKey={`${workspaceId}:${channelId}`}
                placeholder={placeholder}
                allowEveryone
                onSubmit={submit}
                disabled={isPending}
                innerRef={editorRef}
            />
        </div>
    );
};

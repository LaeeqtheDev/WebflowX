import { useCreateMessage } from "@/features/messages/api/use-create-message";
import { useUploader } from "@/lib/upload-photo";
import { useSendFlow } from "@/hooks/use-send-flow";
import { SendStatus } from "@/components/send-status";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import dynamic from "next/dynamic"
import type Quill from "quill"
import { useRef } from "react"
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { TypingIndicator, useTypingPing } from "@/features/presence/typing";




const Editor = dynamic(() => import("./../../components/Editor"), { ssr: false })

interface ChatInputProps{
  placeholder: string;
  conversationId: Id<"conversations">;
}


type CreateMessageValues = {
  conversationId: Id<"conversations">;
  workspaceId: Id<"workspaces">;
  body: string;
  image: Id<"_storage"> | undefined;
    imageName?: string;
}

export const ChatInput = ({placeholder, conversationId}: ChatInputProps) => {
  const editorRef = useRef<Quill | null>(null)

  const workspaceId= useWorkspaceId();
  const {mutate: createMessage} = useCreateMessage()
  const { upload } = useUploader()
  const onTyping = useTypingPing({ workspaceId, conversationId })

  const { editorKey, isPending, upload: sending, submit } = useSendFlow(
    editorRef,
    `${workspaceId}:dm:${conversationId}`,
    async ({ body, image }: { body: string; image: File | null }, onProgress) => {
      const values: CreateMessageValues = { conversationId, workspaceId, body, image: undefined }
      if (image) {
        values.image = await upload(image, "image", workspaceId, (p) => onProgress(image.name, p))
        values.imageName = image.name
      }
      await createMessage(values, { throwError: true })
    },
  )

  return (
    <div data-chat-input className="px-3 md:px-5 w-full pb-[env(safe-area-inset-bottom)]">
      <TypingIndicator conversationId={conversationId} />
      <SendStatus pending={isPending} upload={sending} />
      <Editor
      onTyping={onTyping}
      key={editorKey}
      draftKey={`${workspaceId}:dm:${conversationId}`}
      placeholder={placeholder}
      onSubmit={submit}
      disabled={isPending}
      innerRef={editorRef}
      />
    </div>
  )
}

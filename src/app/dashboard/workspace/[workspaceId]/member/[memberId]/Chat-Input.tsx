import { useCreateMessage } from "@/features/messages/api/use-create-message";
import { useUploader } from "@/lib/upload-photo";
import { useLimitHandler } from "@/hooks/use-limit-handler";
import { useChannelId } from "@/hooks/use-channel-id";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import dynamic from "next/dynamic"
import Quill from "quill"
import { useRef, useState } from "react"
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

  const [editorKey, setEditorKey] = useState(0)
  const editorRef = useRef<Quill | null>(null)
  
  const workspaceId= useWorkspaceId();

  const {mutate: createMessage} = useCreateMessage()
  const [isPending, setIsPending] = useState(false)
  const { upload } = useUploader()
  const { handleLimitError } = useLimitHandler()
  const onTyping = useTypingPing({ workspaceId, conversationId })


  const handleSubmit = async({
    body, image
  }:{body: string, image: File | null})=> {
  
    try{
      setIsPending(true)
      editorRef?.current?.enable(false)

      const values: CreateMessageValues = {
       conversationId,
        workspaceId,
        body,
        image: undefined
      }

      if(image){
        values.image = await upload(image, "image", workspaceId)
        values.imageName = image.name
      }

    await createMessage(
      values
    , {throwError: true})

    setEditorKey((prevKey) => prevKey +1)
  } catch (error){
    handleLimitError(error, "Failed to send the message")
  }finally{
      setIsPending(false)
      editorRef?.current?.enable(true)
  }
  }

  return (
    <div data-chat-input className="px-3 md:px-5 w-full pb-[env(safe-area-inset-bottom)]">
      <TypingIndicator conversationId={conversationId} />
      <Editor
      onTyping={onTyping}
      key={editorKey}
      placeholder={placeholder}
      onSubmit={handleSubmit}
      disabled={isPending}
      innerRef={editorRef}
      />
    </div>
  )
}
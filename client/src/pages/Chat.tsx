import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SendHorizontal } from "lucide-react";
import { Message } from "@/components/chat/Message";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConversationStore } from "@/stores/useConversationStore";
import { wsService } from "@/services/websocket";
import { StreamingMessage } from "@/components/chat/StreamingMessage";

export const Chat = () => {
  const { id } = useParams();
  const [input, setInput] = useState("");
  const isNewChat = !id;

  // Get from store
  const models = useConversationStore((state) => state.models);
  const conversations = useConversationStore((state) => state.conversations);
  const fetchModels = useConversationStore((state) => state.fetchModels);
  const fetchConversationById = useConversationStore(
    (state) => state.fetchConversationById
  );
  const selectedModel = useConversationStore((state) => state.selectedModel);
  const setSelectedModel = useConversationStore(
    (state) => state.setSelectedModel
  );
  const currentMessage = useConversationStore((state) => state.currentMessage);

  const startNewConversation = useConversationStore(
    (state) => state.startNewConversation
  );

  const sendMessage = useConversationStore((state) => state.sendMessage);

  const resumeConversation = useConversationStore(
    (state) => state.resumeConversation
  );
  const addUserMessage = useConversationStore((state) => state.addUserMessage);

  // Current conversation from store
  const conversation = useMemo(() => {
    if (!id) return null;
    return conversations.find((c) => c.ID === id);
  }, [id, conversations]);

  // Load models if new chat
  useEffect(() => {
    if (isNewChat && models.length === 0) {
      fetchModels();
    }
  }, [isNewChat, models.length, fetchModels]);

  // Load conversation if needed
  useEffect(() => {
    const setupChat = async () => {
      if (id) {
        await fetchConversationById(id);

        const waitForWS = () => {
          if (wsService.isConnected()) {
            resumeConversation(id);
          } else {
            setTimeout(waitForWS, 100);
          }
        };
        waitForWS();
      } else {
        setInput("");
      }
    };
    setupChat();
  }, [id, fetchConversationById, resumeConversation]);

  useEffect(() => {
    if (conversation) {
      setSelectedModel(conversation.Model);
    }
  }, [conversation]);

  const handleSend = async () => {
    if (!input.trim()) return;

    if (isNewChat) {
      if (!selectedModel) return;
      startNewConversation(selectedModel, input);
    } else if (id) {
      addUserMessage(id, input);
      sendMessage(id, input, conversation?.Model || "");
    }

    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      {isNewChat && (
        <div className="border-b p-4">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.name} value={model.model}>
                  {model.name} ({model.details.parameter_size})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Chat Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-3xl mx-auto">
          {conversation && conversation.Messages ? (
            <>
              {conversation.Messages.map((message) => (
                <Message key={message.ID} message={message} />
              ))}
              {/* Current Streaming Message */}
              {currentMessage && (
                <StreamingMessage currentMessage={currentMessage} />
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {id ? "Loading messages..." : "Start a new conversation"}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Chat Input Area */}
      <div className="border-t p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${selectedModel || "..."}`}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            disabled={!input.trim() || (isNewChat && !selectedModel)}
            onClick={handleSend}
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

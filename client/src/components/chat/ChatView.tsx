import { Model } from "../../lib/types.ts";
import ChatInput from "./ChatInput.tsx";
import MessageComponent from "./Message.tsx";
import { useEffect, useRef } from "react";
import ModelSelector from "./ModelSelector.tsx";

import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useConversationStore } from "../../store/conversationstore.ts";
import { MessageSkeleton } from "../loaders/skeleton";
import { useWebSocket } from "../../providers/WebSocketProvider.tsx";

const defaultModel: Model = {
  name: "Llama 3.2",
  model: "llama 3.2:latest",
  details: {
    parameter_size: "1.5",
  },
};

const ChatView = ({ id }: { id?: string }) => {
  const navigate = useNavigate();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const resumedIdRef = useRef<string | null>(null);
  const {
    isThinking,
    currentThinking,
    clearThinkingState,
    resumeConversation,
    isConnected,
  } = useWebSocket();

  const selectedModel = useConversationStore((state) => state.selectedModel);
  const setSelectedModel = useConversationStore(
    (state) => state.setSelectedModel
  );
  const selectedConversation = useConversationStore(
    (state) => state.selectedConversation
  );

  const setSelectedConversation = useConversationStore(
    (state) => state.setSelectedConversation
  );

  const isMessagesLoading = useConversationStore(
    (state) => state.isMessagesLoading
  );
  const isInitialLoading = useConversationStore(
    (state) => state.isInitialLoading
  );
  const getConversation = useConversationStore(
    (state) => state.getConversation
  );

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [selectedConversation?.Messages, id, isThinking, currentThinking]);

  useEffect(() => {
    const loadConversation = async () => {
      if (!id) {
        setSelectedConversation(null);
        return;
      }

      try {
        await getConversation(id);
      } catch (error: any) {
        if (error.message.includes("not found")) {
          navigate("/");
          toast.error("Conversation not found");
          return;
        }
        throw error;
      }
    };

    loadConversation();
  }, [id, getConversation, navigate, setSelectedConversation]);

  useEffect(() => {
    // Reset any thinking UI when conversation changes
    if (clearThinkingState) {
      clearThinkingState();
    }
  }, [id, clearThinkingState]);

  useEffect(() => {
    const tryResumeConversation = async () => {
      // Only try to resume if:
      // 1. We have an ID
      // 2. We're connected
      // 3. We haven't already resumed this exact ID
      // 4. We have a selected conversation loaded
      if (
        id &&
        isConnected &&
        resumedIdRef.current !== id &&
        selectedConversation
      ) {
        console.log(`Attempting to resume conversation: ${id}`);

        // Update the ref before the async call to prevent duplicates
        resumedIdRef.current = id;

        try {
          await resumeConversation(id);
        } catch (error) {
          console.error("Failed to resume conversation:", error);
        }
      }
    };

    tryResumeConversation();
  }, [id, isConnected, selectedConversation, resumeConversation]);

  const modelName = id
    ? selectedConversation?.Model || ""
    : selectedModel?.name || "";

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 md:pl-14 border-b border-gray-800">
        {(isInitialLoading || isMessagesLoading || isThinking) && (
          <div className="absolute top-0 left-0 right-0">
            <div className="h-1 bg-blue-500/20">
              <div className="h-1 bg-blue-500 animate-progress"></div>
            </div>
          </div>
        )}
        <h1 className="text-xl font-semibold text-gray-200">
          {id ? selectedConversation?.Title || "Chat" : "New Chat"}
        </h1>

        {!id && (
          <div className="max-w-xs mt-2">
            <ModelSelector
              selectedModel={selectedModel || defaultModel}
              onModelSelect={(model) => {
                setSelectedModel(model);
              }}
            />
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto" ref={messagesContainerRef}>
        {isMessagesLoading && id ? (
          <>
            <MessageSkeleton />
            <MessageSkeleton />
            <MessageSkeleton />
          </>
        ) : (
          <>
            {selectedConversation?.Messages?.map((message) => (
              <MessageComponent key={message.ID} message={message} />
            ))}

            {/* Show thinking section */}
            {isThinking && (
              <div className="py-4 bg-gray-900/50">
                <div className="max-w-4xl mx-auto px-4">
                  <div className="mb-1 text-xs font-medium text-gray-500">
                    Assistant
                  </div>
                  <div className="text-gray-300">
                    {currentThinking ? (
                      <div className="text-gray-400 text-sm">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <div
                              className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                              style={{ animationDelay: "300ms" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                              style={{ animationDelay: "600ms" }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-blue-400">
                            Thinking...
                          </span>
                        </div>
                        <div className="pl-5 py-2 border-l-2 border-blue-800/30 text-sm text-gray-400 bg-blue-900/10 rounded-r-md">
                          {currentThinking}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div
                            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                            style={{ animationDelay: "600ms" }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-400">
                          Thinking...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ChatInput modelName={modelName} conversationId={id} />
    </div>
  );
};

export default ChatView;

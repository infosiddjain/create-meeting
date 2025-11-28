"use client";

import React, { useRef, useEffect } from "react";

export default function ChatSidebar({
  open,
  messages,
  message,
  setMessage,
  onSend,
  username,
}: any) {
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 bg-gray-900 text-white shadow-xl 
                  transform transition-transform duration-300 z-50
                  ${open ? "translate-x-0" : "translate-x-full"}`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Chat</h2>
      </div>

      <div className="p-4 space-y-3 h-[calc(100%-100px)] overflow-y-auto">
        {messages.map((msg: any, i: number) => (
          <div
            key={i}
            className={`p-2 rounded-lg max-w-[85%] ${
              msg.user === username
                ? "bg-blue-600 ml-auto"
                : "bg-gray-700 mr-auto"
            }`}
          >
            <p className="text-xs text-gray-300">{msg.user}</p>
            <p className="break-words">{msg.text}</p>
            <p className="text-[10px] text-gray-400 mt-1">
              {new Date(msg.time).toLocaleTimeString()}
            </p>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="p-3 border-t border-gray-700 bg-gray-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
          className="flex gap-2"
        >
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 p-2 rounded bg-gray-700 text-white outline-none"
            placeholder="Type a message..."
          />
          <button
            type="submit"
            className="px-4 bg-blue-600 rounded hover:bg-blue-500"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

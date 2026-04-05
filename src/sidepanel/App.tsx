import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { AIProvider, AIConnection, ChatMode, ChatMessage, ModeRoles } from '../shared/types';
import { CHAT_MODES, DEFAULT_DEBATE_ROLES, DEFAULT_CONSULT_ROLES, DEFAULT_CODING_ROLES } from '../shared/constants';
import ConnectionBar from './components/ConnectionBar';
import ModeSelector from './components/ModeSelector';
import RoleConfig from './components/RoleConfig';
import ChatArea from './components/ChatArea';
import InputBar from './components/InputBar';

const DEFAULT_ROLES: Record<string, ModeRoles> = {
  debate: DEFAULT_DEBATE_ROLES,
  consult: DEFAULT_CONSULT_ROLES,
  coding: DEFAULT_CODING_ROLES,
};

export default function App() {
  const [connections, setConnections] = useState<Record<AIProvider, AIConnection>>({
    chatgpt: { provider: 'chatgpt', status: 'disconnected' },
    claude: { provider: 'claude', status: 'disconnected' },
    gemini: { provider: 'gemini', status: 'disconnected' },
  });
  const [mode, setMode] = useState<ChatMode>('free');
  const [roles, setRoles] = useState<ModeRoles>(DEFAULT_DEBATE_ROLES);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState('');
  const [showRoleConfig, setShowRoleConfig] = useState(false);
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});
  // Keep a ref so the message listener always sees the latest pendingRoles without re-registering
  const pendingRolesRef = useRef<Record<string, string>>({});
  useEffect(() => {
    pendingRolesRef.current = pendingRoles;
  }, [pendingRoles]);

  // Fetch initial connections
  useEffect(() => {
    chrome.runtime.sendMessage({ action: 'GET_CONNECTIONS' }, (res) => {
      if (res) setConnections(res);
    });
  }, []);

  // Listen for connection updates and responses
  useEffect(() => {
    const listener = (message: { action: string; provider?: AIProvider; payload?: unknown }) => {
      switch (message.action) {
        case 'CONNECTIONS_UPDATE':
          setConnections(message.payload as Record<AIProvider, AIConnection>);
          break;
        case 'ROLE_ASSIGNMENT': {
          const { label } = message.payload as { role: string; label: string };
          if (message.provider) {
            setPendingRoles((prev) => ({ ...prev, [message.provider as string]: label }));
          }
          break;
        }
        case 'RESPONSE_CHUNK':
          // Real-time streaming update
          setMessages((prev) => {
            const existing = prev.find(
              (m) => m.provider === message.provider && m.role === 'ai' && m.id.endsWith('-streaming')
            );
            if (existing) {
              return prev.map((m) =>
                m.id === existing.id ? { ...m, content: message.payload as string } : m
              );
            }
            // New streaming message — consume the pending role for this provider
            const modeRole = message.provider ? pendingRolesRef.current[message.provider] : undefined;
            if (modeRole && message.provider) {
              setPendingRoles((prev) => {
                const next = { ...prev };
                delete next[message.provider as string];
                return next;
              });
            }
            return [
              ...prev,
              {
                id: `${message.provider}-${Date.now()}-streaming`,
                role: 'ai',
                provider: message.provider,
                modeRole,
                content: message.payload as string,
                timestamp: Date.now(),
              },
            ];
          });
          break;
        case 'RESPONSE_DONE':
          setMessages((prev) => {
            // Replace streaming message with final
            const streamingMsg = prev.find(
              (m) => m.provider === message.provider && m.id.endsWith('-streaming')
            );
            if (streamingMsg) {
              // Preserve modeRole already set on the streaming message
              return prev.map((m) =>
                m.id === streamingMsg.id
                  ? { ...m, id: m.id.replace('-streaming', ''), content: message.payload as string }
                  : m
              );
            }
            // No streaming message found — consume the pending role for this provider
            const modeRole = message.provider ? pendingRolesRef.current[message.provider] : undefined;
            if (modeRole && message.provider) {
              setPendingRoles((prev) => {
                const next = { ...prev };
                delete next[message.provider as string];
                return next;
              });
            }
            return [
              ...prev,
              {
                id: `${message.provider}-${Date.now()}`,
                role: 'ai',
                provider: message.provider,
                modeRole,
                content: message.payload as string,
                timestamp: Date.now(),
              },
            ];
          });
          // Don't clear isProcessing/workflowStatus here — let WORKFLOW_STATUS('') handle it
          // This prevents flicker between serial steps
          break;
        case 'WORKFLOW_STATUS': {
          const status = message.payload as string;
          setWorkflowStatus(status);
          if (!status) {
            // Empty status = workflow complete
            setIsProcessing(false);
          }
          break;
        }
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // Update roles when mode changes
  useEffect(() => {
    if (mode !== 'free') {
      setRoles(DEFAULT_ROLES[mode]);
    }
  }, [mode]);

  const handleCancel = useCallback(() => {
    chrome.runtime.sendMessage({ action: 'CANCEL_WORKFLOW' });
    setIsProcessing(false);
    setWorkflowStatus('');
  }, []);

  const handleSend = useCallback(
    (text: string) => {
      if (!text.trim() || isProcessing) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsProcessing(true);

      chrome.runtime.sendMessage({
        action: 'SEND_MESSAGE',
        payload: {
          text,
          mode,
          roles: mode !== 'free' ? roles : undefined,
        },
      });
    },
    [mode, roles, isProcessing]
  );

  const handleOpenLogin = (provider: AIProvider) => {
    chrome.runtime.sendMessage({ action: 'OPEN_LOGIN', provider });
  };

  const connectedCount = Object.values(connections).filter((c) => c.status === 'connected').length;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex-none border-b border-gray-700 p-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold">Multi-AI Chat</h1>
          <span className="text-xs text-gray-400">{connectedCount}/3 connected</span>
        </div>
        <ConnectionBar connections={connections} onOpenLogin={handleOpenLogin} />
      </div>

      {/* Mode Selector */}
      <div className="flex-none border-b border-gray-700 p-2">
        <ModeSelector mode={mode} onModeChange={setMode} />
        {mode !== 'free' && (
          <button
            onClick={() => setShowRoleConfig(!showRoleConfig)}
            className="text-xs text-gray-400 hover:text-white mt-1 ml-1"
          >
            {showRoleConfig ? '▲ 收起角色設定' : '▼ 角色設定'}
          </button>
        )}
        {showRoleConfig && mode !== 'free' && (
          <RoleConfig mode={mode} roles={roles} onRolesChange={setRoles} />
        )}
      </div>

      {/* Chat Area */}
      <ChatArea messages={messages} mode={mode} />

      {/* Workflow Status */}
      {workflowStatus && (
        <div className="flex-none border-t border-gray-700 px-3 py-1.5 bg-gray-800/80 text-center">
          <span className="text-xs text-yellow-300 animate-pulse">{workflowStatus}</span>
        </div>
      )}

      {/* Input */}
      <InputBar onSend={handleSend} onCancel={handleCancel} disabled={isProcessing || connectedCount === 0} isProcessing={isProcessing} />
    </div>
  );
}

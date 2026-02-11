import { useState, useEffect, useRef } from 'react';
import { useGetAllMessages, useSendMessage } from '../../hooks/useQueries';
import { useDeleteMessage } from '../../hooks/useQueries';
import { useCustomAuth } from '../../hooks/useCustomAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Principal } from '@dfinity/principal';
import { Send, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';

export default function MessengerModule({ userProfile }) {
  const { identity } = useCustomAuth();
  const { data: messages = [], isLoading } = useGetAllMessages();
  const sendMessage = useSendMessage();
  const deleteMessage = useDeleteMessage();

  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const selectionTimer = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();

    if ((!content.trim() && files.length === 0) || !identity) return;

    try {
      // Convert selected files to data URLs
      const attachments = [];
      for (const f of files) {
        if (f.size > 5 * 1024 * 1024) {
          toast.error(`File ${f.name} exceeds 5MB limit`);
          continue;
        }
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
        attachments.push({
          name: f.name,
          type: f.type,
          size: f.size,
          data: dataUrl
        });
      }

      const message = {
        id: `msg-${Date.now()}`,
        senderId: userProfile.id,
        sender: userProfile.name || userProfile.username,
        content: content.trim().length > 0 ? content.trim() : (attachments.length > 0 ? '[attachment]' : ''),
        timestamp: BigInt(Date.now() * 1000000),
        attachments
      };
     
      await sendMessage.mutateAsync(message);
      setContent('');
      setFiles([]);
    } catch (error) {
      toast.error('Failed to send message');
      console.error(error);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(typeof timestamp === 'string' ? timestamp : (Number(timestamp) ? Number(timestamp) / 1000000 : Date.now()));
    return date.toLocaleString();
  };
  const truncateName = (name, max = 10) => {
    if (!name) return '';
    return name.length > max ? `${name.slice(0, max)}...` : name;
  };

  const toIdText = (val) => typeof val === 'string' ? val : (val?.toText ? val.toText() : String(val));
  const isOwnMessage = (senderId) => {
    return toIdText(userProfile.id) === toIdText(senderId);
  };
  const getRoleName = (role) => {
    if (!role) return '';
    if (typeof role === 'string') return role;
    const keys = Object.keys(role);
    return keys.length ? keys[0] : '';
  };
  const normalizeAttachment = (att) => {
    if (!att) return null;
    if (typeof att === 'string') {
      const name = att.split('/').pop() || 'attachment';
      return { path: att, name };
    }
    if (typeof att === 'object') {
      if (att.data) return { path: att.data, name: att.name || 'attachment', type: att.type, size: att.size };
      if (att.path) return { path: att.path, name: att.name || att.path.split('/').pop() || 'attachment' };
      if (att.url) return { path: att.url, name: att.name || att.url.split('/').pop() || 'attachment' };
    }
    return null;
  };
  const toPublicPath = (p) => {
    if (!p) return p;
    if (p.startsWith('/assets/')) return p;
    const marker = '/assets/';
    const idx = p.lastIndexOf(marker);
    if (idx >= 0) return `/assets/${p.slice(idx + marker.length)}`;
    return p;
  };
  const isImageAttachment = (att) => {
    if (!att?.path) return false;
    if (att.type?.startsWith('image/')) return true;
    return /\.(png|jpe?g|gif|webp|svg)$/i.test(att.path);
  };
  const isAdmin = ['admin', 'owner'].includes(getRoleName(userProfile.role));
  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const clearSelection = () => {
    setSelectedIds([]);
    setSelectionMode(false);
  };
  const onMessagePointerDown = (id) => {
    if (selectionTimer.current) clearTimeout(selectionTimer.current);
    selectionTimer.current = setTimeout(() => {
      setSelectionMode(true);
      toggleSelect(id);
    }, 600);
  };
  const onMessagePointerUp = () => {
    if (selectionTimer.current) {
      clearTimeout(selectionTimer.current);
      selectionTimer.current = null;
    }
  };
  const handleDeleteSelected = async () => {
    for (const id of selectedIds) {
      try {
        await deleteMessage.mutateAsync(id);
      } catch {}
    }
    clearSelection();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Workspace Messenger</h2>
      {isAdmin && selectionMode && (
        <div className="flex items-center justify-between rounded-md border p-2 bg-muted/40">
          <span className="text-sm">Selected: {selectedIds.length}</span>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={deleteMessage.isPending || selectedIds.length === 0}>
              Delete Selected
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>Cancel</Button>
          </div>
        </div>
      )}
      
      <Card className="h-[calc(100vh-16rem)] flex flex-col">
        <CardHeader>
          <CardTitle>Team Chat</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
            <div className="space-y-4">
              {isLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No messages yet. Start the conversation!</p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message._id || message.messageId || message.id}
                    className={`flex ${isOwnMessage(message.senderId) ? 'justify-end' : 'justify-start'}`}
                    onMouseDown={() => onMessagePointerDown(message._id || message.messageId || message.id)}
                    onMouseUp={onMessagePointerUp}
                    onTouchStart={() => onMessagePointerDown(message._id || message.messageId || message.id)}
                    onTouchEnd={onMessagePointerUp}
                    onClick={() => selectionMode ? toggleSelect(message._id || message.messageId || message.id) : null}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isOwnMessage(message.senderId)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      } ${selectionMode && selectedIds.includes(message._id || message.messageId || message.id) ? 'ring-2 ring-destructive' : ''}`}
                    >
                      <p className="text-sm break-words">{message.content}</p>
                      {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((att, idx) => {
                            const normalized = normalizeAttachment(att);
                            if (!normalized) return null;
                            const sizeText = typeof normalized.size === 'number' ? ` (${Math.round(normalized.size / 1024)} KB)` : '';
                            const publicPath = toPublicPath(normalized.path);
                            return (
                              <div key={`${message.id}-att-${idx}`} className="rounded-md border border-border p-2 bg-background/40">
                                {isImageAttachment(normalized) && (
                                  <img src={publicPath} alt={normalized.name} className="max-h-40 rounded-md object-contain mb-2" />
                                )}
                                <a href={publicPath} download={normalized.name} className="text-xs underline flex items-center gap-2" title={normalized.name}>
                                  <Paperclip className="h-3 w-3" />
                                  {truncateName(normalized.name)}{sizeText}
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-xs mt-1 opacity-70">
                        {message.senderName || message.sender || 'Unknown'}
                      </p>
                      <p className="text-[11px] opacity-60">
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

        </CardContent>
        <CardFooter className="sticky bottom-0 bg-background">
          <form onSubmit={handleSend} className="flex gap-2 w-full">
            <div className="flex items-center">
              <Label htmlFor="chat-files" className="p-2 rounded-md bg-muted hover:bg-muted/80 cursor-pointer">
                <Paperclip className="h-4 w-4" />
              </Label>
              <Input
                id="chat-files"
                type="file"
                multiple
                accept="*/*"
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
            </div>
            {files.length > 0 && (
              <div className="flex items-center gap-2 max-w-[40%] overflow-x-auto">
                {files.map((f, idx) => (
                  <Badge key={`${f.name}-${idx}`} variant="secondary" className="flex items-center gap-2 whitespace-nowrap" title={f.name}>
                    <span className="text-xs">{truncateName(f.name)}</span>
                    <button
                      type="button"
                      className="rounded-md p-0.5 hover:bg-muted"
                      onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message..."
              disabled={sendMessage.isPending}
            />
            <Button type="submit" disabled={sendMessage.isPending || (!content.trim() && files.length === 0)}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}

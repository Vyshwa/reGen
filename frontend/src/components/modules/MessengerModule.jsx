import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useGetAllMessages, useSendMessage, useGetAllUsers, useDeleteMessage, useEditMessage } from '../../hooks/useQueries';
import { useCustomAuth } from '../../hooks/useCustomAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Principal } from '@dfinity/principal';
import { Send, Paperclip, X, Pencil, Trash2, Search, ChevronUp, ChevronDown, Check, Users, Lock } from 'lucide-react';
import { toast } from 'sonner';
import PrivateChatModule from './PrivateChatModule';

export default function MessengerModule({ userProfile }) {
  const [chatMode, setChatMode] = useState('private'); // 'team' | 'private'
  const { identity } = useCustomAuth();
  const { data: messages = [], isLoading } = useGetAllMessages();
  const sendMessage = useSendMessage();
  const deleteMessage = useDeleteMessage();
  const editMessage = useEditMessage();
  const { data: users = [] } = useGetAllUsers();

  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const selectionTimer = useRef(null);
  const scrollRef = useRef(null);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const matchRefs = useRef([]);

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
        senderId: userProfile.userId || userProfile.id,
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

  const getSenderName = (senderId, fallbackName) => {
    const u = users.find(x => x.userId === senderId || x.id === senderId);
    return u ? (u.name || u.username) : fallbackName;
  };

  const toIdText = (val) => typeof val === 'string' ? val : (val?.toText ? val.toText() : String(val));
  const isOwnMessage = (senderId) => {
    const myId = toIdText(userProfile.userId || userProfile.id);
    return myId === toIdText(senderId);
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
  const isAdmin = ['admin', 'owner', 'param'].includes(getRoleName(userProfile.role));
  const isPrivileged = ['owner', 'param'].includes(getRoleName(userProfile.role));

  const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  const canModify = useCallback((message) => {
    // param and owner can modify any message anytime
    if (isPrivileged) return true;
    // Other users: own messages only, within 15 min
    if (!isOwnMessage(message.senderId)) return false;
    const createdAt = message.createdAt ? new Date(message.createdAt).getTime() : null;
    if (!createdAt) return false;
    return (Date.now() - createdAt) <= EDIT_WINDOW_MS;
  }, [isPrivileged, userProfile]);

  // Search matches
  const searchMatches = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    const matches = [];
    messages.forEach((msg, idx) => {
      if (msg.content && msg.content.toLowerCase().includes(term)) {
        matches.push(idx);
      }
    });
    return matches;
  }, [messages, searchTerm]);

  // Reset match index when matches change
  useEffect(() => {
    if (searchMatches.length > 0) {
      setCurrentMatchIndex(0);
    }
  }, [searchMatches.length, searchTerm]);

  // Scroll to current match
  useEffect(() => {
    if (searchMatches.length > 0 && matchRefs.current[searchMatches[currentMatchIndex]]) {
      matchRefs.current[searchMatches[currentMatchIndex]]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentMatchIndex, searchMatches]);

  const goToNextMatch = () => {
    if (searchMatches.length === 0) return;
    setCurrentMatchIndex(prev => (prev + 1) % searchMatches.length);
  };
  const goToPrevMatch = () => {
    if (searchMatches.length === 0) return;
    setCurrentMatchIndex(prev => (prev - 1 + searchMatches.length) % searchMatches.length);
  };

  // Highlight search term in text
  const highlightText = (text, msgIndex) => {
    if (!searchTerm.trim() || !text) return text;
    const term = searchTerm.trim();
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    if (parts.length === 1) return text;
    const isCurrentMatch = searchMatches[currentMatchIndex] === msgIndex;
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className={`rounded px-0.5 ${isCurrentMatch ? 'bg-yellow-400 text-black' : 'bg-yellow-200 text-black'}`}>{part}</mark>
      ) : part
    );
  };

  // Edit handlers
  const startEdit = (message) => {
    const mid = message._id || message.messageId || message.id;
    setEditingId(mid);
    setEditContent(message.content || '');
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };
  const confirmEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    try {
      await editMessage.mutateAsync({ id: editingId, content: editContent.trim() });
      toast.success('Message edited');
      cancelEdit();
    } catch (err) {
      toast.error(err?.message || 'Failed to edit message');
    }
  };

  // Single message delete
  const handleDeleteSingle = async (id) => {
    try {
      await deleteMessage.mutateAsync(id);
      toast.success('Message deleted');
    } catch (err) {
      toast.error(err?.message || 'Failed to delete message');
    }
  };
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Messenger</h2>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={chatMode === 'private' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setChatMode('private')}
            className="h-8 px-3 text-xs gap-1.5"
          >
            <Lock className="h-3.5 w-3.5" /> Private
          </Button>
          <Button
            variant={chatMode === 'team' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setChatMode('team')}
            className="h-8 px-3 text-xs gap-1.5"
          >
            <Users className="h-3.5 w-3.5" /> Team
          </Button>
        </div>
      </div>

      {chatMode === 'private' ? (
        <PrivateChatModule userProfile={userProfile} />
      ) : (
      <>
      <div className="flex items-center justify-end">
        <Button variant="ghost" size="icon" onClick={() => { setSearchOpen(o => !o); setSearchTerm(''); setCurrentMatchIndex(0); }}>
          <Search className="h-5 w-5" />
        </Button>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="flex items-center gap-2 rounded-md border p-2 bg-muted/40">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search messages..."
            className="h-8"
            autoFocus
          />
          {searchTerm.trim() && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {searchMatches.length > 0 ? `${currentMatchIndex + 1}/${searchMatches.length}` : '0/0'}
            </span>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={goToPrevMatch} disabled={searchMatches.length === 0}>
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={goToNextMatch} disabled={searchMatches.length === 0}>
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setSearchOpen(false); setSearchTerm(''); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {selectionMode && (
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
                messages.map((message, msgIndex) => {
                  const mid = message._id || message.messageId || message.id;
                  const own = isOwnMessage(message.senderId);
                  const modifiable = canModify(message);
                  const isEditing = editingId === mid;
                  const isCurrentSearchMatch = searchMatches[currentMatchIndex] === msgIndex;

                  return (
                    <div
                      key={mid}
                      ref={(el) => { matchRefs.current[msgIndex] = el; }}
                      className={`group flex ${own ? 'justify-end' : 'justify-start'} ${isCurrentSearchMatch ? 'ring-2 ring-yellow-400 rounded-lg' : ''}`}
                      onMouseDown={() => onMessagePointerDown(mid)}
                      onMouseUp={onMessagePointerUp}
                      onTouchStart={() => onMessagePointerDown(mid)}
                      onTouchEnd={onMessagePointerUp}
                      onClick={() => selectionMode ? toggleSelect(mid) : null}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 relative ${
                          own
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        } ${selectionMode && selectedIds.includes(mid) ? 'ring-2 ring-destructive' : ''}`}
                      >
                        {/* Edit/Delete action buttons – shown on hover */}
                        {modifiable && !selectionMode && !isEditing && (
                          <div className={`absolute top-1 ${own ? 'left-1' : 'right-1'} hidden group-hover:flex gap-1`}>
                            <button
                              onClick={(e) => { e.stopPropagation(); startEdit(message); }}
                              className="rounded p-1 bg-background/80 hover:bg-background text-foreground shadow-sm"
                              title="Edit"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteSingle(mid); }}
                              className="rounded p-1 bg-background/80 hover:bg-destructive hover:text-destructive-foreground text-foreground shadow-sm"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}

                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="h-8 text-sm bg-background text-foreground"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmEdit(); }
                                if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={cancelEdit}>
                                <X className="h-3 w-3 mr-1" /> Cancel
                              </Button>
                              <Button size="sm" className="h-6 px-2 text-xs" onClick={confirmEdit} disabled={editMessage.isPending || !editContent.trim()}>
                                <Check className="h-3 w-3 mr-1" /> Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm break-words">{highlightText(message.content, msgIndex)}</p>
                        )}

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
                        <div className="flex items-center gap-1 mt-1">
                          <p className="text-xs opacity-70">
                            {getSenderName(message.senderId, message.senderName || message.sender || 'Unknown')}
                          </p>
                          {message.editedAt && (
                            <span className="text-[10px] opacity-50 italic">(edited)</span>
                          )}
                        </div>
                        <p className="text-[11px] opacity-60">
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })
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
      </>
      )}
    </div>
  );
}

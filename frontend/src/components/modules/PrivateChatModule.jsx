import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  useGetAllUsers,
  useGetMyConversations,
  useGetConversationMessages,
  useGetOrCreateConversation,
  useSendDirectMessage,
  useMarkConversationRead,
  useStorePublicKey,
  useDeleteDirectMessage,
  useEditDirectMessage,
} from '../../hooks/useQueries';
import { useCustomAuth } from '../../hooks/useCustomAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Send, Paperclip, X, ArrowLeft, Search, ShieldCheck, Lock, Pencil, Trash2, Check,
  MessageSquare, ChevronUp, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import {
  generateKeyPair, hasKeyPair, deriveSharedKey,
  encryptMessage, decryptMessage, getStoredPrivateKey
} from '../../utils/e2e';

export default function PrivateChatModule({ userProfile }) {
  const { identity } = useCustomAuth();
  const { data: users = [] } = useGetAllUsers();
  const { data: conversations = [], refetch: refetchConvos } = useGetMyConversations();
  const getOrCreate = useGetOrCreateConversation();
  const sendDM = useSendDirectMessage();
  const markRead = useMarkConversationRead();
  const storeKey = useStorePublicKey();
  const deleteDM = useDeleteDirectMessage();
  const editDM = useEditDirectMessage();

  const [activeConvoId, setActiveConvoId] = useState(null);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [sharedKey, setSharedKey] = useState(null);
  const [e2eReady, setE2eReady] = useState(false);
  const scrollRef = useRef(null);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [msgSearchTerm, setMsgSearchTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const matchRefs = useRef([]);

  const myId = userProfile.userId || userProfile.id;

  const { data: rawMessages = [], refetch: refetchMessages } = useGetConversationMessages(activeConvoId);

  // Decrypt messages when sharedKey changes
  const [decryptedMessages, setDecryptedMessages] = useState([]);
  useEffect(() => {
    let cancelled = false;
    const decrypt = async () => {
      if (!rawMessages.length) { setDecryptedMessages([]); return; }
      const results = await Promise.all(rawMessages.map(async (msg) => {
        if (!msg.encrypted || !sharedKey) return msg;
        const plaintext = await decryptMessage(sharedKey, msg.content, msg.iv);
        return { ...msg, _decrypted: plaintext };
      }));
      if (!cancelled) setDecryptedMessages(results);
    };
    decrypt();
    return () => { cancelled = true; };
  }, [rawMessages, sharedKey]);

  const messages = decryptedMessages;

  // Active conversation object
  const activeConvo = useMemo(() =>
    conversations.find(c => c._id === activeConvoId),
    [conversations, activeConvoId]
  );

  // Resolve peer user from a conversation
  const getPeer = useCallback((convo) => {
    if (!convo) return null;
    const peerId = convo.participants?.find(p => p !== myId);
    return users.find(u => (u.userId || u.id) === peerId) || { userId: peerId, name: peerId };
  }, [users, myId]);

  const normalizeAvatar = (avatar) => {
    if (!avatar) return '';
    const s = String(avatar).trim();
    if (!s) return '';
    if (s.startsWith('data:') || s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/uploads/')) return s;
    return `/uploads/${s.replace(/^\/+/, '')}`;
  };

  // ─── E2E Key Exchange ──────────────────────────────────────────
  useEffect(() => {
    if (!activeConvoId || !activeConvo) { setSharedKey(null); setE2eReady(false); return; }

    const setupE2E = async () => {
      try {
        // 1. Generate our key pair if we don't have one
        if (!hasKeyPair(activeConvoId)) {
          const pubKey = await generateKeyPair(activeConvoId);
          await storeKey.mutateAsync({ conversationId: activeConvoId, publicKey: pubKey });
          refetchConvos();
        }

        // 2. Check if peer has published their key
        const peerId = activeConvo.participants?.find(p => p !== myId);
        const peerKeyStr = activeConvo.publicKeys?.[peerId];
        if (peerKeyStr) {
          const peerPubJwk = JSON.parse(peerKeyStr);
          const derived = await deriveSharedKey(activeConvoId, peerPubJwk);
          setSharedKey(derived);
          setE2eReady(true);
        } else {
          // Peer hasn't published yet — we can still send unencrypted or wait
          setSharedKey(null);
          setE2eReady(false);
        }
      } catch (err) {
        console.error('[E2E] Setup error:', err);
        setSharedKey(null);
        setE2eReady(false);
      }
    };
    setupE2E();
  }, [activeConvoId, activeConvo?.publicKeys]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark as read when opening conversation
  useEffect(() => {
    if (activeConvoId) {
      markRead.mutate(activeConvoId);
    }
  }, [activeConvoId, messages.length]);

  // ─── Open conversation with a user ─────────────────────────────
  const openChat = async (userId) => {
    try {
      const convo = await getOrCreate.mutateAsync(userId);
      setActiveConvoId(convo._id);
      setContent('');
      setFiles([]);
      setContactSearch('');
      setEditingId(null);
    } catch (err) {
      toast.error(err.message || 'Failed to open conversation');
    }
  };

  // ─── Send message ──────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();
    if ((!content.trim() && files.length === 0) || !activeConvoId) return;

    try {
      // Handle attachments
      const attachments = [];
      for (const f of files) {
        if (f.size > 5 * 1024 * 1024) { toast.error(`File ${f.name} exceeds 5MB`); continue; }
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
        attachments.push({ name: f.name, type: f.type, size: f.size, data: dataUrl });
      }

      let payload = {
        senderName: userProfile.name || userProfile.username,
        content: content.trim() || (attachments.length > 0 ? '[attachment]' : ''),
        attachments,
        encrypted: false,
      };

      // Encrypt if E2E is ready
      if (e2eReady && sharedKey && content.trim()) {
        const { ciphertext, iv } = await encryptMessage(sharedKey, content.trim());
        payload.content = ciphertext;
        payload.iv = iv;
        payload.encrypted = true;
      }

      await sendDM.mutateAsync({ conversationId: activeConvoId, message: payload });
      setContent('');
      setFiles([]);
    } catch (error) {
      toast.error('Failed to send message');
      console.error(error);
    }
  };

  // ─── Edit / Delete ─────────────────────────────────────────────
  const startEdit = (msg) => {
    setEditingId(msg._id);
    setEditContent(msg._decrypted || msg.content || '');
  };
  const cancelEdit = () => { setEditingId(null); setEditContent(''); };
  const confirmEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    try {
      let payload = { content: editContent.trim() };
      if (e2eReady && sharedKey) {
        const { ciphertext, iv } = await encryptMessage(sharedKey, editContent.trim());
        payload = { content: ciphertext, iv, encrypted: true };
      }
      await editDM.mutateAsync({ messageId: editingId, payload });
      toast.success('Message edited');
      cancelEdit();
      refetchMessages();
    } catch (err) {
      toast.error(err?.message || 'Failed to edit');
    }
  };
  const handleDelete = async (id) => {
    try {
      await deleteDM.mutateAsync(id);
      toast.success('Message deleted');
    } catch (err) {
      toast.error(err?.message || 'Failed to delete');
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────
  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString();
  };

  const isOwnMessage = (senderId) => myId === senderId;

  const toPublicPath = (p) => {
    if (!p) return p;
    if (p.startsWith('/assets/')) return p;
    const marker = '/assets/';
    const idx = p.lastIndexOf(marker);
    if (idx >= 0) return `/assets/${p.slice(idx + marker.length)}`;
    return p;
  };
  const isImageAtt = (att) => {
    if (!att?.path) return false;
    if (att.type?.startsWith('image/')) return true;
    return /\.(png|jpe?g|gif|webp|svg)$/i.test(att.path);
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDate = '';
    messages.forEach(msg => {
      const date = formatDate(msg.createdAt);
      if (date !== currentDate) {
        groups.push({ type: 'date', date });
        currentDate = date;
      }
      groups.push({ type: 'message', msg });
    });
    return groups;
  }, [messages]);

  // Search in messages
  const searchMatches = useMemo(() => {
    if (!msgSearchTerm.trim()) return [];
    const term = msgSearchTerm.toLowerCase();
    const matches = [];
    messages.forEach((msg, idx) => {
      const text = msg._decrypted || msg.content || '';
      if (text.toLowerCase().includes(term)) matches.push(idx);
    });
    return matches;
  }, [messages, msgSearchTerm]);

  useEffect(() => { if (searchMatches.length > 0) setCurrentMatchIndex(0); }, [searchMatches.length, msgSearchTerm]);
  useEffect(() => {
    if (searchMatches.length > 0 && matchRefs.current[searchMatches[currentMatchIndex]]) {
      matchRefs.current[searchMatches[currentMatchIndex]]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentMatchIndex, searchMatches]);

  // Contact list — company users excluding self
  const contactList = useMemo(() => {
    return users
      .filter(u => {
        const uid = u.userId || u.id;
        if (uid === myId) return false;
        if (contactSearch) {
          const term = contactSearch.toLowerCase();
          return (u.name || '').toLowerCase().includes(term) ||
                 (u.username || '').toLowerCase().includes(term);
        }
        return true;
      })
      .sort((a, b) => (a.name || a.username || '').localeCompare(b.name || b.username || ''));
  }, [users, myId, contactSearch]);

  // Conversation list with peer info
  const convoList = useMemo(() => {
    return conversations.map(c => ({
      ...c,
      peer: getPeer(c),
    })).filter(c => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (c.peer?.name || '').toLowerCase().includes(term) ||
             (c.peer?.username || '').toLowerCase().includes(term);
    });
  }, [conversations, getPeer, searchTerm]);

  // ─── RENDER ────────────────────────────────────────────────────

  // Chat view (conversation open)
  if (activeConvoId && activeConvo) {
    const peer = getPeer(activeConvo);
    const peerAvatar = normalizeAvatar(peer?.avatar);
    const initials = (peer?.name || peer?.username || '?').slice(0, 2).toUpperCase();

    return (
      <div className="h-[calc(100vh-10rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b mb-2">
          <Button variant="ghost" size="icon" onClick={() => { setActiveConvoId(null); setSharedKey(null); setE2eReady(false); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage src={peerAvatar} />
            <AvatarFallback className="text-xs bg-primary/10">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{peer?.name || peer?.username}</p>
            <p className="text-xs text-muted-foreground truncate">
              {e2eReady ? (
                <span className="flex items-center gap-1 text-emerald-500">
                  <Lock className="h-3 w-3" /> End-to-end encrypted
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-500">
                  <ShieldCheck className="h-3 w-3" /> Setting up encryption…
                </span>
              )}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { setSearchOpen(o => !o); setMsgSearchTerm(''); }}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="flex items-center gap-2 rounded-md border p-2 bg-muted/40 mb-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={msgSearchTerm}
              onChange={(e) => setMsgSearchTerm(e.target.value)}
              placeholder="Search messages..."
              className="h-8"
              autoFocus
            />
            {msgSearchTerm.trim() && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {searchMatches.length > 0 ? `${currentMatchIndex + 1}/${searchMatches.length}` : '0/0'}
              </span>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setCurrentMatchIndex(i => (i - 1 + searchMatches.length) % searchMatches.length)} disabled={searchMatches.length === 0}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setCurrentMatchIndex(i => (i + 1) % searchMatches.length)} disabled={searchMatches.length === 0}>
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setSearchOpen(false); setMsgSearchTerm(''); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
          <div className="space-y-1 py-2">
            {groupedMessages.map((item, i) => {
              if (item.type === 'date') {
                return (
                  <div key={`date-${i}`} className="flex justify-center my-3">
                    <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">{item.date}</span>
                  </div>
                );
              }
              const msg = item.msg;
              const own = isOwnMessage(msg.senderId);
              const displayContent = msg._decrypted || msg.content || '';
              const isEditing = editingId === msg._id;
              const msgIdx = messages.indexOf(msg);
              const isCurrentSearch = searchMatches[currentMatchIndex] === msgIdx;

              return (
                <div
                  key={msg._id}
                  ref={el => { matchRefs.current[msgIdx] = el; }}
                  className={`group flex ${own ? 'justify-end' : 'justify-start'} ${isCurrentSearch ? 'ring-2 ring-yellow-400 rounded-lg' : ''}`}
                >
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 relative ${
                    own
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  }`}>
                    {/* Edit/Delete */}
                    {own && !isEditing && (
                      <div className="absolute top-1 left-1 hidden group-hover:flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); startEdit(msg); }} className="rounded p-1 bg-background/80 hover:bg-background text-foreground shadow-sm" title="Edit">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(msg._id); }} className="rounded p-1 bg-background/80 hover:bg-destructive hover:text-destructive-foreground text-foreground shadow-sm" title="Delete">
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
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={cancelEdit}><X className="h-3 w-3 mr-1" />Cancel</Button>
                          <Button size="sm" className="h-6 px-2 text-xs" onClick={confirmEdit}><Check className="h-3 w-3 mr-1" />Save</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm break-words whitespace-pre-wrap">{displayContent}</p>
                    )}

                    {/* Attachments */}
                    {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.attachments.map((att, idx) => {
                          if (!att) return null;
                          const publicPath = toPublicPath(att.path);
                          return (
                            <div key={idx} className="rounded border border-border/50 p-1.5 bg-background/40">
                              {isImageAtt(att) && <img src={publicPath} alt={att.name} className="max-h-40 rounded object-contain mb-1" />}
                              <a href={publicPath} download={att.name} className="text-xs underline flex items-center gap-1">
                                <Paperclip className="h-3 w-3" />{att.name}
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      {msg.encrypted && <Lock className="h-2.5 w-2.5 opacity-50" />}
                      {msg.editedAt && <span className="text-[10px] opacity-50 italic">edited</span>}
                      <span className="text-[10px] opacity-60">{formatTime(msg.createdAt)}</span>
                      {own && msg.readBy && msg.readBy.length > 1 && (
                        <span className="text-[10px] text-blue-400">✓✓</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && (
              <p className="text-center py-12 text-muted-foreground text-sm">
                {e2eReady ? '🔒 Messages are end-to-end encrypted. Send the first message!' : 'Start the conversation!'}
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="pt-2 border-t">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <Label htmlFor="dm-files" className="p-2 rounded-md bg-muted hover:bg-muted/80 cursor-pointer shrink-0">
              <Paperclip className="h-4 w-4" />
            </Label>
            <Input id="dm-files" type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            {files.length > 0 && (
              <div className="flex items-center gap-1 max-w-[30%] overflow-x-auto">
                {files.map((f, idx) => (
                  <Badge key={idx} variant="secondary" className="flex items-center gap-1 whitespace-nowrap text-xs">
                    {f.name.length > 10 ? f.name.slice(0, 10) + '…' : f.name}
                    <button type="button" onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={e2eReady ? '🔒 Type an encrypted message…' : 'Type a message…'}
              disabled={sendDM.isPending}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); }
              }}
            />
            <Button type="submit" size="icon" disabled={sendDM.isPending || (!content.trim() && files.length === 0)}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Conversation List View ────────────────────────────────────
  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col">
      {/* New chat search */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
            placeholder="Search people to chat..."
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Contact search results */}
      {contactSearch.trim() && (
        <div className="mb-3 max-h-48 overflow-y-auto border rounded-lg">
          {contactList.length === 0 ? (
            <p className="text-center py-3 text-sm text-muted-foreground">No users found</p>
          ) : (
            contactList.map(u => {
              const uid = u.userId || u.id;
              const avatar = normalizeAvatar(u.avatar);
              const initials = (u.name || u.username || '?').slice(0, 2).toUpperCase();
              return (
                <button
                  key={uid}
                  onClick={() => openChat(uid)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted/60 transition-colors text-left"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={avatar} />
                    <AvatarFallback className="text-xs bg-primary/10">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{u.name || u.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.designation || u.department || ''}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Search existing conversations */}
      {!contactSearch.trim() && (
        <div className="mb-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter conversations..."
            className="pl-9 h-9"
          />
        </div>
      )}

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {convoList.length === 0 && !contactSearch.trim() ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">No conversations yet</p>
            <p className="text-xs mt-1">Search for a colleague to start a private chat</p>
          </div>
        ) : (
          <div className="divide-y">
            {convoList.map(c => {
              const peer = c.peer;
              const avatar = normalizeAvatar(peer?.avatar);
              const initials = (peer?.name || peer?.username || '?').slice(0, 2).toUpperCase();
              const lastMsg = c.lastMessage;
              const unread = c.unreadCount || 0;

              return (
                <button
                  key={c._id}
                  onClick={() => { setActiveConvoId(c._id); setContactSearch(''); }}
                  className="flex items-center gap-3 w-full px-3 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarImage src={avatar} />
                    <AvatarFallback className="text-sm bg-primary/10">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold truncate">{peer?.name || peer?.username}</p>
                      {lastMsg?.timestamp && (
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                          {formatDate(lastMsg.timestamp) === 'Today' ? formatTime(lastMsg.timestamp) : formatDate(lastMsg.timestamp)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground truncate pr-2">
                        {lastMsg?.senderId === myId && <span className="text-muted-foreground/70">You: </span>}
                        {lastMsg?.content || 'No messages yet'}
                      </p>
                      {unread > 0 && (
                        <span className="shrink-0 flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

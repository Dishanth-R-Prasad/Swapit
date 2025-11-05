import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare } from 'lucide-react';

interface Conversation {
  id: string;
  other_user_id: string;
  other_user_name: string | null;
  other_user_avatar: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  item_id: string | null;
  item_title: string | null;
}

const Messages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchConversations();
    subscribeToMessages();
  }, [user, navigate]);

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchConversations = async () => {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          recipient_id,
          content,
          created_at,
          read_at,
          item_id,
          items (
            title
          )
        `)
        .or(`sender_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by conversation
      const conversationMap = new Map<string, Conversation>();

      for (const msg of messages || []) {
        const otherUserId = msg.sender_id === user?.id ? msg.recipient_id : msg.sender_id;
        const key = [user?.id, otherUserId].sort().join('-');

        if (!conversationMap.has(key)) {
          // Fetch other user's profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', otherUserId)
            .single();

          const unread = messages?.filter(
            (m) =>
              m.recipient_id === user?.id &&
              (m.sender_id === otherUserId || m.recipient_id === otherUserId) &&
              !m.read_at
          ).length || 0;

          conversationMap.set(key, {
            id: key,
            other_user_id: otherUserId,
            other_user_name: profile?.full_name || 'Unknown User',
            other_user_avatar: profile?.avatar_url || null,
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: unread,
            item_id: msg.item_id,
            item_title: msg.items?.title || null,
          });
        }
      }

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-4 pt-20 md:pt-24">
      <Navigation />
      <div className="container max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Messages</h1>

        {conversations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No messages yet</p>
              <p className="text-sm text-muted-foreground">
                Start a conversation from your interests
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <Card
                key={conversation.id}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => navigate(`/chat/${conversation.other_user_id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={conversation.other_user_avatar || undefined} />
                      <AvatarFallback>
                        {conversation.other_user_name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold truncate">
                          {conversation.other_user_name}
                        </h3>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatDistanceToNow(new Date(conversation.last_message_time), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {conversation.item_title && (
                        <p className="text-xs text-muted-foreground mb-1">
                          About: {conversation.item_title}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.last_message}
                        </p>
                        {conversation.unread_count > 0 && (
                          <Badge variant="default" className="ml-2">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
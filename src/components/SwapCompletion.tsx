import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle2, Clock, Handshake, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SwapCompletionProps {
  currentUserId: string;
  otherUserId: string;
}

interface Item {
  id: string;
  title: string;
  photo_url: string | null;
}

interface Swap {
  id: string;
  initiator_user_id: string;
  responder_user_id: string;
  initiator_item_id: string | null;
  responder_item_id: string | null;
  initiator_confirmed: boolean;
  responder_confirmed: boolean;
  status: string;
}

export function SwapCompletion({ currentUserId, otherUserId }: SwapCompletionProps) {
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [otherItems, setOtherItems] = useState<Item[]>([]);
  const [selectedMyItem, setSelectedMyItem] = useState<string>('');
  const [selectedOtherItem, setSelectedOtherItem] = useState<string>('');
  const [pendingSwap, setPendingSwap] = useState<Swap | null>(null);
  const [loading, setLoading] = useState(false);
  const [initiating, setInitiating] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchPendingSwap();
    subscribeToSwaps();
  }, [currentUserId, otherUserId]);

  const subscribeToSwaps = () => {
    const channel = supabase
      .channel('swap-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'swaps',
        },
        () => {
          fetchPendingSwap();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchItems = async () => {
    // Fetch my active items
    const { data: myData } = await supabase
      .from('items')
      .select('id, title, photo_url')
      .eq('user_id', currentUserId)
      .eq('status', 'active');

    // Fetch other user's active items
    const { data: otherData } = await supabase
      .from('items')
      .select('id, title, photo_url')
      .eq('user_id', otherUserId)
      .eq('status', 'active');

    setMyItems(myData || []);
    setOtherItems(otherData || []);
  };

  const fetchPendingSwap = async () => {
    const { data } = await supabase
      .from('swaps')
      .select('*')
      .eq('status', 'pending')
      .or(
        `and(initiator_user_id.eq.${currentUserId},responder_user_id.eq.${otherUserId}),and(initiator_user_id.eq.${otherUserId},responder_user_id.eq.${currentUserId})`
      )
      .maybeSingle();

    setPendingSwap(data);
  };

  const handleInitiateSwap = async () => {
    if (!selectedMyItem || !selectedOtherItem) {
      toast.error('Please select both items for the swap');
      return;
    }

    setInitiating(true);
    try {
      const { error } = await supabase.from('swaps').insert({
        initiator_user_id: currentUserId,
        responder_user_id: otherUserId,
        initiator_item_id: selectedMyItem,
        responder_item_id: selectedOtherItem,
        initiator_confirmed: true,
        responder_confirmed: false,
      });

      if (error) throw error;

      toast.success('Swap request sent! Waiting for confirmation.');
      setSelectedMyItem('');
      setSelectedOtherItem('');
      fetchPendingSwap();
    } catch (error) {
      console.error('Error initiating swap:', error);
      toast.error('Failed to initiate swap');
    } finally {
      setInitiating(false);
    }
  };

  const handleConfirmSwap = async () => {
    if (!pendingSwap) return;

    setLoading(true);
    try {
      // Update responder_confirmed to true
      const { error: updateError } = await supabase
        .from('swaps')
        .update({ responder_confirmed: true })
        .eq('id', pendingSwap.id);

      if (updateError) throw updateError;

      // Call the complete_swap function
      const { error: completeError } = await supabase.rpc('complete_swap', {
        swap_id: pendingSwap.id,
      });

      if (completeError) throw completeError;

      toast.success('Swap completed successfully! Both users earned a swap credit.');
      fetchPendingSwap();
      fetchItems();
    } catch (error) {
      console.error('Error confirming swap:', error);
      toast.error('Failed to confirm swap');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSwap = async () => {
    if (!pendingSwap) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('swaps')
        .update({ status: 'cancelled' })
        .eq('id', pendingSwap.id);

      if (error) throw error;

      toast.success('Swap request cancelled');
      fetchPendingSwap();
    } catch (error) {
      console.error('Error cancelling swap:', error);
      toast.error('Failed to cancel swap');
    } finally {
      setLoading(false);
    }
  };

  const isInitiator = pendingSwap?.initiator_user_id === currentUserId;
  const myItem = pendingSwap
    ? (isInitiator
        ? myItems.find((i) => i.id === pendingSwap.initiator_item_id)
        : otherItems.find((i) => i.id === pendingSwap.responder_item_id)) ||
      (isInitiator
        ? { title: 'Your item' }
        : { title: 'Their item' })
    : null;
  const theirItem = pendingSwap
    ? (isInitiator
        ? otherItems.find((i) => i.id === pendingSwap.responder_item_id)
        : myItems.find((i) => i.id === pendingSwap.initiator_item_id)) ||
      (isInitiator
        ? { title: 'Their item' }
        : { title: 'Your item' })
    : null;

  // If there's a pending swap
  if (pendingSwap) {
    return (
      <Card className="mb-4 border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Handshake className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Swap Request</CardTitle>
            <Badge variant={isInitiator ? 'secondary' : 'default'} className="ml-auto">
              {isInitiator ? (
                <>
                  <Clock className="w-3 h-3 mr-1" />
                  Waiting for confirmation
                </>
              ) : (
                'Action required'
              )}
            </Badge>
          </div>
          <CardDescription>
            {isInitiator
              ? 'You initiated a swap request. Waiting for the other user to confirm.'
              : 'The other user wants to swap items with you.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex-1 text-center p-3 bg-background rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Your item</p>
              <p className="font-medium truncate">
                {isInitiator ? (myItem as Item)?.title : (theirItem as Item)?.title}
              </p>
            </div>
            <Handshake className="w-6 h-6 text-muted-foreground" />
            <div className="flex-1 text-center p-3 bg-background rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Their item</p>
              <p className="font-medium truncate">
                {isInitiator ? (theirItem as Item)?.title : (myItem as Item)?.title}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {!isInitiator && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="flex-1" disabled={loading}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirm Swap
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Swap Completion</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to confirm this swap? This action will:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Mark both items as "Swapped"</li>
                        <li>Remove items from active listings</li>
                        <li>Award swap credits to both users</li>
                      </ul>
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmSwap}>
                      Confirm Swap
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className={isInitiator ? 'flex-1' : ''} disabled={loading}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Swap Request</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel this swap request?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Request</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancelSwap}>
                    Cancel Swap
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No pending swap - show initiation form
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Handshake className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Mark Swap as Completed</CardTitle>
        </div>
        <CardDescription>
          Select the items involved in your swap and request completion confirmation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Your item</label>
            <Select value={selectedMyItem} onValueChange={setSelectedMyItem}>
              <SelectTrigger>
                <SelectValue placeholder="Select your item" />
              </SelectTrigger>
              <SelectContent>
                {myItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Their item</label>
            <Select value={selectedOtherItem} onValueChange={setSelectedOtherItem}>
              <SelectTrigger>
                <SelectValue placeholder="Select their item" />
              </SelectTrigger>
              <SelectContent>
                {otherItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleInitiateSwap}
            disabled={initiating || !selectedMyItem || !selectedOtherItem}
            className="w-full"
          >
            <Handshake className="w-4 h-4 mr-2" />
            Request Swap Completion
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

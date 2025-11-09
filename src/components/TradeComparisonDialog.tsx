import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Scale } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TradeComparison } from './TradeComparison';
import { Card, CardContent } from './ui/card';

interface TradeComparisonDialogProps {
  theirItemId: string;
  theirItemTitle: string;
}

interface MyItem {
  id: string;
  title: string;
  photo_url: string | null;
  estimated_value: number | null;
}

export const TradeComparisonDialog = ({ 
  theirItemId, 
  theirItemTitle 
}: TradeComparisonDialogProps) => {
  const [myItems, setMyItems] = useState<MyItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchMyItems();
  }, [user]);

  const fetchMyItems = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('items')
        .select('id, title, photo_url, estimated_value')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      setMyItems(data || []);
    } catch (error) {
      console.error('Error fetching my items:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Scale className="w-4 h-4" />
          Compare Trade Value
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare Trade Fairness</DialogTitle>
          <DialogDescription>
            Select one of your items to compare with "{theirItemTitle}"
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : myItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>You don't have any active items to compare.</p>
            <p className="text-sm mt-2">Create a listing first!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {myItems.map((item) => (
                <Card
                  key={item.id}
                  className={`cursor-pointer transition-all ${
                    selectedItemId === item.id
                      ? 'ring-2 ring-primary'
                      : 'hover:border-primary'
                  }`}
                  onClick={() => setSelectedItemId(item.id)}
                >
                  <CardContent className="p-3">
                    <div className="aspect-video bg-muted rounded-md mb-2 overflow-hidden">
                      {item.photo_url ? (
                        <img
                          src={item.photo_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl">📦</span>
                        </div>
                      )}
                    </div>
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    {item.estimated_value && (
                      <p className="text-xs text-muted-foreground">
                        Est. ${item.estimated_value.toFixed(0)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedItemId && (
              <div className="pt-4 border-t">
                <TradeComparison myItemId={selectedItemId} theirItemId={theirItemId} />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

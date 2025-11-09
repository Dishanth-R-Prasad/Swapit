import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import SwipeCard from '@/components/SwipeCard';
import Navigation from '@/components/Navigation';
import { X, Heart, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Item {
  id: string;
  title: string;
  category: string;
  description: string | null;
  price: number;
  is_donation: boolean;
  photo_url: string | null;
  city: string | null;
  pincode: string | null;
  user_id: string;
  estimated_value?: number | null;
}

const Home = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchItems();
  }, [user, navigate]);

  const fetchItems = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/items`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch items');
      
      const data = await response.json();
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (direction: string, itemId: string) => {
    if (direction === 'right') {
      try {
        const { error } = await supabase.from('interests').insert({
          user_id: user?.id,
          item_id: itemId,
        });
        if (error && error.code !== '23505') throw error;
        toast.success('Added to interests!');
      } catch (error) {
        console.error('Error adding interest:', error);
      }
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const currentItem = items[currentIndex];
  const hasMoreCards = currentIndex < items.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-4 pt-20 md:pt-24">
      <Navigation />
      <div className="container max-w-md mx-auto px-4">
        <div className="relative h-[600px] mb-8">
          {!hasMoreCards ? (
            <div className="absolute inset-0 flex items-center justify-center bg-card rounded-3xl border-2 border-dashed border-border">
              <div className="text-center p-8">
                <RotateCcw className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-bold mb-2">No more items</h2>
                <p className="text-muted-foreground mb-4">
                  Check back later for new listings
                </p>
                <Button onClick={fetchItems}>
                  Refresh
                </Button>
              </div>
            </div>
          ) : (
            <>
              {items.slice(currentIndex, currentIndex + 3).map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    zIndex: items.length - index,
                    transform: `scale(${1 - index * 0.05}) translateY(${index * -10}px)`,
                    opacity: 1 - index * 0.2,
                  }}
                  className="absolute inset-0"
                >
                  {index === 0 ? (
                    <SwipeCard item={item} onSwipe={handleSwipe} />
                  ) : (
                    <div className="w-full h-full bg-card rounded-3xl shadow-lg" />
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {hasMoreCards && (
          <div className="flex justify-center gap-8">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full w-16 h-16 border-2 hover:border-swipe-pass hover:text-swipe-pass"
              onClick={() => handleSwipe('left', currentItem.id)}
            >
              <X className="w-6 h-6" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full w-16 h-16 border-2 hover:border-swipe-like hover:text-swipe-like"
              onClick={() => handleSwipe('right', currentItem.id)}
            >
              <Heart className="w-6 h-6" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;

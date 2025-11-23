import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Package } from 'lucide-react';
import { toast } from 'sonner';

interface AuctionItem {
  id: string;
  title: string;
  category: string;
  photo_url: string | null;
  auction_end_date: string;
  city: string;
  price: number;
  offer_count?: number;
}

const Auctions = () => {
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchAuctions();
  }, [user, navigate]);

  const fetchAuctions = async () => {
    try {
      const { data: items, error } = await supabase
        .from('items')
        .select('*')
        .eq('is_auction', true)
        .eq('status', 'active')
        .gt('auction_end_date', new Date().toISOString())
        .order('auction_end_date', { ascending: true });

      if (error) throw error;

      // Get offer counts for each auction
      const itemsWithOffers = await Promise.all(
        (items || []).map(async (item) => {
          const { count } = await supabase
            .from('offers')
            .select('*', { count: 'exact', head: true })
            .eq('auction_listing_id', item.id);
          
          return { ...item, offer_count: count || 0 };
        })
      );

      setAuctions(itemsWithOffers);
    } catch (error: any) {
      toast.error('Failed to load auctions');
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (endDate: string) => {
    const now = new Date().getTime();
    const end = new Date(endDate).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const filteredAuctions = auctions.filter((auction) => {
    if (filter === 'ending-soon') {
      const timeLeft = new Date(auction.auction_end_date).getTime() - new Date().getTime();
      return timeLeft < 24 * 60 * 60 * 1000; // Less than 24 hours
    }
    if (filter === 'most-offers') {
      return (auction.offer_count || 0) > 0;
    }
    if (filter !== 'all') {
      return auction.category.toLowerCase() === filter.toLowerCase();
    }
    return true;
  }).sort((a, b) => {
    if (filter === 'most-offers') {
      return (b.offer_count || 0) - (a.offer_count || 0);
    }
    return 0;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 md:pb-4 pt-20 md:pt-24">
        <Navigation />
        <div className="container mx-auto px-4">
          <p className="text-center text-muted-foreground">Loading auctions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-4 pt-20 md:pt-24">
      <Navigation />
      <div className="container mx-auto px-4">
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Active Auctions</h1>
              <p className="text-muted-foreground mt-1">Compete for items with your offers</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Auctions</SelectItem>
                <SelectItem value="ending-soon">Ending Soon</SelectItem>
                <SelectItem value="most-offers">Most Offers</SelectItem>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="clothing">Clothing</SelectItem>
                <SelectItem value="books">Books</SelectItem>
                <SelectItem value="furniture">Furniture</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredAuctions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold text-foreground mb-2">No Active Auctions</p>
              <p className="text-muted-foreground text-center">
                Check back later for new auction listings
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAuctions.map((auction) => (
              <Card 
                key={auction.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/auctions/${auction.id}`)}
              >
                <div className="relative">
                  {auction.photo_url ? (
                    <img
                      src={auction.photo_url}
                      alt={auction.title}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Badge variant="secondary" className="bg-background/90 backdrop-blur">
                      <Clock className="w-3 h-3 mr-1" />
                      {getTimeRemaining(auction.auction_end_date)}
                    </Badge>
                  </div>
                  {(auction.offer_count || 0) > 0 && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-primary/90 backdrop-blur">
                        {auction.offer_count} {auction.offer_count === 1 ? 'offer' : 'offers'}
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <Badge variant="outline" className="mb-2">{auction.category}</Badge>
                  <h3 className="font-semibold text-lg mb-1 text-foreground line-clamp-1">
                    {auction.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">{auction.city}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary">
                      Est. ₹{auction.price}
                    </span>
                    <Button size="sm" onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/auctions/${auction.id}`);
                    }}>
                      View Details
                    </Button>
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

export default Auctions;

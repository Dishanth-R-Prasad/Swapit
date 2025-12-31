import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Clock, MapPin, Package, User, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import { offerSchema, getZodErrorMessage } from '@/lib/validations';

interface AuctionItem {
  id: string;
  title: string;
  description: string;
  category: string;
  photo_url: string | null;
  auction_end_date: string;
  city: string;
  price: number;
  estimated_value: number | null;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

interface Offer {
  id: string;
  message: string;
  created_at: string;
  status: string;
  offerer_user_id: string;
  offered_item_id: string | null;
  cash_amount: number;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
  items: {
    title: string;
    photo_url: string;
    price: number;
    estimated_value: number | null;
  } | null;
}

interface UserItem {
  id: string;
  title: string;
  photo_url: string | null;
  price: number;
  estimated_value: number | null;
}

const AuctionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [auction, setAuction] = useState<AuctionItem | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [userItems, setUserItems] = useState<UserItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [offerType, setOfferType] = useState<'item' | 'cash' | 'both'>('item');
  const [offerMessage, setOfferMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchAuctionDetails();
    fetchUserItems();
  }, [user, id, navigate]);

  const fetchAuctionDetails = async () => {
    try {
      const { data: auctionData, error: auctionError } = await supabase
        .from('items')
        .select(`
          *,
          profiles (full_name, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (auctionError) throw auctionError;
      setAuction(auctionData);

      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select(`
          *,
          profiles!offerer_user_id (full_name, avatar_url)
        `)
        .eq('auction_listing_id', id)
        .order('created_at', { ascending: false });

      // Fetch offered item details separately to avoid ambiguity
      const offersWithItems = await Promise.all(
        (offersData || []).map(async (offer) => {
          if (offer.offered_item_id) {
            const { data: itemData } = await supabase
              .from('items')
              .select('title, photo_url, price, estimated_value')
              .eq('id', offer.offered_item_id)
              .single();
            
            return { ...offer, items: itemData || null };
          }
          return { ...offer, items: null };
        })
      );

      if (offersError) throw offersError;
      setOffers(offersWithItems);
    } catch (error: any) {
      toast.error('Failed to load auction details');
      navigate('/auctions');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserItems = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('items')
      .select('id, title, photo_url, price, estimated_value')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('is_auction', false);

    if (!error && data) {
      setUserItems(data);
    }
  };

  const handlePlaceOffer = async () => {
    if (!user || !auction) return;
    
    // Validate based on offer type
    if (offerType === 'item' && !selectedItemId) {
      toast.error('Please select an item to offer');
      return;
    }
    
    const parsedCashAmount = parseFloat(cashAmount) || 0;
    
    if (offerType === 'cash' && parsedCashAmount <= 0) {
      toast.error('Please enter a valid cash amount');
      return;
    }
    if (offerType === 'both' && (!selectedItemId || parsedCashAmount <= 0)) {
      toast.error('Please select an item and enter a cash amount');
      return;
    }
    
    // Validate offer data with zod
    const validation = offerSchema.safeParse({
      cashAmount: offerType !== 'item' ? parsedCashAmount : 0,
      message: offerMessage,
    });
    
    if (!validation.success) {
      toast.error(getZodErrorMessage(validation.error));
      return;
    }
    
    setSubmitting(true);
    try {
      const { error } = await supabase.from('offers').insert({
        auction_listing_id: auction.id,
        offerer_user_id: user.id,
        offered_item_id: offerType !== 'cash' ? selectedItemId : null,
        cash_amount: validation.data.cashAmount,
        message: validation.data.message || null,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Offer placed successfully!');
      setDialogOpen(false);
      setSelectedItemId('');
      setCashAmount('');
      setOfferType('item');
      setOfferMessage('');
      fetchAuctionDetails();
    } catch (error: any) {
      toast.error(error.message || 'Failed to place offer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    try {
      const { error } = await supabase
        .from('offers')
        .update({ status: 'accepted' })
        .eq('id', offerId);

      if (error) throw error;

      // Update auction status to completed
      await supabase
        .from('items')
        .update({ status: 'completed' })
        .eq('id', id);

      toast.success('Offer accepted!');
      navigate('/my-items');
    } catch (error: any) {
      toast.error('Failed to accept offer');
    }
  };

  const getTimeRemaining = (endDate: string) => {
    const now = new Date().getTime();
    const end = new Date(endDate).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Auction Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 md:pb-4 pt-20 md:pt-24">
        <Navigation />
        <div className="container mx-auto px-4">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!auction) return null;

  const isOwner = user?.id === auction.user_id;
  const hasEnded = new Date(auction.auction_end_date) < new Date();

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-4 pt-20 md:pt-24">
      <Navigation />
      <div className="container max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Auction Details */}
          <Card>
            <CardContent className="p-0">
              {auction.photo_url ? (
                <img
                  src={auction.photo_url}
                  alt={auction.title}
                  className="w-full h-96 object-cover rounded-t-lg"
                />
              ) : (
                <div className="w-full h-96 bg-muted flex items-center justify-center rounded-t-lg">
                  <Package className="w-24 h-24 text-muted-foreground" />
                </div>
              )}
              <div className="p-6 space-y-4">
                <div>
                  <Badge variant="outline">{auction.category}</Badge>
                  <h1 className="text-3xl font-bold text-foreground mt-2">{auction.title}</h1>
                  <p className="text-muted-foreground mt-2">{auction.description}</p>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{auction.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className={hasEnded ? 'text-destructive font-semibold' : 'text-primary font-semibold'}>
                      {getTimeRemaining(auction.auction_end_date)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t">
                  <Avatar>
                    <AvatarImage src={auction.profiles.avatar_url} />
                    <AvatarFallback>
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{auction.profiles.full_name}</p>
                    <p className="text-xs text-muted-foreground">Listing Owner</p>
                  </div>
                </div>

                {!isOwner && !hasEnded && (
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full" size="lg">
                        Place Offer
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Place Your Offer</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-3">
                          <Label>Offer Type</Label>
                          <RadioGroup value={offerType} onValueChange={(v) => setOfferType(v as 'item' | 'cash' | 'both')}>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="item" id="item" />
                              <Label htmlFor="item" className="font-normal cursor-pointer">Trade with Item</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="cash" id="cash" />
                              <Label htmlFor="cash" className="font-normal cursor-pointer">Cash Only</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="both" id="both" />
                              <Label htmlFor="both" className="font-normal cursor-pointer">Item + Cash</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {(offerType === 'item' || offerType === 'both') && (
                          <div className="space-y-2">
                            <Label>Select Item to Offer</Label>
                            {userItems.length === 0 ? (
                              <div className="p-4 text-center border rounded-lg bg-muted/50">
                                <p className="text-sm text-muted-foreground mb-2">
                                  You don't have any items to offer
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate('/create')}
                                >
                                  Create a Listing First
                                </Button>
                              </div>
                            ) : (
                              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose from your items" />
                                </SelectTrigger>
                                <SelectContent>
                                  {userItems.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                      {item.title} (₹{item.estimated_value || item.price})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        )}

                        {(offerType === 'cash' || offerType === 'both') && (
                          <div className="space-y-2">
                            <Label>Cash Amount (₹)</Label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                type="number"
                                placeholder="Enter amount"
                                value={cashAmount}
                                onChange={(e) => setCashAmount(e.target.value)}
                                className="pl-9"
                                min="0"
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Message (Optional)</Label>
                          <Textarea
                            placeholder="Add a message with your offer..."
                            value={offerMessage}
                            onChange={(e) => setOfferMessage(e.target.value)}
                            rows={3}
                            maxLength={1000}
                          />
                          <p className="text-xs text-muted-foreground text-right">{offerMessage.length}/1000</p>
                        </div>
                        <Button 
                          onClick={handlePlaceOffer} 
                          disabled={submitting}
                          className="w-full"
                        >
                          {submitting ? 'Placing Offer...' : 'Submit Offer'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Offers List */}
          <Card>
            <CardHeader>
              <CardTitle>Offers ({offers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {offers.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No offers yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {offers.map((offer) => (
                    <Card key={offer.id}>
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {offer.items?.photo_url ? (
                            <img
                              src={offer.items.photo_url}
                              alt={offer.items.title}
                              className="w-20 h-20 object-cover rounded"
                            />
                          ) : offer.items ? (
                            <div className="w-20 h-20 bg-muted rounded flex items-center justify-center">
                              <Package className="w-8 h-8 text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="w-20 h-20 bg-primary/10 rounded flex items-center justify-center">
                              <IndianRupee className="w-8 h-8 text-primary" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                {offer.items && (
                                  <>
                                    <h4 className="font-semibold">{offer.items.title}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      Est. ₹{offer.items.estimated_value || offer.items.price}
                                    </p>
                                  </>
                                )}
                                {offer.cash_amount > 0 && (
                                  <div className="flex items-center gap-1 text-primary font-semibold">
                                    <IndianRupee className="w-4 h-4" />
                                    <span>{offer.cash_amount.toLocaleString('en-IN')}</span>
                                    {offer.items && <span className="text-xs text-muted-foreground ml-1">(+ item)</span>}
                                  </div>
                                )}
                                {!offer.items && offer.cash_amount > 0 && (
                                  <p className="text-xs text-muted-foreground">Cash offer only</p>
                                )}
                              </div>
                              <Badge variant={
                                offer.status === 'accepted' ? 'default' :
                                offer.status === 'rejected' ? 'destructive' :
                                'secondary'
                              }>
                                {offer.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={offer.profiles.avatar_url} />
                                <AvatarFallback>
                                  <User className="w-3 h-3" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{offer.profiles.full_name}</span>
                            </div>
                            {offer.message && (
                              <p className="text-sm text-muted-foreground mt-2 italic">
                                "{offer.message}"
                              </p>
                            )}
                            {isOwner && offer.status === 'pending' && !hasEnded && (
                              <Button 
                                size="sm" 
                                className="mt-3"
                                onClick={() => handleAcceptOffer(offer.id)}
                              >
                                Accept Offer
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuctionDetail;

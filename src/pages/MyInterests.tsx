import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MapPin, X } from 'lucide-react';

interface Interest {
  id: string;
  item: {
    id: string;
    title: string;
    category: string;
    description: string | null;
    price: number;
    is_donation: boolean;
    photo_url: string | null;
    city: string | null;
    pincode: string | null;
    profiles: {
      full_name: string | null;
      email: string | null;
    };
  };
}

const MyInterests = () => {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchInterests();
  }, [user, navigate]);

  const fetchInterests = async () => {
    try {
      const { data, error } = await supabase
        .from('interests')
        .select(`
          id,
          item:items (
            id,
            title,
            category,
            description,
            price,
            is_donation,
            photo_url,
            city,
            pincode,
            profiles (
              full_name,
              email
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInterests(data || []);
    } catch (error) {
      console.error('Error fetching interests:', error);
      toast.error('Failed to load your interests');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveInterest = async (interestId: string) => {
    try {
      const { error } = await supabase
        .from('interests')
        .delete()
        .eq('id', interestId);

      if (error) throw error;
      toast.success('Removed from interests');
      fetchInterests();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove interest');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your interests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-4 pt-20 md:pt-24">
      <Navigation />
      <div className="container max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">My Interests</h1>

        {interests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                You haven't shown interest in any items yet
              </p>
              <Button onClick={() => navigate('/')}>
                Start Swiping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {interests.map((interest) => (
              <Card key={interest.id} className="overflow-hidden">
                <div className="h-48 bg-muted relative">
                  {interest.item.photo_url ? (
                    <img
                      src={interest.item.photo_url}
                      alt={interest.item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl">📦</span>
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => handleRemoveInterest(interest.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg mb-2 line-clamp-1">
                    {interest.item.title}
                  </h3>
                  {interest.item.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {interest.item.description}
                    </p>
                  )}
                  <div className="flex gap-2 mb-4">
                    <Badge variant="outline">{interest.item.category}</Badge>
                    <Badge variant={interest.item.is_donation ? 'default' : 'secondary'}>
                      {interest.item.is_donation ? 'Free' : `₹${interest.item.price}`}
                    </Badge>
                  </div>
                  {interest.item.city && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {interest.item.city}
                        {interest.item.pincode ? `, ${interest.item.pincode}` : ''}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-border pt-4 space-y-2">
                    <p className="text-sm font-medium mb-1">Contact Seller</p>
                    {interest.item.profiles?.full_name && (
                      <p className="text-sm text-muted-foreground">
                        {interest.item.profiles.full_name}
                      </p>
                    )}
                    {interest.item.profiles?.email && (
                      <a
                        href={`mailto:${interest.item.profiles.email}`}
                        className="text-sm text-primary hover:underline block"
                      >
                        {interest.item.profiles.email}
                      </a>
                    )}
                    <Button
                      className="w-full mt-2"
                      onClick={() => {
                        const sellerId = interest.item.id;
                        // Get the user_id from the item
                        supabase
                          .from('items')
                          .select('user_id')
                          .eq('id', sellerId)
                          .single()
                          .then(({ data }) => {
                            if (data?.user_id) {
                              navigate(`/chat/${data.user_id}`);
                            }
                          });
                      }}
                    >
                      Send Message
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

export default MyInterests;

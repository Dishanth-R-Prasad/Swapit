import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import { listingSchema, getZodErrorMessage } from '@/lib/validations';

const CreateListing = () => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [isDonation, setIsDonation] = useState(true);
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isAuction, setIsAuction] = useState(false);
  const [auctionDays, setAuctionDays] = useState('3');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validate inputs with zod
    const validation = listingSchema.safeParse({
      title: title.trim(),
      category,
      description: description.trim(),
      price: isDonation ? 0 : parseFloat(price) || 0,
      estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
      city: city.trim(),
      pincode: pincode.trim() || undefined,
    });
    
    if (!validation.success) {
      toast.error(getZodErrorMessage(validation.error));
      return;
    }
    
    setLoading(true);

    try {
      let photoUrl = null;

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${user.id}/${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('item-photos')
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('item-photos')
          .getPublicUrl(fileName);

        photoUrl = publicUrl;
      }

      const auctionEndDate = isAuction 
        ? new Date(Date.now() + parseInt(auctionDays) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase.from('items').insert({
        user_id: user.id,
        title: validation.data.title,
        category: validation.data.category,
        description: validation.data.description || null,
        price: validation.data.price,
        estimated_value: validation.data.estimatedValue,
        is_donation: isDonation,
        photo_url: photoUrl,
        city: validation.data.city || null,
        pincode: validation.data.pincode || null,
        status: 'active',
        is_auction: isAuction,
        auction_end_date: auctionEndDate,
      });

      if (error) throw error;

      toast.success('Item listed successfully!');
      navigate('/my-items');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-4 pt-20 md:pt-24">
      <Navigation />
      <div className="container max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create New Listing</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Photo Upload */}
              <div className="space-y-2">
                <Label>Photo</Label>
                {photoPreview ? (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={removePhoto}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="w-12 h-12 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Click to upload photo</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handlePhotoChange}
                    />
                  </label>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Vintage leather jacket"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clothes">Clothes</SelectItem>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="books">Books</SelectItem>
                    <SelectItem value="furniture">Furniture</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your item..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground text-right">{description.length}/2000</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="auction">List as Auction</Label>
                  <p className="text-sm text-muted-foreground">
                    Let users compete with offers
                  </p>
                </div>
                <Switch
                  id="auction"
                  checked={isAuction}
                  onCheckedChange={setIsAuction}
                />
              </div>

              {isAuction && (
                <div className="space-y-2">
                  <Label htmlFor="auctionDays">Auction Duration</Label>
                  <Select value={auctionDays} onValueChange={setAuctionDays}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="donation">Free Donation</Label>
                  <p className="text-sm text-muted-foreground">
                    Give away for free
                  </p>
                </div>
                <Switch
                  id="donation"
                  checked={isDonation}
                  onCheckedChange={setIsDonation}
                />
              </div>

              {!isDonation && (
              <div className="space-y-2">
                <Label htmlFor="price">Base Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  max="100000000"
                  step="1"
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            )}

              <div className="space-y-2">
                <Label htmlFor="estimatedValue">Estimated Value (₹)</Label>
                <Input
                  id="estimatedValue"
                  type="number"
                  min="0"
                  max="100000000"
                  step="1"
                  placeholder="Enter estimated market value"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  This helps others understand the value of your item for fair swaps
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    placeholder="400001"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    pattern="[0-9]{6}"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/my-items')}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Listing'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateListing;

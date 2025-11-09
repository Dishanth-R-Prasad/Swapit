import { useState } from 'react';
import TinderCard from 'react-tinder-card';
import { MapPin, Tag } from 'lucide-react';
import { Badge } from './ui/badge';
import { ValueEstimate } from './ValueEstimate';

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
  estimated_value?: number | null;
}

interface SwipeCardProps {
  item: Item;
  onSwipe: (direction: string, itemId: string) => void;
}

const SwipeCard = ({ item, onSwipe }: SwipeCardProps) => {
  const [exitX, setExitX] = useState(0);

  const onCardLeftScreen = (direction: string) => {
    onSwipe(direction, item.id);
  };

  const categoryColors: Record<string, string> = {
    clothes: 'bg-purple-100 text-purple-800',
    electronics: 'bg-blue-100 text-blue-800',
    books: 'bg-green-100 text-green-800',
    furniture: 'bg-orange-100 text-orange-800',
  };

  return (
    <TinderCard
      className="absolute w-full h-full"
      onSwipe={onCardLeftScreen}
      onCardLeftScreen={() => onCardLeftScreen(exitX > 0 ? 'right' : 'left')}
      preventSwipe={['up', 'down']}
    >
      <div 
        className="relative w-full h-full bg-card rounded-3xl overflow-hidden shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.2)] cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      >
        {/* Image */}
        <div className="h-3/5 bg-muted relative">
          {item.photo_url ? (
            <img
              src={item.photo_url}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-24 h-24 text-muted-foreground" />
            </div>
          )}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start gap-2">
            <Badge className={categoryColors[item.category] || 'bg-gray-100 text-gray-800'}>
              <Tag className="w-3 h-3 mr-1" />
              {item.category}
            </Badge>
            <div className="flex gap-2">
              <ValueEstimate itemId={item.id} currentValue={item.estimated_value} compact />
              {item.is_donation ? (
                <Badge variant="secondary" className="bg-primary text-primary-foreground">
                  Free
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-background/90">
                  ₹{item.price}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="h-2/5 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2 line-clamp-1">{item.title}</h2>
            {item.description && (
              <p className="text-muted-foreground line-clamp-2 mb-3">
                {item.description}
              </p>
            )}
          </div>
          
          {item.city && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{item.city}{item.pincode ? `, ${item.pincode}` : ''}</span>
            </div>
          )}
        </div>
      </div>
    </TinderCard>
  );
};

const Package = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16.5 9.4 7.55 4.24" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.29 7 12 12 20.71 7" />
    <line x1="12" x2="12" y1="22" y2="12" />
  </svg>
);

export default SwipeCard;

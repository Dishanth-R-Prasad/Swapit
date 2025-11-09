import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ValueEstimateProps {
  itemId: string;
  currentValue?: number | null;
  onValueEstimated?: (value: number) => void;
  compact?: boolean;
}

export const ValueEstimate = ({ 
  itemId, 
  currentValue, 
  onValueEstimated,
  compact = false 
}: ValueEstimateProps) => {
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimatedValue, setEstimatedValue] = useState<number | null>(currentValue || null);
  const { toast } = useToast();

  const handleEstimate = async () => {
    setIsEstimating(true);
    try {
      const { data, error } = await supabase.functions.invoke('estimate-value', {
        body: { itemId }
      });

      if (error) throw error;

      setEstimatedValue(data.estimatedValue);
      onValueEstimated?.(data.estimatedValue);
      
      toast({
        title: "Value Estimated",
        description: `Estimated at $${data.estimatedValue.toFixed(2)}`,
      });
    } catch (error) {
      console.error('Error estimating value:', error);
      toast({
        title: "Estimation Failed",
        description: "Could not estimate item value. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEstimating(false);
    }
  };

  if (estimatedValue !== null) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Sparkles className="h-3 w-3" />
        ${estimatedValue.toFixed(0)}
      </Badge>
    );
  }

  if (compact) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={handleEstimate}
        disabled={isEstimating}
        className="gap-1"
      >
        {isEstimating ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Sparkles className="h-3 w-3" />
        )}
        Estimate
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleEstimate}
      disabled={isEstimating}
      className="gap-2"
    >
      {isEstimating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Estimating...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Estimate Value
        </>
      )}
    </Button>
  );
};

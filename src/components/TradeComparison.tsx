import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TradeComparisonProps {
  myItemId: string;
  theirItemId: string;
}

interface ComparisonResult {
  myItem: {
    title: string;
    estimatedValue: number;
  };
  theirItem: {
    title: string;
    estimatedValue: number;
  };
  fairnessScore: number;
  fairnessLevel: string;
  recommendation: string;
}

export const TradeComparison = ({ myItemId, theirItemId }: TradeComparisonProps) => {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComparison();
  }, [myItemId, theirItemId]);

  const fetchComparison = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('suggest-fair-swaps', {
        body: { myItemId, theirItemId }
      });

      if (error) throw error;
      setComparison(data);
    } catch (error) {
      console.error('Error fetching comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Scale className="h-6 w-6 animate-pulse text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!comparison) return null;

  const getFairnessColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFairnessIcon = () => {
    const diff = comparison.myItem.estimatedValue - comparison.theirItem.estimatedValue;
    if (Math.abs(diff) < comparison.myItem.estimatedValue * 0.15) {
      return <Minus className="h-5 w-5" />;
    }
    return diff > 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Trade Fairness Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Your Item</p>
            <p className="font-semibold truncate">{comparison.myItem.title}</p>
            <p className="text-lg font-bold text-primary">
              ${comparison.myItem.estimatedValue.toFixed(0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Their Item</p>
            <p className="font-semibold truncate">{comparison.theirItem.title}</p>
            <p className="text-lg font-bold text-primary">
              ${comparison.theirItem.estimatedValue.toFixed(0)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getFairnessIcon()}
              <span className="font-semibold">Fairness Score</span>
            </div>
            <Badge variant="outline" className={getFairnessColor(comparison.fairnessScore)}>
              {comparison.fairnessLevel}
            </Badge>
          </div>
          <Progress value={comparison.fairnessScore} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {comparison.fairnessScore}/100
          </p>
        </div>

        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm">{comparison.recommendation}</p>
        </div>
      </CardContent>
    </Card>
  );
};

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DescriptionSectionProps {
  description: string;
}

export const DescriptionSection = ({ description }: DescriptionSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = description.length > 200;
  const displayText = isExpanded || !shouldTruncate
    ? description
    : `${description.slice(0, 200)}...`;

  return (
    <div className="p-1">
      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
        {displayText}
      </p>
      {shouldTruncate && (
        <Button
          variant="link"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 p-0 h-auto text-primary"
        >
          {isExpanded ? (
            <>
              Show less <ChevronUp className="ml-1 h-4 w-4" />
            </>
          ) : (
            <>
              Read more <ChevronDown className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      )}
    </div>
  );
};

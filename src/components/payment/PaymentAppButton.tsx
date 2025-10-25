import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentApp } from "@/lib/paymentDeepLinks";

interface PaymentAppButtonProps {
  app: PaymentApp;
  selected: boolean;
  preferred: boolean;
  onClick: () => void;
  disabled: boolean;
}

export function PaymentAppButton({ 
  app, 
  selected, 
  preferred, 
  onClick, 
  disabled 
}: PaymentAppButtonProps) {
  return (
    <Button
      variant={selected ? "default" : "outline"}
      className={`h-auto p-3 flex flex-col items-center space-y-2 relative ${
        preferred ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onClick}
      disabled={disabled}
      style={{ borderColor: app.color }}
    >
      {preferred && (
        <Badge className="absolute -top-2 -right-2 text-xs bg-primary">
          Preferred
        </Badge>
      )}
      <img 
        src={app.logo} 
        alt={app.name}
        className="h-12 w-12 object-contain"
      />
      <span className="text-xs font-medium">{app.name}</span>
    </Button>
  );
}

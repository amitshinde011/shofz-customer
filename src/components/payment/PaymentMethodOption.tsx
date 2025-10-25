interface PaymentMethodOptionProps {
  id: string;
  selected: boolean;
  onSelect: () => void;
  icon: string;
  title: string;
  description: string;
}

export function PaymentMethodOption({ 
  id, 
  selected, 
  onSelect, 
  icon, 
  title, 
  description 
}: PaymentMethodOptionProps) {
  return (
    <div
      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
        selected 
          ? 'border-primary bg-primary/5' 
          : 'border-border hover:border-primary/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center space-x-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1">
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div 
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            selected 
              ? 'border-primary bg-primary' 
              : 'border-border'
          }`}
        >
          {selected && (
            <div className="w-2 h-2 bg-primary-foreground rounded-full" />
          )}
        </div>
      </div>
    </div>
  );
}

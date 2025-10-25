interface SpecificationsTableProps {
  specifications: Record<string, any>;
}

export const SpecificationsTable = ({ specifications }: SpecificationsTableProps) => {
  const entries = Object.entries(specifications);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-3 text-foreground">Specifications</h3>
      <div className="space-y-2">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="flex justify-between py-2 border-b border-border last:border-0"
          >
            <span className="text-sm text-muted-foreground capitalize">
              {key.replace(/_/g, ' ')}
            </span>
            <span className="text-sm font-medium text-foreground text-right">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

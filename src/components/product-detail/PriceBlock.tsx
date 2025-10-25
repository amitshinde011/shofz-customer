interface PriceBlockProps {
  price: number;
  compareAtPrice?: number;
}

export const PriceBlock = ({ price, compareAtPrice }: PriceBlockProps) => {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

  const discount = compareAtPrice
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;

  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xl font-bold text-foreground">
        {formatter.format(price)}
      </span>
      {compareAtPrice && compareAtPrice > price && (
        <>
          <span className="text-l text-muted-foreground line-through">
            {formatter.format(compareAtPrice)}
          </span>
          <span className="text-s font-semibold text-green-600 bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded">
            {discount}% OFF
          </span>
        </>
      )}
    </div>
  );
};

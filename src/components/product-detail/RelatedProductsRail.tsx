import { useNavigate } from 'react-router-dom';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/services/productService';

interface RelatedProductsRailProps {
  products: Product[];
}

export const RelatedProductsRail = ({ products }: RelatedProductsRailProps) => {
  const navigate = useNavigate();

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="px-4 mb-24">
      <h3 className="text-lg font-semibold mb-3 text-foreground">Related Products</h3>
      <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
        <div className="flex gap-3 pb-2">
          {products.map((product) => (
            <div key={product.id} className="w-[160px] sm:w-[180px] shrink-0">
              <ProductCard
                product={product}
                onClick={() => navigate(`/products/${product.id}`)}
                onInquire={() => navigate(`/products/${product.id}`)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

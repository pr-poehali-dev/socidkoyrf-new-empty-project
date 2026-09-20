import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

export type Product = {
  id: string | number;
  title: string;
  image?: string | null;
  price: number;
  oldPrice?: number | null;
  shop?: string | null;
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })
    .format(value);

const ProductCard = ({ product }: { product: Product }) => {
  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round((1 - product.price / product.oldPrice) * 100)
      : null;

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-square bg-muted">
        {product.image ? (
          <img
            src={product.image}
            alt={product.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Icon name="Image" size={32} />
          </div>
        )}
        {discount && (
          <Badge className="absolute left-2 top-2 bg-destructive text-destructive-foreground">
            −{discount}%
          </Badge>
        )}
      </div>
      <CardContent className="p-3">
        <h3 className="line-clamp-2 text-sm font-medium">{product.title}</h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-semibold">{formatPrice(product.price)}</span>
          {product.oldPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(product.oldPrice)}
            </span>
          )}
        </div>
        {product.shop && (
          <p className="mt-1 truncate text-xs text-muted-foreground">{product.shop}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductCard;

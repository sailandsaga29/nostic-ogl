import { useEffect, useMemo, useState } from 'react';

type Product = {
  id: number;
  name: string;
  category: string;
  type: string;
  price: number;
  stock: number;
  image: string;
  isActive: boolean;
  updatedAt?: string;
};

type PromoSlide = {
  id: string;
  kind: 'flavor' | 'offer' | 'combo';
  badge: string;
  title: string;
  subtitle: string;
  priceLabel?: string;
  image?: string;
  product?: Product;
};

const OFFER_SLIDES: PromoSlide[] = [
  {
    id: 'offer-weekend',
    kind: 'offer',
    badge: 'Limited offer',
    title: 'Weekend party pack deal',
    subtitle: '15% off on all party-pack flavors this weekend.',
    priceLabel: 'Save 15%',
  },
  {
    id: 'offer-happy-hour',
    kind: 'offer',
    badge: 'Happy hours',
    title: 'Buy 2 Get 1 free',
    subtitle: 'Valid on 100 ML & cone categories, 4 PM – 7 PM.',
    priceLabel: '3rd item free',
  },
];

const COMBO_SLIDES: PromoSlide[] = [
  {
    id: 'combo-family',
    kind: 'combo',
    badge: 'Combo',
    title: 'Family celebration pack',
    subtitle: 'Any 3 party-pack flavors bundled for groups.',
    priceLabel: 'From ₹499',
  },
  {
    id: 'combo-duo',
    kind: 'combo',
    badge: 'Combo',
    title: 'Duo delight deal',
    subtitle: 'Pick 2 bestsellers together and save instantly.',
    priceLabel: 'From ₹299',
  },
];

function buildSlides(products: Product[]): PromoSlide[] {
  const latestFlavors = [...products]
    .sort((a, b) => {
      const aTime = a.updatedAt
        ? new Date(a.updatedAt).getTime()
        : 0;
      const bTime = b.updatedAt
        ? new Date(b.updatedAt).getTime()
        : 0;
      return bTime - aTime;
    })
    .slice(0, 3)
    .map((product) => ({
      id: `flavor-${product.id}`,
      kind: 'flavor' as const,
      badge: 'New flavor',
      title: product.name,
      subtitle: `${product.category} · ${product.type}`,
      priceLabel: `₹${product.price}`,
      image: product.image,
      product,
    }));

  return [...latestFlavors, ...OFFER_SLIDES, ...COMBO_SLIDES];
}

const kindAccent: Record<PromoSlide['kind'], string> = {
  flavor: 'from-[#8bd8bf] to-[#33c3b3]',
  offer: 'from-[#f6b26b] to-[#f39c12]',
  combo: 'from-[#9b8cff] to-[#6c5ce7]',
};

type StaffPromoCarouselProps = {
  products: Product[];
  onAddToCart?: (product: Product) => void;
};

export default function StaffPromoCarousel({
  products,
  onAddToCart,
}: StaffPromoCarouselProps) {
  const slides = useMemo(() => buildSlides(products), [products]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[activeIndex];
  const goTo = (index: number) => {
    const next =
      ((index % slides.length) + slides.length) %
      slides.length;
    setActiveIndex(next);
  };

  return (
    <section className="mb-5 sm:mb-6">
      <div className="relative overflow-hidden rounded-3xl border border-stone-200/70 bg-white shadow-[0_8px_30px_rgba(28,25,23,0.06)]">
        <div
          className={`bg-gradient-to-r ${kindAccent[slide.kind]} px-6 py-8 sm:px-10 sm:py-10 text-white transition-all duration-500`}
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                {slide.badge}
              </span>
              <h3
                className="mt-4 text-2xl sm:text-3xl font-bold leading-tight"
                style={{ fontFamily: 'cursive' }}
              >
                {slide.title}
              </h3>
              <p className="mt-2 text-sm sm:text-base text-white/90 max-w-xl">
                {slide.subtitle}
              </p>
              {slide.priceLabel ? (
                <p className="mt-4 text-xl font-bold">
                  {slide.priceLabel}
                </p>
              ) : null}
              {slide.kind === 'flavor' &&
                slide.product &&
                onAddToCart ? (
                <button
                  type="button"
                  onClick={() => onAddToCart(slide.product!)}
                  disabled={
                    !slide.product.isActive || slide.product.stock <= 0
                  }
                  className="mt-5 rounded-full bg-white text-[#33c3b3] px-5 py-2 text-sm font-semibold hover:bg-white/90 transition disabled:opacity-50"
                >
                  {!slide.product.isActive
                    ? 'Unavailable'
                    : slide.product.stock <= 0
                      ? 'Out of stock'
                      : 'Add to cart'}
                </button>
              ) : null}
            </div>

            {slide.image ? (
              <div className="shrink-0 mx-auto sm:mx-0 w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-white/15 flex items-center justify-center p-4">
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="max-h-full max-w-full object-contain drop-shadow-lg"
                />
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => goTo(activeIndex - 1)}
          aria-label="Previous slide"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 text-gray-700 shadow hover:bg-white text-lg font-bold"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => goTo(activeIndex + 1)}
          aria-label="Next slide"
          className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 text-gray-700 shadow hover:bg-white text-lg font-bold"
        >
          ›
        </button>

        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
          {slides.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={`h-2 rounded-full transition-all ${index === activeIndex
                ? 'w-6 bg-white'
                : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

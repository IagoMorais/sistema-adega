import { useEffect, useState } from "react";
import { imageCache } from "@/lib/imageCache";
import { cn } from "@/lib/utils";

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallback?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function CachedImage({
  src,
  alt,
  className,
  fallback = "/placeholder.png",
  onLoad,
  onError,
  ...props
}: CachedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(fallback);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function loadImage() {
      try {
        setIsLoading(true);
        
        // Tenta carregar do cache primeiro
        const cachedBlob = await imageCache.get(src);
        if (cachedBlob && mounted) {
          const url = URL.createObjectURL(cachedBlob);
          setImageSrc(url);
          setIsLoading(false);
          onLoad?.();
          return;
        }

        // Se não estiver no cache, faz o download
        const response = await fetch(src, { signal: controller.signal });
        const blob = await response.blob();
        
        if (mounted) {
          const url = URL.createObjectURL(blob);
          setImageSrc(url);
          setIsLoading(false);
          onLoad?.();
          
          // Salva no cache para uso futuro
          await imageCache.set(src, blob);
        }
      } catch (error) {
        if (mounted) {
          console.error('Erro ao carregar imagem:', error);
          setImageSrc(fallback);
          setIsLoading(false);
          onError?.();
        }
      }
    }

    loadImage();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [src, fallback, onLoad, onError]);

  return (
    <div className={cn("relative", className)}>
      <img
        src={imageSrc}
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        {...props}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-md" />
      )}
    </div>
  );
}

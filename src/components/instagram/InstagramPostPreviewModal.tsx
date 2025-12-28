import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface InstagramPostPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  caption: string;
  username?: string;
  profilePicture?: string;
  imageUrls?: string[];
}

export function InstagramPostPreviewModal({
  open,
  onOpenChange,
  imageUrl,
  caption,
  username = 'usuario',
  profilePicture,
  imageUrls
}: InstagramPostPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const images = imageUrls && imageUrls.length > 1 ? imageUrls : [imageUrl];
  const isCarousel = images.length > 1;

  const nextImage = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setCurrentIndex(0); }}>
      <DialogContent className="max-w-[420px] p-0 overflow-hidden bg-white dark:bg-zinc-900 border-0">
        <div className="w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8 ring-2 ring-pink-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900">
                <AvatarImage src={profilePicture} alt={username} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-semibold">
                  {username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm text-black dark:text-white">{username}</span>
            </div>
            <button className="text-black dark:text-white">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Image - Square aspect ratio like Instagram */}
          <div className="relative w-full aspect-square bg-black group">
            <img
              src={images[currentIndex]}
              alt="Post preview"
              className="w-full h-full object-cover"
            />
            
            {/* Carousel Navigation */}
            {isCarousel && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 text-black p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 text-black p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                
                {/* Dots indicator */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all",
                        idx === currentIndex ? "bg-blue-500 w-2" : "bg-white/70"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button className="text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
                  <Heart className="w-6 h-6" />
                </button>
                <button className="text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
                  <MessageCircle className="w-6 h-6" />
                </button>
                <button className="text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
                  <Send className="w-6 h-6" />
                </button>
              </div>
              <button className="text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
                <Bookmark className="w-6 h-6" />
              </button>
            </div>

            <p className="font-semibold text-sm text-black dark:text-white">0 curtidas</p>

            <div className="text-sm text-black dark:text-white">
              <span className="font-semibold mr-1">{username}</span>
              <span className="whitespace-pre-wrap break-words">{caption}</span>
            </div>

            <p className="text-xs text-gray-400 uppercase">Agora</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

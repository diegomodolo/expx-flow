import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface InstagramPostPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  caption: string;
  username?: string;
  profilePicture?: string;
}

export function InstagramPostPreviewModal({
  open,
  onOpenChange,
  imageUrl,
  caption,
  username = 'usuario',
  profilePicture
}: InstagramPostPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] p-0 overflow-hidden bg-white dark:bg-zinc-900 border-0">
        {/* Instagram Post Simulation */}
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
          <div className="relative w-full aspect-square bg-black">
            <img
              src={imageUrl}
              alt="Post preview"
              className="w-full h-full object-cover"
            />
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

            {/* Likes count placeholder */}
            <p className="font-semibold text-sm text-black dark:text-white">0 curtidas</p>

            {/* Caption */}
            <div className="text-sm text-black dark:text-white">
              <span className="font-semibold mr-1">{username}</span>
              <span className="whitespace-pre-wrap break-words">{caption}</span>
            </div>

            {/* Timestamp placeholder */}
            <p className="text-xs text-gray-400 uppercase">Agora</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

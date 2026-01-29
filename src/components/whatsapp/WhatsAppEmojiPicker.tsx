import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppEmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

// Organized emoji categories
const EMOJI_CATEGORIES = [
  {
    name: "Frequentes",
    icon: "🕐",
    emojis: ["😀", "😂", "🥰", "😍", "😊", "🙏", "👍", "❤️", "🔥", "✨", "😎", "🤣", "😅", "😁", "🥳"]
  },
  {
    name: "Rostos",
    icon: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍",
      "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫",
      "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤",
      "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸",
      "😎", "🤓", "🧐", "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨",
      "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠"
    ]
  },
  {
    name: "Gestos",
    icon: "👋",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉",
      "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝",
      "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁"
    ]
  },
  {
    name: "Corações",
    icon: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗",
      "💖", "💘", "💝", "💟", "♥️", "🩷", "🩵", "🩶"
    ]
  },
  {
    name: "Objetos",
    icon: "🎉",
    emojis: [
      "🎉", "🎊", "🎈", "🎁", "🎀", "🏆", "🥇", "🥈", "🥉", "⚽", "🏀", "🎮", "🎯", "🎪", "🎭",
      "🎨", "🎬", "🎤", "🎧", "🎵", "🎶", "🎹", "🥁", "🎸", "📱", "💻", "⌚", "📷", "🔔", "🔒",
      "🔑", "💡", "📚", "✏️", "📝", "💼", "📁", "📂", "🗂️", "📊", "📈", "📉", "💰", "💵", "💳"
    ]
  },
  {
    name: "Natureza",
    icon: "🌸",
    emojis: [
      "🌸", "💮", "🏵️", "🌹", "🥀", "🌺", "🌻", "🌼", "🌷", "🌱", "🪴", "🌲", "🌳", "🌴", "🌵",
      "🌾", "🌿", "☘️", "🍀", "🍁", "🍂", "🍃", "🌍", "🌎", "🌏", "🌙", "⭐", "🌟", "✨", "⚡",
      "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "☃️", "⛄", "🔥", "💧", "🌊"
    ]
  },
  {
    name: "Comida",
    icon: "🍕",
    emojis: [
      "🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝",
      "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠",
      "🍕", "🍔", "🍟", "🌭", "🍿", "🧂", "🥓", "🍳", "🧇", "🥞", "🧀", "🥗", "🥪", "🌮", "🌯"
    ]
  },
  {
    name: "Símbolos",
    icon: "✅",
    emojis: [
      "✅", "❌", "⭕", "❗", "❓", "❕", "❔", "‼️", "⁉️", "💯", "🔴", "🟠", "🟡", "🟢", "🔵",
      "🟣", "🟤", "⚫", "⚪", "🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "🟫", "⬛", "⬜", "◼️", "◻️",
      "▪️", "▫️", "🔶", "🔷", "🔸", "🔹", "🔺", "🔻", "💠", "🔘", "🔲", "🔳", "⏰", "⏳", "🔔"
    ]
  }
];

export function WhatsAppEmojiPicker({ onEmojiSelect, disabled }: WhatsAppEmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    // Don't close the picker to allow selecting multiple emojis
  };

  // Reset to first category when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(0);
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    }
  }, [isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="shrink-0"
          title="Inserir emoji"
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="start" 
        className="w-80 p-0"
        sideOffset={8}
      >
        {/* Category tabs */}
        <div className="flex border-b overflow-x-auto">
          {EMOJI_CATEGORIES.map((category, index) => (
            <button
              key={category.name}
              onClick={() => setSelectedCategory(index)}
              className={cn(
                "flex-shrink-0 p-2 text-lg hover:bg-muted transition-colors",
                selectedCategory === index && "bg-muted border-b-2 border-primary"
              )}
              title={category.name}
            >
              {category.icon}
            </button>
          ))}
        </div>

        {/* Emojis grid */}
        <div 
          ref={scrollRef}
          className="h-48 overflow-y-auto p-2"
        >
          <p className="text-xs text-muted-foreground mb-2 px-1">
            {EMOJI_CATEGORIES[selectedCategory].name}
          </p>
          <div className="grid grid-cols-8 gap-1">
            {EMOJI_CATEGORIES[selectedCategory].emojis.map((emoji, index) => (
              <button
                key={`${emoji}-${index}`}
                onClick={() => handleEmojiClick(emoji)}
                className="text-xl p-1.5 hover:bg-muted rounded transition-colors"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

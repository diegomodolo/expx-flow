import { useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Smile, Search } from "lucide-react";

const EMOJI_CATEGORIES: Record<string, string[]> = {
  "😀 Rostos": [
    "😀",
    "😁",
    "😂",
    "🤣",
    "😃",
    "😄",
    "😅",
    "😆",
    "😉",
    "😊",
    "😋",
    "😎",
    "😍",
    "🥰",
    "😘",
    "😗",
    "😙",
    "😚",
    "🙂",
    "🤗",
    "🤩",
    "🤔",
    "🤨",
    "😐",
    "😑",
    "😶",
    "🙄",
    "😏",
    "😣",
    "😥",
    "😮",
    "🤐",
    "😯",
    "😪",
    "😫",
    "🥱",
    "😴",
    "😌",
    "😛",
    "😜",
    "😝",
    "🤤",
    "😒",
    "😓",
    "😔",
    "😕",
    "🙃",
    "🤑",
    "😲",
    "🙁",
    "😖",
    "😞",
    "😟",
    "😤",
    "😢",
    "😭",
    "😦",
    "😧",
    "😨",
    "😩",
    "🤯",
    "😬",
    "😰",
    "😱",
    "🥵",
    "🥶",
    "😳",
    "🤪",
    "😵",
    "🥴",
    "😠",
    "😡",
    "🤬",
    "😷",
    "🤒",
    "🤕",
    "🤢",
    "🤮",
    "🥳",
    "🥺",
    "🤠",
    "🤡",
    "🤥",
    "🤫",
    "🤭",
    "🧐",
    "🤓",
    "😈",
    "👿",
  ],
  "👋 Gestos": [
    "👋",
    "🤚",
    "🖐",
    "✋",
    "🖖",
    "👌",
    "🤌",
    "🤏",
    "✌️",
    "🤞",
    "🤟",
    "🤘",
    "🤙",
    "👈",
    "👉",
    "👆",
    "🖕",
    "👇",
    "☝️",
    "👍",
    "👎",
    "✊",
    "👊",
    "🤛",
    "🤜",
    "👏",
    "🙌",
    "👐",
    "🤲",
    "🤝",
    "🙏",
    "💪",
    "🦾",
    "🦿",
    "🦵",
    "🦶",
    "👂",
    "🦻",
    "👃",
    "🧠",
  ],
  "❤️ Símbolos": [
    "❤️",
    "🧡",
    "💛",
    "💚",
    "💙",
    "💜",
    "🖤",
    "🤍",
    "🤎",
    "💔",
    "❤️‍🔥",
    "❤️‍🩹",
    "💕",
    "💞",
    "💓",
    "💗",
    "💖",
    "💘",
    "💝",
    "💟",
    "⭐",
    "🌟",
    "✨",
    "⚡",
    "🔥",
    "💯",
    "✅",
    "❌",
    "⚠️",
    "🚀",
    "🎉",
    "🎊",
    "🏆",
    "🥇",
    "🎯",
    "💡",
    "📌",
    "🔔",
    "💬",
    "💭",
  ],
  "🏢 Trabalho": [
    "💼",
    "📊",
    "📈",
    "📉",
    "📋",
    "📝",
    "✏️",
    "📎",
    "🖇",
    "📁",
    "📂",
    "📅",
    "📆",
    "🗓",
    "⏰",
    "⏳",
    "⌛",
    "🔒",
    "🔓",
    "🔑",
    "🛠",
    "⚙️",
    "🔧",
    "🔨",
    "💻",
    "🖥",
    "📱",
    "📧",
    "📩",
    "📤",
    "📥",
    "🗑",
    "📦",
    "🏷",
    "🔍",
    "🔎",
    "💰",
    "💸",
    "🏦",
    "📡",
  ],
};

interface EmojiGifPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onGifSelect: (gifUrl: string) => void;
}

export function EmojiGifPicker({
  onEmojiSelect,
  onGifSelect,
}: EmojiGifPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("emoji");

  const filteredEmojis = useMemo(() => {
    if (!search) return EMOJI_CATEGORIES;
    const result: Record<string, string[]> = {};
    // Simple search: just show all emojis flattened when searching
    const all = Object.values(EMOJI_CATEGORIES)
      .flat()
      .filter(() => true);
    if (all.length > 0) result["Resultados"] = all;
    return result;
  }, [search]);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
  };

  // Sample trending GIFs (placeholder thumbnails)
  const sampleGifs = [
    { id: "1", label: "👍 Aprovado", emoji: "👍" },
    { id: "2", label: "🎉 Celebração", emoji: "🎉" },
    { id: "3", label: "😂 Rindo", emoji: "😂" },
    { id: "4", label: "🔥 Fogo", emoji: "🔥" },
    { id: "5", label: "💪 Força", emoji: "💪" },
    { id: "6", label: "🚀 Foguete", emoji: "🚀" },
    { id: "7", label: "❤️ Amor", emoji: "❤️" },
    { id: "8", label: "👏 Palmas", emoji: "👏" },
    { id: "9", label: "🏆 Troféu", emoji: "🏆" },
    { id: "10", label: "✅ Feito", emoji: "✅" },
    { id: "11", label: "💯 100%", emoji: "💯" },
    { id: "12", label: "🤝 Acordo", emoji: "🤝" },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-label="Ação"
          size="icon"
          variant="ghost"
          className="rounded-xl shrink-0 h-10 w-10 text-muted-foreground hover:text-foreground"
        >
          <Smile className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-80 p-0 overflow-hidden"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border px-3 pt-3 pb-0">
            <TabsList className="w-full grid grid-cols-2 h-9">
              <TabsTrigger value="emoji" className="text-xs">
                😀 Emojis
              </TabsTrigger>
              <TabsTrigger value="gif" className="text-xs font-bold">
                GIF
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Search */}
          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder={
                  activeTab === "emoji" ? "Buscar emoji..." : "Buscar GIF..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          <TabsContent value="emoji" className="m-0">
            <ScrollArea className="h-64">
              <div className="px-3 pb-3 space-y-3">
                {Object.entries(filteredEmojis).map(([category, emojis]) => (
                  <div key={category}>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                      {category}
                    </p>
                    <div className="grid grid-cols-8 gap-0.5">
                      {emojis.map((emoji, i) => (
                        <button
                          key={`${emoji}-${i}`}
                          onClick={() => handleEmojiClick(emoji)}
                          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-accent text-lg transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="gif" className="m-0">
            <ScrollArea className="h-64">
              <div className="px-3 pb-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Reações rápidas
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {sampleGifs.map((gif) => (
                    <button
                      key={gif.id}
                      onClick={() => {
                        onEmojiSelect(gif.emoji);
                        setOpen(false);
                      }}
                      className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg bg-muted/50 hover:bg-accent border border-border transition-colors"
                    >
                      <span className="text-2xl">{gif.emoji}</span>
                      <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                        {gif.label}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-3">
                  Integração com GIFs em breve!
                </p>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

import React, { useState } from "react";
import { ContentCard } from "./ContentCard";
import { ContentModal } from "./ContentModal";
import { contentTypes } from "./ContentTypes";

export function ContentGrid() {
  const [selectedContentType, setSelectedContentType] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = (contentId: string) => {
    setSelectedContentType(contentId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedContentType(null);
  };

  const groupedContent = contentTypes.reduce((acc, content) => {
    if (!acc[content.category]) {
      acc[content.category] = [];
    }
    acc[content.category].push(content);
    return acc;
  }, {} as Record<string, typeof contentTypes>);

  return (
    <>
      <div className="space-y-8">
        {Object.entries(groupedContent).map(([category, items]) => (
          <div key={category} className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="text-xl">{category.split(' ')[0]}</span>
              <span>{category.split(' ').slice(1).join(' ')}</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((content) => (
                <ContentCard
                  key={content.id}
                  content={content}
                  onClick={() => handleCardClick(content.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedContentType && (
        <ContentModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          contentType={contentTypes.find(c => c.id === selectedContentType)!}
        />
      )}
    </>
  );
}
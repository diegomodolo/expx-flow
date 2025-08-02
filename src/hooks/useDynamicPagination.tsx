import { useState, useEffect, useRef } from 'react';

interface UseDynamicPaginationProps {
  itemHeight: number; // Altura estimada de cada item em pixels
  headerHeight?: number; // Altura do cabeçalho da tabela
  footerHeight?: number; // Altura do footer/paginação
  minItemsPerPage?: number; // Número mínimo de itens por página
  maxItemsPerPage?: number; // Número máximo de itens por página
}

export const useDynamicPagination = ({
  itemHeight = 80,
  headerHeight = 60,
  footerHeight = 80,
  minItemsPerPage = 5,
  maxItemsPerPage = 50
}: UseDynamicPaginationProps) => {
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateItemsPerPage = () => {
    if (!containerRef.current) return minItemsPerPage;

    const containerHeight = containerRef.current.clientHeight;
    const availableHeight = containerHeight - headerHeight - footerHeight;
    const calculatedItems = Math.floor(availableHeight / itemHeight);
    
    console.log('Calculando itens por página:', {
      containerHeight,
      availableHeight,
      itemHeight,
      calculatedItems,
      finalItems: Math.max(minItemsPerPage, Math.min(maxItemsPerPage, calculatedItems))
    });
    
    // Garantir que está dentro dos limites
    return Math.max(minItemsPerPage, Math.min(maxItemsPerPage, calculatedItems));
  };

  useEffect(() => {
    const updateItemsPerPage = () => {
      // Aguardar um frame para garantir que o DOM foi renderizado
      requestAnimationFrame(() => {
        const newItemsPerPage = calculateItemsPerPage();
        setItemsPerPage(newItemsPerPage);
      });
    };

    // Aguardar um pouco antes de calcular inicialmente
    const timer = setTimeout(updateItemsPerPage, 100);

    // Recalcular quando a janela for redimensionada
    const handleResize = () => {
      setTimeout(updateItemsPerPage, 100);
    };

    window.addEventListener('resize', handleResize);

    // Observer para mudanças na altura do container com debounce
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(updateItemsPerPage, 50);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [itemHeight, headerHeight, footerHeight, minItemsPerPage, maxItemsPerPage]);

  return {
    itemsPerPage,
    containerRef
  };
};
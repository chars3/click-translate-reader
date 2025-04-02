import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from "sonner";
import { Book, EpubCFI } from 'epubjs';
import { translateWord, cleanWord } from '@/utils/dictionaryLoader';
import WordTooltip from './WordTooltip';
import LoadingScreen from './LoadingScreen';

const EpubReader = ({ url, savedLocation, onLocationChange, onBookReady }) => {
  const [book, setBook] = useState(null);
  const [rendition, setRendition] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(savedLocation || null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedWord, setSelectedWord] = useState("");
  const [translation, setTranslation] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const viewerRef = useRef(null);
  const tooltipRef = useRef(null);

  // Inicializar o livro EPUB
  useEffect(() => {
    const initializeBook = async () => {
      try {
        setIsLoading(true);
        
        // Simulação de progresso de carregamento
        const interval = setInterval(() => {
          setLoadingProgress(prev => {
            if (prev >= 95) {
              clearInterval(interval);
              return prev;
            }
            return prev + Math.random() * 10;
          });
        }, 200);
        
        // Inicializar o livro
        const newBook = new Book(url, { openAs: 'binary' });
        await newBook.ready;
        setBook(newBook);
        
        // Criar o renderizador
        const viewer = viewerRef.current;
        if (!viewer) return;
        
        const newRendition = newBook.renderTo(viewer, {
          width: '100%',
          height: '100%',
          spread: 'none',
          flow: 'paginated'
        });
        
        // Carregar metadados e conteúdo
        await newBook.loaded.metadata;
        await newBook.loaded.navigation;
        
        setRendition(newRendition);
        
        // Se tiver uma localização salva, vá para ela
        if (savedLocation) {
          newRendition.display(savedLocation);
        } else {
          newRendition.display();
        }
        
        // Informar que o livro está pronto
        if (onBookReady) {
          onBookReady(newBook);
        }
        
        // Limpar a simulação e definir como carregado
        clearInterval(interval);
        setLoadingProgress(100);
        
        setTimeout(() => {
          setIsLoading(false);
          toast.success("Livro carregado com sucesso", {
            description: "Clique em qualquer palavra para ver sua tradução para português",
          });
        }, 300);
      } catch (error) {
        console.error("Erro ao carregar EPUB:", error);
        toast.error("Erro ao carregar o livro", {
          description: "Verifique se o arquivo EPUB é válido e tente novamente",
        });
        setIsLoading(false);
      }
    };

    if (url) {
      initializeBook();
    }

    return () => {
      if (book) {
        book.destroy();
      }
    };
  }, [url]);

  // Configurar o manipulador de cliques para a tradução de palavras
  useEffect(() => {
    if (!rendition) return;
    
    const handleTextSelection = (cfiRange, contents) => {
      const selection = contents.window.getSelection();
      const selectedText = selection.toString().trim();
      
      if (!selectedText || selectedText.split(/\s+/).length > 2) {
        // Ignorar seleções vazias ou com múltiplas palavras
        return;
      }
      
      // Obter a posição para o tooltip
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      const containerRect = viewerRef.current.getBoundingClientRect();
      const position = {
        x: rect.left + (rect.width / 2) - containerRect.left,
        y: rect.bottom - containerRect.top
      };
      
      // Definir a palavra e posição imediatamente para mostrar o tooltip
      setSelectedWord(cleanWord(selectedText));
      setTooltipPosition(position);
      setShowTooltip(true);
      
      // Mostrar estado de carregamento no tooltip
      setIsTranslating(true);
      setTranslation("Traduzindo...");
      
      // Obter a tradução
      translateWord(selectedText)
        .then(translatedWord => {
          setTranslation(translatedWord);
        })
        .catch(error => {
          console.error("Erro de tradução:", error);
          setTranslation("Falha na tradução. Tente novamente.");
        })
        .finally(() => {
          setIsTranslating(false);
        });
    };
    
    rendition.on("selected", handleTextSelection);
    
    // Monitorar mudanças de localização
    rendition.on("locationChanged", (location) => {
      const locationCfi = location.start.cfi;
      setCurrentLocation(locationCfi);
      
      if (onLocationChange) {
        onLocationChange(locationCfi);
      }
    });
    
    return () => {
      rendition.off("selected", handleTextSelection);
      rendition.off("locationChanged");
    };
  }, [rendition, onLocationChange]);

  // Fechar tooltip ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        tooltipRef.current && 
        !tooltipRef.current.contains(event.target) &&
        viewerRef.current && 
        viewerRef.current.contains(event.target)
      ) {
        setShowTooltip(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Navegar para próxima/anterior página
  const nextPage = () => {
    if (rendition) {
      rendition.next();
    }
  };

  const prevPage = () => {
    if (rendition) {
      rendition.prev();
    }
  };

  // Manipular teclas de navegação
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'ArrowRight') {
        nextPage();
      } else if (event.key === 'ArrowLeft') {
        prevPage();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [rendition]);

  if (isLoading) {
    return <LoadingScreen progress={loadingProgress} />;
  }

  return (
    <div className="relative h-full flex flex-col">
      <motion.div 
        className="flex-1 overflow-hidden bg-reader-paper rounded-lg shadow-medium my-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Controles de navegação */}
        <div className="absolute top-1/2 -translate-y-1/2 left-4 z-10">
          <button 
            onClick={prevPage}
            className="p-2 bg-reader-paper rounded-full shadow hover:bg-muted transition-colors"
            aria-label="Página anterior"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
        
        <div className="absolute top-1/2 -translate-y-1/2 right-4 z-10">
          <button 
            onClick={nextPage}
            className="p-2 bg-reader-paper rounded-full shadow hover:bg-muted transition-colors"
            aria-label="Próxima página"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
        
        {/* Container do visualizador EPUB */}
        <div 
          ref={viewerRef} 
          className="w-full h-full epub-container"
        />
      </motion.div>

      {/* Tooltip de tradução */}
      {showTooltip && (
        <WordTooltip 
          ref={tooltipRef}
          word={selectedWord} 
          translation={translation}
          position={tooltipPosition}
          isLoading={isTranslating}
          onClose={() => setShowTooltip(false)}
        />
      )}
    </div>
  );
};

export default EpubReader;
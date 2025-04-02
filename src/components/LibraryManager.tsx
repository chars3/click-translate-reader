import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

// Tipo para os livros da biblioteca
interface Book {
  id: string;
  title: string;
  author: string;
  cover: string | null;
  filepath: string;
  addedAt: number;
  lastRead: number | null;
  progress: string | null;
}

// Tipagem para as props
interface LibraryManagerProps {
  onSelectBook: (book: Book) => void;
}

const LibraryManager: React.FC<LibraryManagerProps> = ({ onSelectBook }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Carregar a biblioteca do armazenamento local
  useEffect(() => {
    const loadLibrary = () => {
      try {
        const storedLibrary = localStorage.getItem('epub-library');
        if (storedLibrary) {
          setBooks(JSON.parse(storedLibrary));
        }
      } catch (error) {
        console.error('Erro ao carregar a biblioteca:', error);
        toast.error('Erro ao carregar sua biblioteca', {
          description: 'Não foi possível recuperar seus livros salvos'
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Simulando um pequeno atraso para mostrar o esqueleto de carregamento
    setTimeout(loadLibrary, 500);
  }, []);

  // Salvar biblioteca no armazenamento local quando for alterada
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('epub-library', JSON.stringify(books));
    }
  }, [books, isLoading]);

  // Manipular upload de arquivo EPUB
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/epub+zip') {
      setSelectedFile(file);
      
      // Tentar extrair título e autor do nome do arquivo
      const filename = file.name.replace('.epub', '');
      const parts = filename.split(' - ');
      
      if (parts.length > 1) {
        setBookTitle(parts[1]);
        setBookAuthor(parts[0]);
      } else {
        setBookTitle(filename);
      }
    } else {
      toast.error('Arquivo inválido', {
        description: 'Por favor, selecione um arquivo EPUB válido'
      });
    }
  };

  // Adicionar um novo livro à biblioteca
  const addBook = async () => {
    if (!selectedFile) {
      toast.error('Nenhum arquivo selecionado');
      return;
    }

    try {
      // Criar um URL de objeto para o arquivo
      const fileUrl = URL.createObjectURL(selectedFile);

      // Extrair capa (implementação básica - em produção usaria epubjs para extrair a capa corretamente)
      const coverUrl = null;
      
      // Criar uma entrada para o novo livro
      const newBook: Book = {
        id: `book_${Date.now()}`,
        title: bookTitle || selectedFile.name.replace('.epub', ''),
        author: bookAuthor || 'Desconhecido',
        cover: coverUrl,
        filepath: fileUrl,
        addedAt: Date.now(),
        lastRead: null,
        progress: null
      };

      // Adicionar à biblioteca
      setBooks(prevBooks => [...prevBooks, newBook]);
      
      // Fechar o diálogo e redefinir o formulário
      setShowAddDialog(false);
      setSelectedFile(null);
      setBookTitle('');
      setBookAuthor('');
      
      toast.success('Livro adicionado', {
        description: `"${newBook.title}" foi adicionado à sua biblioteca`
      });
    } catch (error) {
      console.error('Erro ao adicionar livro:', error);
      toast.error('Erro ao adicionar livro', {
        description: 'Não foi possível processar o arquivo EPUB'
      });
    }
  };

  // Manipular a seleção de um livro para leitura
  const handleSelectBook = (book: Book) => {
    // Atualizar o timestamp de último acesso
    const updatedBooks = books.map(b => 
      b.id === book.id 
        ? { ...b, lastRead: Date.now() } 
        : b
    );
    
    setBooks(updatedBooks);
    onSelectBook(book);
  };

  // Remover um livro da biblioteca
  const removeBook = (bookId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const bookToRemove = books.find(b => b.id === bookId);
    
    if (bookToRemove) {
      // Revogar o URL do objeto para liberar memória
      if (bookToRemove.filepath.startsWith('blob:')) {
        URL.revokeObjectURL(bookToRemove.filepath);
      }

      // Filtrar o livro da lista
      setBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));
      
      toast.success('Livro removido', {
        description: `"${bookToRemove.title}" foi removido da sua biblioteca`
      });
    }
  };

  // Manipuladores de arrastar e soltar
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const epubFile = files.find(file => file.type === 'application/epub+zip');
    
    if (epubFile) {
      setSelectedFile(epubFile);
      setShowAddDialog(true);
      
      // Tentar extrair título e autor do nome do arquivo
      const filename = epubFile.name.replace('.epub', '');
      const parts = filename.split(' - ');
      
      if (parts.length > 1) {
        setBookTitle(parts[1]);
        setBookAuthor(parts[0]);
      } else {
        setBookTitle(filename);
      }
    } else {
      toast.error('Arquivo inválido', {
        description: 'Por favor, arraste um arquivo EPUB válido'
      });
    }
  };

  return (
    <div 
      className={`h-full flex flex-col p-4 ${isDragging ? 'bg-primary/10' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Minha Biblioteca</h2>
        <Button 
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          Adicionar Livro
        </Button>
      </div>
      
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="p-8 rounded-lg border-2 border-dashed border-primary text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-4 text-primary"
            >
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <p className="text-lg font-medium">Solte o arquivo EPUB aqui</p>
          </div>
        </div>
      )}
      
      {isLoading ? (
        // Esqueleto de carregamento
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <div className="aspect-[2/3] w-full">
                <Skeleton className="h-full w-full" />
              </div>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : books.length === 0 ? (
        // Mensagem de biblioteca vazia
        <motion.div 
          className="flex flex-col items-center justify-center h-full gap-4 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
          <h3 className="text-xl font-medium">Sua biblioteca está vazia</h3>
          <p className="text-muted-foreground max-w-md">
            Adicione livros EPUB para começar sua jornada de leitura com tradução instantânea
          </p>
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="mt-2"
          >
            Adicionar Primeiro Livro
          </Button>
        </motion.div>
      ) : (
        // Grade de livros
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
            {books.map((book) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ y: -5 }}
                className="cursor-pointer group"
                onClick={() => handleSelectBook(book)}
              >
                <Card className="overflow-hidden h-full flex flex-col transition-shadow hover:shadow-lg">
                  <div className="aspect-[2/3] w-full bg-muted relative">
                    {book.cover ? (
                      <img 
                        src={book.cover} 
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="64"
                          height="64"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Marcador de progresso */}
                    {book.progress && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted-foreground/20">
                        <div className="h-full bg-primary" style={{ width: '30%' }} />
                      </div>
                    )}
                    
                    {/* Botão de remoção */}
                    <button
                      className="absolute top-2 right-2 p-1 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => removeBook(book.id, e)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <h3 className="font-medium text-ellipsis overflow-hidden line-clamp-2">{book.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{book.author}</p>
                    
                    {/* Informação de última leitura */}
                    {book.lastRead && (
                      <div className="mt-auto pt-2 text-xs text-muted-foreground flex items-center gap-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {formatLastRead(book.lastRead)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      )}
      
      {/* Diálogo para adicionar novo livro */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar novo livro</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Título
              </Label>
              <Input
                id="title"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="author" className="text-right">
                Autor
              </Label>
              <Input
                id="author"
                value={bookAuthor}
                onChange={(e) => setBookAuthor(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="file" className="text-right">
                Arquivo EPUB
              </Label>
              <div className="col-span-3">
                <Input
                  id="file"
                  type="file"
                  accept=".epub,application/epub+zip"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={addBook} disabled={!selectedFile}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Função auxiliar para formatar a data de última leitura
const formatLastRead = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  // Menos de 1 minuto
  if (diff < 60 * 1000) {
    return 'Agora mesmo';
  }
  
  // Menos de 1 hora
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} atrás`;
  }
  
  // Menos de 1 dia
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours} ${hours === 1 ? 'hora' : 'horas'} atrás`;
  }
  
  // Menos de 7 dias
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days} ${days === 1 ? 'dia' : 'dias'} atrás`;
  }
  
  // Mais de 7 dias
  const date = new Date(timestamp);
  return date.toLocaleDateString();
};

export default LibraryManager;
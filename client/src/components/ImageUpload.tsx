import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Image, 
  Upload, 
  X, 
  Star, 
  Loader2,
  AlertCircle,
  Camera
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PropertyImage {
  id: number;
  propertyId: number;
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: Date;
}

interface ImageUploadProps {
  propertyId: number;
  onImagesChange?: (images: PropertyImage[]) => void;
}

export default function ImageUpload({ propertyId, onImagesChange }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imagesQuery = trpc.images.listByProperty.useQuery({ propertyId }, {
    enabled: propertyId > 0,
  });
  const createMutation = trpc.images.create.useMutation();
  const deleteMutation = trpc.images.delete.useMutation();
  const setPrimaryMutation = trpc.images.setPrimary.useMutation();

  const images = imagesQuery.data || [];
  const canAddMore = images.length < 10;

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Verificar se propertyId é válido
    if (!propertyId || propertyId <= 0) {
      toast.error("É necessário salvar a propriedade antes de adicionar imagens");
      return;
    }

    const remainingSlots = 10 - images.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      toast.warning(`Você só pode adicionar mais ${remainingSlots} imagens. Apenas as primeiras serão enviadas.`);
    }

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        setUploadProgress(`Enviando ${i + 1} de ${filesToUpload.length}...`);
        
        // Validar tipo
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} não é uma imagem válida`);
          errorCount++;
          continue;
        }

        // Validar tipos permitidos
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
          toast.error(`${file.name}: Tipo não permitido. Use JPEG, PNG, WebP ou GIF`);
          errorCount++;
          continue;
        }

        // Validar tamanho (máx 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} é muito grande. Máximo 5MB.`);
          errorCount++;
          continue;
        }

        try {
          // Converter para base64
          const base64 = await fileToBase64(file);
          const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;

          await createMutation.mutateAsync({
            propertyId,
            base64Data: base64,
            filename,
            originalName: file.name,
            mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
            size: file.size,
            isPrimary: images.length === 0 && i === 0, // Primeira imagem é principal
          });
          successCount++;
        } catch (error: any) {
          console.error(`Erro ao enviar ${file.name}:`, error);
          const errorMessage = error?.message || 'Erro desconhecido';
          toast.error(`Erro ao enviar ${file.name}: ${errorMessage}`);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} imagem(ns) enviada(s) com sucesso!`);
        await imagesQuery.refetch();
        onImagesChange?.(imagesQuery.data || []);
      }
      
      if (errorCount > 0 && successCount === 0) {
        toast.error('Nenhuma imagem foi enviada. Verifique os arquivos e tente novamente.');
      }
    } catch (error: any) {
      console.error('Erro geral no upload:', error);
      toast.error('Erro ao enviar imagens: ' + (error?.message || 'Erro desconhecido'));
    } finally {
      setIsUploading(false);
      setUploadProgress("");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [propertyId, images.length, createMutation, imagesQuery, onImagesChange]);

  const handleDelete = async (imageId: number) => {
    try {
      await deleteMutation.mutateAsync({ imageId });
      toast.success('Imagem excluída');
      await imagesQuery.refetch();
      onImagesChange?.(imagesQuery.data || []);
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + (error?.message || 'Erro desconhecido'));
    }
  };

  const handleSetPrimary = async (imageId: number) => {
    try {
      await setPrimaryMutation.mutateAsync({ imageId });
      toast.success('Imagem principal definida');
      await imagesQuery.refetch();
      onImagesChange?.(imagesQuery.data || []);
    } catch (error: any) {
      toast.error('Erro: ' + (error?.message || 'Erro desconhecido'));
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (imagesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Imagens do Imóvel</h3>
          <p className="text-sm text-gray-500">{images.length}/10 imagens</p>
        </div>
        {canAddMore && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1 sm:flex-none"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadProgress || "Enviando..."}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Adicionar
                </>
              )}
            </Button>
            {/* Mobile Camera Button */}
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="sm:hidden"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Images Grid */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {images.map((image) => (
            <Card key={image.id} className={`relative group overflow-hidden ${image.isPrimary ? 'ring-2 ring-blue-500' : ''}`}>
              <CardContent className="p-0">
                <div 
                  className="aspect-square bg-gray-100 cursor-pointer relative"
                  onClick={() => setPreviewImage(image.url)}
                >
                  <img
                    src={image.url}
                    alt={image.originalName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* Primary Badge */}
                  {image.isPrimary && (
                    <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-blue-500 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium flex items-center gap-1">
                      <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      <span className="hidden xs:inline">Principal</span>
                    </div>
                  )}
                </div>

                {/* Actions - Always visible on mobile, hover on desktop */}
                <div className="absolute inset-0 bg-black/40 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 opacity-0 touch-none pointer-events-none sm:pointer-events-auto">
                </div>
                
                {/* Action buttons at bottom */}
                <div className="p-2 bg-white border-t flex items-center justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate" title={image.originalName}>
                      {image.originalName}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-400">{formatFileSize(image.size)}</p>
                  </div>
                  <div className="flex gap-1">
                    {!image.isPrimary && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetPrimary(image.id);
                        }}
                        disabled={setPrimaryMutation.isPending}
                        title="Definir como principal"
                      >
                        <Star className="h-3.5 w-3.5 text-blue-600" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(image.id);
                      }}
                      disabled={deleteMutation.isPending}
                      title="Excluir imagem"
                    >
                      <X className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 sm:py-12 text-center">
            <Image className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4 text-sm sm:text-base">Nenhuma imagem cadastrada</p>
            {canAddMore && (
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar Imagens
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Limit Warning */}
      {!canAddMore && (
        <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Limite máximo de 10 imagens atingido</span>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl p-2 sm:p-6">
          <DialogHeader className="sr-only">
            <DialogTitle>Visualizar Imagem</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            {previewImage && (
              <img
                src={previewImage}
                alt="Preview"
                className="max-h-[80vh] w-auto object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente simplificado para exibição somente leitura
export function PropertyImageGallery({ propertyId }: { propertyId: number }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const imagesQuery = trpc.images.listByProperty.useQuery({ propertyId }, {
    enabled: propertyId > 0,
  });
  
  const images = imagesQuery.data || [];
  const primaryImage = images.find(img => img.isPrimary) || images[0];
  const otherImages = images.filter(img => img.id !== primaryImage?.id);

  if (imagesQuery.isLoading) {
    return (
      <div className="h-[250px] sm:h-[400px] bg-gray-100 animate-pulse rounded-lg" />
    );
  }

  if (images.length === 0) {
    return (
      <div className="h-[250px] sm:h-[400px] bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center rounded-lg">
        <div className="text-center">
          <Image className="h-16 w-16 sm:h-24 sm:w-24 text-blue-400 mx-auto mb-4" />
          <p className="text-blue-500 font-medium">Sem imagens disponíveis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Main Image */}
      <div 
        className="h-[250px] sm:h-[400px] bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
        onClick={() => setSelectedImage(primaryImage?.url || null)}
      >
        <img
          src={primaryImage?.url}
          alt="Imagem principal"
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Thumbnails */}
      {otherImages.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {otherImages.map((image) => (
            <div
              key={image.id}
              className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
              onClick={() => setSelectedImage(image.url)}
            >
              <img
                src={image.url}
                alt={image.originalName}
                className="w-full h-full object-cover hover:scale-105 transition-transform"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl p-2 sm:p-6">
          <div className="flex items-center justify-center">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Preview"
                className="max-h-[80vh] w-auto object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

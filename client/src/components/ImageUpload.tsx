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
  AlertCircle
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imagesQuery = trpc.images.listByProperty.useQuery({ propertyId });
  const createMutation = trpc.images.create.useMutation();
  const deleteMutation = trpc.images.delete.useMutation();
  const setPrimaryMutation = trpc.images.setPrimary.useMutation();

  const images = imagesQuery.data || [];
  const canAddMore = images.length < 10;

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 10 - images.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      toast.warning(`Você só pode adicionar mais ${remainingSlots} imagens. Apenas as primeiras serão enviadas.`);
    }

    setIsUploading(true);

    try {
      for (const file of filesToUpload) {
        // Validar tipo
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} não é uma imagem válida`);
          continue;
        }

        // Validar tamanho (máx 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} é muito grande. Máximo 5MB.`);
          continue;
        }

        // Converter para base64
        const base64 = await fileToBase64(file);
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;

        await createMutation.mutateAsync({
          propertyId,
          base64Data: base64,
          filename,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          isPrimary: images.length === 0, // Primeira imagem é principal
        });
      }

      toast.success('Imagens enviadas com sucesso!');
      imagesQuery.refetch();
      onImagesChange?.(imagesQuery.data || []);
    } catch (error: any) {
      toast.error('Erro ao enviar imagens: ' + (error?.message || 'Erro desconhecido'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [propertyId, images.length, createMutation, imagesQuery, onImagesChange]);

  const handleDelete = async (imageId: number) => {
    if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;

    try {
      await deleteMutation.mutateAsync({ imageId });
      toast.success('Imagem excluída');
      imagesQuery.refetch();
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + (error?.message || 'Erro desconhecido'));
    }
  };

  const handleSetPrimary = async (imageId: number) => {
    try {
      await setPrimaryMutation.mutateAsync({ imageId });
      toast.success('Imagem principal definida');
      imagesQuery.refetch();
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Imagens do Imóvel</h3>
          <p className="text-sm text-gray-500">{images.length}/10 imagens</p>
        </div>
        {canAddMore && (
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Adicionar Imagens
              </>
            )}
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Images Grid */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {images.map((image) => (
            <Card key={image.id} className={`relative group overflow-hidden ${image.isPrimary ? 'ring-2 ring-blue-500' : ''}`}>
              <CardContent className="p-0">
                <div 
                  className="aspect-square bg-gray-100 cursor-pointer"
                  onClick={() => setPreviewImage(image.url)}
                >
                  <img
                    src={image.url}
                    alt={image.originalName}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Primary Badge */}
                {image.isPrimary && (
                  <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Principal
                  </div>
                )}

                {/* Actions Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!image.isPrimary && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetPrimary(image.id);
                      }}
                      disabled={setPrimaryMutation.isPending}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(image.id);
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* File Info */}
                <div className="p-2 bg-white">
                  <p className="text-xs text-gray-500 truncate" title={image.originalName}>
                    {image.originalName}
                  </p>
                  <p className="text-xs text-gray-400">{formatFileSize(image.size)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Image className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">Nenhuma imagem cadastrada</p>
            {canAddMore && (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Adicionar Imagens
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Limit Warning */}
      {!canAddMore && (
        <div className="flex items-center gap-2 text-amber-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>Limite máximo de 10 imagens atingido</span>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Visualizar Imagem</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            {previewImage && (
              <img
                src={previewImage}
                alt="Preview"
                className="max-h-[70vh] object-contain rounded-lg"
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
  const imagesQuery = trpc.images.listByProperty.useQuery({ propertyId });
  
  const images = imagesQuery.data || [];
  const primaryImage = images.find(img => img.isPrimary) || images[0];
  const otherImages = images.filter(img => img.id !== primaryImage?.id);

  if (imagesQuery.isLoading) {
    return (
      <div className="h-[400px] bg-gray-100 animate-pulse rounded-lg" />
    );
  }

  if (images.length === 0) {
    return (
      <div className="h-[400px] bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center rounded-lg">
        <div className="text-center">
          <Image className="h-24 w-24 text-blue-400 mx-auto mb-4" />
          <p className="text-blue-500 font-medium">Sem imagens disponíveis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div 
        className="h-[400px] bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
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
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
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
              />
            </div>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Preview"
                className="max-h-[80vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

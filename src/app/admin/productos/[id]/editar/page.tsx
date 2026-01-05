"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ProductoService } from "@/features/productos/services/producto-service";
import { uploadProductImage } from "@/features/productos/services/product-image-service";
import { deleteReferenceImage, regenerateProductEmbeddings, uploadReferenceImage } from "@/features/productos/services/product-reference-service";
import type { Categoria, ProductoReferenceImage } from "@/lib/types";

interface FormState {
  codigo: string;
  nombre: string;
  categoriaId: string;
  precio: string;
  precio_base: string;
  descuento: string;
  proveedor: string;
  marca: string;
  stockMinimo: string;
  descripcion: string;
  imagen: string;
  estado: "activo" | "inactivo";
}

type ReferenceDraft = { file: File; preview: string };

export default function EditarProductoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [formData, setFormData] = useState<FormState | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [referenceImages, setReferenceImages] = useState<ProductoReferenceImage[]>([]);
  const [referenceDrafts, setReferenceDrafts] = useState<ReferenceDraft[]>([]);
  const [uploadingReferences, setUploadingReferences] = useState(false);
  const [regeneratingEmbeddings, setRegeneratingEmbeddings] = useState(false);
  const [removingReferenceId, setRemovingReferenceId] = useState<number | null>(null);

  const mapReferenceRecord = (record: any): ProductoReferenceImage => ({
    id: record?.id ?? 0,
    productoId: record?.productoId ?? productoId ?? 0,
    url: record?.url ?? "",
    path: record?.path ?? "",
    bucket: record?.bucket ?? null,
    filename: record?.filename ?? null,
    mimeType: record?.mimeType ?? null,
    size:
      typeof record?.size === "number"
        ? record.size
        : record?.size != null
          ? Number(record.size)
          : null,
    createdAt: record?.createdAt ?? new Date().toISOString(),
    updatedAt: record?.updatedAt ?? new Date().toISOString(),
  });

  const productoId = useMemo(() => {
    const raw = params?.id;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, [params]);

  useEffect(() => {
    let activo = true;

    const loadData = async () => {
      if (productoId == null) {
        setError("Identificador de producto inválido");
        setCargando(false);
        return;
      }

      try {
        const [producto, categoriasActivas] = await Promise.all([
          ProductoService.getById(productoId),
          ProductoService.getCategoriasActivas()
        ]);

        if (!activo) return;

        if (!producto) {
          setError("No se encontró el producto");
          setCargando(false);
          return;
        }

        setCategorias(categoriasActivas);
        setFormData({
          codigo: producto.codigo,
          nombre: producto.nombre,
          categoriaId: String(producto.categoriaId ?? ""),
          precio: String(producto.precio ?? ""),
          precio_base: String(producto.precio_base ?? 0),
          descuento: String(producto.descuento ?? 0),
          proveedor: producto.proveedor ?? "",
          marca: producto.marca ?? "",
          stockMinimo: String(producto.stockMinimo ?? 0),
          descripcion: producto.descripcion ?? "",
          imagen: producto.imagen ?? "",
          estado: (producto.estado as "activo" | "inactivo") ?? "activo"
        });
        setReferenceImages(producto.referenceImages ?? []);
      } catch (err) {
        console.error("Error cargando datos del producto", err);
        if (activo) {
          setError("No fue posible cargar la información del producto");
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    };

    void loadData();

    return () => {
      activo = false;
    };
  }, [productoId]);

  useEffect(() => {
    return () => {
      referenceDrafts.forEach((draft) => URL.revokeObjectURL(draft.preview));
    };
  }, [referenceDrafts]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData || productoId == null) return;

    const precio = Number(formData.precio);
    const descuento = formData.descuento ? Number(formData.descuento) : 0;
    const stockMinimo = Number(formData.stockMinimo);
    const categoriaId = Number(formData.categoriaId);

    if (Number.isNaN(precio) || precio <= 0) {
      toast({
        title: "Precio inválido",
        description: "Ingresa un precio mayor a cero",
        variant: "destructive"
      });
      return;
    }

    if (Number.isNaN(stockMinimo) || stockMinimo < 0) {
      toast({
        title: "Stock mínimo inválido",
        description: "El stock mínimo no puede ser negativo",
        variant: "destructive"
      });
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        codigo: formData.codigo.trim(),
        nombre: formData.nombre.trim(),
        categoriaId: Number.isNaN(categoriaId) || categoriaId === 0 ? undefined : categoriaId,
        descripcion: formData.descripcion.trim() || null,
        precio,
        precio_base: Number(formData.precio_base) || 0,
        descuento: Number.isNaN(descuento) ? 0 : descuento,
        proveedor: formData.proveedor.trim() || null,
        marca: formData.marca.trim() || null,
        imagen: formData.imagen.trim() || null,
        stockMinimo,
        estado: formData.estado
      };

      const actualizado = await ProductoService.update(productoId, payload);

      if (!actualizado) {
        toast({
          title: "No se pudieron guardar los cambios",
          description: "Intenta nuevamente en unos segundos",
          variant: "destructive"
        });
        setGuardando(false);
        return;
      }

      let referenceSuccess = 0;
      const referenceErrors: Array<{ name: string; message: string }> = [];
      const newReferenceRecords: ProductoReferenceImage[] = [];

      if (referenceDrafts.length > 0 && productoId != null) {
        setUploadingReferences(true);
        try {
          for (const draft of referenceDrafts) {
            try {
              const response = await uploadReferenceImage(productoId, draft.file, {
                productCode: formData.codigo,
              });
              if (response?.referenceImage) {
                newReferenceRecords.push(mapReferenceRecord(response.referenceImage));
              }
              referenceSuccess += 1;
            } catch (uploadError) {
              console.error("Error subiendo imagen de referencia", uploadError);
              referenceErrors.push({
                name: draft.file.name,
                message:
                  uploadError instanceof Error ? uploadError.message : "No se pudo procesar la imagen de referencia",
              });
            } finally {
              URL.revokeObjectURL(draft.preview);
            }
          }
        } finally {
          setReferenceDrafts([]);
          setUploadingReferences(false);
        }
      }

      if (newReferenceRecords.length > 0) {
        setReferenceImages((prev) => [...prev, ...newReferenceRecords]);
      }

      toast({
        title: "Producto actualizado",
        description: `${actualizado.nombre} fue actualizado correctamente`
      });

      if (referenceSuccess > 0) {
        toast({
          title: referenceSuccess === 1 ? "Referencia registrada" : "Referencias registradas",
          description: `${referenceSuccess} referencia${referenceSuccess === 1 ? "" : "s"} procesada${referenceSuccess === 1 ? "" : "s"
            } correctamente`,
        });
      }

      if (referenceErrors.length > 0) {
        toast({
          title: "Algunas referencias no se procesaron",
          description: referenceErrors
            .map((item) => `${item.name}: ${item.message}`)
            .slice(0, 3)
            .join(" | "),
          variant: "destructive",
        });
      }

      router.push(`/admin/productos/${productoId}`);
    } catch (err) {
      console.error("Error actualizando producto", err);
      toast({
        title: "Error inesperado",
        description: "Revisa la consola para más detalles",
        variant: "destructive"
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleReferenceFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const drafts = files.map<ReferenceDraft>((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setReferenceDrafts((prev) => [...prev, ...drafts]);
    event.target.value = "";
  };

  const handleRemoveReferenceDraft = (index: number) => {
    setReferenceDrafts((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      return next;
    });
  };

  const handleDeleteReference = async (referenceId: number) => {
    try {
      setRemovingReferenceId(referenceId);
      await deleteReferenceImage(referenceId);
      setReferenceImages((prev) => prev.filter((item) => item.id !== referenceId));
      toast({
        title: "Referencia eliminada",
        description: "La imagen de referencia se eliminó correctamente.",
      });
    } catch (deleteError) {
      console.error("Error eliminando imagen de referencia", deleteError);
      toast({
        title: "No se pudo eliminar la referencia",
        description: deleteError instanceof Error ? deleteError.message : "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setRemovingReferenceId(null);
    }
  };

  const handleRegenerateEmbeddings = async () => {
    if (productoId == null) return;
    try {
      setRegeneratingEmbeddings(true);
      const result = await regenerateProductEmbeddings(productoId);
      toast({
        title: "Embeddings regenerados",
        description:
          result.processed === 0
            ? "No se generaron embeddings porque no hay referencias."
            : `${result.processed} referencia${result.processed === 1 ? "" : "s"} procesada${result.processed === 1 ? "" : "s"
            } correctamente`,
      });
    } catch (regenError) {
      console.error("Error regenerando embeddings", regenError);
      toast({
        title: "No se pudieron regenerar los embeddings",
        description: regenError instanceof Error ? regenError.message : "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setRegeneratingEmbeddings(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando información…</p>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="text-muted-foreground">{error ?? "No se pudo cargar el producto"}</p>
        <Button onClick={() => router.push("/admin/productos")}>Regresar al listado</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href={`/admin/productos/${productoId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Editar producto</h1>
              <p className="text-sm text-muted-foreground">Actualiza la información del inventario</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información básica</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(event) => setFormData({ ...formData, codigo: event.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(event) => setFormData({ ...formData, nombre: event.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  rows={3}
                  value={formData.descripcion}
                  onChange={(event) => setFormData({ ...formData, descripcion: event.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Categorización</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select
                    value={formData.categoriaId}
                    onValueChange={(value) => setFormData({ ...formData, categoriaId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((categoria) => (
                        <SelectItem key={categoria.id} value={String(categoria.id)}>
                          {categoria.nombre}
                        </SelectItem>
                      ))}
                      {categorias.length === 0 && <SelectItem value="" disabled>No hay categorías disponibles</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca</Label>
                  <Input
                    id="marca"
                    value={formData.marca}
                    onChange={(event) => setFormData({ ...formData, marca: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proveedor">Proveedor</Label>
                  <Input
                    id="proveedor"
                    value={formData.proveedor}
                    onChange={(event) => setFormData({ ...formData, proveedor: event.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value: "activo" | "inactivo") => setFormData({ ...formData, estado: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Precios y stock</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="precio">Precio (COP)</Label>
                <Input
                  id="precio"
                  type="number"
                  value={formData.precio}
                  onChange={(event) => setFormData({ ...formData, precio: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precio_base">Costo Base (COP)</Label>
                <Input
                  id="precio_base"
                  type="number"
                  value={formData.precio_base}
                  onChange={(event) => setFormData({ ...formData, precio_base: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descuento">Descuento (%)</Label>
                <Input
                  id="descuento"
                  type="number"
                  value={formData.descuento}
                  onChange={(event) => setFormData({ ...formData, descuento: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stockMinimo">Stock mínimo</Label>
                <Input
                  id="stockMinimo"
                  type="number"
                  value={formData.stockMinimo}
                  onChange={(event) => setFormData({ ...formData, stockMinimo: event.target.value })}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Imagen principal del producto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="imagen-file">Subir nueva imagen</Label>
                  <Input
                    id="imagen-file"
                    type="file"
                    accept="image/*"
                    disabled={uploadingImage}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file || !formData) return;
                      setUploadingImage(true);
                      try {
                        const { url } = await uploadProductImage(file, {
                          productId: productoId ?? undefined,
                          productCode: formData.codigo,
                        });
                        setFormData((prev) => (prev ? { ...prev, imagen: url } : prev));
                        toast({ title: "Imagen actualizada", description: "La imagen se almacenó correctamente." });
                      } catch (uploadError) {
                        console.error("Error subiendo imagen", uploadError);
                        toast({
                          title: "No se pudo subir la imagen",
                          description:
                            uploadError instanceof Error ? uploadError.message : "Intenta nuevamente con otro archivo",
                          variant: "destructive",
                        });
                      } finally {
                        setUploadingImage(false);
                        event.target.value = "";
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Selecciona una imagen desde tu dispositivo. Reemplazará la imagen actual del producto.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imagen">URL de imagen</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="imagen"
                      value={formData.imagen}
                      placeholder="https://"
                      onChange={(event) => setFormData({ ...formData, imagen: event.target.value })}
                    />
                    {formData.imagen && (
                      <div className="relative h-16 w-16 overflow-hidden rounded border">
                        <Image
                          src={formData.imagen}
                          alt="Previsualización"
                          fill
                          sizes="64px"
                          loading="lazy"
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Imágenes de referencia para reconocimiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Imágenes registradas</Label>
                {referenceImages.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {referenceImages.map((reference) => {
                      const imageSrc = reference.url && reference.url.length > 0 ? reference.url : undefined;
                      return (
                        <div key={reference.id} className="flex flex-col gap-2">
                          <div className="relative h-24 w-full overflow-hidden rounded border">
                            {imageSrc ? (
                              <Image
                                src={imageSrc}
                                alt={reference.filename ?? `Referencia ${reference.id}`}
                                fill
                                sizes="120px"
                                loading="lazy"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                                Sin vista previa
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex-1 truncate text-xs text-muted-foreground">
                              {reference.filename ?? reference.path}
                            </span>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteReference(reference.id)}
                              disabled={
                                removingReferenceId === reference.id ||
                                uploadingReferences ||
                                guardando
                              }
                            >
                              {removingReferenceId === reference.id ? "Eliminando…" : "Eliminar"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Aún no hay imágenes de referencia registradas para este producto.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference-files">Añadir nuevas imágenes</Label>
                <Input
                  id="reference-files"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={guardando || uploadingImage || uploadingReferences}
                  onChange={handleReferenceFilesChange}
                />
                <p className="text-xs text-muted-foreground">
                  Agrega fotos adicionales del producto para mejorar los resultados del reconocimiento visual.
                </p>
              </div>

              {referenceDrafts.length > 0 && (
                <div className="space-y-2">
                  <Label>Imágenes pendientes de carga</Label>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {referenceDrafts.map((draft, index) => (
                      <div key={`${draft.preview}-${index}`} className="flex flex-col gap-2">
                        <div className="relative h-24 w-full overflow-hidden rounded border">
                          <Image
                            src={draft.preview}
                            alt={`Referencia pendiente ${index + 1}`}
                            fill
                            sizes="120px"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRemoveReferenceDraft(index)}
                          disabled={guardando || uploadingReferences}
                        >
                          Quitar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRegenerateEmbeddings}
                  disabled={
                    regeneratingEmbeddings ||
                    uploadingReferences ||
                    referenceImages.length === 0 ||
                    guardando
                  }
                >
                  {regeneratingEmbeddings ? "Regenerando…" : "Regenerar embeddings"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Úsalo cuando reemplaces referencias existentes o después de eliminarlas.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href={`/admin/productos/${productoId}`}>
              <Button
                type="button"
                variant="outline"
                disabled={guardando || uploadingReferences || regeneratingEmbeddings || removingReferenceId !== null}
              >
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={
                guardando ||
                categorias.length === 0 ||
                uploadingImage ||
                uploadingReferences ||
                regeneratingEmbeddings
              }
            >
              {guardando || uploadingReferences ? "Procesando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

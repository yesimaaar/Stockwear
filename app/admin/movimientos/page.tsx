"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import * as LucideIcons from "lucide-react";
const { ArrowLeftRight } = LucideIcons;

import { AdminSectionLayout } from "@/components/admin-section-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { InventarioService } from "@/lib/services/inventario-service";
import type { Almacen, Talla } from "@/lib/types";

const entradaSchema = z.object({
  productoId: z.string({ required_error: "Selecciona un producto" }).min(1, "Selecciona un producto"),
  tallaId: z.string().optional(),
  almacenId: z.string({ required_error: "Selecciona un almacén" }).min(1, "Selecciona un almacén"),
  cantidad: z.coerce
    .number({ invalid_type_error: "Ingresa una cantidad válida" })
    .min(1, "La cantidad debe ser mayor a cero"),
  motivo: z.string().trim().max(160, "Máximo 160 caracteres").optional(),
  costoUnitario: z.string().optional(),
});

type EntradaFormValues = z.infer<typeof entradaSchema>;

const ajusteSchema = z.object({
  tipo: z.enum(["entrada", "salida", "ajuste"], { required_error: "Selecciona un tipo" }),
  productoId: z.string({ required_error: "Selecciona un producto" }).min(1, "Selecciona un producto"),
  tallaId: z.string().optional(),
  almacenId: z.string({ required_error: "Selecciona un almacén" }).min(1, "Selecciona un almacén"),
  cantidad: z.coerce
    .number({ invalid_type_error: "Ingresa una cantidad válida" })
    .min(1, "La cantidad debe ser mayor a cero"),
  motivo: z.string().trim().max(160, "Máximo 160 caracteres").optional(),
});

type AjusteFormValues = z.infer<typeof ajusteSchema>;

const transferenciaSchema = z
  .object({
    productoId: z.string({ required_error: "Selecciona un producto" }).min(1, "Selecciona un producto"),
    tallaId: z.string().optional(),
    origenId: z.string({ required_error: "Selecciona el almacén origen" }).min(1, "Selecciona el almacén origen"),
    destinoId: z
      .string({ required_error: "Selecciona el almacén destino" })
      .min(1, "Selecciona el almacén destino"),
    cantidad: z.coerce
      .number({ invalid_type_error: "Ingresa una cantidad válida" })
      .min(1, "La cantidad debe ser mayor a cero"),
    motivo: z.string().trim().max(160, "Máximo 160 caracteres").optional(),
  })
  .refine((values) => values.origenId !== values.destinoId, {
    message: "El almacén destino debe ser diferente al de origen",
    path: ["destinoId"],
  });

type TransferenciaFormValues = z.infer<typeof transferenciaSchema>;

type ProductoBasico = {
  id: number;
  nombre: string;
  codigo: string;
};

const DEFAULT_ENTRADA_VALUES: EntradaFormValues = {
  productoId: "",
  tallaId: "none",
  almacenId: "",
  cantidad: 1,
  motivo: "",
  costoUnitario: "",
};

const DEFAULT_AJUSTE_VALUES: AjusteFormValues = {
  tipo: "salida",
  productoId: "",
  tallaId: "none",
  almacenId: "",
  cantidad: 1,
  motivo: "",
};

const DEFAULT_TRANSFERENCIA_VALUES: TransferenciaFormValues = {
  productoId: "",
  tallaId: "none",
  origenId: "",
  destinoId: "",
  cantidad: 1,
  motivo: "",
};

export default function MovimientosPage() {
  const { toast } = useToast();
  const [productos, setProductos] = useState<ProductoBasico[]>([]);
  const [tallas, setTallas] = useState<Talla[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  const entradaForm = useForm<EntradaFormValues>({
    resolver: zodResolver(entradaSchema),
    defaultValues: DEFAULT_ENTRADA_VALUES,
  });

  const ajusteForm = useForm<AjusteFormValues>({
    resolver: zodResolver(ajusteSchema),
    defaultValues: DEFAULT_AJUSTE_VALUES,
  });

  const transferenciaForm = useForm<TransferenciaFormValues>({
    resolver: zodResolver(transferenciaSchema),
    defaultValues: DEFAULT_TRANSFERENCIA_VALUES,
  });

  useEffect(() => {
    let active = true;

    const loadCatalogos = async () => {
      setLoadingCatalogos(true);
      try {
        const [productosActivos, tallasActivas, almacenesActivos] = await Promise.all([
          InventarioService.getProductosActivosBasicos(),
          InventarioService.getTallasActivas(),
          InventarioService.getAlmacenesActivos(),
        ]);

        if (active) {
          setProductos(productosActivos);
          setTallas(tallasActivas);
          setAlmacenes(almacenesActivos);
        }
      } catch (error) {
        console.error("Error al cargar catálogos de inventario", error);
        toast({
          title: "No pudimos cargar los catálogos",
          description: "Actualiza la página o verifica tu conexión.",
          variant: "destructive",
        });
      } finally {
        if (active) {
          setLoadingCatalogos(false);
        }
      }
    };

    void loadCatalogos();

    return () => {
      active = false;
    };
  }, [toast]);

  const resumen = useMemo(
    () => ({
      productos: productos.length,
      tallas: tallas.length,
      almacenes: almacenes.length,
    }),
    [productos, tallas, almacenes],
  );

  const convertirId = (valor: string | undefined) => {
    if (!valor || valor === "none") {
      return null;
    }

    const id = Number(valor);
    return Number.isFinite(id) ? id : null;
  };

  const handleEntradaSubmit = async (values: EntradaFormValues) => {
    const productoId = Number(values.productoId);
    const tallaId = convertirId(values.tallaId);
    const almacenId = convertirId(values.almacenId);

    try {
      let costo: number | null = null;
      if (values.costoUnitario && values.costoUnitario.trim().length > 0) {
        const parsed = Number(values.costoUnitario);
        if (!Number.isFinite(parsed) || parsed < 0) {
          throw new Error('El costo unitario no es válido');
        }
        costo = Number(parsed.toFixed(2));
      }

      await InventarioService.registrarEntrada({
        productoId,
        tallaId,
        almacenId,
        cantidad: values.cantidad,
        motivo: values.motivo?.trim() || null,
        costoUnitario: costo,
      });

      toast({
        title: "Entrada registrada",
        description: "El stock se actualizó correctamente.",
      });
      entradaForm.reset(DEFAULT_ENTRADA_VALUES);
    } catch (error) {
      console.error("Error al registrar la entrada", error);
      toast({
        title: "No se registró la entrada",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const handleAjusteSubmit = async (values: AjusteFormValues) => {
    const productoId = Number(values.productoId);
    const tallaId = convertirId(values.tallaId);
    const almacenId = convertirId(values.almacenId);

    try {
      await InventarioService.registrarAjuste({
        tipo: values.tipo,
        productoId,
        tallaId,
        almacenId,
        cantidad: values.cantidad,
        motivo: values.motivo?.trim() || null,
      });

      toast({
        title: "Movimiento registrado",
        description: "El ajuste se aplicó correctamente.",
      });
      ajusteForm.reset(DEFAULT_AJUSTE_VALUES);
    } catch (error) {
      console.error("Error al aplicar el ajuste", error);
      toast({
        title: "No se completó el ajuste",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const handleTransferenciaSubmit = async (values: TransferenciaFormValues) => {
    const productoId = Number(values.productoId);
    const tallaId = convertirId(values.tallaId);
    const origenId = Number(values.origenId);
    const destinoId = Number(values.destinoId);

    try {
      await InventarioService.transferirStock({
        productoId,
        tallaId,
        origenId,
        destinoId,
        cantidad: values.cantidad,
        motivo: values.motivo?.trim() || null,
      });

      toast({
        title: "Transferencia completada",
        description: "Se movió el stock entre almacenes.",
      });
      transferenciaForm.reset(DEFAULT_TRANSFERENCIA_VALUES);
    } catch (error) {
      console.error("Error al transferir stock", error);
      toast({
        title: "No se logró la transferencia",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const accionesDeshabilitadas = loadingCatalogos || productos.length === 0 || almacenes.length === 0;

  const renderProductoOptions = () =>
    productos.map((producto) => (
      <SelectItem key={producto.id} value={String(producto.id)}>
        {producto.nombre} · {producto.codigo}
      </SelectItem>
    ));

  const renderTallaOptions = () => [
    <SelectItem key="none" value="none">
      Sin talla específica
    </SelectItem>,
    ...tallas.map((talla) => (
      <SelectItem key={talla.id} value={String(talla.id)}>
        {talla.nombre}
      </SelectItem>
    )),
  ];

  const renderAlmacenOptions = () =>
    almacenes.map((almacen) => (
      <SelectItem key={almacen.id} value={String(almacen.id)}>
        {almacen.nombre}
      </SelectItem>
    ));

  return (
    <AdminSectionLayout
      title="Movimientos de inventario"
      description="Registra entradas, salidas o transfiere existencias entre almacenes"
      icon={<ArrowLeftRight className="h-5 w-5" />}
      actions={null}
      sidebar={
        <div className="space-y-5">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Catálogos disponibles
            </h2>
            <div className="mt-3 space-y-3 text-sm">
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Productos activos</span>
                <span className="font-semibold text-foreground">{resumen.productos}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Tallas activas</span>
                <span className="font-semibold text-foreground">{resumen.tallas}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Almacenes activos</span>
                <span className="font-semibold text-foreground">{resumen.almacenes}</span>
              </p>
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Sugerencias</h3>
            <ul className="space-y-1">
              <li>• Usa transferencias para equilibrar inventario.</li>
              <li>• Registra ajustes después de auditorías físicas.</li>
              <li>• Mantén el historial siempre actualizado.</li>
            </ul>
          </section>
        </div>
      }
    >
      <Tabs defaultValue="entrada" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 gap-2 rounded-2xl bg-muted/60 p-1">
          <TabsTrigger value="entrada">Entrada</TabsTrigger>
          <TabsTrigger value="ajuste">Salida / Ajuste</TabsTrigger>
          <TabsTrigger value="transferencia">Transferencia</TabsTrigger>
        </TabsList>

        <TabsContent value="entrada">
          <Card className="border-border">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">Registrar entrada</CardTitle>
              <CardDescription>Incorpora nuevas unidades al inventario.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCatalogos ? (
                <p className="text-sm text-muted-foreground">Cargando catálogos...</p>
              ) : productos.length === 0 || almacenes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Necesitas al menos un producto y un almacén activo para registrar entradas.
                </p>
              ) : (
                <Form {...entradaForm}>
                  <form className="grid gap-4 md:grid-cols-2" onSubmit={entradaForm.handleSubmit(handleEntradaSubmit)}>
                    <FormField
                      control={entradaForm.control}
                      name="productoId"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Producto</FormLabel>
                          <FormControl>
                            <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un producto" />
                              </SelectTrigger>
                              <SelectContent>{renderProductoOptions()}</SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={entradaForm.control}
                      name="tallaId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Talla</FormLabel>
                          <FormControl>
                            <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Sin talla" />
                              </SelectTrigger>
                              <SelectContent>{renderTallaOptions()}</SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={entradaForm.control}
                      name="almacenId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Almacén destino</FormLabel>
                          <FormControl>
                            <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un almacén" />
                              </SelectTrigger>
                              <SelectContent>{renderAlmacenOptions()}</SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={entradaForm.control}
                      name="cantidad"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cantidad</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              disabled={accionesDeshabilitadas}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={entradaForm.control}
                      name="costoUnitario"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Costo unitario (opcional)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="Ej. 25000"
                              disabled={accionesDeshabilitadas}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={entradaForm.control}
                      name="motivo"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Motivo</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe el motivo de la entrada"
                              disabled={accionesDeshabilitadas}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="md:col-span-2 flex justify-end">
                      <Button type="submit" disabled={accionesDeshabilitadas || entradaForm.formState.isSubmitting}>
                        {entradaForm.formState.isSubmitting ? "Registrando..." : "Registrar entrada"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ajuste">
          <Card className="border-border">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">Registrar salida o ajuste</CardTitle>
              <CardDescription>Actualiza el inventario por ajustes manuales.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCatalogos ? (
                <p className="text-sm text-muted-foreground">Cargando catálogos...</p>
              ) : productos.length === 0 || almacenes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Necesitas al menos un producto y un almacén activo para registrar ajustes.
                </p>
              ) : (
                <Form {...ajusteForm}>
                  <form className="grid gap-4 md:grid-cols-2" onSubmit={ajusteForm.handleSubmit(handleAjusteSubmit)}>
                    <FormField
                      control={ajusteForm.control}
                      name="tipo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de movimiento</FormLabel>
                          <FormControl>
                            <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona el tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="salida">Salida</SelectItem>
                                <SelectItem value="entrada">Entrada</SelectItem>
                                <SelectItem value="ajuste">Ajuste manual</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={ajusteForm.control}
                      name="productoId"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Producto</FormLabel>
                          <FormControl>
                            <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un producto" />
                              </SelectTrigger>
                              <SelectContent>{renderProductoOptions()}</SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={ajusteForm.control}
                      name="tallaId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Talla</FormLabel>
                          <FormControl>
                            <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Sin talla" />
                              </SelectTrigger>
                              <SelectContent>{renderTallaOptions()}</SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={ajusteForm.control}
                      name="almacenId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Almacén</FormLabel>
                          <FormControl>
                            <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un almacén" />
                              </SelectTrigger>
                              <SelectContent>{renderAlmacenOptions()}</SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={ajusteForm.control}
                      name="cantidad"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cantidad</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              disabled={accionesDeshabilitadas}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={ajusteForm.control}
                      name="motivo"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Motivo</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe el motivo del ajuste"
                              disabled={accionesDeshabilitadas}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="md:col-span-2 flex justify-end">
                      <Button type="submit" disabled={accionesDeshabilitadas || ajusteForm.formState.isSubmitting}>
                        {ajusteForm.formState.isSubmitting ? "Registrando..." : "Registrar movimiento"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transferencia">
          <Card className="border-border">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">Transferir entre almacenes</CardTitle>
              <CardDescription>Mueve stock de un almacén a otro.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCatalogos ? (
                <p className="text-sm text-muted-foreground">Cargando catálogos...</p>
              ) : productos.length === 0 || almacenes.length < 2 ? (
                <p className="text-sm text-muted-foreground">
                  Necesitas al menos un producto y dos almacenes activos para transferir stock.
                </p>
              ) : (
                <Form {...transferenciaForm}>
                  <form
                    className="grid gap-4 md:grid-cols-2"
                    onSubmit={transferenciaForm.handleSubmit(handleTransferenciaSubmit)}
                  >
                    <FormField
                      control={transferenciaForm.control}
                      name="productoId"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Producto</FormLabel>
                          <FormControl>
                            <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un producto" />
                              </SelectTrigger>
                              <SelectContent>{renderProductoOptions()}</SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={transferenciaForm.control}
                      name="tallaId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Talla</FormLabel>
                          <FormControl>
                            <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Sin talla" />
                              </SelectTrigger>
                              <SelectContent>{renderTallaOptions()}</SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={transferenciaForm.control}
                      name="cantidad"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cantidad</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              disabled={accionesDeshabilitadas}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={transferenciaForm.control}
                      name="origenId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Almacén origen</FormLabel>
                          <FormControl>
                            <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona el almacén origen" />
                              </SelectTrigger>
                              <SelectContent>{renderAlmacenOptions()}</SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={transferenciaForm.control}
                      name="destinoId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Almacén destino</FormLabel>
                          <FormControl>
                            <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona el almacén destino" />
                              </SelectTrigger>
                              <SelectContent>{renderAlmacenOptions()}</SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={transferenciaForm.control}
                      name="motivo"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Motivo</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe el motivo de la transferencia"
                              disabled={accionesDeshabilitadas}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="md:col-span-2 flex justify-end">
                      <Button
                        type="submit"
                        disabled={accionesDeshabilitadas || transferenciaForm.formState.isSubmitting}
                      >
                        {transferenciaForm.formState.isSubmitting ? "Transfiriendo..." : "Registrar transferencia"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminSectionLayout>
  );
}

import { beforeEach, describe, expect, it, vi } from "vitest"
import { VentaService } from "@/lib/services/venta-service"

const stockTableMock = {
  select: vi.fn(),
  in: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}

const ventasTableMock = {
  insert: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
}

const ventasDetalleTableMock = {
  insert: vi.fn(),
  select: vi.fn(),
}

const historialStockTableMock = {
  insert: vi.fn(),
}

const supabaseMock = {
  from: vi.fn() as (table: string) => unknown,
}

vi.mock("@/lib/supabase", () => ({
  supabase: supabaseMock,
}))

const resetSupabaseMocks = () => {
  stockTableMock.select.mockReset()
  stockTableMock.select.mockReturnThis()
  stockTableMock.in.mockReset()
  stockTableMock.update.mockReset()
  stockTableMock.update.mockReturnThis()
  stockTableMock.eq.mockReset()
  stockTableMock.eq.mockResolvedValue({ error: null })

  ventasTableMock.insert.mockReset()
  ventasTableMock.insert.mockReturnThis()
  ventasTableMock.select.mockReset()
  ventasTableMock.select.mockReturnThis()
  ventasTableMock.single.mockReset()

  ventasDetalleTableMock.insert.mockReset()
  ventasDetalleTableMock.insert.mockReturnThis()
  ventasDetalleTableMock.select.mockReset()

  historialStockTableMock.insert.mockReset()
  historialStockTableMock.insert.mockResolvedValue({ error: null })

  supabaseMock.from = vi.fn((table: string) => {
    switch (table) {
      case "stock":
        return stockTableMock
      case "ventas":
        return ventasTableMock
      case "ventasDetalle":
        return ventasDetalleTableMock
      case "historialStock":
        return historialStockTableMock
      default:
        throw new Error(`Tabla no mockeada: ${table}`)
    }
  })
}

beforeEach(() => {
  resetSupabaseMocks()
})

describe("VentaService.create", () => {
  it("registra una venta y actualiza el inventario", async () => {
    const stockRow = {
      id: 1,
      productoId: 55,
      tallaId: 3,
      almacenId: 7,
      cantidad: 5,
    }

    stockTableMock.in.mockResolvedValueOnce({ data: [stockRow], error: null })

    const ventaRecord = {
      id: 123,
      folio: "VTA-FAKE-1234",
      total: 180,
      usuarioId: "user-123",
      createdAt: "2024-01-01T00:00:00.000Z",
    }

    ventasTableMock.single.mockResolvedValueOnce({ data: ventaRecord, error: null })

    const detalleRecords = [
      {
        id: 99,
        ventaId: 123,
        productoId: 55,
        stockId: 1,
        cantidad: 2,
        precioUnitario: 100,
        descuento: 10,
        subtotal: 180,
      },
    ]

    ventasDetalleTableMock.select.mockResolvedValueOnce({ data: detalleRecords, error: null })

    const folioSpy = vi.spyOn(VentaService, "generarFolio").mockReturnValue("VTA-FAKE-1234")

    const resultado = await VentaService.create({
      usuarioId: "user-123",
      items: [
        {
          stockId: 1,
          cantidad: 2,
          precioUnitario: 100,
          descuento: 10,
        },
      ],
    })

    expect(folioSpy).toHaveBeenCalledTimes(1)

    expect(stockTableMock.select).toHaveBeenCalledWith("id,productoId,tallaId,almacenId,cantidad")
    expect(stockTableMock.in).toHaveBeenCalledWith("id", [1])

    expect(ventasTableMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        folio: "VTA-FAKE-1234",
        total: 180,
        usuarioId: "user-123",
        createdAt: expect.any(String),
      }),
    )

    expect(ventasDetalleTableMock.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        ventaId: 123,
        productoId: 55,
        stockId: 1,
        cantidad: 2,
        precioUnitario: 100,
        descuento: 10,
        subtotal: 180,
      }),
    ])

    expect(stockTableMock.update).toHaveBeenCalledWith({ cantidad: 3 })
    expect(stockTableMock.eq).toHaveBeenCalledWith("id", 1)

    expect(historialStockTableMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: "venta",
        productoId: 55,
        cantidad: 2,
        stockAnterior: 5,
        stockNuevo: 3,
        usuarioId: "user-123",
        motivo: "Venta en punto de venta (VTA-FAKE-1234)",
      }),
    )

    expect(resultado).toMatchObject({
      id: 123,
      folio: "VTA-FAKE-1234",
      total: 180,
      usuarioId: "user-123",
      detalles: detalleRecords,
    })
  })

  it("impide registrar la venta si no hay inventario suficiente", async () => {
    stockTableMock.in.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          productoId: 55,
          tallaId: null,
          almacenId: null,
          cantidad: 1,
        },
      ],
      error: null,
    })

    await expect(
      VentaService.create({
        usuarioId: null,
        items: [
          {
            stockId: 1,
            cantidad: 2,
            precioUnitario: 100,
          },
        ],
      }),
    ).rejects.toThrow("No hay inventario suficiente para completar la venta")

    expect(ventasTableMock.insert).not.toHaveBeenCalled()
    expect(ventasDetalleTableMock.insert).not.toHaveBeenCalled()
    expect(historialStockTableMock.insert).not.toHaveBeenCalled()
  })
})

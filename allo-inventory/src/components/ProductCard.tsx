import { formatCurrency } from "@/lib/utils"
import { StockBadge } from "./StockBadge"

export interface WarehouseStock {
  warehouseId: string
  warehouseName: string
  available: number
}

export interface Product {
  id: string
  name: string
  sku: string
  description: string
  price: number
  imageUrl: string
  warehouses: WarehouseStock[]
}

interface ProductCardProps {
  product: Product
  onReserve: (product: Product) => void
}

export function ProductCard({ product, onReserve }: ProductCardProps) {
  const totalAvailable = product.warehouses.reduce((sum, w) => sum + w.available, 0)

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200 transition-all hover:shadow-md">
      <div className="aspect-[4/3] w-full bg-gray-100 relative">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-gray-400">
            [Image Placeholder]
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg text-gray-900 leading-tight">{product.name}</h3>
          <span className="font-bold text-gray-900">{formatCurrency(product.price)}</span>
        </div>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{product.description}</p>
        
        <div className="mt-auto space-y-2 mb-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Availability by location</p>
          <div className="space-y-1">
            {product.warehouses.map(w => (
              <div key={w.warehouseId} className="flex justify-between items-center text-sm">
                <span className="text-gray-700">{w.warehouseName}</span>
                <StockBadge available={w.available} />
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => onReserve(product)}
          disabled={totalAvailable === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
        >
          {totalAvailable === 0 ? "Out of Stock" : "Reserve"}
        </button>
      </div>
    </div>
  )
}

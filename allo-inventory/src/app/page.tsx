"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ProductCard, Product } from "@/components/ProductCard"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("")
  const [quantity, setQuantity] = useState<number>(1)
  const [reserving, setReserving] = useState(false)
  const [reserveError, setReserveError] = useState<string | null>(null)
  
  // Custom Idempotency Toggle for Demo Purposes
  const [useIdempotency, setUseIdempotency] = useState(true)
  const [manualIdempotencyKey, setManualIdempotencyKey] = useState("")

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/products")
      if (!res.ok) throw new Error("Failed to load products")
      const data = await res.json()
      setProducts(data.products || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while loading products.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleOpenReserveModal = (product: Product) => {
    setSelectedProduct(product)
    // Select first warehouse with stock
    const availableWarehouse = product.warehouses.find(w => w.available > 0)
    setSelectedWarehouseId(availableWarehouse?.warehouseId || "")
    setQuantity(1)
    setReserveError(null)
    // Generate a fresh idempotency key for this session
    setManualIdempotencyKey(crypto.randomUUID())
  }

  const handleCloseModal = () => {
    setSelectedProduct(null)
    setReserveError(null)
  }

  const handleReserveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct || !selectedWarehouseId) return

    setReserving(true)
    setReserveError(null)

    try {
      const payload = {
        productId: selectedProduct.id,
        warehouseId: selectedWarehouseId,
        quantity: Number(quantity),
        idempotencyKey: useIdempotency ? manualIdempotencyKey : undefined
      }

      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok && data.reservation) {
        // Redirect to the reservation checkout page
        router.push(`/checkout/${data.reservation.id}`)
      } else {
        // Show status code specific messages
        if (res.status === 409) {
          setReserveError("Stock Conflict (409): Not enough stock available in the selected warehouse. Please try a lower quantity or another location.")
        } else {
          setReserveError(data.error || "Failed to make reservation")
        }
      }
    } catch {
      setReserveError("Network error: Could not complete reservation. Please try again.")
    } finally {
      setReserving(false)
    }
  }

  const selectedWarehouse = selectedProduct?.warehouses.find(
    w => w.warehouseId === selectedWarehouseId
  )
  const maxAvailable = selectedWarehouse ? selectedWarehouse.available : 0

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Hero Header Section */}
      <div className="text-center md:text-left py-6 md:py-10 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Inventory Catalog
          </h1>
          <p className="mt-3 text-lg text-slate-500 dark:text-slate-400 max-w-2xl">
            Reserve stock items from multiple regional hubs. Reservations expire automatically after 10 minutes.
          </p>
        </div>
        <div>
          <button 
            onClick={fetchProducts}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Stock
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading && products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading catalog items...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl flex gap-3 text-red-800 dark:text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <h3 className="font-semibold">Failed to load catalog</h3>
            <p className="text-sm mt-1">{error}</p>
            <button 
              onClick={fetchProducts}
              className="mt-3 px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 rounded-md text-xs font-semibold transition-all"
            >
              Retry Connection
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
          {products.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onReserve={handleOpenReserveModal} 
            />
          ))}
        </div>
      )}

      {/* Glassmorphic Reservation Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 animate-scale-up">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Create Reservation Hold
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {selectedProduct.name}
                </h3>
              </div>
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl font-semibold transition-colors"
              >
                &times;
              </button>
            </div>

            {reserveError && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl flex gap-3 text-red-800 dark:text-red-300 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{reserveError}</span>
              </div>
            )}

            <form onSubmit={handleReserveSubmit} className="space-y-5">
              {/* Warehouse selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Select Warehouse Location
                </label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => {
                    setSelectedWarehouseId(e.target.value)
                    setQuantity(1)
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-950 dark:text-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {selectedProduct.warehouses.map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId} disabled={w.available === 0}>
                      {w.warehouseName} ({w.available > 0 ? `${w.available} units left` : "Out of Stock"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity selector */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Quantity to Hold
                  </label>
                  <span className="text-xs font-medium text-slate-400">
                    Max: {maxAvailable} units
                  </span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={maxAvailable}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(maxAvailable, Math.max(1, Number(e.target.value))))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-950 dark:text-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Idempotency demonstration setting (Premium Feature Demo) */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useIdempotency}
                    onChange={(e) => setUseIdempotency(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Use Idempotency Key (Prevents Duplicate Holds)
                  </span>
                </label>
                {useIdempotency && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Idempotency Key (UUID)
                    </span>
                    <input
                      type="text"
                      readOnly
                      value={manualIdempotencyKey}
                      className="w-full bg-transparent border-0 p-0 text-[11px] font-mono text-slate-500 select-all focus:ring-0"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold py-3 px-4 rounded-xl text-sm transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reserving || maxAvailable === 0}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  {reserving ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Holding...
                    </>
                  ) : (
                    "Place Hold"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

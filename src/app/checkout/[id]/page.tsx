"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import { Clock, ShieldAlert, CheckCircle, XCircle, ArrowLeft, Building2, Package } from "lucide-react"

interface ReservationDetail {
  id: string
  productId: string
  warehouseId: string
  quantity: number
  status: string // PENDING, CONFIRMED, RELEASED, EXPIRED
  expiresAt: string
  idempotencyKey?: string
  product: {
    name: string
    description: string
    price: number
    imageUrl: string
    sku: string
  }
  warehouse: {
    name: string
    location: string
  }
}

export default function CheckoutPage() {
  const router = useRouter()
  const params = useParams()
  const reservationId = params.id as string

  const [reservation, setReservation] = useState<ReservationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState<number>(0) // in seconds
  const [isConfirming, setIsConfirming] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchReservation = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/reservations/${reservationId}`)
      if (!res.ok) throw new Error("Reservation not found")
      
      const data = await res.json()
      setReservation(data.reservation)
      setError(null)
      
      // Calculate initial time left
      if (data.reservation.status === "PENDING") {
        const expiry = new Date(data.reservation.expiresAt).getTime()
        const now = Date.now()
        const diff = Math.max(0, Math.floor((expiry - now) / 1000))
        setTimeLeft(diff)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not retrieve checkout details.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (reservationId) {
      fetchReservation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId])

  // Countdown timer effect
  useEffect(() => {
    if (reservation?.status !== "PENDING" || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // Handle lazy local expiry update
          setReservation(res => res ? { ...res, status: "EXPIRED" } : null)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [reservation?.status, timeLeft])

  const handleConfirm = async () => {
    if (!reservation) return
    setIsConfirming(true)
    setActionError(null)

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      }
      // Pass the idempotency key if it was defined
      if (reservation.idempotencyKey) {
        headers["idempotency-key"] = reservation.idempotencyKey
      }

      const res = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: "POST",
        headers
      })

      const data = await res.json()

      if (res.ok && data.reservation) {
        setReservation(res => res ? { ...res, status: "CONFIRMED" } : null)
      } else {
        if (res.status === 410) {
          setReservation(res => res ? { ...res, status: "EXPIRED" } : null)
          setActionError("Hold Expired (410): The reservation window has closed. The inventory was released back to other customers.")
        } else {
          setActionError(data.error || "Confirmation failed.")
        }
      }
    } catch {
      setActionError("Network error: Could not confirm the purchase. Please try again.")
    } finally {
      setIsConfirming(false)
    }
  }

  const handleCancel = async () => {
    if (!reservation) return
    setIsCancelling(true)
    setActionError(null)

    try {
      const res = await fetch(`/api/reservations/${reservation.id}/release`, {
        method: "POST",
      })

      const data = await res.json()

      if (res.ok && data.reservation) {
        // Successfully released, redirect to catalog
        router.push("/")
      } else {
        setActionError(data.error || "Failed to cancel hold.")
      }
    } catch {
      setActionError("Network error: Could not cancel hold. Please try again.")
    } finally {
      setIsCancelling(false)
    }
  }

  // Format helper for timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Checking reservation status...</p>
      </div>
    )
  }

  if (error || !reservation) {
    return (
      <div className="max-w-md mx-auto py-12 px-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-xl">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Checkout Error</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{error || "Reservation detail not found."}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Catalog
        </button>
      </div>
    )
  }

  // State Views
  if (reservation.status === "CONFIRMED") {
    return (
      <div className="max-w-md mx-auto py-16 px-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-2xl animate-scale-up">
        <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-6" />
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Order Confirmed!</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-sm mx-auto">
          Your payment was processed successfully and stock has been permanently allocated from the warehouse.
        </p>

        <div className="my-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/80 text-left space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Item</span>
            <span className="font-semibold text-slate-950 dark:text-slate-50">{reservation.product.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Quantity</span>
            <span className="font-semibold text-slate-950 dark:text-slate-50">{reservation.quantity} unit(s)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Warehouse</span>
            <span className="font-semibold text-slate-950 dark:text-slate-50">{reservation.warehouse.name}</span>
          </div>
          <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Total Price</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(reservation.product.price * reservation.quantity)}
            </span>
          </div>
        </div>

        <button
          onClick={() => router.push("/")}
          className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-semibold py-3 rounded-xl text-sm transition-all"
        >
          Return to Catalog
        </button>
      </div>
    )
  }

  if (reservation.status === "EXPIRED") {
    return (
      <div className="max-w-md mx-auto py-16 px-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-xl animate-scale-up">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Hold Expired</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
          Unfortunately, your 10-minute inventory hold has expired. The stock unit(s) were returned to the pool for other shoppers.
        </p>

        <div className="my-6 p-4 bg-red-50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 rounded-xl text-left text-xs text-red-800 dark:text-red-300">
          Holds expire automatically to prevent checkout abandonment from permanently freezing retail stock.
        </div>

        <button
          onClick={() => router.push("/")}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-md shadow-indigo-600/20"
        >
          Back to Catalog
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Back Button */}
      <button
        onClick={() => router.push("/")}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Cancel & Return to Catalog
      </button>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Reservation Card Details */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <div className="flex gap-4">
            <div className="h-20 w-20 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
              <img
                src={reservation.product.imageUrl}
                alt={reservation.product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {reservation.product.name}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                {reservation.product.description}
              </p>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* Fulfillment Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Fulfillment Hubs
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 flex items-start gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Warehouse
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {reservation.warehouse.name}
                  </span>
                  <span className="text-xs text-slate-500 block">
                    {reservation.warehouse.location}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 flex items-start gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Quantity
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {reservation.quantity} unit(s)
                  </span>
                  <span className="text-xs text-slate-500 block">
                    SKU: {reservation.product.sku}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {actionError && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl flex gap-3 text-red-800 dark:text-red-300 text-sm">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{actionError}</span>
            </div>
          )}
        </div>

        {/* Countdown & Payment Hold Summary */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="text-center p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 countdown-pulse">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Clock className="h-4.5 w-4.5" /> Hold Remaining
              </span>
              <span className="text-3xl font-extrabold font-mono text-slate-950 dark:text-slate-50 block mt-2">
                {formatTime(timeLeft)}
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Unit Price</span>
                <span>{formatCurrency(reservation.product.price)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Quantity</span>
                <span>x {reservation.quantity}</span>
              </div>
              <hr className="border-slate-200 dark:border-slate-800" />
              <div className="flex justify-between items-end">
                <span className="text-sm text-slate-500 font-medium">Total Amount</span>
                <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(reservation.product.price * reservation.quantity)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleConfirm}
              disabled={isConfirming || isCancelling || timeLeft <= 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              {isConfirming ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Purchase"
              )}
            </button>
            
            <button
              onClick={handleCancel}
              disabled={isConfirming || isCancelling}
              className="w-full bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold py-3 px-4 rounded-xl text-sm transition-colors text-center block"
            >
              {isCancelling ? "Cancelling..." : "Cancel Reservation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

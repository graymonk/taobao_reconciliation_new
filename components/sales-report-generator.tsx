"use client"

import { useState } from "react"
import { DataImportModule } from "./modules/data-import-module"
import { OrderFilterModule } from "./modules/order-filter-module"
import { CostMatchModule } from "./modules/cost-match-module"
import { DashboardModule } from "./modules/dashboard-module"
import { ExportModule } from "./modules/export-module"

type Step = "import" | "filter" | "match" | "dashboard" | "export"

export function SalesReportGenerator() {
  const [currentStep, setCurrentStep] = useState<Step>("import")
  const [importedData, setImportedData] = useState<{
    orders: any[]
    products: any[]
  }>({ orders: [], products: [] })
  const [filteredOrders, setFilteredOrders] = useState<any[]>([])
  const [enrichedOrders, setEnrichedOrders] = useState<any[]>([])

  const handleImportComplete = (data: { orders: any[]; products: any[] }) => {
    setImportedData(data)
    setCurrentStep("filter")
  }

  const handleFilterComplete = (filtered: any[]) => {
    setFilteredOrders(filtered)
    setCurrentStep("match")
  }

  const handleMatchComplete = (enriched: any[]) => {
    setEnrichedOrders(enriched)
    setCurrentStep("dashboard")
  }

  const resetProcess = () => {
    setCurrentStep("import")
    setImportedData({ orders: [], products: [] })
    setFilteredOrders([])
    setEnrichedOrders([])
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {currentStep === "import" && <DataImportModule onComplete={handleImportComplete} />}
      {currentStep === "filter" && (
        <OrderFilterModule
          orders={importedData.orders}
          onComplete={handleFilterComplete}
          onBack={() => setCurrentStep("import")}
        />
      )}
      {currentStep === "match" && (
        <CostMatchModule
          orders={filteredOrders}
          products={importedData.products}
          onComplete={handleMatchComplete}
          onBack={() => setCurrentStep("filter")}
        />
      )}
      {currentStep === "dashboard" && (
        <DashboardModule
          orders={enrichedOrders}
          onExport={() => setCurrentStep("export")}
          onBack={() => setCurrentStep("match")}
          onReset={resetProcess}
        />
      )}
      {currentStep === "export" && (
        <ExportModule orders={enrichedOrders} onBack={() => setCurrentStep("dashboard")} onReset={resetProcess} />
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import { Upload, FileCheck, TrendingUp, Download, ArrowRight, Zap, BarChart3, Shield } from "lucide-react"
import DataImportModule from "@/components/data-import-module"
import OrderFilterModule from "@/components/order-filter-module"
import CostMatchingModule from "@/components/cost-matching-module"
import FinancialDashboard from "@/components/financial-dashboard"
import ReportExport from "@/components/report-export"
import { Button } from "@/components/ui/button"

export default function Page() {
  const [activeStep, setActiveStep] = useState(0)
  const [showApp, setShowApp] = useState(false)
  const [importedData, setImportedData] = useState({
    orders: [],
    products: [],
  })
  const [filteredOrders, setFilteredOrders] = useState([])
  const [matchedData, setMatchedData] = useState([])
  const [calculations, setCalculations] = useState(null)

  const steps = [
    { name: "导入数据", icon: Upload, component: DataImportModule },
    { name: "筛选订单", icon: FileCheck, component: OrderFilterModule },
    { name: "匹配成本", icon: TrendingUp, component: CostMatchingModule },
    { name: "查看报告", icon: TrendingUp, component: FinancialDashboard },
    { name: "导出报告", icon: Download, component: ReportExport },
  ]

  if (!showApp) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background via-card to-background">
        {/* Navigation */}
        <div className="border-b border-border sticky top-0 z-50 bg-card/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-bold text-foreground">Sales Report</h1>
            </div>
            <Button onClick={() => setShowApp(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              开始使用
            </Button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <div className="inline-block mb-6 px-4 py-2 bg-secondary/50 rounded-full border border-secondary">
            <span className="text-sm font-medium text-secondary-foreground">为中小电商优化财务 ✨</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 text-pretty">
            淘宝订单财务<span className="text-primary">核算利器</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 text-pretty">
            自动匹配商品成本，精准计算利润，一键生成财务报表。助力电商店铺掌握经营数据。
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => setShowApp(true)}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Zap className="w-4 h-4 mr-2" />
              立即开始
            </Button>
            <Button size="lg" variant="outline" className="border-border hover:bg-muted bg-transparent">
              了解更多
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 bg-card rounded-xl border border-border hover:border-primary/50 transition-all hover:shadow-lg">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">灵活导入</h3>
              <p className="text-sm text-muted-foreground">
                支持 CSV、Excel 等多种格式，快速导入淘宝订单和聚水潭商品库数据
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-card rounded-xl border border-border hover:border-primary/50 transition-all hover:shadow-lg">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">智能匹配</h3>
              <p className="text-sm text-muted-foreground">基于商品编码和名称精准匹配成本，支持模糊搜索和手动调整</p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-card rounded-xl border border-border hover:border-primary/50 transition-all hover:shadow-lg">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">精准分析</h3>
              <p className="text-sm text-muted-foreground">自动计算利润、利润率、成本占比等关键指标，生成详细报表</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto px-4 py-20">
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-2xl p-12 text-center">
            <h3 className="text-2xl font-bold text-foreground mb-4">准备好优化您的财务管理了吗？</h3>
            <p className="text-muted-foreground mb-8">三个简单步骤，五分钟内生成完整的销售财务报告</p>
            <Button
              onClick={() => setShowApp(true)}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              开始使用 <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">销售报告生成器</h1>
            <p className="text-sm text-muted-foreground mt-1">淘宝订单财务核算与聚水潭商品库成本匹配</p>
          </div>
          <Button onClick={() => setShowApp(false)} variant="outline" className="border-border hover:bg-muted">
            返回首页
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between gap-2 overflow-x-auto pb-2">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = activeStep === index
              const isCompleted = activeStep > index

              return (
                <button
                  key={index}
                  onClick={() => setActiveStep(index)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : isCompleted
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{step.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeStep === 0 && (
          <DataImportModule
            onImport={(data) => {
              setImportedData(data)
              setActiveStep(1)
            }}
          />
        )}
        {activeStep === 1 && (
          <OrderFilterModule
            orders={importedData.orders}
            onFilter={(filtered) => {
              setFilteredOrders(filtered)
              setActiveStep(2)
            }}
          />
        )}
        {activeStep === 2 && (
          <CostMatchingModule
            orders={filteredOrders}
            products={importedData.products}
            onMatch={(matched) => {
              setMatchedData(matched)
              setActiveStep(3)
            }}
          />
        )}
        {activeStep === 3 && (
          <FinancialDashboard
            data={matchedData}
            onCalculate={(result) => {
              setCalculations(result)
            }}
          />
        )}
        {activeStep === 4 && <ReportExport data={matchedData} calculations={calculations} />}
      </div>
    </main>
  )
}

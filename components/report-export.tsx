"use client"

import { useState } from "react"
import { Download, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface ReportExportProps {
  data: any[]
  calculations?: {
    metrics: any
    productBreakdown: any[]
    profitAnalysis: any
  }
}

export default function ReportExport({ data, calculations }: ReportExportProps) {
  const [exportFormat, setExportFormat] = useState<"excel" | "csv" | "json">("excel")
  const [selectedSheets, setSelectedSheets] = useState({
    summary: true,
    details: true,
    products: true,
    risks: true,
  })
  const [exported, setExported] = useState(false)

  const generateSummaryData = () => {
    const totalRevenue = data.reduce((sum, d) => sum + (d.sellingPrice || 0), 0)
    const totalCost = data.reduce((sum, d) => sum + (d.cost || 0), 0)
    const totalProfit = totalRevenue - totalCost
    const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : "0"
    const matchedCount = data.filter((d) => d.matchStatus === "matched").length
    const unmatchedCount = data.length - matchedCount

    return {
      reportTitle: "销售报告生成器 - 财务分析报告",
      generateDate: new Date().toLocaleString("zh-CN"),
      summary: {
        订单总数: data.length,
        已匹配: matchedCount,
        未匹配: unmatchedCount,
        匹配率: `${((matchedCount / data.length) * 100).toFixed(2)}%`,
        总销售额: totalRevenue.toFixed(2),
        总成本: totalCost.toFixed(2),
        总利润: totalProfit.toFixed(2),
        利润率: `${profitMargin}%`,
        平均订单价值: (totalRevenue / data.length).toFixed(2),
        平均利润: (totalProfit / data.length).toFixed(2),
      },
    }
  }

  const exportAsCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"

    if (selectedSheets.summary) {
      const summary = generateSummaryData()
      csvContent += "销售报告总览\n"
      csvContent += `生成时间,${summary.generateDate}\n\n`
      Object.entries(summary.summary).forEach(([key, value]) => {
        csvContent += `${key},${value}\n`
      })
      csvContent += "\n\n"
    }

    if (selectedSheets.details) {
      csvContent += "订单详细数据\n"
      csvContent += "订单号,商品名称,销售额,成本,利润,利润率,匹配状态\n"
      data.forEach((d) => {
        csvContent += `"${d["订单号"] || "-"}","${d["商品名称"] || "-"}",${d.sellingPrice || 0},${d.cost || 0},${d.profit || 0},${d.profitMargin || "0"}%,${d.matchStatus}\n`
      })
      csvContent += "\n\n"
    }

    if (selectedSheets.products && calculations?.productBreakdown) {
      csvContent += "商品统计\n"
      csvContent += "商品名称,销量,总收入,总成本,总利润\n"
      calculations.productBreakdown.forEach((p) => {
        csvContent += `"${p.name}",${p.count},${p.revenue.toFixed(2)},${p.cost.toFixed(2)},${p.profit.toFixed(2)}\n`
      })
    }

    const link = document.createElement("a")
    link.setAttribute("href", encodeURI(csvContent))
    link.setAttribute("download", `销售报告_${new Date().toISOString().split("T")[0]}.csv`)
    link.click()
    setExported(true)
  }

  const exportAsJSON = () => {
    const summary = generateSummaryData()
    const exportData = {
      report: summary,
      orders: data.map((d) => ({
        订单号: d["订单号"],
        商品名称: d["商品名称"],
        销售额: d.sellingPrice,
        成本: d.cost,
        利润: d.profit,
        利润率: d.profitMargin,
        匹配状态: d.matchStatus,
        匹配方式: d.matchMethod,
      })),
      products: calculations?.productBreakdown || [],
      metrics: calculations?.metrics || {},
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const link = document.createElement("a")
    link.setAttribute("href", `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`)
    link.setAttribute("download", `销售报告_${new Date().toISOString().split("T")[0]}.json`)
    link.click()
    setExported(true)
  }

  const exportAsExcel = () => {
    // For browser environment, we'll create a simple CSV that can be imported to Excel
    // If xlsx library is available, this would be more sophisticated
    exportAsCSV()
  }

  const handleExport = () => {
    if (exportFormat === "excel") {
      exportAsExcel()
    } else if (exportFormat === "csv") {
      exportAsCSV()
    } else if (exportFormat === "json") {
      exportAsJSON()
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {!exported ? (
        <div className="space-y-6">
          {/* Export Format Selection */}
          <Card className="p-6 bg-card border border-border">
            <h2 className="text-xl font-bold text-foreground mb-4">选择导出格式</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { value: "excel", label: "Excel 格式", desc: "标准电子表格格式" },
                { value: "csv", label: "CSV 格式", desc: "通用数据交换格式" },
                { value: "json", label: "JSON 格式", desc: "数据集成专用格式" },
              ].map((format) => (
                <button
                  key={format.value}
                  onClick={() => setExportFormat(format.value as any)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    exportFormat === format.value
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/30 hover:border-primary/50"
                  }`}
                >
                  <div className="font-semibold text-foreground">{format.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{format.desc}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Sheet Selection */}
          <Card className="p-6 bg-card border border-border">
            <h3 className="font-semibold text-foreground mb-4">选择导出内容</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSheets.summary}
                  onChange={(e) => setSelectedSheets({ ...selectedSheets, summary: e.target.checked })}
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-foreground">
                  <div className="font-medium">财务总览</div>
                  <div className="text-xs text-muted-foreground">包含总销售额、成本、利润等关键指标</div>
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSheets.details}
                  onChange={(e) => setSelectedSheets({ ...selectedSheets, details: e.target.checked })}
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-foreground">
                  <div className="font-medium">订单详情</div>
                  <div className="text-xs text-muted-foreground">{data.length} 条完整订单数据和财务计算</div>
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSheets.products}
                  onChange={(e) => setSelectedSheets({ ...selectedSheets, products: e.target.checked })}
                  className="w-4 h-4 rounded border-border"
                  disabled={!calculations?.productBreakdown?.length}
                />
                <span className={`text-foreground ${!calculations?.productBreakdown?.length ? "opacity-50" : ""}`}>
                  <div className="font-medium">商品统计</div>
                  <div className="text-xs text-muted-foreground">按商品分类的销量和收入分析</div>
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSheets.risks}
                  onChange={(e) => setSelectedSheets({ ...selectedSheets, risks: e.target.checked })}
                  className="w-4 h-4 rounded border-border"
                  disabled={!calculations?.profitAnalysis}
                />
                <span className={`text-foreground ${!calculations?.profitAnalysis ? "opacity-50" : ""}`}>
                  <div className="font-medium">风险分析</div>
                  <div className="text-xs text-muted-foreground">低利润和亏损订单的详细分析</div>
                </span>
              </label>
            </div>
          </Card>

          {/* Report Preview */}
          <Card className="p-6 bg-card border border-border">
            <h3 className="font-semibold text-foreground mb-4">报告预览</h3>
            <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">订单总数:</span>
                <span className="font-semibold text-foreground">{data.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">已匹配:</span>
                <span className="font-semibold text-accent">
                  {data.filter((d) => d.matchStatus === "matched").length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">总销售额:</span>
                <span className="font-semibold text-foreground">
                  ¥{data.reduce((sum, d) => sum + (d.sellingPrice || 0), 0).toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">总利润:</span>
                <span className="font-semibold text-accent">
                  ¥{data.reduce((sum, d) => sum + (d.profit || 0), 0).toFixed(0)}
                </span>
              </div>
            </div>
          </Card>

          {/* Export Button */}
          <div className="flex gap-4">
            <Button
              onClick={handleExport}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Download className="w-4 h-4" />
              导出报告
            </Button>
          </div>
        </div>
      ) : (
        <Card className="p-8 text-center bg-card border border-border">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">导出成功！</h2>
          <p className="text-muted-foreground mb-6">
            报告已保存到您的下载文件夹，文件名为: 销售报告_{new Date().toISOString().split("T")[0]}.{exportFormat}
          </p>
          <Button onClick={() => setExported(false)} variant="outline" className="gap-2">
            继续导出其他格式
          </Button>
        </Card>
      )}
    </div>
  )
}

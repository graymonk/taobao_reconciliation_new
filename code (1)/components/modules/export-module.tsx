"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Download, CheckCircle2 } from "lucide-react"
import * as XLSX from "xlsx"

interface ExportModuleProps {
  orders: any[]
  onBack: () => void
  onReset: () => void
}

export function ExportModule({ orders, onBack, onReset }: ExportModuleProps) {
  const [exported, setExported] = useState(false)

  const handleExport = () => {
    // Summary sheet
    const totalRevenue = orders.reduce((sum, o) => sum + o["金额"], 0)
    const totalCost = orders.reduce((sum, o) => sum + o.总成本, 0)
    const totalProfit = totalRevenue - totalCost
    const profitMargin = ((totalProfit / totalRevenue) * 100).toFixed(2)

    const summaryData = [
      ["销售报告总览"],
      [],
      ["指标", "数值"],
      ["订单数量", orders.length],
      ["总销售额", totalRevenue],
      ["总成本", totalCost],
      ["总利润", totalProfit],
      ["利润率", `${profitMargin}%`],
      ["平均订单价值", (totalRevenue / orders.length).toFixed(2)],
    ]

    // Detailed sheet
    const detailedData = [
      [
        "订单号",
        "商品编码",
        "商品名称",
        "数量",
        "单价",
        "销售额",
        "成本单价",
        "总成本",
        "利润",
        "利润率",
        "退款",
        "备注",
      ],
      ...orders.map((o) => [
        o["订单号"],
        o["商品编码"],
        o["商品名称"],
        o["数量"],
        o["单价"],
        o["金额"],
        o.成本单价 || 0,
        o.总成本 || 0,
        o.利润 || 0,
        o.利润率 || "0%",
        o["退款"],
        o["备注"],
      ]),
    ]

    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
    const ws2 = XLSX.utils.aoa_to_sheet(detailedData)

    XLSX.utils.book_append_sheet(wb, ws1, "总览")
    XLSX.utils.book_append_sheet(wb, ws2, "明细")

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0]
    XLSX.writeFile(wb, `销售报告_${timestamp}.xlsx`)

    setExported(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <Card className="p-8 text-center">
          {!exported ? (
            <>
              <Download className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">导出报告</h1>
              <p className="text-gray-600 mb-6">生成包含总览和详细数据的Excel报告</p>

              <div className="bg-blue-50 p-4 rounded-lg mb-6 text-left">
                <p className="text-sm font-semibold text-gray-900 mb-3">报告包含:</p>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>✓ 财务总览（收入、成本、利润）</li>
                  <li>✓ {orders.length} 条订单详细数据</li>
                  <li>✓ 成本匹配结果</li>
                  <li>✓ 利润率分析</li>
                </ul>
              </div>

              <Button
                onClick={handleExport}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg mb-3"
              >
                导出为Excel
              </Button>
              <Button onClick={onBack} variant="outline" className="w-full h-12 text-gray-700 bg-transparent">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回报告
              </Button>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">导出成功！</h1>
              <p className="text-gray-600 mb-6">报告已保存到您的下载文件夹</p>

              <Button
                onClick={onReset}
                className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg"
              >
                新建分析
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

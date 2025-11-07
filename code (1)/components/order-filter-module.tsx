"use client"

import { useState, useMemo } from "react"
import { Filter, Trash2, ChevronDown, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"

interface OrderFilterModuleProps {
  orders: any[]
  onFilter: (filtered: any[]) => void
}

export default function OrderFilterModule({ orders, onFilter }: OrderFilterModuleProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showComparison, setShowComparison] = useState(true) // 默认显示对比表格

  const [filterRules, setFilterRules] = useState({
    excludeByKeyword: "", // 额外关键词排除
    priceRange: [0, 1000000], // 价格范围
    dateRange: { start: "", end: "" }, // 日期范围
  })

  const priceStats = useMemo(() => {
    if (orders.length === 0) return { min: 0, max: 1000000 }
    const prices = orders.map((o) => {
      // 优先使用淘宝订单的"买家应付货款"字段
      const priceStr = String(
        o["买家应付货款"] || 
        o["成交价格"] || 
        o["实付金额"] || 
        o["订单金额"] || 
        o["总金额"] || 
        o["金额"] || 
        o["price"] || 
        0
      ).replace(/[¥$,，\s]/g, "").trim()
      
      const price = Number.parseFloat(priceStr)
      return isNaN(price) ? 0 : price
    }).filter((p) => p > 0)
    if (prices.length === 0) return { min: 0, max: 1000000 }
    return {
      min: Math.floor(Math.min(...prices, 0)),
      max: Math.ceil(Math.max(...prices, 1000000)),
    }
  }, [orders])

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>()
    orders.forEach((order) => {
      const status = (order["订单状态"] || order["status"] || "").trim()
      if (status) statuses.add(status)
    })
    const statusArray = Array.from(statuses)
    console.log("[订单筛选] 发现的所有订单状态:", statusArray)
    return statusArray
  }, [orders])

  // 为每个订单标记筛选状态和原因
  const ordersWithStatus = useMemo(() => {
    return orders.map((order) => {
      let isFiltered = true
      let filterReason = ""
      let filterCategory = ""

      // ========== FR-2.2 保留规则 ==========
      const orderStatus = (order["订单状态"] || order["status"] || "").trim()
      if (orderStatus !== "交易成功") {
        isFiltered = false
        filterReason = `订单状态为"${orderStatus}"，不是"交易成功"`
        filterCategory = "status"
      }

      // ========== FR-2.3 剔除规则 ==========
      if (isFiltered) {
        const refundStatus = (order["退款状态"] || order["refund_status"] || "").trim()
        if (refundStatus === "退款成功") {
          isFiltered = false
          filterReason = '退款状态为"退款成功"'
          filterCategory = "refund"
        }
      }

      if (isFiltered) {
        const contactRemarks = order["联系方式备注"] || order["contact_remarks"] || ""
        if (contactRemarks.includes("(收)")) {
          isFiltered = false
          filterReason = '联系方式备注包含"(收)"'
          filterCategory = "remarks"
        }
      }

      // ========== 额外筛选规则 ==========
      if (isFiltered) {
        // 优先使用淘宝订单的"买家应付货款"字段
        const priceStr = String(
          order["买家应付货款"] || 
          order["成交价格"] || 
          order["实付金额"] || 
          order["订单金额"] || 
          order["总金额"] || 
          order["金额"] || 
          order["price"] || 
          0
        ).replace(/[¥$,，\s]/g, "").trim()
        
        const price = Number.parseFloat(priceStr)
        if (!isNaN(price) && (price < filterRules.priceRange[0] || price > filterRules.priceRange[1])) {
          isFiltered = false
          filterReason = `价格¥${price}不在范围内`
          filterCategory = "price"
        }
      }

      if (isFiltered) {
      if (filterRules.dateRange.start || filterRules.dateRange.end) {
        const orderDate = order["创建时间"] || order["date"] || ""
        if (filterRules.dateRange.start && orderDate < filterRules.dateRange.start) {
            isFiltered = false
            filterReason = "日期早于开始日期"
            filterCategory = "date"
          } else if (filterRules.dateRange.end && orderDate > filterRules.dateRange.end) {
            isFiltered = false
            filterReason = "日期晚于结束日期"
            filterCategory = "date"
          }
        }
      }

      if (isFiltered) {
        if (filterRules.excludeByKeyword) {
          const remarks = (order["备注"] || order["remarks"] || "").toLowerCase()
          const keywords = filterRules.excludeByKeyword.toLowerCase().split(",")
          const matchedKeyword = keywords.find((kw) => remarks.includes(kw.trim()))
          if (matchedKeyword) {
            isFiltered = false
            filterReason = `备注包含关键词"${matchedKeyword.trim()}"`
            filterCategory = "keyword"
          }
        }
      }

      return {
        ...order,
        _isFiltered: isFiltered,
        _filterReason: filterReason,
        _filterCategory: filterCategory,
      }
    })
  }, [orders, filterRules])

  const filteredOrders = useMemo(() => {
    return ordersWithStatus.filter((order) => order._isFiltered)
  }, [ordersWithStatus])

  const stats = useMemo(() => {
    // 计算所有原始订单的总金额 - 优先使用"买家应付货款"
    const allPrices = orders.map((o) => {
      // 优先使用淘宝订单的"买家应付货款"字段
      const priceStr = String(
        o["买家应付货款"] || 
        o["成交价格"] || 
        o["实付金额"] || 
        o["订单金额"] || 
        o["总金额"] || 
        o["金额"] || 
        o["price"] || 
        o["amount"] || 
        0
      ).replace(/[¥$,，\s]/g, "").trim() // 移除货币符号、逗号和空格
      
      const price = Number.parseFloat(priceStr)
      return isNaN(price) ? 0 : price
    })
    const allTotalAmount = allPrices.reduce((a, b) => a + b, 0)
    
    // 计算有效订单的总金额
    const validPrices = filteredOrders.map((o) => {
      // 优先使用淘宝订单的"买家应付货款"字段
      const priceStr = String(
        o["买家应付货款"] || 
        o["成交价格"] || 
        o["实付金额"] || 
        o["订单金额"] || 
        o["总金额"] || 
        o["金额"] || 
        o["price"] || 
        o["amount"] || 
        0
      ).replace(/[¥$,，\s]/g, "").trim() // 移除货币符号、逗号和空格
      
      const price = Number.parseFloat(priceStr)
      return isNaN(price) ? 0 : price
    })
    const validTotalAmount = validPrices.reduce((a, b) => a + b, 0)
    
    // 统计剔除原因
    const excludedOrders = ordersWithStatus.filter((o) => !o._isFiltered)
    const reasonStats = {
      status: excludedOrders.filter((o) => o._filterCategory === "status").length,
      refund: excludedOrders.filter((o) => o._filterCategory === "refund").length,
      remarks: excludedOrders.filter((o) => o._filterCategory === "remarks").length,
      price: excludedOrders.filter((o) => o._filterCategory === "price").length,
      date: excludedOrders.filter((o) => o._filterCategory === "date").length,
      keyword: excludedOrders.filter((o) => o._filterCategory === "keyword").length,
    }
    
    // 调试日志：筛选统计
    console.log(`[订单筛选] 原始订单: ${orders.length}, 有效订单: ${filteredOrders.length}, 剔除: ${excludedOrders.length}`)
    console.log(`[订单筛选] 原始总金额: ¥${allTotalAmount.toFixed(2)}, 有效总金额: ¥${validTotalAmount.toFixed(2)}`)
    console.log(`[订单筛选] 剔除原因分析:`, reasonStats)
    
    // 检查是否使用了"买家应付货款"字段
    if (orders.length > 0) {
      const hasField = orders[0].hasOwnProperty("买家应付货款")
      if (hasField) {
        console.log(`[订单筛选] ✅ 使用"买家应付货款"字段计算金额`)
        console.log(`[订单筛选] 示例值: ${orders[0]["买家应付货款"]}`)
      } else {
        console.warn(`[订单筛选] ⚠️ 未找到"买家应付货款"字段，使用备用字段`)
      }
    }
    
    // 如果金额为0，打印第一条订单的字段名，帮助调试
    if (allTotalAmount === 0 && orders.length > 0) {
      console.warn(`[订单筛选] ⚠️ 总金额为0！可能原因：`)
      console.warn(`[订单筛选] 1. 缺少"买家应付货款"字段`)
      console.warn(`[订单筛选] 2. 价格字段值为空或格式不正确`)
      console.warn(`[订单筛选] 第一条订单的所有字段:`, Object.keys(orders[0]))
      
      // 查找可能的价格字段
      const possiblePriceFields = Object.keys(orders[0]).filter(key => 
        key.includes("买家") || key.includes("货款") || 
        key.includes("价格") || key.includes("金额") || key.includes("价") || 
        key.toLowerCase().includes("price") || key.toLowerCase().includes("amount") ||
        key.toLowerCase().includes("total") || key.toLowerCase().includes("pay")
      )
      console.warn(`[订单筛选] 发现可能的价格字段:`, possiblePriceFields)
      if (possiblePriceFields.length > 0) {
        possiblePriceFields.forEach(field => {
          console.warn(`[订单筛选]   - ${field}: ${orders[0][field]}`)
        })
      }
    }
    
    return {
      total: orders.length,
      filtered: filteredOrders.length,
      excluded: excludedOrders.length,
      allTotalAmount: allTotalAmount.toFixed(2),
      validTotalAmount: validTotalAmount.toFixed(2),
      avgPrice: filteredOrders.length > 0 ? (validTotalAmount / filteredOrders.length).toFixed(2) : "0.00",
      reasonStats,
    }
  }, [orders, filteredOrders, ordersWithStatus])

  const handleApplyFilters = () => {
    // 移除 localStorage 存储，避免大数据导致配额超限
    // 数据已通过 React 状态和 props 传递，无需持久化
    onFilter(filteredOrders)
  }

  const handleResetFilters = () => {
    setFilterRules({
      excludeByKeyword: "",
      priceRange: [0, priceStats.max],
      dateRange: { start: "", end: "" },
    })
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card className="p-8 bg-card border border-border mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">订单筛选引擎</h2>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
            <Filter className="w-4 h-4" />
            筛选规则
          </Button>
        </div>

        {showFilters && (
          <div className="bg-muted/20 rounded-lg p-6 mb-6 space-y-6">
            {/* 核心规则说明 */}
            <div className="bg-green-50 border border-green-300 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                自动应用的筛选规则（FR-2.2 & FR-2.3）
              </h4>
              <div className="text-sm text-green-800 space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="font-semibold min-w-[80px]">✓ 保留规则:</span>
                  <span>[订单状态] = "交易成功"</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold min-w-[80px]">✗ 剔除规则:</span>
                  <div>
                    <div>① [退款状态] = "退款成功"</div>
                    <div>② [联系方式备注] 包含 "(收)"</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 额外筛选（可选） */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">额外筛选（可选）</h3>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">按备注关键词排除（逗号分隔）</label>
                <input
                  type="text"
                  value={filterRules.excludeByKeyword}
                  onChange={(e) => setFilterRules({ ...filterRules, excludeByKeyword: e.target.value })}
                  placeholder="如: 测试,样品,不计费"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground text-sm"
                />
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="border-t border-border pt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                高级筛选选项
              </button>

              {showAdvanced && (
                <div className="space-y-4 mt-4">
                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">
                      价格范围: ¥{filterRules.priceRange[0]} - ¥{filterRules.priceRange[1]}
                    </label>
                    <Slider
                      min={priceStats.min}
                      max={priceStats.max}
                      step={10}
                      value={filterRules.priceRange}
                      onValueChange={(value) =>
                        setFilterRules({ ...filterRules, priceRange: value as [number, number] })
                      }
                    />
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">开始日期</label>
                      <input
                        type="date"
                        value={filterRules.dateRange.start}
                        onChange={(e) =>
                          setFilterRules({
                            ...filterRules,
                            dateRange: { ...filterRules.dateRange, start: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">结束日期</label>
                      <input
                        type="date"
                        value={filterRules.dateRange.end}
                        onChange={(e) =>
                          setFilterRules({
                            ...filterRules,
                            dateRange: { ...filterRules.dateRange, end: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                      />
                    </div>
                  </div>

                  {/* Debug Info */}
                  {uniqueStatuses.length > 0 && (
                    <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        调试信息：您的订单中发现的所有状态
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {uniqueStatuses.map((status) => (
                          <span key={status} className="px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700">
                            {status}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reset Button */}
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleResetFilters} className="gap-2 bg-transparent">
                <Trash2 className="w-4 h-4" />
                重置筛选
              </Button>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-muted/20 rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-1">原始订单</div>
            <div className="text-2xl font-bold text-foreground">{stats.total} 条</div>
            <div className="text-sm text-muted-foreground mt-1">总金额：¥{stats.allTotalAmount}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-xs text-green-600 mb-1">✓ 有效订单</div>
            <div className="text-2xl font-bold text-green-700">{stats.filtered} 条</div>
            <div className="text-sm text-green-600 mt-1 font-semibold">总金额：¥{stats.validTotalAmount}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-xs text-red-600 mb-1">✗ 已排除</div>
            <div className="text-2xl font-bold text-red-700">{stats.excluded} 条</div>
            <div className="text-sm text-red-600 mt-1">
              损失：¥{(parseFloat(stats.allTotalAmount) - parseFloat(stats.validTotalAmount)).toFixed(2)}
            </div>
          </div>
        </div>

        {/* 金额为0的警告 */}
        {parseFloat(stats.allTotalAmount) === 0 && stats.total > 0 && (
          <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-800">
              <strong>⚠️ 总金额显示为 ¥0.00</strong>
              <br />
              系统优先使用 <strong>"买家应付货款"</strong> 字段计算总金额。如果显示为0，可能原因：
              <br />
              1. Excel表格中缺少"买家应付货款"列
              <br />
              2. "买家应付货款"列的值为空或格式不正确
              <br />
              <br />
              <strong>💡 请按 F12 打开浏览器控制台</strong>，查看详细的调试信息，包括所有可用的字段名。
            </div>
          </div>
        )}

        {/* 警告：如果有效订单为0 */}
        {stats.filtered === 0 && stats.total > 0 && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <strong>没有筛选到任何有效订单！</strong>
              <br />
              <strong>可能原因：</strong>
              <br />
              1. 您的Excel中 [订单状态] 列没有值为 "交易成功" 的订单
              <br />
              2. 或者所有"交易成功"订单都被以下规则剔除了：
              <ul className="list-disc ml-5 mt-1">
                <li>[退款状态] = "退款成功"</li>
                <li>[联系方式备注] 包含 "(收)"</li>
              </ul>
              <br />
              <strong>排查方法：</strong>
              <br />
              • 点击上方"筛选规则" → "高级筛选选项"，查看"调试信息"，确认您的订单状态字段值
              <br />
              • 检查Excel表格，确认列名是否正确：[订单状态]、[退款状态]、[联系方式备注]
            </div>
          </div>
        )}

        {/* 提示信息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>请仔细检查上方的筛选结果：</strong>
            <br />
            • 绿色背景的订单将被保留（{stats.filtered} 条）
            <br />
            • 红色背景的订单将被剔除（{stats.excluded} 条）
            <br />
            确认无误后，点击下方"确认并继续"按钮进入成本匹配环节
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={handleApplyFilters}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-base py-6"
            disabled={stats.filtered === 0}
          >
            ✓ 确认筛选结果，继续匹配成本 ({stats.filtered} 条有效订单)
          </Button>
        </div>
      </Card>

      {/* 剔除原因统计 */}
      {stats.excluded > 0 && (
        <Card className="p-6 bg-card border border-border mb-6">
          <h3 className="font-semibold text-foreground mb-4">筛选原因统计</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {stats.reasonStats.status > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-xs text-red-600 mb-1">非"交易成功"状态</div>
                <div className="text-xl font-bold text-red-700">{stats.reasonStats.status} 条</div>
              </div>
            )}
            {stats.reasonStats.refund > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="text-xs text-orange-600 mb-1">退款成功</div>
                <div className="text-xl font-bold text-orange-700">{stats.reasonStats.refund} 条</div>
              </div>
            )}
            {stats.reasonStats.remarks > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="text-xs text-yellow-600 mb-1">备注含"(收)"</div>
                <div className="text-xl font-bold text-yellow-700">{stats.reasonStats.remarks} 条</div>
              </div>
            )}
            {stats.reasonStats.price > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="text-xs text-purple-600 mb-1">价格超出范围</div>
                <div className="text-xl font-bold text-purple-700">{stats.reasonStats.price} 条</div>
              </div>
            )}
            {stats.reasonStats.date > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs text-blue-600 mb-1">日期超出范围</div>
                <div className="text-xl font-bold text-blue-700">{stats.reasonStats.date} 条</div>
              </div>
            )}
            {stats.reasonStats.keyword > 0 && (
              <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                <div className="text-xs text-pink-600 mb-1">关键词匹配</div>
                <div className="text-xl font-bold text-pink-700">{stats.reasonStats.keyword} 条</div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Comparison Table - 显示所有原始列 */}
      <Card className="p-6 bg-card border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">订单筛选对比表（原始完整数据）</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowComparison(!showComparison)}
            className="gap-2"
          >
            {showComparison ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showComparison ? "隐藏" : "显示"}被剔除订单
          </Button>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] border border-border rounded-lg">
          <table className="w-full text-xs border-collapse">
            <thead className="border-b-2 border-border sticky top-0 bg-card shadow-sm z-20">
              <tr>
                <th className="text-left py-3 px-2 font-semibold text-muted-foreground bg-card sticky left-0 z-30 border-r border-border shadow-sm">
                  状态
                </th>
                {orders.length > 0 &&
                  Object.keys(orders[0])
                    .filter((key) => !key.startsWith("_")) // 过滤内部字段
                    .map((column, idx) => (
                      <th
                        key={idx}
                        className="text-left py-3 px-2 font-semibold text-muted-foreground whitespace-nowrap bg-card"
                      >
                        {column}
                      </th>
                    ))}
                <th className="text-left py-3 px-2 font-semibold text-muted-foreground bg-card sticky right-0 z-30 border-l border-border shadow-sm">
                  筛选结果
                </th>
              </tr>
            </thead>
            <tbody>
              {ordersWithStatus
                .filter((order) => showComparison || order._isFiltered)
                .map((order, idx) => {
                  const columns = Object.keys(orders[0] || {}).filter((key) => !key.startsWith("_"))
                  return (
                    <tr
                      key={idx}
                      className={`border-b border-border transition-colors ${
                        order._isFiltered
                          ? "bg-green-50/30 hover:bg-green-100/50"
                          : "bg-red-50/30 hover:bg-red-100/50"
                      }`}
                    >
                      <td className="py-2 px-2 sticky left-0 bg-inherit z-10 border-r border-border">
                        {order._isFiltered ? (
                          <CheckCircle className="w-4 h-4 text-green-600" title="保留" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" title="剔除" />
                        )}
                      </td>
                      {columns.map((column, colIdx) => {
                        const value = order[column]
                        const displayValue =
                          value !== null && value !== undefined && value !== ""
                            ? String(value).length > 100
                              ? String(value).substring(0, 100) + "..."
                              : String(value)
                            : "-"
                        return (
                          <td
                            key={colIdx}
                            className={`py-2 px-2 whitespace-nowrap ${
                              order._isFiltered ? "text-foreground" : "text-red-700 line-through"
                            }`}
                            title={String(value || "")}
                          >
                            {displayValue}
                          </td>
                        )
                      })}
                      <td className="py-2 px-2 sticky right-0 bg-inherit z-10 border-l border-border whitespace-nowrap">
                        {order._isFiltered ? (
                          <span className="text-green-600 font-semibold text-xs">✓ 保留</span>
                        ) : (
                          <span className="text-red-600 font-semibold text-xs">{order._filterReason}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
        
        {/* 数据统计信息 */}
        <div className="mt-3 text-center py-2 text-xs text-muted-foreground bg-muted/20 rounded-lg">
          {showComparison ? (
            <>
              显示全部 {ordersWithStatus.length} 条订单
              （<span className="text-green-600 font-semibold">{stats.filtered} 条保留</span> + 
              <span className="text-red-600 font-semibold">{stats.excluded} 条剔除</span>）
            </>
          ) : (
            <>
              仅显示 {stats.filtered} 条保留的订单
              （已隐藏 {stats.excluded} 条被剔除的订单，点击上方按钮查看）
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

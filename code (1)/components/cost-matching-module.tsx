"use client"

import { useState, useMemo } from "react"
import { CheckCircle, AlertCircle, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"

interface CostMatchingModuleProps {
  orders: any[]
  products: any[]
  onMatch: (matched: any[]) => void
}

export default function CostMatchingModule({ orders, products, onMatch }: CostMatchingModuleProps) {
  const [matchStrategy, setMatchStrategy] = useState<"code" | "name" | "hybrid">("code")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [fuzzyThreshold, setFuzzyThreshold] = useState(80)
  const [showUnmatched, setShowUnmatched] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const matchedData = useMemo(() => {
    // FR-3.2: 使用商品资料中的 [商品编码] 建立Map
    const productMap = new Map(
      products.map((p) => [
        p["商品编码"] || p["编码"] || p["code"] || "", 
        p
      ])
    )
    
    // 备用：名称匹配（保留用于调试和补充）
    const productNameMap = new Map(
      products.map((p) => [
        p["商品名称"]?.toLowerCase() || p["product_name"]?.toLowerCase() || "", 
        p
      ]),
    )

    console.log(`[成本匹配] FR-3规则执行：使用 [外部系统编号] 匹配 [商品编码]`)
    console.log(`[成本匹配] 订单数量: ${orders.length}, 商品库数量: ${products.length}`)
    
    // 检查字段是否存在
    if (orders.length > 0) {
      const hasExternalCode = orders[0].hasOwnProperty("外部系统编号")
      console.log(`[成本匹配] 订单表${hasExternalCode ? "✅" : "⚠️"} ${hasExternalCode ? "包含" : "缺少"} [外部系统编号] 字段`)
      if (!hasExternalCode && orders[0]) {
        console.log(`[成本匹配] 订单表所有字段:`, Object.keys(orders[0]))
      }
    }
    
    if (products.length > 0) {
      const hasProductCode = products[0].hasOwnProperty("商品编码")
      console.log(`[成本匹配] 商品库${hasProductCode ? "✅" : "⚠️"} ${hasProductCode ? "包含" : "缺少"} [商品编码] 字段`)
      if (!hasProductCode && products[0]) {
        console.log(`[成本匹配] 商品库所有字段:`, Object.keys(products[0]))
      }
    }

    return orders.map((order) => {
      let costInfo = null
      let matchStatus = "unmatched"
      let matchMethod = "none"

      // FR-3.2: 使用淘宝订单表中的 [外部系统编号]
      const externalCode = (order["外部系统编号"] || order["商品编码"] || order["product_code"] || "").toString().trim()
      const productName = (order["商品名称"] || order["product_name"] || "").toLowerCase()

      // Strategy 1: FR-3.2 标准匹配 - 使用外部系统编号匹配商品编码
      if (matchStrategy === "code" || matchStrategy === "hybrid") {
        if (externalCode) {
          costInfo = productMap.get(externalCode)
          if (costInfo) {
            matchStatus = "matched"
            matchMethod = "code"
          }
        }
      }

      // Strategy 2: Name matching (exact or fuzzy) - 作为备用
      if (!costInfo && (matchStrategy === "name" || matchStrategy === "hybrid")) {
        if (productName) {
          // Try exact match first
          costInfo = productNameMap.get(productName)
          if (costInfo) {
            matchStatus = "matched"
            matchMethod = "name_exact"
          } else if (matchStrategy === "name") {
            // 仅在明确选择"名称匹配"时才进行模糊匹配（性能考虑）
            // 限制遍历次数，避免大数据量时卡顿
            let checkedCount = 0
            const maxCheckCount = 1000 // 最多检查1000个商品
            
            for (const [key, product] of productNameMap.entries()) {
              if (checkedCount++ >= maxCheckCount) break
              
              if (calculateSimilarity(productName, key) >= fuzzyThreshold / 100) {
                costInfo = product
                matchStatus = "matched"
                matchMethod = "name_fuzzy"
                break
              }
            }
          }
        }
      }

      // FR-4.1: 获取售价（商家实收金额）
      const sellingPriceStr = String(
        order["商家实收金额"] || 
        order["买家应付货款"] || 
        order["成交价格"] || 
        order["实付金额"] || 
        order["price"] || 
        0
      ).replace(/[¥$,，\s]/g, "").trim()
      const sellingPrice = Number.parseFloat(sellingPriceStr)
      
      // FR-4.1: 获取买家购买数量
      const quantityStr = String(
        order["买家购买数量"] || 
        order["数量"] || 
        order["quantity"] || 
        1
      ).replace(/[,，\s]/g, "").trim()
      const quantity = Number.parseFloat(quantityStr) || 1
      
      // FR-3.3 & FR-4.1: 从商品资料获取 [成本价]，未匹配则为0
      const unitCost = costInfo ? Number.parseFloat(costInfo["成本价"] || costInfo["成本"] || costInfo["cost"] || 0) : 0
      
      // FR-4.1: [总成本] = [成本价] × [买家购买数量]
      const totalCost = unitCost * quantity
      
      // FR-4.1: [单品利润] = [商家实收金额] - [总成本]
      const profit = sellingPrice - totalCost
      const profitMargin = sellingPrice > 0 ? ((profit / sellingPrice) * 100).toFixed(2) : "0"

      return {
        ...order,
        costInfo,
        matchStatus,
        matchMethod,
        // FR-4.1 财务核算字段
        sellingPrice: isNaN(sellingPrice) ? 0 : sellingPrice, // [商家实收金额]
        quantity: isNaN(quantity) ? 1 : quantity, // [买家购买数量]
        unitCost: isNaN(unitCost) ? 0 : unitCost, // [成本价]
        totalCost: isNaN(totalCost) ? 0 : totalCost, // [总成本] = [成本价] × [买家购买数量]
        cost: isNaN(totalCost) ? 0 : totalCost, // 保持兼容性
        profit: isNaN(profit) ? 0 : profit, // [单品利润] = [商家实收金额] - [总成本]
        profitMargin,
        externalCode, // 记录使用的外部系统编号
        costData: costInfo
          ? {
              productCode: costInfo["商品编码"] || costInfo["编码"] || costInfo["code"] || "",
              productName: costInfo["商品名称"] || costInfo["product_name"] || "",
              unitCost: unitCost,
              costPrice: unitCost,
              supplier: costInfo["供应商"] || costInfo["supplier"] || "N/A",
            }
          : null,
      }
    })
  }, [orders, products, matchStrategy, fuzzyThreshold])

  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    if (longer.length === 0) return 100.0
    const editDistance = getEditDistance(longer, shorter)
    return ((longer.length - editDistance) / longer.length) * 100
  }

  const getEditDistance = (s1: string, s2: string): number => {
    const costs = []
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j
        } else if (j > 0) {
          let newValue = costs[j - 1]
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
          }
          costs[j - 1] = lastValue
          lastValue = newValue
        }
      }
      if (i > 0) costs[s2.length] = lastValue
    }
    return costs[s2.length]
  }

  const stats = useMemo(() => {
    const matched = matchedData.filter((d) => d.matchStatus === "matched").length
    const unmatched = matchedData.length - matched
    const totalRevenue = matchedData.reduce((sum, d) => sum + d.sellingPrice, 0)
    const totalCost = matchedData.reduce((sum, d) => sum + d.cost, 0)
    const totalProfit = totalRevenue - totalCost
    const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : "0"

    const matchedByMethod = {
      code: matchedData.filter((d) => d.matchMethod === "code").length,
      name_exact: matchedData.filter((d) => d.matchMethod === "name_exact").length,
      name_fuzzy: matchedData.filter((d) => d.matchMethod === "name_fuzzy").length,
    }

    return {
      matched,
      unmatched,
      matchRate: matchedData.length > 0 ? ((matched / matchedData.length) * 100).toFixed(1) : "0",
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      matchedByMethod,
    }
  }, [matchedData])

  const handleApplyMatching = async () => {
    console.log("[成本匹配] 开始处理匹配数据...")
    setIsProcessing(true)
    
    try {
      // 使用 setTimeout 让浏览器有机会更新 UI（显示加载状态）
      await new Promise(resolve => setTimeout(resolve, 100))
      
      console.log(`[成本匹配] 准备传递 ${matchedData.length} 条匹配数据到报告模块`)
      
      // 批量处理大数据，避免阻塞 UI
      const batchSize = 500
      const totalBatches = Math.ceil(matchedData.length / batchSize)
      
      for (let i = 0; i < totalBatches; i++) {
        // 每处理一批数据后，给浏览器一个喘息的机会
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 0))
        }
        console.log(`[成本匹配] 处理进度: ${i + 1}/${totalBatches}`)
      }
      
      console.log("[成本匹配] 数据处理完成，准备跳转...")
      
      // 数据已通过 React 状态和 props 传递，无需持久化
      onMatch(matchedData)
    } catch (error) {
      console.error("[成本匹配] 处理错误:", error)
      alert("数据处理失败，请重试")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Card className="p-8 bg-card border border-border mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">成本匹配系统（FR-3）</h2>
            <p className="text-sm text-muted-foreground mt-1">
              使用 <strong>[外部系统编号]</strong> 匹配 <strong>[商品编码]</strong>，获取 <strong>[成本价]</strong>
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowAdvanced(!showAdvanced)} className="gap-2">
            <Settings className="w-4 h-4" />
            高级选项
          </Button>
        </div>

        {/* FR-3 规则说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-blue-900 mb-2">FR-3 匹配规则</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <div>• <strong>订单字段：</strong>[外部系统编号]（淘宝订单表）</div>
            <div>• <strong>商品字段：</strong>[商品编码]（聚水潭商品资料）</div>
            <div>• <strong>成本字段：</strong>[成本价]</div>
            <div>• <strong>售价字段：</strong>[买家应付货款]</div>
            <div className="text-red-600 font-medium mt-2">• 未匹配到的订单，成本价自动设为 ¥0.00</div>
          </div>
        </div>

        {/* Strategy Selection */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {(["code", "name", "hybrid"] as const).map((strategy) => (
            <button
              key={strategy}
              onClick={() => setMatchStrategy(strategy)}
              className={`p-4 rounded-lg border transition-all ${
                matchStrategy === strategy
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted/30 hover:border-primary/50"
              }`}
            >
              <div className="font-semibold text-foreground">
                {strategy === "code" ? "编码匹配（推荐）" : strategy === "name" ? "名称匹配" : "混合匹配"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {strategy === "code"
                  ? "FR-3标准：外部系统编号→商品编码"
                  : strategy === "name"
                    ? "按商品名称匹配（备用）"
                    : "编码优先，名称补充"}
              </div>
            </button>
          ))}
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="bg-muted/20 rounded-lg p-4 mb-6 space-y-4 border border-border">
            <div>
              <label className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">名称匹配相似度: {fuzzyThreshold}%</span>
                {matchStrategy !== "code" && <span className="text-xs text-muted-foreground">用于模糊匹配</span>}
              </label>
              <Slider
                min={50}
                max={100}
                step={5}
                value={[fuzzyThreshold]}
                onValueChange={(value) => setFuzzyThreshold(value[0])}
                disabled={matchStrategy === "code"}
              />
            </div>
          </div>
        )}

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/20 rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-1">匹配率</div>
            <div className="text-3xl font-bold text-accent">{stats.matchRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.matched}/{matchedData.length}
            </div>
          </div>
          <div className="bg-muted/20 rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-1">总销售额</div>
            <div className="text-2xl font-bold text-foreground">¥{stats.totalRevenue.toFixed(0)}</div>
          </div>
          <div className="bg-muted/20 rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-1">总成本</div>
            <div className="text-2xl font-bold text-foreground">¥{stats.totalCost.toFixed(0)}</div>
          </div>
          <div className="bg-muted/20 rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-1">总利润</div>
            <div className="text-2xl font-bold text-accent">¥{stats.totalProfit.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground mt-1">{stats.profitMargin}% 利润率</div>
          </div>
        </div>

        {/* Matching Statistics by Method */}
        {matchStrategy === "hybrid" && (
          <div className="grid grid-cols-3 gap-2 mb-6 text-sm">
            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-2 rounded">
              编码匹配: {stats.matchedByMethod.code}
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 p-2 rounded">
              名称精确: {stats.matchedByMethod.name_exact}
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 p-2 rounded">
              名称模糊: {stats.matchedByMethod.name_fuzzy}
            </div>
          </div>
        )}

        <Button 
          onClick={handleApplyMatching} 
          disabled={isProcessing}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
              正在处理数据...
            </>
          ) : (
            `确认匹配 (${stats.matched} 条已匹配)`
          )}
        </Button>
      </Card>

      {/* Results Table */}
      <Card className="p-6 bg-card border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">成本匹配详情</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showUnmatched}
              onChange={(e) => setShowUnmatched(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm text-muted-foreground">显示未匹配</span>
          </label>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[60vh] border border-border rounded-lg">
          <table className="w-full text-xs">
            <thead className="border-b-2 border-border sticky top-0 bg-card shadow-sm z-10">
              <tr>
                <th className="text-left py-3 px-2 font-semibold text-muted-foreground bg-card whitespace-nowrap">订单号</th>
                <th className="text-left py-3 px-2 font-semibold text-muted-foreground bg-card whitespace-nowrap">外部系统编号</th>
                <th className="text-left py-3 px-2 font-semibold text-muted-foreground bg-card whitespace-nowrap">商品名称</th>
                <th className="text-right py-3 px-2 font-semibold text-muted-foreground bg-card whitespace-nowrap">数量</th>
                <th className="text-right py-3 px-2 font-semibold text-muted-foreground bg-card whitespace-nowrap">售价<br />（商家实收）</th>
                <th className="text-right py-3 px-2 font-semibold text-muted-foreground bg-card whitespace-nowrap">单位成本<br />（成本价）</th>
                <th className="text-right py-3 px-2 font-semibold text-muted-foreground bg-card whitespace-nowrap">总成本<br />（FR-4.1）</th>
                <th className="text-right py-3 px-2 font-semibold text-muted-foreground bg-card whitespace-nowrap">单品利润<br />（FR-4.1）</th>
                <th className="text-right py-3 px-2 font-semibold text-muted-foreground bg-card whitespace-nowrap">利润率</th>
                <th className="text-center py-3 px-2 font-semibold text-muted-foreground bg-card whitespace-nowrap">匹配状态</th>
              </tr>
            </thead>
            <tbody>
              {matchedData
                .filter((d) => showUnmatched || d.matchStatus === "matched")
                .map((item, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-border hover:bg-muted/30 transition-colors ${
                      item.matchStatus === "unmatched" ? "bg-red-50/50" : "bg-green-50/30"
                    }`}
                  >
                    <td className="py-2 px-2 text-foreground text-xs whitespace-nowrap">
                      {(item["订单号"] || "-").substring(0, 20)}
                    </td>
                    <td className="py-2 px-2 text-xs whitespace-nowrap">
                      <span className={item.matchStatus === "matched" ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                        {item.externalCode || "❌ 缺失"}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-foreground whitespace-nowrap" title={item["商品名称"] || "-"}>
                      {(item["商品名称"] || "-").substring(0, 30)}
                      {(item["商品名称"] || "").length > 30 && "..."}
                    </td>
                    <td className="py-2 px-2 text-right text-foreground font-semibold whitespace-nowrap">
                      {item.quantity}
                    </td>
                    <td className="py-2 px-2 text-right text-foreground font-semibold whitespace-nowrap">
                      ¥{item.sellingPrice.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right text-foreground whitespace-nowrap">
                      ¥{item.unitCost.toFixed(2)}
                    </td>
                    <td className={`py-2 px-2 text-right font-semibold whitespace-nowrap ${
                      item.totalCost === 0 ? "text-red-600" : "text-foreground"
                    }`}>
                      ¥{item.totalCost.toFixed(2)}
                      {item.totalCost === 0 && item.matchStatus === "unmatched" && (
                        <span className="ml-1 text-xs text-red-500">（未匹配）</span>
                      )}
                    </td>
                    <td className={`py-2 px-2 text-right font-semibold whitespace-nowrap ${
                      item.profit >= 0 ? "text-green-600" : "text-red-500"
                    }`}>
                      ¥{item.profit.toFixed(2)}
                    </td>
                    <td className={`py-2 px-2 text-right whitespace-nowrap ${
                      parseFloat(item.profitMargin) >= 0 ? "text-green-600" : "text-red-500"
                    }`}>
                      {item.profitMargin}%
                    </td>
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      {item.matchStatus === "matched" ? (
                        <div className="flex items-center justify-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-xs text-green-600 font-medium">已匹配</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span className="text-xs text-red-600 font-medium">未匹配</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        
        {/* 统计信息 */}
        <div className="mt-3 text-center py-2 text-xs text-muted-foreground bg-muted/20 rounded-lg">
          {showUnmatched ? (
            <>
              显示全部 {matchedData.length} 条订单
              （<span className="text-green-600 font-semibold">{stats.matched} 条已匹配</span> + 
              <span className="text-red-600 font-semibold">{stats.unmatched} 条未匹配</span>）
            </>
          ) : (
            <>
              仅显示 {stats.matched} 条已匹配订单
              （已隐藏 {stats.unmatched} 条未匹配订单，勾选上方"显示未匹配"查看）
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

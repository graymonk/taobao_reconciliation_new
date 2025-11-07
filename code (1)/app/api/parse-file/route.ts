import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import ExcelJS from "exceljs"
import { Readable } from "stream"

// Next.js 15 App Router 配置
export const runtime = "nodejs"
export const maxDuration = 300 // 5 分钟超时

// 简化的 CSV 解析函数
function parseCSV(text: string): any[] {
  const lines: string[] = []
  let currentLine = ""
  let inQuotes = false

  // 逐字符解析，正确处理引号内的逗号
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 双引号转义
        currentLine += '"'
        i++ // 跳过下一个引号
      } else {
        // 切换引号状态
        inQuotes = !inQuotes
        currentLine += char
      }
    } else if (char === "\n" && !inQuotes) {
      // 行结束
      if (currentLine.trim()) {
        lines.push(currentLine)
      }
      currentLine = ""
    } else {
      currentLine += char
    }
  }
  // 添加最后一行
  if (currentLine.trim()) {
    lines.push(currentLine)
  }

  if (lines.length < 1) return []

  // 解析第一行作为表头
  const parseCSVLine = (line: string): string[] => {
    const values: string[] = []
    let currentValue = ""
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === "," && !inQuotes) {
        values.push(currentValue.trim())
        currentValue = ""
      } else {
        currentValue += char
      }
    }
    values.push(currentValue.trim())
    return values
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.replace(/^"|"$/g, "").trim())

  // 解析数据行
  const data = lines
    .slice(1)
    .map((line) => {
      const values = parseCSVLine(line).map((v) => v.replace(/^"|"$/g, "").trim())
      const obj: any = {}
      headers.forEach((header, index) => {
        obj[header] = values[index] || ""
      })
      return obj
    })
    .filter((obj) => Object.values(obj).some((val) => val !== ""))

  return data
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "未找到文件" }, { status: 400 })
    }

    // 检查文件大小
    const MAX_CSV_SIZE = 50 * 1024 * 1024 // 50MB
    const MAX_EXCEL_SIZE = 50 * 1024 * 1024 // 50MB
    
    const fileName = file.name.toLowerCase()
    const isCSV = fileName.endsWith(".csv")
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls")
    
    if (!isCSV && !isExcel) {
      return NextResponse.json({ error: "不支持的文件格式，请上传 CSV 或 Excel 文件" }, { status: 400 })
    }
    
    const maxSize = isCSV ? MAX_CSV_SIZE : MAX_EXCEL_SIZE
    const fileType = isCSV ? "CSV" : "Excel"
    
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `文件过大 (${(file.size / 1024 / 1024).toFixed(2)}MB)，超过限制 (${maxSize / 1024 / 1024}MB)` },
        { status: 400 }
      )
    }

    let data: any[] = []

    try {
      if (isCSV) {
        const text = await file.text()
        data = parseCSV(text)
      } else if (isExcel) {
        // 使用 ExcelJS 流式读取（支持超大文件，逐行处理）
        console.log(`[Excel流式解析] 开始读取: ${file.name}`)
        
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        // 创建 ExcelJS 工作簿
        const workbook = new ExcelJS.Workbook()
        
        // 从 buffer 加载
        await workbook.xlsx.load(buffer)
        
        const worksheet = workbook.worksheets[0]
        if (!worksheet) {
          throw new Error("Excel文件中没有工作表")
        }
        
        console.log(`[Excel流式解析] 工作表: ${worksheet.name}, 行数: ${worksheet.rowCount}`)
        
        // 逐行读取，构建数据（内存友好）
        const rows: any[] = []
        let headers: string[] = []
        
        worksheet.eachRow((row, rowNumber) => {
          const values = row.values as any[]
          
          // 第一行作为表头
          if (rowNumber === 1) {
            headers = values.slice(1).map(v => String(v || "").trim())
          } else {
            // 数据行
            const rowData: any = {}
            const rowValues = values.slice(1)
            
            headers.forEach((header, index) => {
              let value = rowValues[index]
              
              // 处理不同类型的值
              if (value === null || value === undefined) {
                value = ""
              } else if (typeof value === "object" && value.text) {
                // 富文本对象
                value = value.text
              } else if (typeof value === "object" && value.formula) {
                // 公式，取结果值
                value = value.result || ""
              } else {
                value = String(value)
              }
              
              // 截断超长字段（防止内存溢出）
              if (value.length > 10000) {
                value = value.substring(0, 10000) + "...[已截断]"
              }
              
              rowData[header] = value
            })
            
            // 过滤空行
            if (Object.values(rowData).some(v => v !== "")) {
              rows.push(rowData)
            }
          }
        })
        
        data = rows
        console.log(`[Excel流式解析] 完成，共 ${data.length} 行`)
      }
    } catch (readError) {
      console.error("文件解析错误:", readError)
      const errorMsg = readError instanceof Error ? readError.message : "未知错误"
      
      if (errorMsg.includes("string longer") || errorMsg.includes("allocation") || errorMsg.includes("memory")) {
        return NextResponse.json(
          {
            error: `文件解析失败：内存不足。\n\n您的文件：${(file.size / 1024 / 1024).toFixed(2)}MB\n\n` +
              `可能原因：文件包含大量格式、图片或超长文本字段\n\n` +
              `建议：删除不必要的列（如图片URL、长描述），然后重新上传`
          },
          { status: 413 }
        )
      }
      
      return NextResponse.json({ error: `文件解析失败: ${errorMsg}` }, { status: 500 })
    }

    if (data.length === 0) {
      return NextResponse.json({ error: "文件为空或格式错误" }, { status: 400 })
    }

    // 简化：直接返回数据，让Next.js处理
    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      message: `成功解析 ${data.length} 条记录`,
    })
  } catch (error) {
    console.error("文件解析错误:", error)
    return NextResponse.json(
      {
        error: `文件解析失败: ${error instanceof Error ? error.message : "未知错误"}`,
      },
      { status: 500 }
    )
  }
}


/**
 * 模拟债务相关类型定义
 */

/** 模拟债务数据 */
export interface SimulatedDebt {
  id: string // 唯一ID（UUID）
  name: string // 债务名称
  principal: number // 本金（元）
  interest_start_date: string // 起息日 YYYY-MM-DD
  end_date: string // 到期日 YYYY-MM-DD

  // 利率信息（与债务表单一致）
  interest_type: 'fixed' | 'floating' // 利率类型: fixed固定利率/floating浮动利率
  interest_rate?: number // 固定利率（%）
  base_rate_id?: number // 浮动利率基准ID
  spread?: number // 点差(BP)
  adjust_cycle?: string // 调整周期（从字典获取）

  // 计息规则（与债务表单一致）
  interest_mode: 'simple' | 'compound' // 计息模式: simple单利/compound复利
  day_count_convention: 'ACT365' | 'ACT360' | 'MONTHLY' // 计息基数规则

  // 还款规则（还款方式从字典获取）
  repayment_method: string // 还款方式（从字典获取，如：equal_installment等额本息/equal_principal等额本金/interest_first先息后本）
  repayment_cycle: number // 还款周期（月）
  repayment_day: number // 还款日

  // 控制字段
  enabled: boolean // 是否启用
  created_at: string // 创建时间
  updated_at: string // 更新时间
}

/** 模拟债务表单数据 */
export interface SimulatedDebtFormData {
  name: string
  principal: number
  principal_unit: 'yuan' | 'wan' | 'yi'
  interest_start_date: string
  end_date: string
  interest_type: 'fixed' | 'floating'
  interest_rate?: number
  base_rate_id?: number
  spread?: number
  adjust_cycle?: string // 从字典获取
  interest_mode: 'simple' | 'compound'
  day_count_convention: 'ACT365' | 'ACT360' | 'MONTHLY'
  repayment_method: string // 从字典获取
  repayment_cycle: number
  repayment_day: number
}

/** 模拟债务列表项（用于管理界面） */
export interface SimulatedDebtListItem extends SimulatedDebt {
  // 扩展显示字段
  principal_display: string // 本金显示（带单位）
  date_range_display: string // 日期范围显示
  interest_display: string // 利率显示
}

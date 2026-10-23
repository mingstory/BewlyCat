import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { parse } from 'vue/compiler-sfc'

import { ambilightFpsOptions, ambilightPresetOptions } from '../src/components/Settings/definitions/ambilight'
import { originalComponentOptions, pluginComponentOptions, pluginFilterOptions } from '../src/components/Settings/definitions/moments'
import { configurableShortcutsGroups } from '../src/components/Settings/definitions/shortcuts'
import { topBarComponentDefinitions } from '../src/components/Settings/definitions/topbar'
import { isSettingTitleKey, settingsSearchEntries } from '../src/components/Settings/searchCatalog'
import { SETTINGS_CATALOG_ALLOWLIST } from './settingsCatalogAllowlist'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const settingsDirectory = resolve(root, 'src/components/Settings')
const localesDirectory = resolve(root, 'src/_locales')
const searchCatalogFile = resolve(settingsDirectory, 'searchCatalog.ts')
const catalogLines = readFileSync(searchCatalogFile, 'utf8').split(/\r?\n/)
const titleComponents = new Set(['SettingsItem', 'SettingsItemGroup', 'SettingsSectionHeading'])

interface TemplateProp {
  type: number
  name?: string
  arg?: { content?: string }
  exp?: { content?: string }
  value?: { content?: string }
}

interface TemplateNode {
  type: number
  tag?: string
  props?: TemplateProp[]
  children?: TemplateNode[]
  loc?: { start?: { line?: number } }
}

interface StaticKey {
  file: string
  line: number
  tag: string
  key: string
}

interface LocaleKeys {
  file: string
  keys: Set<string>
  objectKeys: Set<string>
}

const errors: string[] = []
const warnings: string[] = []

function displayPath(file: string) {
  return relative(root, file).replaceAll('\\', '/')
}

function collectVueFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory())
      return collectVueFiles(path)
    return entry.name.endsWith('.vue') ? [path] : []
  })
}

function getProp(node: TemplateNode, name: string): TemplateProp | undefined {
  for (const prop of node.props ?? []) {
    if (prop.type === 6 && prop.name === name)
      return prop
    if (prop.type === 7 && prop.name === 'bind' && prop.arg?.content === name)
      return prop
  }
  return undefined
}

function getPropExpression(node: TemplateNode, name: string): string | undefined {
  const prop = getProp(node, name)
  if (!prop)
    return undefined
  return prop.type === 6 ? prop.value?.content : prop.exp?.content
}

function getStringPropLiteral(node: TemplateNode, name: string): string | undefined {
  const prop = getProp(node, name)
  if (!prop)
    return undefined
  if (prop.type === 6)
    return prop.value?.content?.trim() || undefined
  return getStringLiteral(prop.exp?.content)
}

function getI18nLiteral(expression: string | undefined): string | undefined {
  if (!expression)
    return undefined
  return expression.match(/^\s*(?:\$t|t)\(\s*['"]([^'"]+)['"]/)?.[1]
}

function getStringLiteral(expression: string | undefined): string | undefined {
  if (!expression)
    return undefined
  const value = expression.trim()
  if (!/^['"][^'"]+['"]$/.test(value))
    return undefined
  return value.slice(1, -1)
}

function collectTemplateKeys(file: string): { titles: StaticKey[], dataKeys: StaticKey[] } {
  const source = readFileSync(file, 'utf8')
  const { descriptor, errors: parseErrors } = parse(source, { filename: file })
  if (parseErrors.length) {
    errors.push(`${displayPath(file)}: SFC 解析失败：${parseErrors.map(error => error.message).join('; ')}`)
    return { titles: [], dataKeys: [] }
  }

  const titles: StaticKey[] = []
  const dataKeys: StaticKey[] = []
  const rootNode = descriptor.template?.ast as unknown as TemplateNode | undefined
  if (!rootNode)
    return { titles, dataKeys }

  const stack = [rootNode]
  while (stack.length) {
    const node = stack.pop()!
    if (node.type === 1 && node.tag) {
      const line = node.loc?.start?.line ?? 0
      if (titleComponents.has(node.tag)) {
        const key = getI18nLiteral(getPropExpression(node, 'title'))
        if (key && isSettingTitleKey(key))
          titles.push({ file: displayPath(file), line, tag: node.tag, key })
      }
      const dataKey = getStringPropLiteral(node, 'data-settings-key')
      if (dataKey)
        dataKeys.push({ file: displayPath(file), line, tag: node.tag, key: dataKey })
    }
    if (node.children)
      stack.push(...node.children)
  }

  return { titles, dataKeys }
}

function parseLocaleKeys(file: string): LocaleKeys {
  const keys = new Set<string>()
  const objectKeys = new Set<string>()
  const stack: string[] = []
  let blockScalarIndent: number | undefined

  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const lineNumber = index + 1

    if (blockScalarIndent !== undefined) {
      if (!line.trim())
        continue
      const indent = line.match(/^\s*/)?.[0].length ?? 0
      if (indent > blockScalarIndent)
        continue
      blockScalarIndent = undefined
    }

    if (!line.trim() || line.trim().startsWith('#'))
      continue
    if (line.includes('\t'))
      throw new Error(`${displayPath(file)}:${lineNumber} 不支持 tab 缩进`)
    if (/^\s*-\s/.test(line))
      throw new Error(`${displayPath(file)}:${lineNumber} 不支持 YAML 序列`)
    if (/^\s*[&*]/.test(line))
      throw new Error(`${displayPath(file)}:${lineNumber} 不支持 YAML 锚点或别名`)
    if (/^\s*['"]/.test(line))
      throw new Error(`${displayPath(file)}:${lineNumber} 不支持带引号的 key`)
    if (/^\s*[[{]/.test(line))
      throw new Error(`${displayPath(file)}:${lineNumber} 不支持 flow collection`)

    const match = line.match(/^([ \t]*)([\w.-]+):(.*)$/)
    if (!match)
      throw new Error(`${displayPath(file)}:${lineNumber} 无法识别的 YAML 行`)

    const indent = match[1].length
    if (indent % 2 !== 0)
      throw new Error(`${displayPath(file)}:${lineNumber} 缩进不是 2 的倍数`)
    const level = indent / 2
    if (level > stack.length)
      throw new Error(`${displayPath(file)}:${lineNumber} 缩进跳级`)

    for (let ancestorLevel = 0; ancestorLevel < level; ancestorLevel++)
      objectKeys.add(stack.slice(0, ancestorLevel + 1).join('.'))

    stack.length = level
    stack[level] = match[2]
    keys.add(stack.slice(0, level + 1).join('.'))

    if (/^[|>][-+0-9]*(?:\s+#.*)?$/.test((match[3] ?? '').trim()))
      blockScalarIndent = indent
  }

  return { file: displayPath(file), keys, objectKeys }
}

function localeHasStringLeaf(locales: LocaleKeys[], key: string) {
  return locales.every(locale => locale.keys.has(key) && !locale.objectKeys.has(key))
}

function localeHasKey(locales: LocaleKeys[], key: string) {
  return locales.every(locale => locale.keys.has(key))
}

function catalogLine(key: string) {
  const index = catalogLines.findIndex(line => line.includes(`'${key}'`))
  return index === -1 ? 0 : index + 1
}

function validateEntries(locales: LocaleKeys[]) {
  const targets = new Set<string>()
  const duplicates = new Map<string, string[]>()

  for (const entry of settingsSearchEntries) {
    for (const key of [entry.titleKey, entry.targetTitleKey, entry.secondaryTitleKey]) {
      if (!key)
        continue
      if (!localeHasStringLeaf(locales, key))
        errors.push(`${displayPath(searchCatalogFile)}:${catalogLine(key)} 条目 key "${key}" 在 locale 中缺失或不是字符串叶子`)
    }

    for (const key of entry.keywordKeys ?? []) {
      if (!localeHasKey(locales, key))
        errors.push(`${displayPath(searchCatalogFile)}:${catalogLine(key)} keywordKey "${key}" 在 locale 中缺失`)
    }

    if (entry.fallbackTargetKey && !localeHasStringLeaf(locales, entry.fallbackTargetKey))
      errors.push(`${displayPath(searchCatalogFile)}:${catalogLine(entry.fallbackTargetKey)} fallbackTargetKey "${entry.fallbackTargetKey}" 在 locale 中缺失或不是字符串叶子`)

    if (entry.titleKey)
      targets.add(entry.titleKey)
    if (entry.targetTitleKey)
      targets.add(entry.targetTitleKey)

    const target = entry.targetTitleKey ?? entry.titleKey ?? entry.title
    if (target) {
      const id = `${entry.menu}|${target}`
      duplicates.set(id, [...(duplicates.get(id) ?? []), entry.titleKey ?? entry.title ?? ''])
    }
  }

  for (const [id, entries] of duplicates) {
    if (entries.length > 1)
      warnings.push(`重复搜索结果 ${id}：${entries.join(', ')}`)
  }

  return targets
}

function validateStaticKeys(locales: LocaleKeys[], targets: Set<string>) {
  const titles: StaticKey[] = []
  const dataKeys: StaticKey[] = []
  const usedAllowlistKeys = new Set<string>()

  for (const file of collectVueFiles(settingsDirectory)) {
    const collected = collectTemplateKeys(file)
    titles.push(...collected.titles)
    dataKeys.push(...collected.dataKeys)
  }

  for (const title of titles) {
    if (targets.has(title.key))
      continue
    if (Object.hasOwn(SETTINGS_CATALOG_ALLOWLIST, title.key)) {
      usedAllowlistKeys.add(title.key)
      continue
    }
    errors.push(`${title.file}:${title.line} 标题 key "${title.key}" 未出现在任何搜索条目中；请新增条目或加入 allowlist`)
  }

  for (const dataKey of dataKeys) {
    if (!localeHasStringLeaf(locales, dataKey.key))
      errors.push(`${dataKey.file}:${dataKey.line} data-settings-key "${dataKey.key}" 在 locale 中缺失或不是字符串叶子`)
    if (!targets.has(dataKey.key))
      errors.push(`${dataKey.file}:${dataKey.line} data-settings-key "${dataKey.key}" 未对应任何搜索条目的 titleKey/targetTitleKey`)
  }

  const dataKeySet = new Set(dataKeys.map(dataKey => dataKey.key))
  for (const entry of settingsSearchEntries) {
    if (entry.fallbackTargetKey && !dataKeySet.has(entry.fallbackTargetKey))
      errors.push(`条目 "${entry.titleKey ?? entry.title ?? ''}" 的 fallbackTargetKey "${entry.fallbackTargetKey}" 没有对应的 data-settings-key`)
  }

  for (const key of Object.keys(SETTINGS_CATALOG_ALLOWLIST)) {
    if (!localeHasStringLeaf(locales, key))
      errors.push(`allowlist key "${key}" 在 locale 中缺失或不是字符串叶子`)
    if (!usedAllowlistKeys.has(key))
      warnings.push(`allowlist key "${key}" 未被任何静态标题使用`)
  }
}

function validateDefinitions(locales: LocaleKeys[], targets: Set<string>) {
  for (const group of configurableShortcutsGroups) {
    for (const shortcut of group.shortcuts) {
      if (!targets.has(shortcut.nameKey))
        errors.push(`快捷键定义 "${shortcut.nameKey}" 未出现在搜索目录中`)
      if (!localeHasStringLeaf(locales, shortcut.descriptionKey))
        errors.push(`快捷键描述 "${shortcut.descriptionKey}" 在 locale 中缺失或不是字符串叶子`)
    }
  }

  const momentGroups = [
    { label: 'Moments 原始页组件', options: originalComponentOptions },
    { label: 'Moments 新页组件', options: pluginComponentOptions },
    { label: 'Moments 过滤项', options: pluginFilterOptions },
  ]
  for (const group of momentGroups) {
    for (const option of group.options) {
      if (!localeHasStringLeaf(locales, option.labelKey))
        errors.push(`${group.label} "${option.labelKey}" 在 locale 中缺失或不是字符串叶子`)
      if (option.searchable === false) {
        if (!option.searchTitleKey)
          errors.push(`${group.label} "${option.labelKey}" 标记为不可独立搜索，但缺少 searchTitleKey`)
        else if (!targets.has(option.searchTitleKey))
          errors.push(`${group.label} 的手工搜索条目 "${option.searchTitleKey}" 不存在`)
      }
      else if (!targets.has(option.labelKey)) {
        errors.push(`${group.label} "${option.labelKey}" 未出现在搜索目录中`)
      }
    }
  }

  const searchOrders = new Set<number>()
  for (const component of topBarComponentDefinitions) {
    if (searchOrders.has(component.searchOrder))
      errors.push(`顶栏组件 "${component.i18nKey}" 的 searchOrder ${component.searchOrder} 重复`)
    searchOrders.add(component.searchOrder)
    if (!targets.has(component.i18nKey))
      errors.push(`顶栏组件 "${component.i18nKey}" 未出现在搜索目录中`)
  }

  const ambilightEntry = settingsSearchEntries.find(entry => entry.titleKey === 'settings.ambilight.title')
  const ambilightKeywords = new Set(ambilightEntry?.keywordKeys ?? [])
  for (const option of [...ambilightPresetOptions, ...ambilightFpsOptions]) {
    if (!localeHasStringLeaf(locales, option.labelKey))
      errors.push(`环境光选项 "${option.labelKey}" 在 locale 中缺失或不是字符串叶子`)
    if (!ambilightKeywords.has(option.labelKey))
      errors.push(`环境光选项 "${option.labelKey}" 未挂到 settings.ambilight.title 的搜索关键词`)
  }
}

function main() {
  const localeFiles = readdirSync(localesDirectory)
    .filter(file => file.endsWith('.yml'))
    .sort()
    .map(file => resolve(localesDirectory, file))

  if (localeFiles.length === 0) {
    console.error('未找到 src/_locales/*.yml')
    process.exitCode = 1
    return
  }

  const locales = localeFiles.map(parseLocaleKeys)
  const referenceLocale = locales[0]
  for (const locale of locales.slice(1)) {
    for (const key of referenceLocale.keys) {
      if (!locale.keys.has(key))
        errors.push(`${locale.file} 缺少 locale key "${key}"`)
    }
    for (const key of locale.keys) {
      if (!referenceLocale.keys.has(key))
        errors.push(`${locale.file} 多出 locale key "${key}"`)
    }
  }

  const targets = validateEntries(locales)
  validateStaticKeys(locales, targets)
  validateDefinitions(locales, targets)

  for (const warning of warnings)
    console.warn(`[warn] ${warning}`)

  if (errors.length) {
    for (const error of errors)
      console.error(`[error] ${error}`)
    process.exitCode = 1
    return
  }

  console.log(`设置搜索目录校验通过：${settingsSearchEntries.length} 个条目，${locales.length} 份 locale。`)
}

try {
  main()
}
catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}

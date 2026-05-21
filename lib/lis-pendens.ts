import { searchMiamiDadeClerkRecords } from '@/lib/miami-dade-clerk-records'

const LIS_PENDENS_DOC = 'LIS PENDENS - LIS'

export async function fetchMiamiDadeLisPendens(): Promise<{
  listings: import('@/lib/foreclosure-listing').ForeclosureListing[]
  warning?: string
}> {
  const result = await searchMiamiDadeClerkRecords({
    documentType: LIS_PENDENS_DOC,
    category: 'lis-pendens',
    idPrefix: 'lp',
  })
  return { listings: result.listings, warning: result.warning }
}

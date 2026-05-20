/**
 * @deprecated Import from `@/lib/realtdm` instead.
 */
export {
  FL_REALTDM_COUNTIES,
  REALTDM_UPCOMING_STATUS_IDS,
  REALTDM_ACTIVE_STATUS_IDS,
  REALTDM_RESALE_STATUS_IDS,
  REALTDM_UPCOMING_STATUS_LABELS,
  REALTDM_ACTIVE_STATUS_LABELS,
  REALTDM_RESALE_STATUS_LABELS,
  countyBaseUrl,
  countyCaseListUrl,
  caseUniqueId,
  normalizeParcelNumber,
  isUpcomingSale,
  fetchFloridaTaxDeedCases,
  fetchMiamiDadeTaxDeedCases,
  fetchCountyTaxDeedCases,
  type RealTdmCase,
  type RealTdmCounty,
  type CountyFetchResult,
  type MiamiDadeCase,
} from '@/lib/realtdm'

export const REALTDM_CASE_LIST_URL = 'https://miamidade.realtdm.com/public/cases/list'
export const REALTDM_CASE_DETAILS_URL = 'https://miamidade.realtdm.com/public/cases/details'

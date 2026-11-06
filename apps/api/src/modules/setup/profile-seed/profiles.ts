import type { BusinessProfile } from '../../settings/business-profile';
import { KITCHEN_ROLE, ROLE_DEFS } from './roles';
import type { RoleDef } from './roles';

export interface AttributeDef {
  code: string;
  name: string;
  values: { value: string; code: string }[];
}

export interface ProfileSeedData {
  roles: RoleDef[];
  attributes: AttributeDef[];
  categories: string[];
  /** Tiền tố mã chứng từ. */
  docPrefixes: Record<string, string>;
  defaultOutputVatRate: string;
  pricesIncludeVat: boolean;
}

const v = (value: string, code = value) => ({ value, code });

const SIZE_ALPHA = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const SIZE_NUM = ['28', '29', '30', '31', '32', '33', '34', '35', '36'];
const COLORS: [string, string][] = [
  ['Đen', 'BLK'],
  ['Trắng', 'WHT'],
  ['Xám', 'GRY'],
  ['Đỏ', 'RED'],
  ['Xanh dương', 'BLU'],
  ['Xanh lá', 'GRN'],
  ['Vàng', 'YLW'],
  ['Hồng', 'PNK'],
  ['Nâu', 'BRN'],
  ['Be', 'BEI'],
];

const DOC_PREFIXES = { import: 'PN', export: 'PX', stocktake: 'KK', purchase_return: 'TH', customer_return: 'KT' };

export const PROFILE_SEEDS: Record<BusinessProfile, ProfileSeedData> = {
  FNB: {
    roles: [...ROLE_DEFS, KITCHEN_ROLE],
    attributes: [],
    categories: ['Thịt', 'Rau', 'Gia vị', 'Đồ khô', 'Đồ uống'],
    docPrefixes: DOC_PREFIXES,
    defaultOutputVatRate: '8',
    pricesIncludeVat: true,
  },
  FASHION: {
    roles: ROLE_DEFS,
    attributes: [
      { code: 'SIZE', name: 'Size', values: [...SIZE_ALPHA, ...SIZE_NUM].map((s) => v(s)) },
      { code: 'COLOR', name: 'Màu', values: COLORS.map(([value, code]) => v(value, code)) },
    ],
    categories: ['Áo', 'Quần', 'Váy / Đầm', 'Áo khoác', 'Phụ kiện'],
    docPrefixes: DOC_PREFIXES,
    defaultOutputVatRate: '8',
    pricesIncludeVat: true,
  },
  RETAIL: {
    roles: ROLE_DEFS,
    attributes: [],
    categories: ['Hàng tiêu dùng', 'Khác'],
    docPrefixes: DOC_PREFIXES,
    defaultOutputVatRate: '8',
    pricesIncludeVat: true,
  },
};

export type RetailRole = "MANAGER" | "STAFF";
export type RetailPage = 
  | "pos" 
  | "inventory" 
  | "inventory-tambah" 
  | "inventory-titipan" 
  | "belanja" 
  | "tabungan" 
  | "laporan" 
  | "profil";

export interface RetailNavItem {
  key: RetailPage;
  label: string;
  href: string;
  iconName: string;
  roles: RetailRole[];
  primary?: boolean;
  children?: RetailNavItem[];
}

export const RETAIL_NAV_GROUPS = {
  primary: [
    { key: "pos" as RetailPage, label: "POS", href: "/dashboard/retail/pos", iconName: "ShoppingCart", roles: ["MANAGER","STAFF"] as const, primary: true },
  ],
  secondary: [
    { 
      key: "inventory" as RetailPage, 
      label: "Inventori", 
      href: "/dashboard/retail/inventory", 
      iconName: "Package", 
      roles: ["MANAGER","STAFF"] as const,
      children: [
        { key: "inventory" as RetailPage, label: "Stok Pondok", href: "/dashboard/retail/inventory", iconName: "Package", roles: ["MANAGER","STAFF"] as const },
        { key: "inventory-tambah" as RetailPage, label: "Tambah Barang", href: "/dashboard/retail/inventory/tambah", iconName: "Plus", roles: ["MANAGER","STAFF"] as const },
        { key: "inventory-titipan" as RetailPage, label: "Barang Titipan (UMKM)", href: "/dashboard/retail/inventory/barang-titipan", iconName: "PackageOpen", roles: ["MANAGER","STAFF"] as const },
      ]
    },
    { key: "belanja" as RetailPage, label: "Belanja Stok", href: "/dashboard/retail/belanja", iconName: "ShoppingBag", roles: ["MANAGER","STAFF"] as const },
    { key: "tabungan" as RetailPage, label: "Tabungan Santri", href: "/dashboard/retail/tabungan", iconName: "Wallet", roles: ["MANAGER","STAFF"] as const },
  ],
  tertiary: [
    { key: "laporan" as RetailPage, label: "Laporan Retail", href: "/dashboard/reports", iconName: "BarChart2", roles: ["MANAGER","STAFF"] as const },
    { key: "profil" as RetailPage, label: "Profil", href: "/dashboard/profile", iconName: "User", roles: ["MANAGER","STAFF"] as const },
  ],
} as const;

export const RETAIL_PRIMARY_ACTION = {
  MANAGER: "pos",
  STAFF: "pos",
} as const;

export const RETAIL_UNITS = [
  { id: "cmubg2y5h001fxx3d51558t81", name: "Koperasi Buku", code: "KOP", iconName: "BookOpen" },
  { id: "cmubg2y5b001dxx3d8ybh8kx9", name: "Kantin Umi", code: "KUM", iconName: "Utensils" },
  { id: "cmubg2y54001bxx3d7c6scg0h", name: "Kantin Baru", code: "KAB", iconName: "Store" },
] as const;

export function getRetailNavItems(role: "MANAGER" | "STAFF") {
  return {
    primary: RETAIL_NAV_GROUPS.primary.filter(i => i.roles.includes(role)),
    secondary: RETAIL_NAV_GROUPS.secondary.filter(i => i.roles.includes(role)),
    tertiary: RETAIL_NAV_GROUPS.tertiary.filter(i => i.roles.includes(role)),
  };
}
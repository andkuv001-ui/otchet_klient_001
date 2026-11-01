export interface AvitoSearchItem {
  sellerUrl: string;
  sellerName: string;
  verifiedDocs: boolean;
  adsCount: number;
  rating: number;
  reviews: number;
  adUrl: string;
  avitoId: string;
  title: string;
  price: number;
  description: string;
  address: string;
  publishDate: string;
  position: number;
  viewsToday: number;
  viewsTotal: number;
  paidPromo: string;
  workingHours: string;
  camera: string;
  category: string;
  experience: string;
  serviceType: string;
  searchQuery?: string;
}

export interface SearchMarketAnalysis {
  keyword: string;
  region: string;
  totalAds: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  avgRating: number;
  verifiedPercent: number;
  paidPromoPercent: number;
  totalViews: number;
  avgViewsPerAd: number;
  topSellers: Array<{
    name: string;
    adsCount: number;
    rating: number;
    reviews: number;
    totalViews: number;
    verified: boolean;
  }>;
  commonServices: Array<{
    title: string;
    count: number;
    avgPrice: number;
  }>;
}

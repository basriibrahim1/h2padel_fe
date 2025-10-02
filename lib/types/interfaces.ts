export interface ICourtData {
  id: number;
  court_name: string;
  court_address: string;
  court_maps_url: string;
  fixed_price: number;
}

export interface IPersonData {
  id: string;
  name: string;
  phone: string;
  fixed_fee?: number;
}

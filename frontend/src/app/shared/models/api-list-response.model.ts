export interface ApiListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiResource {
  name: string;
  url: string;
}

export interface ApiResourceList {
    
}
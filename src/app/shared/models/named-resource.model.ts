export interface NamedResource {
  name: string;
  url: string;
}

export interface NamedResourceList {
  count: number;
  next: string | null;
  previous: string | null;
  results: NamedResource[];
}

export interface ApiResource {
  name: string;
  url: string;
}

export interface ApiResourceList {
    
}
import type { NewsArticle } from './api';
export interface Comparison {
  generated_at:string;articles:NewsArticle[];shared_across_all:string[];timeline:string[];
  pairs:{left:string;right:string;shared_terms:string[];left_only_terms:string[];right_only_terms:string[];headline_overlap_percent:number;same_publisher_domain:boolean}[];
  dimensions:{publisher_domains:number;countries:string[];languages:string[];sections:string[];time_span_hours:number;demo_articles:number};method:string;
}
export interface CollectionConfig {id:string;version:number;name:string;note:string;slugs:string[];}
export interface ResearchCollection extends CollectionConfig {
  updated_at:string;unavailable_count:number;changed_count:number;
  items:{article:NewsArticle;changed_since_saved:boolean}[];
}
export interface ResearchReport {limit:number;collections:ResearchCollection[];retention:string;}

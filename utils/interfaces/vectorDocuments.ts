export interface DocumentInput<Metadata extends Record<string, any> = Record<string, any>> {
  pageContent: string;
  metadata?: Metadata;
}
export interface DocumentInterface<Metadata extends Record<string, any> = Record<string, any>> {
  pageContent: string;
  metadata: Metadata;
}
/**
* Interface for interacting with a document.
*/
export declare class VectorDocument<Metadata extends Record<string, any> = Record<string, any>> implements DocumentInput, DocumentInterface {
  pageContent: string;
  metadata: Metadata;
  constructor(fields: DocumentInput<Metadata>);
}

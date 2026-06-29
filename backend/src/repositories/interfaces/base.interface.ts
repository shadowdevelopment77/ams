export interface PaginationParams {
  page?: number;
  limit?: number;
}
 
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
 
export interface SoftDeleteParams {
  is_deleted: boolean;
  deleted_at: Date | null;
}
 
export interface BaseRepository<T, CreateDTO, UpdateDTO, IDType> {
  findById(id: IDType): Promise<T | null>;
  findAll(params?: PaginationParams): Promise<PaginatedResult<T>>;
  create(data: CreateDTO): Promise<T>;
  update(id: IDType, data: UpdateDTO): Promise<T>;
  softDelete(id: IDType): Promise<T>;
}

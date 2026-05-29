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
 
export interface IBaseRepository<T, CreateDTO, UpdateDTO> {
  findById(id: number): Promise<T | null>;
  findAll(params?: PaginationParams): Promise<PaginatedResult<T>>;
  create(data: CreateDTO): Promise<T>;
  update(id: number, data: UpdateDTO): Promise<T>;
  softDelete(id: number): Promise<T>;
}

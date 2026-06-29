import { Company } from "../../../generated/prisma";
import { BaseRepository} from "./base.interface";

export interface CreateCompanyDTO {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
}

export interface UpdateCompanyDTO {
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  is_active?: boolean;
}

export interface CompanyRepository extends BaseRepository<Company, CreateCompanyDTO, UpdateCompanyDTO, number> {
  findByName(name: string): Promise<Company | null>;
}
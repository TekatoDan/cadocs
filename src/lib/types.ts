export interface FolderRecord {
  id: string;
  team_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  created_by: string | null;
}

export interface UploadedFileRecord {
  id: string;
  team_id: string;
  folder_id: string | null;
  name: string;
  description?: string | null;
  storage_path: string;
  size_bytes: number;
  mime_type: string;
  status: string;
  indexing_status?: string | null;
  indexing_error?: string | null;
  indexed_at?: string | null;
  created_at: string;
  created_by: string | null;
}

export interface FileSearchResult {
  id: string;
  type: "file";
  content: string;
  page_number?: number | null;
  section?: string | null;
  files: {
    id: string;
    name: string;
    team_id: string;
    storage_path: string;
    mime_type: string;
    size_bytes: number;
    indexing_status?: string | null;
    indexing_error?: string | null;
    indexed_at?: string | null;
    created_at: string;
    created_by: string | null;
    description?: string | null;
  };
}

export interface FolderSearchResult {
  id: string;
  type: "folder";
  content: string;
  folder: FolderRecord;
}

export type SearchResult = FileSearchResult | FolderSearchResult;

export interface SearchFilters {
  fileType?: string;
  dateModified?: string;
  owner?: string;
  tags?: string;
  fileSize?: string;
}

export interface ChatMessage {
  id: string;
  team_id: string;
  user_id: string;
  user_email: string;
  content: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  role: string;
  user_id: string;
  users: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface StarredItems {
  files: string[];
  folders: string[];
}

export interface ColumnConfig {
  owner: boolean;
  lastModified: boolean;
  size: boolean;
}
